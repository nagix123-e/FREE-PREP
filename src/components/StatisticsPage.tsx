import { useEffect, useState } from "react";
import { getStatisticsSummary, type StatisticsSummary } from "../services/statisticsService";
import { BreakdownTable } from "./result/BreakdownTable";

export function StatisticsPage() {
  const [summary, setSummary] = useState<StatisticsSummary | null>(null);

  useEffect(() => {
    getStatisticsSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return <div className="text-sm text-muted">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-5 gap-4">
        <Metric label="Accuracy" value={`${summary.accuracy}%`} />
        <Metric label="Average Time" value={`${summary.averageTimeSec}s`} />
        <Metric label="Fastest Correct" value={`${summary.fastestCorrectSec}s`} />
        <Metric label="Slowest Correct" value={`${summary.slowestCorrectSec}s`} />
        <Metric label="Marked Frequency" value={`${summary.markedFrequency}%`} />
      </section>
      <BreakdownTable rows={summary.mostMissedDomains} title="Most Missed Domains" />
      <BreakdownTable rows={summary.mostMissedSkills} title="Most Missed Skills" />
      <BreakdownTable rows={summary.mostMissedTopics} title="Most Missed Topics" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="safe-card-padding rounded-md border border-line bg-white p-5 shadow-panel">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</div>
    </div>
  );
}
