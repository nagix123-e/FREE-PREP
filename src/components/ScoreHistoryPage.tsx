import { useEffect, useState } from "react";
import { deleteAttempt, listAttemptHistory } from "../services/attemptService";
import { useAppStore } from "../store/appStore";
import type { AttemptSummary } from "../types";

export function ScoreHistoryPage() {
  const { navigate, setDbError, setReviewFilterPreset } = useAppStore();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadHistory();
  }, []);

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
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="w-56 px-5 py-3">Question Set</th>
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
            {attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td className="px-5 py-3">{formatDate(attempt.completedAt ?? attempt.startedAt)}</td>
                <td className="csv-name-cell px-5 py-3 font-medium">
                  <span className="csv-name-wrap">{attempt.questionSetName}</span>
                </td>
                <td className="px-5 py-3">{attempt.mode}</td>
                <td className="px-5 py-3">{attempt.practiceScore ?? "-"}</td>
                <td className="px-5 py-3">{attempt.rwScore ?? "-"}</td>
                <td className="px-5 py-3">{attempt.mathScore ?? "-"}</td>
                <td className="px-5 py-3">{attempt.accuracy}%</td>
                <td className="px-5 py-3">{formatDuration(attempt.durationSec)}</td>
                <td className="px-5 py-3">{attempt.status}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => navigate("result", attempt.questionSetId, attempt.id)}
                      type="button"
                    >
                      Open Result
                    </button>
                    <button
                      className="rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        setReviewFilterPreset("incorrect");
                        navigate("reviewAnswers", attempt.questionSetId, attempt.id);
                      }}
                      type="button"
                    >
                      Review Mistakes
                    </button>
                    <button
                      className="delete-gradient-button rounded-md px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => void handleDelete(attempt.id)}
                      type="button"
                    >
                      Delete Attempt
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
