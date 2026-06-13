import { AxisFrame, getBounds, getPoints, getTitle, scaleX, scaleY, VisualFrame } from "./chartUtils";

export function ScatterPlotRenderer({ data }: { data: Record<string, unknown> }) {
  const points = getPoints(data);
  const bounds = getBounds(data, points);

  return (
    <VisualFrame>
      <AxisFrame title={getTitle(data)} />
      {points.map((point) => (
        <g key={`${point.x}-${point.y}-${point.label ?? ""}`}>
          <circle cx={scaleX(point.x, bounds)} cy={scaleY(point.y, bounds)} fill="#2563eb" r="4" />
          {point.label ? (
            <text className="fill-slate-600 text-xs" x={scaleX(point.x, bounds) + 6} y={scaleY(point.y, bounds) - 6}>
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </VisualFrame>
  );
}
