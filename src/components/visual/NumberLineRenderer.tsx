import { asNumber, asString, isRecord } from "../../services/visualValidationService";
import { PADDING, SVG_WIDTH, VisualFrame } from "./chartUtils";

export function NumberLineRenderer({ data }: { data: Record<string, unknown> }) {
  const min = asNumber(data.min, -5);
  const max = asNumber(data.max, 5);
  const span = min === max ? 1 : max - min;
  const points = Array.isArray(data.points) ? data.points.filter(isRecord) : [];
  const segments = Array.isArray(data.segments) ? data.segments.filter(isRecord) : [];
  const y = 150;
  const mapX = (value: number) => PADDING + ((value - min) / span) * (SVG_WIDTH - PADDING * 2);

  return (
    <VisualFrame>
      <line x1={PADDING} x2={SVG_WIDTH - PADDING} y1={y} y2={y} stroke="#334155" strokeWidth="2" />
      {Array.from({ length: 6 }).map((_, index) => {
        const value = min + (span / 5) * index;
        const x = mapX(value);
        return (
          <g key={index}>
            <line x1={x} x2={x} y1={y - 7} y2={y + 7} stroke="#334155" />
            <text className="fill-slate-600 text-xs" textAnchor="middle" x={x} y={y + 26}>
              {Number.isInteger(value) ? value : value.toFixed(1)}
            </text>
          </g>
        );
      })}
      {segments.map((segment, index) => {
        const from = asNumber(segment.from, min);
        const to = asNumber(segment.to, max);
        return <line key={index} x1={mapX(from)} x2={mapX(to)} y1={y - 20} y2={y - 20} stroke="#0f766e" strokeWidth="5" />;
      })}
      {points.map((point, index) => {
        const value = asNumber(point.value, min);
        return (
          <g key={index}>
            <circle cx={mapX(value)} cy={y} fill="#dc2626" r="5" />
            <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={mapX(value)} y={y - 16}>
              {asString(point.label, String(value))}
            </text>
          </g>
        );
      })}
    </VisualFrame>
  );
}
