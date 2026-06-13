import type { CategoryTrendPoint } from "../../services/trendService";

export function CategoryTrendChart({ points, title }: { points: CategoryTrendPoint[]; title: string }) {
  const categories = [...new Set(points.map((point) => point.category))].slice(0, 8);

  return (
    <section className="safe-card-padding rounded-md border border-line bg-white p-5 shadow-panel">
      <h3 className="font-semibold">{title}</h3>
      {points.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No trend data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {categories.map((category) => {
            const categoryPoints = points.filter((point) => point.category === category);
            const latest = categoryPoints[categoryPoints.length - 1]?.score ?? 0;
            return (
              <div key={category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{category}</span>
                  <span className="font-semibold">{latest}</span>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-teal-600" style={{ width: `${latest}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
