import { AxisFrame, getBounds, getPoints, getTitle, scaleX, scaleY, VisualFrame } from "./chartUtils";

export function LineGraphRenderer({ data }: { data: Record<string, unknown> }) {
  const points = getPoints(data);
  const bounds = getBounds(data, points);
  const path = points.map((point) => `${scaleX(point.x, bounds)},${scaleY(point.y, bounds)}`).join(" ");

  return (
    <VisualFrame>
      <AxisFrame title={getTitle(data)} />
      {points.length > 1 ? <polyline fill="none" points={path} stroke="#0f766e" strokeWidth="3" /> : null}
      {points.map((point) => (
        <circle cx={scaleX(point.x, bounds)} cy={scaleY(point.y, bounds)} fill="#0f766e" key={`${point.x}-${point.y}`} r="4" />
      ))}
    </VisualFrame>
  );
}
