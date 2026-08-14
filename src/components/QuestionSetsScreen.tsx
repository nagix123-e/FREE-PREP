import { useEffect, useState } from "react";
import { getPackageTypeLabel } from "../lib/csvValidation";
import { combineSectionQuestionSets, deleteQuestionSet, listQuestionSets } from "../lib/database";
import { useAppStore } from "../store/appStore";
import { useSystemLanguage } from "../i18n";
import { DropdownSelect, type DropdownOption } from "./ui/DropdownSelect";
import type { QuestionSet } from "../types";

export function QuestionSetsScreen() {
  const { t } = useSystemLanguage();
  const { questionSets, setQuestionSets, navigate, setDbError, tutorial, setTutorialStep } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [deletingSetId, setDeletingSetId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [rwSetId, setRwSetId] = useState(0);
  const [mathSetId, setMathSetId] = useState(0);
  const [combineName, setCombineName] = useState("SAT_questions.(1)");
  const [combineError, setCombineError] = useState("");
  const [isCombining, setIsCombining] = useState(false);

  const rwSets = questionSets.filter((set) => set.packageType === "rw_section");
  const mathSets = questionSets.filter((set) => set.packageType === "math_section");
  const rwPackageOptions: DropdownOption[] = [
    { value: "0", label: "Select RW package" },
    ...rwSets.map((set) => ({ value: set.id.toString(), label: set.name }))
  ];
  const mathPackageOptions: DropdownOption[] = [
    { value: "0", label: "Select Math package" },
    ...mathSets.map((set) => ({ value: set.id.toString(), label: set.name }))
  ];
  const canCombine = rwSetId > 0 && mathSetId > 0 && combineName.trim() && !isCombining;

  useEffect(() => {
    setLoading(true);
    listQuestionSets()
      .then((sets) => {
        setQuestionSets(sets);
        setDbError(null);
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : "Could not load question sets.")
      )
      .finally(() => setLoading(false));
  }, [setDbError, setQuestionSets]);

  async function handleDelete(setId: number) {
    setDeletingSetId(setId);
    setDeleteError("");
    try {
      await deleteQuestionSet(setId);
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not delete question set.";
      setDeleteError(message);
      setDbError(message);
    } finally {
      setDeletingSetId(null);
    }
  }

  async function handleCombine() {
    if (!canCombine) {
      setCombineError("Select one RW Section package, one Math Section package, and a combined set name.");
      return;
    }

    setIsCombining(true);
    setCombineError("");
    try {
      const saved = await combineSectionQuestionSets({
        rwSetId,
        mathSetId,
        name: combineName.trim(),
        description: "Combined RW and Math section packages."
      });
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
      navigate("preview", saved.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not combine section packages.";
      setCombineError(message);
      setDbError(message);
    } finally {
      setIsCombining(false);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{t("savedQuestionSets")}</h2>
          <p className="mt-1 text-sm text-muted">{t("importedLocally")}</p>
        </div>
      </div>

      <div className="border-b border-line px-6 py-5">
        <h3 className="text-sm font-semibold text-ink">Combine Section Packages</h3>
        <p className="mt-1 text-xs text-muted">
          Select one RW Section Package and one Math Section Package to create a new Full Test Package.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="min-w-0">
            <DropdownSelect
              label="RW Package"
              onChange={(value) => setRwSetId(Number(value))}
              options={rwPackageOptions}
              value={rwSetId.toString()}
            />
          </div>
          <div className="min-w-0">
            <DropdownSelect
              label="Math Package"
              onChange={(value) => setMathSetId(Number(value))}
              options={mathPackageOptions}
              value={mathSetId.toString()}
            />
          </div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Combined Name
            <input
              className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm normal-case text-ink"
              onChange={(event) => setCombineName(event.target.value)}
              value={combineName}
            />
          </label>
          <div className="flex items-end">
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canCombine}
              onClick={() => void handleCombine()}
              type="button"
            >
              {isCombining ? "Combining..." : "Combine"}
            </button>
          </div>
        </div>
        {combineError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {combineError}
          </div>
        ) : null}
      </div>

      {loading ? <div className="p-6 text-sm text-muted">{t("loading")}</div> : null}
      {deleteError ? (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {deleteError}
        </div>
      ) : null}

      {!loading && questionSets.length === 0 ? (
        <div className="p-10 text-center">
          <h3 className="text-base font-semibold">{t("noQuestionSets")}</h3>
          <p className="mt-2 text-sm text-muted">{t("importToBegin")}</p>
        </div>
      ) : null}

      {questionSets.length > 0 ? (
        <div className="question-sets-table text-left text-sm">
          <div className="question-sets-grid bg-slate-50 px-6 py-3 text-xs font-semibold uppercase text-slate-500">
            <div>{t("name")}</div>
            <div>{t("imported")}</div>
            <div>{t("type")}</div>
            <div>{t("questions")}</div>
            <div>{t("status")}</div>
            <div aria-hidden="true" />
          </div>
          <div className="divide-y divide-line">
            {questionSets.map((set) => {
              const isTutorialSet = tutorial.active && tutorial.importedSetId === set.id;
              return (
              <div
                className={`question-sets-grid px-6 py-4 hover:bg-slate-50 ${isTutorialSet ? "tutorial-highlight" : ""}`}
                key={set.id}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <div className="csv-name-wrap font-semibold text-ink">{set.name}</div>
                    {set.hasAttempts ? (
                      <span className="shrink-0 text-xs font-semibold text-blue-700">{t("done")}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted">{set.description || "No description"}</div>
                </div>
                <div className="text-slate-600">{formatDate(set.importedAt)}</div>
                <div className="text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {getPackageTypeLabel(set.packageType)}
                  </span>
                  <div className="mt-1 text-xs text-muted">
                    RW {set.sectionCounts.RW} / Math {set.sectionCounts.MATH}
                  </div>
                </div>
                <div className="text-slate-600">{set.totalQuestions}</div>
                <div className="whitespace-nowrap">
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                    {set.status}
                  </span>
                </div>
                <div className="text-right">
                  <div className="question-set-actions flex justify-end gap-3 whitespace-nowrap">
                    <button
                      className="min-w-0 rounded-md border border-line px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                      onClick={() => navigate("preview", set.id)}
                      type="button"
                    >
                      Preview
                    </button>
                    <button
                      className="delete-gradient-button min-w-0 rounded-md px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingSetId === set.id}
                      onClick={() => void handleDelete(set.id)}
                      type="button"
                    >
                      {deletingSetId === set.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      className={`min-w-0 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600 ${
                        isTutorialSet ? "tutorial-active-target tutorial-target-ring" : ""
                      }`}
                      onClick={() => {
                        if (isTutorialSet) {
                          setTutorialStep(set.packageType === "full_test" ? "test_overview_continue" : "setup_start");
                        }
                        navigate(set.packageType === "full_test" ? "testOverview" : "setup", set.id);
                      }}
                      type="button"
                    >
                      {getStartButtonLabel(set.packageType)}
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getStartButtonLabel(packageType: QuestionSet["packageType"]): string {
  if (packageType === "rw_section") return "Start RW";
  if (packageType === "math_section") return "Start Math";
  if (packageType.startsWith("rw_module")) return "Start RW Module";
  if (packageType.startsWith("math_module")) return "Start Math Module";
  return "Start Test";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
