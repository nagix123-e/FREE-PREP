import { useEffect, useState } from "react";
import { getScoreResult } from "../services/scoringService";
import { useAppStore } from "../store/appStore";
import type { ScoreResult } from "../types";
import { BreakdownTable } from "./result/BreakdownTable";
import { ScoreSummaryCard } from "./result/ScoreSummaryCard";

export function ResultPage() {
  const {
    selectedAttemptId,
    navigate,
    selectedSetId,
    setDbError,
    setReviewFilterPreset,
    tutorial,
    recordTutorialHistory
  } = useAppStore();
  const [result, setResult] = useState<ScoreResult | null>(null);

  useEffect(() => {
    if (!selectedAttemptId) {
      return;
    }
    getScoreResult(selectedAttemptId)
      .then((nextResult) => {
        setResult(nextResult);
        setDbError(null);
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : "Could not load result.")
      );
  }, [selectedAttemptId, setDbError]);

  useEffect(() => {
    if (
      tutorial.active &&
      selectedAttemptId &&
      tutorial.practiceSessionId === selectedAttemptId &&
      tutorial.step === "score_history_delete"
    ) {
      recordTutorialHistory(selectedAttemptId);
    }
  }, [recordTutorialHistory, selectedAttemptId, tutorial.active, tutorial.practiceSessionId, tutorial.step]);

  if (!selectedAttemptId) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">No result selected</h2>
        <button className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate("history")} type="button">
          Open Score History
        </button>
      </section>
    );
  }

  if (!result) {
    return <div className="text-sm text-muted">Loading result...</div>;
  }

  const domainPracticeSummary =
    result.attemptMode === "domain_practice" ? buildDomainPracticeSummary(result) : null;
  const focusedPracticeSummary =
    result.attemptMode === "mistake_practice"
      ? buildFocusedPracticeSummary(result, "Mistake Practice Score")
      : result.attemptMode === "review_list_practice"
        ? buildFocusedPracticeSummary(result, "Review List Practice Score")
        : result.attemptMode === "spaced_review"
          ? buildFocusedPracticeSummary(result, "Spaced Review Score")
          : null;
  const practiceSummary = domainPracticeSummary ?? focusedPracticeSummary;
  const hasTotalScore = result.totalScore !== null;
  const hasRwScore = result.rwScore !== null;
  const hasMathScore = result.mathScore !== null;
  const scoreTitle = practiceSummary
    ? practiceSummary.label
    : hasTotalScore
    ? "Total Practice Score"
    : hasRwScore
      ? "RW Practice Score"
      : "Math Practice Score";
  const isSubmitted = result.attemptStatus === "completed";

  return (
    <div className="space-y-6">
      {!isSubmitted ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">This attempt has not been submitted yet.</div>
              <p className="mt-1">
                The score shown here is a preview based on saved answers. Continue the test and submit it to save the final score.
              </p>
            </div>
            <button
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              onClick={() => navigate("test", selectedSetId ?? undefined, selectedAttemptId)}
              type="button"
            >
              Continue Previous Test
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{scoreTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Scores are estimates for practice only. They are not official SAT scores.
              {practiceSummary
                ? " This practice score is estimated from the questions in this session."
                : !hasTotalScore
                ? " Complete the other section later to combine this with an estimated full practice score."
                : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setReviewFilterPreset("incorrect");
                navigate("reviewAnswers", selectedSetId ?? undefined, selectedAttemptId);
              }}
              type="button"
            >
              Incorrect Questions Only
            </button>
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
              onClick={() => {
                setReviewFilterPreset(null);
                navigate("reviewAnswers", selectedSetId ?? undefined, selectedAttemptId);
              }}
              type="button"
            >
              Review Answers
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {practiceSummary ? (
            <ScoreSummaryCard
              label={practiceSummary.label}
              range={practiceSummary.range}
              score={practiceSummary.scoreText}
            />
          ) : null}
          {!practiceSummary && hasTotalScore ? (
            <ScoreSummaryCard label="Total Practice Score" range="400-1600" score={result.totalScore} />
          ) : null}
          {!practiceSummary && hasRwScore ? (
            <ScoreSummaryCard label="RW Practice Score" range="200-800" score={result.rwScore} />
          ) : null}
          {!practiceSummary && hasMathScore ? (
            <ScoreSummaryCard label="Math Practice Score" range="200-800" score={result.mathScore} />
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-6 gap-3 text-sm">
          <Metric label="Accuracy" value={`${result.accuracy}%`} />
          <Metric label="Correct" value={result.correct.toString()} />
          <Metric label="Incorrect" value={result.incorrect.toString()} />
          <Metric label="Unanswered" value={result.unanswered.toString()} />
          <Metric label="Marked" value={result.marked.toString()} />
          <Metric label="Time Spent" value={formatDuration(result.timeSpentSec)} />
        </div>
      </section>

      <BreakdownTable labelHeader="Module" rows={result.moduleBreakdown} title="Module Breakdown" />
      <BreakdownTable labelHeader="Domain" rows={result.domainBreakdown} title="Content Domain Breakdown" />
      <BreakdownTable labelHeader="Skill Group" rows={result.skillBreakdown} title="Skill Breakdown" />
      <BreakdownTable labelHeader="Question Topic" rows={result.topicBreakdown} title="Question Topic Breakdown" />
      <BreakdownTable labelHeader="Visual Type" rows={result.visualBreakdown} title="Visual Type Breakdown" />
    </div>
  );
}

function buildDomainPracticeSummary(result: ScoreResult): {
  label: string;
  scoreText: string;
  range: string;
} {
  const domainName =
    result.gradedQuestions.find((item) => (item.question.contentDomain || item.question.domain).trim())
      ?.question.contentDomain ||
    result.gradedQuestions.find((item) => item.question.domain.trim())?.question.domain ||
    "Domain";
  const weightedCorrect = result.gradedQuestions.reduce(
    (sum, item) => sum + (item.isCorrect ? item.weight : 0),
    0
  );
  const weightedTotal = result.gradedQuestions.reduce((sum, item) => sum + item.weight, 0);
  const score = formatPracticePoints(weightedCorrect);
  const maxScore = formatPracticePoints(weightedTotal);

  return {
    label: `${domainName} Practice Score`,
    scoreText: `${score} / ${maxScore}`,
    range: `Estimated max from ${result.gradedQuestions.length} questions`
  };
}

function buildFocusedPracticeSummary(
  result: ScoreResult,
  label: string
): {
  label: string;
  scoreText: string;
  range: string;
} {
  const weightedCorrect = result.gradedQuestions.reduce(
    (sum, item) => sum + (item.isCorrect ? item.weight : 0),
    0
  );
  const weightedTotal = result.gradedQuestions.reduce((sum, item) => sum + item.weight, 0);

  return {
    label,
    scoreText: `${formatPracticePoints(weightedCorrect)} / ${formatPracticePoints(weightedTotal)}`,
    range: `Estimated max from ${result.gradedQuestions.length} questions`
  };
}

function formatPracticePoints(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, "");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}
