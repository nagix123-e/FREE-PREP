import { useEffect, useState } from "react";
import { getScoreResult } from "../services/scoringService";
import { useAppStore } from "../store/appStore";
import type { ScoreResult } from "../types";
import { BreakdownTable } from "./result/BreakdownTable";
import { ScoreSummaryCard } from "./result/ScoreSummaryCard";

export function ResultPage() {
  const { selectedAttemptId, navigate, selectedSetId, setDbError, setReviewFilterPreset } = useAppStore();
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

  const hasTotalScore = result.totalScore !== null;
  const hasRwScore = result.rwScore !== null;
  const hasMathScore = result.mathScore !== null;
  const scoreTitle = hasTotalScore
    ? "Total Practice Score"
    : hasRwScore
      ? "RW Practice Score"
      : "Math Practice Score";

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{scoreTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Scores are estimates for practice only. They are not official SAT scores.
              {!hasTotalScore
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
          {hasTotalScore ? (
            <ScoreSummaryCard label="Total Practice Score" range="400-1600" score={result.totalScore} />
          ) : null}
          {hasRwScore ? (
            <ScoreSummaryCard label="RW Practice Score" range="200-800" score={result.rwScore} />
          ) : null}
          {hasMathScore ? (
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
