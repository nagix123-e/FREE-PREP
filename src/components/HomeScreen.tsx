import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getDashboardSummary } from "../services/dashboardService";
import type { DashboardSummary } from "../types";
import { useAppStore } from "../store/appStore";

export function HomeScreen() {
  const { questionSets, navigate } = useAppStore();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const totalQuestions = questionSets.reduce((sum, set) => sum + set.totalQuestions, 0);
  const resumableAttempt = useMemo(
    () => dashboard?.recentScores.find((attempt) => attempt.status === "paused" || attempt.status === "in_progress"),
    [dashboard]
  );

  useEffect(() => {
    getDashboardSummary()
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, []);

  return (
    <div className="space-y-7">
      <section className="home-overview-grid grid gap-6">
        <div className="safe-card-padding-lg rounded-md border border-line bg-white p-7 shadow-panel">
          <h2 className="text-2xl font-semibold tracking-tight">Build a local SAT practice library.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Import GPT-generated SAT-style CSV files, validate full, RW-only, or Math-only packages,
            and keep saved question sets on this device for future practice sessions.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {resumableAttempt ? (
              <button
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                onClick={() =>
                  navigate("test", resumableAttempt.questionSetId, resumableAttempt.id)
                }
                type="button"
              >
                Continue Previous Test
              </button>
            ) : null}
            <button
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => navigate("sets")}
              type="button"
            >
              View Sets
            </button>
          </div>
        </div>

        <div className="safe-card-padding-lg rounded-md border border-line bg-white p-7 shadow-panel">
          <h3 className="text-sm font-semibold uppercase text-slate-500">Library Status</h3>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Metric label="Question Sets" value={questionSets.length.toString()} />
            <Metric label="Questions" value={totalQuestions.toString()} />
            <Metric label="Review List" value={(dashboard?.reviewListCount ?? 0).toString()} />
            <Metric label="Best Score" value={(dashboard?.bestPracticeScore ?? 0).toString()} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-5">
        <DashboardPanel title="Recent Scores">
          {(dashboard?.recentScores ?? []).slice(0, 3).map((attempt) => (
            <button
              className="flex w-full items-center justify-between gap-4 rounded-md border border-line bg-slate-50 p-4 text-left text-sm"
              key={attempt.id}
              onClick={() => navigate("result", attempt.questionSetId, attempt.id)}
              type="button"
            >
              <span className="csv-name-wrap min-w-0">{attempt.questionSetName}</span>
              <span className="font-semibold">{attempt.practiceScore ?? "-"}</span>
            </button>
          ))}
        </DashboardPanel>
        <DashboardPanel title="Weak Areas">
          {(dashboard?.weakAreas ?? []).slice(0, 4).map((area) => (
            <div className="rounded-md border border-red-100 bg-red-50 p-4 text-sm" key={area.label}>
              <div className="font-semibold text-red-800">{area.label}</div>
              <div className="mt-1 text-xs text-red-700">Genre Score {area.genreScore}</div>
            </div>
          ))}
        </DashboardPanel>
        <DashboardPanel title="Upcoming Goals">
          {["Complete one timed module", "Review missed questions", "Practice one weak area"].map((item) => (
            <div className="rounded-md border border-line bg-slate-50 p-4" key={item}>
              <div className="font-semibold text-ink">{item}</div>
              <div className="mt-1 text-xs text-muted">Suggested next step</div>
            </div>
          ))}
        </DashboardPanel>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="safe-tile-padding rounded-md bg-slate-50 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

function DashboardPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="safe-card-padding rounded-md border border-line bg-white p-6 shadow-panel">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
