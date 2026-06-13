import { asNumber, asString } from "../../services/visualValidationService";
import { PADDING, SVG_WIDTH, VisualFrame } from "./chartUtils";

export function BoxPlotRenderer({ data }: { data: Record<string, unknown> }) {
  const values = {
    min: asNumber(data.min, 0),
    q1: asNumber(data.q1, 1),
    median: asNumber(data.median, 2),
    q3: asNumber(data.q3, 3),
    max: asNumber(data.max, 4)
  };
  const span = values.max === values.min ? 1 : values.max - values.min;
  const mapX = (value: number) => PADDING + ((value - values.min) / span) * (SVG_WIDTH - PADDING * 2);
  const y = 150;

  return (
    <VisualFrame>
      {asString(data.title) ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="260" y="24">
          {asString(data.title)}
        </text>
      ) : null}
      <line x1={mapX(values.min)} x2={mapX(values.max)} y1={y} y2={y} stroke="#334155" strokeWidth="2" />
      <rect fill="#dbeafe" height="70" stroke="#2563eb" strokeWidth="3" width={mapX(values.q3) - mapX(values.q1)} x={mapX(values.q1)} y={y - 35} />
      <line x1={mapX(values.median)} x2={mapX(values.median)} y1={y - 35} y2={y + 35} stroke="#1e293b" strokeWidth="3" />
      {[values.min, values.q1, values.median, values.q3, values.max].map((value) => (
        <g key={value}>
          <line x1={mapX(value)} x2={mapX(value)} y1={y - 45} y2={y + 45} stroke="#64748b" />
          <text className="fill-slate-600 text-xs" textAnchor="middle" x={mapX(value)} y={y + 66}>
            {value}
          </text>
        </g>
      ))}
    </VisualFrame>
  );
}
