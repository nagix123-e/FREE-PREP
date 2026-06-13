import type { BreakdownRow } from "../../types";

export function BreakdownTable({
  rows,
  title,
  labelHeader = "Category"
}: {
  rows: BreakdownRow[];
  title: string;
  labelHeader?: string;
}) {
  return (
    <section className="safe-table-card rounded-md border border-line bg-white shadow-panel">
      <div className="safe-table-card__header border-b border-line px-5 py-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">{labelHeader}</th>
            <th className="px-5 py-3">Correct</th>
            <th className="px-5 py-3">Total</th>
            <th className="px-5 py-3">Accuracy</th>
            <th className="px-5 py-3">Genre Score</th>
            <th className="px-5 py-3">Average Time</th>
            <th className="px-5 py-3">Strength</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-5 py-3 font-medium">{row.label}</td>
              <td className="px-5 py-3">{row.correct}</td>
              <td className="px-5 py-3">{row.total}</td>
              <td className="px-5 py-3">{row.accuracy}%</td>
              <td className="px-5 py-3">{row.genreScore}</td>
              <td className="px-5 py-3">{formatDuration(row.averageTimeSec)}</td>
              <td className="px-5 py-3">
                <span className={strengthClass(row.strength)}>{row.strength}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function strengthClass(strength: BreakdownRow["strength"]): string {
  const base = "rounded-md px-2 py-1 text-xs font-semibold";
  if (strength === "Strong") {
    return `${base} bg-teal-50 text-teal-700`;
  }
  if (strength === "Needs Review") {
    return `${base} bg-amber-50 text-amber-700`;
  }
  if (strength === "Weak") {
    return `${base} bg-red-50 text-red-700`;
  }
  return `${base} bg-slate-100 text-slate-600`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return "0s";
  }
  return `${seconds}s`;
}
