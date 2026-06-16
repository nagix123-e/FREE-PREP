import { asString, isFiniteNumber } from "../../services/visualValidationService";
import { SVG_WIDTH, VisualFrame } from "./chartUtils";

const CENTER = { x: 260, y: 145 };
const RADIUS = 82;

export function CircleRenderer({ data }: { data: Record<string, unknown> }) {
  const centerLabel = asString(data.center_label) || asString(data.centerLabel);
  const radiusLabel = getRadiusLabel(data);
  const diameterLabel = getDiameterLabel(data);
  const circumferenceLabel = getCircumferenceLabel(data);
  const centralAngle = getCentralAngle(data);
  const centralAngleLabel = getCentralAngleLabel(data, centralAngle);
  const shouldShadeSector = data.shaded_sector === true || data.shadedSector === true || isSectorTarget(data);
  const hasSector = centralAngle !== null;
  const endPoint = hasSector ? pointOnCircle(centralAngle) : null;
  const angleLabelPoint = hasSector ? angleBisectorPoint(centralAngle, 43) : null;
  const radiusLabelPoint = hasSector
    ? { x: CENTER.x + RADIUS * 0.64, y: CENTER.y + 20 }
    : { x: CENTER.x + RADIUS / 2, y: CENTER.y - 10 };
  const scaleNote = getScaleNote(data, Boolean(radiusLabel), hasSector);

  return (
    <VisualFrame>
      <circle cx={CENTER.x} cy={CENTER.y} fill="#f8fafc" r={RADIUS} stroke="none" />
      {hasSector && shouldShadeSector && endPoint ? (
        <path d={sectorPath(centralAngle)} fill="#bfdbfe" opacity="0.7" />
      ) : null}
      {hasSector && endPoint ? (
        <>
          <line x1={CENTER.x} x2={CENTER.x + RADIUS} y1={CENTER.y} y2={CENTER.y} stroke="#64748b" strokeWidth="2" />
          <line x1={CENTER.x} x2={endPoint.x} y1={CENTER.y} y2={endPoint.y} stroke="#64748b" strokeWidth="2" />
          <path d={angleArcPath(centralAngle)} fill="none" stroke="#334155" strokeWidth="2" />
          {centralAngleLabel && angleLabelPoint ? (
            <text className="fill-slate-800 text-xs font-semibold" textAnchor="middle" x={angleLabelPoint.x} y={angleLabelPoint.y}>
              {centralAngleLabel}
            </text>
          ) : null}
        </>
      ) : (
        <line x1={CENTER.x} x2={CENTER.x + RADIUS} y1={CENTER.y} y2={CENTER.y} stroke="#64748b" strokeWidth="2" />
      )}
      <circle cx={CENTER.x} cy={CENTER.y} fill="none" r={RADIUS} stroke="#2563eb" strokeWidth="3" />
      {centerLabel ? (
        <text className="fill-slate-800 text-xs font-bold" textAnchor="middle" x={CENTER.x - 10} y={CENTER.y + 16}>
          {centerLabel}
        </text>
      ) : null}
      {radiusLabel ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={radiusLabelPoint.x} y={radiusLabelPoint.y}>
          {radiusLabel}
        </text>
      ) : null}
      {diameterLabel ? (
        <>
          <line x1={CENTER.x - RADIUS} x2={CENTER.x + RADIUS} y1={CENTER.y + 28} y2={CENTER.y + 28} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth="2" />
          <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={CENTER.x} y={CENTER.y + 50}>
            {diameterLabel}
          </text>
        </>
      ) : null}
      {circumferenceLabel ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={CENTER.x} y={CENTER.y + RADIUS + 32}>
          {circumferenceLabel}
        </text>
      ) : null}
      {scaleNote ? (
        <text className="fill-slate-500 text-xs font-semibold" textAnchor="end" x={SVG_WIDTH - 36} y="34">
          {scaleNote}
        </text>
      ) : null}
      <Caption data={data} />
    </VisualFrame>
  );
}

function getRadiusLabel(data: Record<string, unknown>): string {
  return asString(data.radius_label) || asString(data.radiusLabel) || numberLabel(data.radius);
}

function getDiameterLabel(data: Record<string, unknown>): string {
  return asString(data.diameter_label) || asString(data.diameterLabel) || numberLabel(data.diameter);
}

function getCircumferenceLabel(data: Record<string, unknown>): string {
  const explicit = asString(data.circumference_label) || asString(data.circumferenceLabel);
  if (explicit) {
    return explicit;
  }
  const value = asString(data.circumference) || numberLabel(data.circumference);
  return value ? `C = ${value}` : "";
}

function getCentralAngle(data: Record<string, unknown>): number | null {
  const value = data.central_angle_degrees ?? data.centralAngleDegrees;
  if (isFiniteNumber(value)) {
    return clampAngle(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clampAngle(parsed) : null;
  }
  return null;
}

function getCentralAngleLabel(data: Record<string, unknown>, angle: number | null): string {
  return asString(data.central_angle_label) || asString(data.centralAngleLabel) || (angle !== null ? `${angle}°` : "");
}

function numberLabel(value: unknown): string {
  if (isFiniteNumber(value)) {
    return String(value);
  }
  return typeof value === "string" ? value.trim() : "";
}

function isSectorTarget(data: Record<string, unknown>): boolean {
  const type = `${asString(data.diagram_type)} ${asString(data.type)} ${asString(data.target)}`.toLowerCase();
  return type.includes("sector");
}

function getScaleNote(data: Record<string, unknown>, hasRadius: boolean, hasSector: boolean): string {
  if (hasRadius && hasSector) {
    return "";
  }
  return data.not_to_scale === true || data.notToScale === true ? "Not to scale" : "";
}

function clampAngle(angle: number): number {
  return Math.max(1, Math.min(359, angle));
}

function pointOnCircle(angleDegrees: number) {
  const radians = (-angleDegrees * Math.PI) / 180;
  return {
    x: CENTER.x + Math.cos(radians) * RADIUS,
    y: CENTER.y + Math.sin(radians) * RADIUS
  };
}

function angleBisectorPoint(angleDegrees: number, distance: number) {
  const radians = (-(angleDegrees / 2) * Math.PI) / 180;
  return {
    x: CENTER.x + Math.cos(radians) * distance,
    y: CENTER.y + Math.sin(radians) * distance + 4
  };
}

function sectorPath(angleDegrees: number): string {
  const start = { x: CENTER.x + RADIUS, y: CENTER.y };
  const end = pointOnCircle(angleDegrees);
  const largeArc = angleDegrees > 180 ? 1 : 0;
  return `M ${CENTER.x} ${CENTER.y} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function angleArcPath(angleDegrees: number): string {
  const arcRadius = 30;
  const radians = (-angleDegrees * Math.PI) / 180;
  const start = { x: CENTER.x + arcRadius, y: CENTER.y };
  const end = { x: CENTER.x + Math.cos(radians) * arcRadius, y: CENTER.y + Math.sin(radians) * arcRadius };
  const largeArc = angleDegrees > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function Caption({ data }: { data: Record<string, unknown> }) {
  const caption = asString(data.caption) || asString(data.target_label) || asString(data.targetLabel);
  return caption ? (
    <text className="fill-slate-600 text-xs" textAnchor="middle" x="260" y="282">
      {caption}
    </text>
  ) : null;
}
