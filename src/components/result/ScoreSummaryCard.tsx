export function ScoreSummaryCard({
  label,
  score,
  range
}: {
  label: string;
  score: number;
  range: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-panel">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-3 text-4xl font-semibold text-ink">{score}</div>
      <div className="mt-1 text-xs text-muted">{range}</div>
    </div>
  );
}
