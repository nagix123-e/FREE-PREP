import { useEffect, useState } from "react";
import { getQuestionSet } from "../lib/database";
import { getModuleIndexesForCourse, TEST_MODULES } from "../lib/testPlan";
import { useAppStore } from "../store/appStore";
import { useTestSessionStore } from "../store/testSessionStore";
import type { PracticeTestCourse, QuestionSet } from "../types";

export function TestSetupPage() {
  const { selectedSetId, navigate, setDbError, tutorial, recordTutorialPractice } = useAppStore();
  const { error, loading, startAttempt } = useTestSessionStore();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const displayedModuleIndexes = getDisplayedModuleIndexes(set);

  useEffect(() => {
    if (!selectedSetId) {
      return;
    }
    getQuestionSet(selectedSetId)
      .then((nextSet) => setSet(nextSet))
      .catch((loadError: unknown) =>
        setDbError(loadError instanceof Error ? loadError.message : "Could not load test setup.")
      );
  }, [selectedSetId, setDbError]);

  async function handleStart(course: PracticeTestCourse) {
    if (!selectedSetId) {
      return;
    }
    if (set?.packageType !== "full_test" && course === "all") {
      setDbError("Combine this section package with a matching section before starting a full test.");
      return;
    }
    if (set?.packageType === "rw_section" && course === "math") {
      setDbError("This package only contains RW questions.");
      return;
    }
    if (set?.packageType === "math_section" && course === "rw") {
      setDbError("This package only contains Math questions.");
      return;
    }
    try {
      const attempt = await startAttempt(selectedSetId, course);
      if (
        tutorial.active &&
        tutorial.importedSetId === selectedSetId &&
        course === "rw"
      ) {
        recordTutorialPractice(attempt.id);
      }
      setDbError(null);
      navigate("test", selectedSetId, attempt.id);
    } catch (startError: unknown) {
      setDbError(formatError(startError, "Could not start practice test."));
    }
  }

  if (!selectedSetId) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Choose a question set first</h2>
        <button
          className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate("sets")}
          type="button"
        >
          Open Question Sets
        </button>
      </section>
    );
  }

  return (
    <div className="test-setup-grid grid gap-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-2xl font-semibold">{getSetupTitle(set)}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {getSetupDescription(set)}
        </p>

        <div className="mt-6 rounded-md border border-line bg-slate-50 p-4">
          <div className="csv-name-wrap text-sm font-semibold">{set?.name ?? "Selected Question Set"}</div>
          <div className="mt-1 text-sm text-muted">
            {set?.totalQuestions ?? 98} questions
            {set?.packageType === "rw_section" ? " · RW Section Package" : ""}
            {set?.packageType === "math_section" ? " · Math Section Package" : ""}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:w-80">
          {set?.packageType === "full_test" ? (
            <PracticeStartButton
              disabled={loading}
              label={loading ? "Starting..." : "Start Full Hard Practice Test"}
              onClick={() => void handleStart("all")}
            />
          ) : null}
          {set?.packageType !== "math_section" ? (
            <PracticeStartButton
              className={
                tutorial.active &&
                (tutorial.step === "question_sets" || tutorial.step === "setup_start") &&
                tutorial.importedSetId === selectedSetId
                  ? "tutorial-active-target tutorial-target-ring"
                  : ""
              }
              disabled={loading}
              label="Start RW Only Full Hard Practice Test"
              onClick={() => void handleStart("rw")}
            />
          ) : null}
          {set?.packageType !== "rw_section" ? (
            <PracticeStartButton
              disabled={loading}
              label="Start Math Only Full Hard Practice Test"
              onClick={() => void handleStart("math")}
            />
          ) : null}
        </div>
      </section>

      <aside className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h3 className="text-base font-semibold">Test Modules</h3>
        <div className="mt-4 space-y-3">
          {displayedModuleIndexes.map((moduleIndex, index) => {
            const module = TEST_MODULES[moduleIndex];
            return (
              <div className="rounded-md border border-line bg-slate-50 p-3" key={module.key}>
                <div className="text-sm font-semibold">
                  {index + 1}. {module.title}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {module.questionCount} questions · {module.minutes} minutes · route={module.route}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function getDisplayedModuleIndexes(set: QuestionSet | null): number[] {
  if (set?.packageType === "rw_section") return getModuleIndexesForCourse("rw");
  if (set?.packageType === "math_section") return getModuleIndexesForCourse("math");
  return getModuleIndexesForCourse("all");
}

function getSetupTitle(set: QuestionSet | null): string {
  if (set?.packageType === "rw_section") return "RW Only Practice Test";
  if (set?.packageType === "math_section") return "Math Only Practice Test";
  return "Full Hard Practice Test";
}

function getSetupDescription(set: QuestionSet | null): string {
  if (set?.packageType === "rw_section") {
    return "This practice session uses RW Module 1 base and RW Module 2 hard from this RW section package.";
  }
  if (set?.packageType === "math_section") {
    return "This practice session uses Math Module 1 base and Math Module 2 hard from this Math section package.";
  }
  return "This practice test uses the fixed sequence RW Module 1 base, RW Module 2 hard, Math Module 1 base, and Math Module 2 hard. It does not use adaptive branching.";
}

function PracticeStartButton({
  className = "",
  disabled,
  label,
  onClick
}: {
  className?: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-11 w-full rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}
