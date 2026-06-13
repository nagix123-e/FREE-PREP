import { asString } from "../../services/visualValidationService";
import type { VisualType } from "../../types";
import { VisualFrame } from "./chartUtils";

export function TriangleRenderer({
  data,
  visualType
}: {
  data: Record<string, unknown>;
  visualType: VisualType;
}) {
  if (visualType === "rectangle") {
    return (
      <VisualFrame>
        <rect fill="#f8fafc" height="150" stroke="#0f766e" strokeWidth="3" width="240" x="140" y="70" />
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="260" y="242">
          {asString(data.widthLabel, "width")}
        </text>
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" transform="rotate(-90 112 145)" x="112" y="145">
          {asString(data.heightLabel, "height")}
        </text>
        <Caption data={data} />
      </VisualFrame>
    );
  }

  const isRight = visualType === "right_triangle" || data.rightAngle === true;
  const points = isRight ? "150,220 150,70 390,220" : "120,220 260,60 400,220";

  return (
    <VisualFrame>
      <polygon fill="#f8fafc" points={points} stroke="#0f766e" strokeWidth="3" />
      {isRight ? <path d="M150 195 L175 195 L175 220" fill="none" stroke="#64748b" strokeWidth="2" /> : null}
      <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="260" y="244">
        {asString(data.baseLabel, "base")}
      </text>
      <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={isRight ? "122" : "180"} y="142">
        {asString(data.leftLabel, "side")}
      </text>
      <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={isRight ? "286" : "340"} y="142">
        {asString(data.rightLabel, "side")}
      </text>
      <Caption data={data} />
    </VisualFrame>
  );
}

function Caption({ data }: { data: Record<string, unknown> }) {
  const caption = asString(data.caption);
  return caption ? (
    <text className="fill-slate-600 text-xs" textAnchor="middle" x="260" y="282">
      {caption}
    </text>
  ) : null;
}
