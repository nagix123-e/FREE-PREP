import { useEffect, useMemo, useState } from "react";
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

export function ImportScreen() {
  const { navigate, questionSets, setQuestionSets, setDbError } = useAppStore();
  const [fileName, setFileName] = useState("");
  const [sourceFilename, setSourceFilename] = useState("");
  const [setName, setSetName] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [sampleOptions, setSampleOptions] = useState<SampleSetOption[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const nameError = nameTouched && !setName.trim() ? "Question set name is required." : null;
  const saveReadinessMessage = getSaveReadinessMessage({
    fileName,
    isParsing,
    name: setName,
    summary
  });
  const canSave = Boolean(summary?.valid && setName.trim() && !isSaving && !isParsing);
  const orderedCounts = useMemo(
    () => getExpectedCountRows(summary),
    [summary]
  );
  const visualTypeRows = useMemo(
    () => toSummaryRows(summary?.visualTypeCounts ?? {}),
    [summary]
  );
  const contentDomainRows = useMemo(
    () => toSummaryRows(summary?.contentDomainCounts ?? {}),
    [summary]
  );
  const skillGroupRows = useMemo(
    () => toSummaryRows(summary?.skillGroupCounts ?? {}),
    [summary]
  );
  const expectedRowCount = getExpectedRowCount(summary);
  const rowCount = summary?.rowCount ?? 0;
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

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    setIsParsing(true);
    setFileName(file.name);
    setSourceFilename(file.name);
    setSetName(file.name.replace(/\.csv$/i, ""));
    setNameTouched(false);
    setSummary(null);
    setSaveError(null);
    setFileError(null);

    try {
      const result = await parseCsvFile(file);
      setSummary(result);
    } catch (error: unknown) {
      setFileError(errorToMessage(error, "Could not parse CSV file."));
      setSummary(null);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleLoadSample() {
    if (!selectedSample) {
      return;
    }

    setIsLoadingSample(true);
    setIsParsing(true);
    setFileName(selectedSample.filename);
    setSourceFilename(selectedSample.sourceFilename);
    setSetName(selectedSample.name);
    setDescription(selectedSample.description);
    setNameTouched(false);
    setSummary(null);
    setSaveError(null);
    setFileError(null);

    try {
      const csvText = await loadSampleCsv(selectedSample);
      setSummary(requireFullTestSample(parseCsvText(csvText)));
    } catch (error: unknown) {
      setFileError(errorToMessage(error, "Could not load sample set."));
      setSummary(null);
    } finally {
      setIsParsing(false);
      setIsLoadingSample(false);
    }
  }

  async function handleSave() {
    setNameTouched(true);
    if (!summary || !canSave) {
      setSaveError(saveReadinessMessage ?? "Question set is not ready to save.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await saveQuestionSet({
        name: setName.trim(),
        description: description.trim(),
        questions: summary.questions,
        status: summary.issues.some((issue) => issue.level === "warning") ? "warning" : "valid",
        packageType: summary.packageType ?? undefined,
        sourceFilename: sourceFilename || fileName,
        rowCount: summary.rowCount,
        sectionCounts: summary.sectionCounts
      });
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
      navigate("preview", saved.id);
    } catch (error: unknown) {
      const message = errorToMessage(error, "Could not save question set.");
      setSaveError(message);
      setDbError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="import-layout-grid grid gap-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Import a SAT-format CSV</h2>
        <p className="mt-2 text-sm text-slate-600">
          The importer checks headers, route rules, question types, duplicate IDs, and the required
          full-test, RW-only, or Math-only counts.
        </p>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-teal-600 hover:bg-teal-50">
          <span className="csv-name-wrap max-w-full text-sm font-semibold text-ink">
            {fileName ? fileName : "Choose CSV file"}
          </span>
          <span className="mt-2 text-xs text-muted">Parsed locally with Papa Parse</span>
          <input
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        {!fileName ? (
          <div className="mt-2 text-xs text-muted">A SAT-format CSV file is required.</div>
        ) : null}
        {fileError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {fileError}
          </div>
        ) : null}

        {isParsing ? <div className="mt-4 text-sm text-muted">Parsing CSV...</div> : null}

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

        <div className="mt-6 grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Question set name
            <input
              className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600"
              onChange={(event) => setSetName(event.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="June RW + Math Practice"
              value={setName}
            />
            {nameError ? <div className="mt-2 text-xs text-red-700">{nameError}</div> : null}
          </label>
          <label className="text-sm font-medium">
            Description
            <input
              className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Generated full-length practice set"
              value={description}
            />
          </label>
        </div>
        {!canSave && saveReadinessMessage ? (
          <div className="mt-3 text-xs text-muted">{saveReadinessMessage}</div>
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

        {saveError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {saveError}
          </div>
        ) : null}
      </section>

      <aside className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h3 className="text-base font-semibold">Validation</h3>
        {!summary ? (
          <p className="mt-4 text-sm text-muted">Select a CSV file to see validation results.</p>
        ) : (
          <div className="mt-4 space-y-5">
            <div
              className={`rounded-md border p-4 text-sm ${
                summary.valid
                  ? "border-teal-100 bg-teal-50 text-teal-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {summary.valid
                ? "CSV is valid and ready to save."
                : "CSV has errors that must be fixed before saving."}
            </div>

            <div className="space-y-2">
              <div className="rounded-md border border-line bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-700">Detected package</span>
                  <span className="font-semibold text-ink">
                    {summary.packageType ? getPackageTypeLabel(summary.packageType) : "Unknown"}
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
                  <span>RW {summary.sectionCounts.RW} / Math {summary.sectionCounts.MATH}</span>
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
              {summary.issues.length === 0 ? (
                <div className="mt-2 text-sm text-muted">No issues found.</div>
              ) : (
                <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
                  {summary.issues.map((issue, index) => (
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
