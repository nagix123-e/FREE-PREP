import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { getPackageTypeLabel, parseCsvFile, parseCsvText } from "../lib/csvValidation";
import { listQuestionSets, saveQuestionSet } from "../lib/database";
import {
  getUnsavedSampleOptions,
  listSampleSetOptions,
  loadSampleCsv,
  type SampleSetOption
} from "../services/sampleSetService";
import { useAppStore } from "../store/appStore";
import { DropdownSelect } from "./ui/DropdownSelect";
import type { ValidationIssue, ValidationSummary } from "../types";

type ImportQueueItem = {
  id: string;
  fileName: string;
  sourceFilename: string;
  setName: string;
  description: string;
  summary: ValidationSummary | null;
  parseError: string | null;
  saved: boolean;
  saveError: string | null;
};

const MAX_IMPORT_FILES = 10;

export function ImportScreen() {
  const { navigate, questionSets, setQuestionSets, setDbError, tutorial, recordTutorialImport } = useAppStore();
  const [queue, setQueue] = useState<ImportQueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lastSelectionCount, setLastSelectionCount] = useState(0);
  const [nameTouched, setNameTouched] = useState(false);
  const [sampleOptions, setSampleOptions] = useState<SampleSetOption[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const activeItem = useMemo(
    () => queue.find((item) => item.id === activeQueueId) ?? queue[0] ?? null,
    [activeQueueId, queue]
  );
  const currentSummary = activeItem?.summary ?? null;
  const currentFileName = activeItem?.fileName ?? "";
  const currentSetName = activeItem?.setName ?? "";
  const currentDescription = activeItem?.description ?? "";
  const currentParseError = activeItem?.parseError ?? null;
  const currentSaveError = activeItem?.saveError ?? null;

  const nameError = nameTouched && !currentSetName.trim() ? "Question set name is required." : null;
  const saveReadinessMessage = getSaveReadinessMessage({
    fileName: currentFileName,
    isParsing,
    name: currentSetName,
    summary: currentSummary
  });
  const canSave = Boolean(currentSummary?.valid && currentSetName.trim() && !isSaving && !isParsing);
  const orderedCounts = useMemo(
    () => getExpectedCountRows(currentSummary),
    [currentSummary]
  );
  const visualTypeRows = useMemo(
    () => toSummaryRows(currentSummary?.visualTypeCounts ?? {}),
    [currentSummary]
  );
  const contentDomainRows = useMemo(
    () => toSummaryRows(currentSummary?.contentDomainCounts ?? {}),
    [currentSummary]
  );
  const skillGroupRows = useMemo(
    () => toSummaryRows(currentSummary?.skillGroupCounts ?? {}),
    [currentSummary]
  );
  const expectedRowCount = getExpectedRowCount(currentSummary);
  const rowCount = currentSummary?.rowCount ?? 0;
  const unsavedSampleOptions = useMemo(() => getUnsavedSampleOptions(sampleOptions), [sampleOptions]);
  const selectedSample = unsavedSampleOptions.find((sample) => sample.id === selectedSampleId) ?? null;

  useEffect(() => {
    listSampleSetOptions(questionSets)
      .then((options) => {
        setSampleOptions(options);
        const unsaved = getUnsavedSampleOptions(options);
        setSelectedSampleId((current) =>
          current && unsaved.some((sample) => sample.id === current) ? current : unsaved[0]?.id ?? ""
        );
      })
      .catch(() => {
        setSampleOptions([]);
        setSelectedSampleId("");
      });
  }, [questionSets]);

  async function handleFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setIsParsing(true);
    setFileError(null);
    setLastSelectionCount(files.length);

    try {
      const parsedItems = await Promise.all(
        files.slice(0, MAX_IMPORT_FILES).map(async (file) => {
          try {
            const summary = await parseCsvFile(file);
            return createQueueItem({
              fileName: file.name,
              sourceFilename: file.name,
              summary,
              description: ""
            });
          } catch (error: unknown) {
            return createQueueItem({
              fileName: file.name,
              sourceFilename: file.name,
              summary: null,
              description: "",
              parseError: errorToMessage(error, "Could not parse CSV file.")
            });
          }
        })
      );

      setQueue((current) => {
        const nextQueue = [...current, ...parsedItems];
        if (!activeItem || activeItem.saved) {
          const nextPending = nextQueue.find((item) => !item.saved);
          if (nextPending) {
            setActiveQueueId(nextPending.id);
            setNameTouched(false);
          }
        } else if (!nextQueue.some((item) => item.id === activeItem.id)) {
          setActiveQueueId(parsedItems[0]?.id ?? nextQueue[0]?.id ?? null);
          setNameTouched(false);
        }
        return nextQueue;
      });

      if (files.length > MAX_IMPORT_FILES) {
        setFileError(`You can import at most ${MAX_IMPORT_FILES} CSV files at a time.`);
      }
    } catch (error: unknown) {
      setFileError(errorToMessage(error, "Could not parse CSV file."));
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    void handleFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".csv")
    );
    void handleFiles(files);
  }

  async function handleLoadSample() {
    if (!selectedSample) {
      return;
    }

    setIsLoadingSample(true);
    setIsParsing(true);
    setNameTouched(false);
    setFileError(null);

    try {
      const csvText = await loadSampleCsv(selectedSample);
      const summary = requireFullTestSample(parseCsvText(csvText));
      const item = createQueueItem({
        fileName: selectedSample.filename,
        sourceFilename: selectedSample.sourceFilename,
        summary,
        setName: selectedSample.name,
        description: selectedSample.description
      });
      setQueue((current) => [...current, item]);
      setActiveQueueId((current) => current ?? item.id);
      setNameTouched(false);
    } catch (error: unknown) {
      setFileError(errorToMessage(error, "Could not load sample set."));
    } finally {
      setIsParsing(false);
      setIsLoadingSample(false);
    }
  }

  async function handleSave() {
    setNameTouched(true);
    if (!activeItem || !currentSummary || !canSave) {
      updateActiveQueueItem({ saveError: saveReadinessMessage ?? "Question set is not ready to save." });
      return;
    }

    setIsSaving(true);
    updateActiveQueueItem({ saveError: null });
    try {
      const saved = await saveQuestionSet({
        name: currentSetName.trim(),
        description: currentDescription.trim(),
        questions: currentSummary.questions,
        status: currentSummary.issues.some((issue) => issue.level === "warning") ? "warning" : "valid",
        packageType: currentSummary.packageType ?? undefined,
        sourceFilename: activeItem.sourceFilename || currentFileName,
        rowCount: currentSummary.rowCount,
        sectionCounts: currentSummary.sectionCounts,
        previewPassword: currentSummary.previewPassword
      });
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
      if (tutorial.active) {
        recordTutorialImport(saved.id, saved.name);
      }
      setQueue((current) => {
        const updated = current.map((item) =>
          item.id === activeItem.id
            ? {
                ...item,
                saved: true,
                saveError: null,
                sourceFilename: saved.sourceFilename || item.sourceFilename
              }
            : item
        );
        const nextPending = updated.find((item) => !item.saved);
        setActiveQueueId(nextPending?.id ?? activeItem.id);
        setNameTouched(false);
        return updated;
      });
      if (!queue.some((item) => !item.saved && item.id !== activeItem.id)) {
        navigate("preview", saved.id);
      }
    } catch (error: unknown) {
      const message = errorToMessage(error, "Could not save question set.");
      updateActiveQueueItem({ saveError: message });
      setDbError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function updateActiveQueueItem(patch: Partial<ImportQueueItem>) {
    if (!activeItem) return;
    setQueue((current) =>
      current.map((item) => (item.id === activeItem.id ? { ...item, ...patch } : item))
    );
  }

  function updateActiveField(field: "setName" | "description", value: string) {
    updateActiveQueueItem({ [field]: value } as Partial<ImportQueueItem>);
  }

  function selectQueueItem(id: string) {
    if (!queue.some((item) => item.id === id)) {
      return;
    }
    setActiveQueueId(id);
    setNameTouched(false);
  }

  function selectNextUnsaved() {
    const nextPending = queue.find((item) => !item.saved && item.id !== activeItem?.id);
    if (nextPending) {
      setActiveQueueId(nextPending.id);
      setNameTouched(false);
      return;
    }
  }

  function createQueueItem({
    fileName,
    sourceFilename,
    summary,
    setName,
    description,
    parseError = null
  }: {
    fileName: string;
    sourceFilename: string;
    summary: ValidationSummary | null;
    setName?: string;
    description: string;
    parseError?: string | null;
  }): ImportQueueItem {
    return {
      id: `${sourceFilename}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName,
      sourceFilename,
      setName: setName ?? fileName.replace(/\.csv$/i, ""),
      description,
      summary,
      parseError,
      saved: false,
      saveError: null
    };
  }

  return (
    <div className={`import-layout-grid grid gap-6 ${tutorial.active && tutorial.step === "import_csv" ? "tutorial-active-target" : ""}`}>
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Import a SAT-format CSV</h2>
        <p className="mt-2 text-sm text-slate-600">
          The importer checks headers, route rules, question types, duplicate IDs, and the required
          full-test, RW-only, or Math-only counts.
        </p>

        <label
          className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-teal-600 hover:bg-teal-50"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <span className="csv-name-wrap max-w-full text-sm font-semibold text-ink">
            {queue.length > 0 ? `${queue.length} CSV file${queue.length === 1 ? "" : "s"} queued` : "Choose CSV files"}
          </span>
          <span className="mt-2 text-xs text-muted">
            Select or drag up to {MAX_IMPORT_FILES} CSV files. Parsed locally with Papa Parse.
          </span>
          <input
            accept=".csv,text/csv"
            className="sr-only"
            multiple
            onChange={handleFileInputChange}
            type="file"
          />
        </label>
        {lastSelectionCount > 0 ? (
          <div className="mt-2 text-xs text-muted">
            Last selection: {Math.min(lastSelectionCount, MAX_IMPORT_FILES)}/{lastSelectionCount} file
            {lastSelectionCount === 1 ? "" : "s"} queued.
          </div>
        ) : null}
        {queue.length === 0 ? (
          <div className="mt-2 text-xs text-muted">A SAT-format CSV file is required.</div>
        ) : null}
        {fileError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {fileError}
          </div>
        ) : null}

        {isParsing ? <div className="mt-4 text-sm text-muted">Parsing CSV...</div> : null}

        {queue.length > 0 ? (
          <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Import queue</div>
                <div className="mt-1 text-xs text-muted">
                  {queue.length} file{queue.length === 1 ? "" : "s"} in this session
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {queue.length}/{MAX_IMPORT_FILES} max per batch
              </div>
            </div>
            <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
              {queue.map((item, index) => {
                const isActive = item.id === activeItem?.id;
                const statusLabel = item.parseError
                  ? "Parse error"
                  : item.saved
                    ? "Saved"
                    : item.summary
                      ? "Ready"
                      : "Pending";
                const statusClass = item.parseError
                  ? "border-red-200 bg-red-50 text-red-800"
                  : item.saved
                    ? "border-teal-100 bg-teal-50 text-teal-800"
                    : isActive
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-white text-slate-700";

                return (
                  <button
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      isActive ? "ring-2 ring-teal-500 ring-offset-1" : "hover:bg-slate-100"
                    }`}
                    key={item.id}
                    onClick={() => selectQueueItem(item.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">
                          {index + 1}/{queue.length} {item.setName?.trim() ? item.setName : item.fileName}
                        </div>
                        <div className="csv-name-wrap mt-1 max-w-full text-xs text-muted">
                          {item.fileName}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {unsavedSampleOptions.length > 0 ? (
          <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
            <div className="text-sm font-semibold">Import sample set</div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-72 flex-1">
                <DropdownSelect
                  label="Sample full practice set"
                  onChange={setSelectedSampleId}
                  options={unsavedSampleOptions.map((sample) => ({
                    label: sample.name,
                    value: sample.id
                  }))}
                  value={selectedSampleId}
                />
              </div>
              <button
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!selectedSample || isLoadingSample || isSaving || isParsing}
                onClick={() => void handleLoadSample()}
                type="button"
              >
                {isLoadingSample ? "Loading..." : "Import Sample Set"}
              </button>
            </div>
            {selectedSample ? (
              <p className="mt-2 text-xs text-muted">{selectedSample.description}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 rounded-md border border-line bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Active import</div>
              <div className="mt-1 text-xs text-muted">
                {queue.length > 0
                  ? `${queue.findIndex((item) => item.id === activeItem?.id) + 1}/${queue.length} queued`
                  : "No CSV loaded yet"}
              </div>
              {currentFileName ? (
                <div className="mt-1 text-xs text-slate-500">Now validating: {currentFileName}</div>
              ) : null}
            </div>
            <button
              className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-200"
              disabled={queue.filter((item) => !item.saved).length === 0}
              onClick={selectNextUnsaved}
              type="button"
            >
              Next unsaved
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="text-sm font-medium">
              Question set name
              <input
                className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600"
                onBlur={() => setNameTouched(true)}
                onChange={(event) => updateActiveField("setName", event.target.value)}
                placeholder="June RW + Math Practice"
                value={currentSetName}
                disabled={!activeItem}
              />
              {nameError ? <div className="mt-2 text-xs text-red-700">{nameError}</div> : null}
            </label>
            <label className="text-sm font-medium">
              Description
              <input
                className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600"
                onChange={(event) => updateActiveField("description", event.target.value)}
                placeholder="Generated full-length practice set"
                value={currentDescription}
                disabled={!activeItem}
              />
            </label>
          </div>
        </div>
        {!canSave && saveReadinessMessage ? (
          <div className="mt-3 text-xs text-muted">{saveReadinessMessage}</div>
        ) : null}
        {currentParseError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {currentParseError}
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canSave}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? "Saving..." : "Save to SQLite"}
          </button>
          <button
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("sets")}
            type="button"
          >
            View Question Sets
          </button>
        </div>

        {currentSaveError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {currentSaveError}
          </div>
        ) : null}
      </section>

      <aside className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h3 className="text-base font-semibold">Validation</h3>
        {!currentSummary ? (
          <p className="mt-4 text-sm text-muted">Select CSV files to see validation results.</p>
        ) : (
          <div className="mt-4 space-y-5">
            <div
              className={`rounded-md border p-4 text-sm ${
                currentSummary.valid
                  ? "border-teal-100 bg-teal-50 text-teal-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {currentSummary.valid
                ? "CSV is valid and ready to save."
                : "CSV has errors that must be fixed before saving."}
            </div>

            <div className="space-y-2">
              <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-700">Detected package</span>
                  <span className="font-semibold text-ink">
                    {currentSummary.packageType ? getPackageTypeLabel(currentSummary.packageType) : "Unknown"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted">
                  <span>Rows</span>
                  <span>
                    {rowCount}
                    {expectedRowCount ? `/${expectedRowCount}` : ""}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-xs text-muted">
                  <span>Sections</span>
                  <span>RW {currentSummary.sectionCounts.RW} / Math {currentSummary.sectionCounts.MATH}</span>
                </div>
              </div>
              <div className="text-sm font-semibold">Module Counts</div>
              {orderedCounts.map(([label, actual, expected]) => (
                <div className="flex items-center justify-between text-sm" key={label}>
                  <span className="text-slate-600">{label}</span>
                  <span className={actual === expected ? "font-semibold" : "font-semibold text-red-700"}>
                    {actual}/{expected}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm" key="row-count">
                <span className="font-semibold text-slate-700">Package Rows</span>
                <span className={rowCount === expectedRowCount ? "font-semibold" : "font-semibold text-red-700"}>
                  {rowCount}/{expectedRowCount || "?"}
                </span>
              </div>
            </div>

            <ValidationSummaryList rows={visualTypeRows} title="Visual Types" />
            <ValidationSummaryList rows={contentDomainRows} title="Content Domains" />
            <ValidationSummaryList rows={skillGroupRows} title="Skill Groups" />

            <div>
              <div className="text-sm font-semibold">Issues</div>
              {currentSummary.issues.length === 0 ? (
                <div className="mt-2 text-sm text-muted">No issues found.</div>
              ) : (
                <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
                  {currentSummary.issues.map((issue, index) => (
                    <div
                      className={`rounded-md border px-3 py-2 text-xs ${
                        issue.level === "error"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                      key={`${issue.message}-${index}`}
                    >
                      {issue.row ? `Row ${issue.row}: ` : ""}
                      {issue.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function getSaveReadinessMessage({
  fileName,
  isParsing,
  name,
  summary
}: {
  fileName: string;
  isParsing: boolean;
  name: string;
  summary: ValidationSummary | null;
}): string | null {
  if (isParsing) return "Wait for CSV parsing to finish before saving.";
  if (!fileName) return "Choose a CSV file before saving.";
  if (!summary) return "CSV validation results are not available yet.";
  if (!summary.valid) return "Fix validation errors before saving.";
  if (!name.trim()) return "Enter a question set name before saving.";
  return null;
}

function createQueueItem({
  fileName,
  sourceFilename,
  summary,
  setName,
  description,
  parseError = null
}: {
  fileName: string;
  sourceFilename: string;
  summary: ValidationSummary | null;
  setName?: string;
  description: string;
  parseError?: string | null;
}): ImportQueueItem {
  return {
    id: `${sourceFilename}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    sourceFilename,
    setName: setName ?? fileName.replace(/\.csv$/i, ""),
    description,
    summary,
    parseError,
    saved: false,
    saveError: null
  };
}

function errorToMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== "null" ? serialized : fallback;
  } catch {
    return fallback;
  }
}

function toSummaryRows(counts: Record<string, number>): Array<[string, number]> {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function getExpectedCountRows(summary: ValidationSummary | null): Array<[string, number, number]> {
  const counts = summary?.counts ?? {};
  const packageType = summary?.packageType;
  const allRows: Array<[string, number, number, "RW" | "MATH"]> = [
    ["RW Module 1 base", counts["RW-1-base"] ?? 0, 27, "RW"],
    ["RW Module 2 hard", counts["RW-2-hard"] ?? 0, 27, "RW"],
    ["Math Module 1 base", counts["MATH-1-base"] ?? 0, 22, "MATH"],
    ["Math Module 2 hard", counts["MATH-2-hard"] ?? 0, 22, "MATH"]
  ];

  return allRows
    .filter(([, , , section]) => {
      if (packageType === "rw_section") return section === "RW";
      if (packageType === "math_section") return section === "MATH";
      return true;
    })
    .map(([label, actual, expected]): [string, number, number] => [label, actual, expected]);
}

function getExpectedRowCount(summary: ValidationSummary | null): number {
  if (summary?.packageType === "rw_section") return 54;
  if (summary?.packageType === "math_section") return 44;
  if (summary?.packageType === "full_test") return 98;
  return 0;
}

function requireFullTestSample(summary: ValidationSummary): ValidationSummary {
  if (summary.packageType === "full_test") {
    return summary;
  }

  const issue: ValidationIssue = {
    level: "error",
    message: "Bundled sample sets must be full practice sets with 98 questions."
  };

  return {
    ...summary,
    valid: false,
    issues: [...summary.issues, issue]
  };
}

function ValidationSummaryList({
  rows,
  title
}: {
  rows: Array<[string, number]>;
  title: string;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      {rows.length === 0 ? (
        <div className="mt-2 text-sm text-muted">No data found.</div>
      ) : (
        <div className="mt-2 max-h-36 space-y-1 overflow-auto rounded-md border border-line bg-slate-50 p-3">
          {rows.map(([label, count]) => (
            <div className="flex items-center justify-between gap-4 text-xs" key={label}>
              <span className="truncate text-slate-600">{label}</span>
              <span className="font-semibold text-ink">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
