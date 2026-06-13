import { asString } from "../../services/visualValidationService";
import { VisualFrame } from "./chartUtils";

export function CircleRenderer({ data }: { data: Record<string, unknown> }) {
  return (
    <VisualFrame>
      <circle cx="260" cy="145" fill="#f8fafc" r="82" stroke="#2563eb" strokeWidth="3" />
      <line x1="260" x2="342" y1="145" y2="145" stroke="#64748b" strokeWidth="2" />
      <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="305" y="134">
        {asString(data.radiusLabel, "r")}
      </text>
      {asString(data.diameterLabel) ? (
        <>
          <line x1="178" x2="342" y1="170" y2="170" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth="2" />
          <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="260" y="190">
            {asString(data.diameterLabel)}
          </text>
        </>
      ) : null}
      {asString(data.caption) ? (
        <text className="fill-slate-600 text-xs" textAnchor="middle" x="260" y="270">
          {asString(data.caption)}
        </text>
      ) : null}
    </VisualFrame>
  );
}
