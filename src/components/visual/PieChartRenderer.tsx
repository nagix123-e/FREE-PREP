import { asString, isFiniteNumber, isRecord } from "../../services/visualValidationService";
import { VisualFrame } from "./chartUtils";

const COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#f59e0b", "#dc2626", "#64748b"];

export function PieChartRenderer({ data }: { data: Record<string, unknown> }) {
  const slices = Array.isArray(data.slices) ? data.slices.filter(isRecord) : [];
  const total = slices.reduce((sum, slice) => sum + (isFiniteNumber(slice.value) ? slice.value : 0), 0) || 1;
  let start = -90;

  return (
    <VisualFrame>
      {asString(data.title) ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="260" y="22">
          {asString(data.title)}
        </text>
      ) : null}
      {slices.map((slice, index) => {
        const value = isFiniteNumber(slice.value) ? slice.value : 0;
        const end = start + (value / total) * 360;
        const path = describeArc(205, 150, 78, start, end);
        start = end;
        return <path d={path} fill={COLORS[index % COLORS.length]} key={`${asString(slice.label)}-${index}`} stroke="#fff" strokeWidth="2" />;
      })}
      {slices.map((slice, index) => (
        <g key={`legend-${index}`}>
          <rect fill={COLORS[index % COLORS.length]} height="10" width="10" x="320" y={92 + index * 22} />
          <text className="fill-slate-700 text-xs" x="338" y={101 + index * 22}>
            {asString(slice.label, `Slice ${index + 1}`)}
          </text>
        </g>
      ))}
    </VisualFrame>
  );
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, "Z"].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}
