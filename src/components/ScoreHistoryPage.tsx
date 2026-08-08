import { useEffect, useState } from "react";
import { deleteAttempt, listAttemptHistory } from "../services/attemptService";
import { useAppStore } from "../store/appStore";
import type { AttemptSummary } from "../types";

export function ScoreHistoryPage() {
  const { navigate, setDbError, setReviewFilterPreset, tutorial, setTutorialStep, exitTutorial } = useAppStore();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (!tutorial.active || tutorial.step !== "score_history_delete" || loading || !tutorial.scoreHistoryId) return;
    if (tutorial.scoreHistoryId && !attempts.some((attempt) => attempt.id === tutorial.scoreHistoryId)) {
      setTutorialStep("done");
      window.setTimeout(() => exitTutorial(), 900);
    }
  }, [attempts, exitTutorial, loading, setTutorialStep, tutorial.active, tutorial.scoreHistoryId, tutorial.step]);

  async function loadHistory() {
    setLoading(true);
    try {
      setAttempts(await listAttemptHistory());
      setDbError(null);
    } catch (error: unknown) {
      setDbError(error instanceof Error ? error.message : "Could not load score history.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(attemptId: number) {
    await deleteAttempt(attemptId);
    await loadHistory();
    if (tutorial.active && tutorial.scoreHistoryId === attemptId) {
      setTutorialStep("done");
      window.setTimeout(() => exitTutorial(), 900);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-panel">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold">Score History</h2>
        <p className="mt-1 text-sm text-muted">Completed and in-progress practice attempts stored locally.</p>
      </div>

      {loading ? <div className="p-6 text-sm text-muted">Loading...</div> : null}

      {!loading && attempts.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">No attempts yet.</div>
      ) : null}

      {attempts.length > 0 ? (
        <div className="score-history-table-wrap">
          <table className="score-history-table w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="score-history-col-date" />
              <col className="score-history-col-set" />
              <col className="score-history-col-mode" />
              <col className="score-history-col-score" />
              <col className="score-history-col-score" />
              <col className="score-history-col-score" />
              <col className="score-history-col-small" />
              <col className="score-history-col-small" />
              <col className="score-history-col-status" />
              <col className="score-history-col-actions" />
            </colgroup>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Question Set</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Total Score</th>
                <th className="px-5 py-3">RW Score</th>
                <th className="px-5 py-3">Math Score</th>
                <th className="px-5 py-3">Accuracy</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {attempts.map((attempt) => {
                const isTutorialAttempt = tutorial.active && tutorial.scoreHistoryId === attempt.id;
                return (
                <tr className={isTutorialAttempt ? "tutorial-highlight" : ""} key={attempt.id}>
                  <td className="px-5 py-3">{formatDate(attempt.completedAt ?? attempt.startedAt)}</td>
                  <td className="csv-name-cell px-5 py-3 font-medium">
                    <span className="csv-name-wrap">{attempt.questionSetName}</span>
                  </td>
                  <td className="score-history-breakable px-5 py-3">{formatAttemptMode(attempt.mode)}</td>
                  <td className="px-5 py-3">{shouldHideSatScores(attempt) ? "-" : attempt.practiceScore ?? "-"}</td>
                  <td className="px-5 py-3">{shouldHideSatScores(attempt) ? "-" : attempt.rwScore ?? "-"}</td>
                  <td className="px-5 py-3">{shouldHideSatScores(attempt) ? "-" : attempt.mathScore ?? "-"}</td>
                  <td className="px-5 py-3">{attempt.accuracy}%</td>
                  <td className="px-5 py-3">{formatDuration(attempt.durationSec)}</td>
                  <td className="score-history-breakable px-5 py-3">
                    {attempt.archived ? "score only" : attempt.status}
                  </td>
                  <td className="px-4 py-3">
                    <div className="score-history-actions">
                      {!attempt.archived ? (
                        <>
                          <button
                            className="score-history-action-button rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                            onClick={() => navigate("result", attempt.questionSetId, attempt.id)}
                            type="button"
                          >
                            Open Result
                          </button>
                          <button
                            className="score-history-action-button rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                            onClick={() => {
                              setReviewFilterPreset("incorrect");
                              navigate("reviewAnswers", attempt.questionSetId, attempt.id);
                            }}
                            type="button"
                          >
                            Review Mistakes
                          </button>
                        </>
                      ) : (
                        <span className="score-history-action-note">Details removed</span>
                      )}
                      <button
                        className={`delete-gradient-button score-history-action-button rounded-md px-3 py-2 text-xs font-semibold text-white ${
                          isTutorialAttempt ? "tutorial-target-ring" : ""
                        }`}
                        onClick={() => void handleDelete(attempt.id)}
                        type="button"
                      >
                        Delete Attempt
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatAttemptMode(mode: AttemptSummary["mode"]): string {
  if (mode === "domain_practice") return "Practice: Domain";
  if (mode === "mistake_practice") return "Practice: Mistakes";
  if (mode === "review_list_practice") return "Practice: Review List";
  if (mode === "spaced_review") return "Spaced Review";
  if (mode === "full_hard_rw_practice") return "RW Practice Test";
  if (mode === "full_hard_math_practice") return "Math Practice Test";
  return "Full Hard Practice Test";
}

function shouldHideSatScores(attempt: AttemptSummary): boolean {
  return attempt.mode === "domain_practice" || attempt.mode === "spaced_review";
}
