import { asString, isRecord, toPoint } from "../../services/visualValidationService";
import { AxisFrame, getBounds, getPoints, getRecordArray, getTitle, scaleX, scaleY, VisualFrame } from "./chartUtils";

export function CoordinatePlaneRenderer({ data }: { data: Record<string, unknown> }) {
  const points = getPoints(data);
  const bounds = getBounds(data, points);
  const segments = getRecordArray(data.segments);

  return (
    <VisualFrame>
      <AxisFrame title={getTitle(data)} />
      {segments.map((segment, index) => {
        const from = isRecord(segment.from) ? toPoint(segment.from) : null;
        const to = isRecord(segment.to) ? toPoint(segment.to) : null;
        if (!from || !to) {
          return null;
        }
        return (
          <line
            key={index}
            stroke="#64748b"
            strokeWidth="2"
            x1={scaleX(from.x, bounds)}
            x2={scaleX(to.x, bounds)}
            y1={scaleY(from.y, bounds)}
            y2={scaleY(to.y, bounds)}
          />
        );
      })}
      {points.map((point) => (
        <g key={`${point.x}-${point.y}-${point.label ?? ""}`}>
          <circle cx={scaleX(point.x, bounds)} cy={scaleY(point.y, bounds)} fill="#dc2626" r="4" />
          <text className="fill-slate-700 text-xs" x={scaleX(point.x, bounds) + 6} y={scaleY(point.y, bounds) - 6}>
            {point.label ?? `(${point.x}, ${point.y})`}
          </text>
        </g>
      ))}
      {asString(data.caption) ? (
        <text className="fill-slate-600 text-xs" textAnchor="middle" x="260" y="292">
          {asString(data.caption)}
        </text>
      ) : null}
    </VisualFrame>
  );
}
