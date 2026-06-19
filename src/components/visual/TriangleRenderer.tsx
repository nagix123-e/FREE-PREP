import { asString, isFiniteNumber, isRecord } from "../../services/visualValidationService";
import type { VisualType } from "../../types";
import { SVG_HEIGHT, SVG_WIDTH, VisualFrame } from "./chartUtils";

interface SvgPoint {
  x: number;
  y: number;
}

interface VertexPoint extends SvgPoint {
  key: string;
  label: string;
}

type LabelMap = Record<string, string>;
type GeometryRenderMode = "exact_to_scale" | "near_to_scale" | "schematic_not_to_scale";

interface TriangleGeometry {
  mode: GeometryRenderMode;
  vertices: VertexPoint[];
}

interface SvgBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const DEFAULT_TRIANGLE_POINTS: Record<string, SvgPoint> = {
  A: { x: 120, y: 220 },
  B: { x: 400, y: 220 },
  C: { x: 260, y: 60 }
};

export function TriangleRenderer({
  data,
  visualType
}: {
  data: Record<string, unknown>;
  visualType: VisualType;
}) {
  if (visualType === "rectangle") {
    return <RectangleDiagram data={data} />;
  }

  if (isSimilarTrianglesData(data)) {
    return <SimilarTrianglesDiagram data={data} />;
  }

  const geometry = getTriangleGeometry(data, visualType);
  const vertices = geometry.vertices;
  const angleLabels = readLabelMap(data.angle_labels) ?? readLabelMap(data.angleLabels);
  const sideLabels =
    readLabelMap(data.side_labels) ??
    readLabelMap(data.sideLabels) ??
    readLegacySideLabels(data);
  const exterior = getExteriorExtension(data, vertices);
  const rightAngleAt = asString(data.right_angle_at) || asString(data.rightAngleAt) || (visualType === "right_triangle" ? vertices[0]?.key : "");
  const scaleNote = getScaleNote(data, geometry.mode);

  return (
    <VisualFrame>
      <polygon fill="#f8fafc" points={vertices.map(toPointString).join(" ")} stroke="#0f766e" strokeWidth="3" />
      {exterior ? (
        <line
          stroke="#0f766e"
          strokeLinecap="round"
          strokeWidth="3"
          x1={exterior.from.x}
          x2={exterior.to.x}
          y1={exterior.from.y}
          y2={exterior.to.y}
        />
      ) : null}
      {rightAngleAt ? <RightAngleMarker at={rightAngleAt} vertices={vertices} /> : null}
      {vertices.map((vertex) => (
        <VertexLabel key={vertex.key} vertex={vertex} vertices={vertices} />
      ))}
      {Object.entries(sideLabels ?? {}).map(([edge, label]) => (
        <SideLabel edge={edge} key={edge} label={label} vertices={vertices} />
      ))}
      {Object.entries(angleLabels ?? {}).map(([vertexKey, label]) => (
        <AngleLabel key={vertexKey} label={label} vertexKey={vertexKey} vertices={vertices} />
      ))}
      {exterior?.label ? <ExteriorAngleLabel label={exterior.label} point={exterior.labelPoint} /> : null}
      {scaleNote ? (
        <text className="fill-slate-500 text-xs font-semibold" textAnchor="end" x={SVG_WIDTH - 36} y="34">
          {scaleNote}
        </text>
      ) : null}
      <Caption data={data} />
    </VisualFrame>
  );
}

function RectangleDiagram({ data }: { data: Record<string, unknown> }) {
  const widthLabel = asString(data.widthLabel);
  const heightLabel = asString(data.heightLabel);

  return (
    <VisualFrame>
      <rect fill="#f8fafc" height="150" stroke="#0f766e" strokeWidth="3" width="240" x="140" y="70" />
      {widthLabel ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x="260" y="242">
          {widthLabel}
        </text>
      ) : null}
      {heightLabel ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" transform="rotate(-90 112 145)" x="112" y="145">
          {heightLabel}
        </text>
      ) : null}
      <Caption data={data} />
    </VisualFrame>
  );
}

function SimilarTrianglesDiagram({ data }: { data: Record<string, unknown> }) {
  const triangles = getTriangleItems(data.triangles).slice(0, 2);
  if (triangles.length < 2) {
    return <GeometrySummary data={data} />;
  }

  const correspondence = readLabelMap(data.correspondence);
  const firstGeometry = getTriangleGeometry(triangles[0], "triangle");
  const secondGeometry = getTriangleGeometry(triangles[1], "triangle");
  const firstBox: SvgBox = { xMin: 48, xMax: 230, yMin: 72, yMax: 218 };
  const secondBox: SvgBox = { xMin: 292, xMax: 474, yMin: 72, yMax: 218 };
  const firstVertices = fitVerticesToBox(firstGeometry.vertices, firstBox);
  const secondVertices = fitVerticesToBox(secondGeometry.vertices, secondBox);
  const scaleNote = getScaleNote(data, bestMode(firstGeometry.mode, secondGeometry.mode));

  return (
    <VisualFrame>
      <TriangleShape vertices={firstVertices} />
      <TriangleShape vertices={secondVertices} />
      <TriangleLabels data={triangles[0]} vertices={firstVertices} />
      <TriangleLabels data={triangles[1]} vertices={secondVertices} />
      <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={boxCenterX(firstBox)} y="250">
        {asString(triangles[0].name) || firstVertices.map((vertex) => vertex.key).join("")}
      </text>
      <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={boxCenterX(secondBox)} y="250">
        {asString(triangles[1].name) || secondVertices.map((vertex) => vertex.key).join("")}
      </text>
      {correspondence ? (
        <text className="fill-slate-600 text-xs" textAnchor="middle" x="260" y="276">
          {formatCorrespondence(correspondence)}
        </text>
      ) : null}
      {scaleNote ? (
        <text className="fill-slate-500 text-xs font-semibold" textAnchor="end" x={SVG_WIDTH - 36} y="34">
          {scaleNote}
        </text>
      ) : null}
    </VisualFrame>
  );
}

function TriangleShape({ vertices }: { vertices: VertexPoint[] }) {
  return <polygon fill="#f8fafc" points={vertices.map(toPointString).join(" ")} stroke="#0f766e" strokeWidth="3" />;
}

function TriangleLabels({ data, vertices }: { data: Record<string, unknown>; vertices: VertexPoint[] }) {
  const angleLabels = readLabelMap(data.angle_labels) ?? readLabelMap(data.angleLabels);
  const sideLabels =
    readLabelMap(data.side_labels) ??
    readLabelMap(data.sideLabels) ??
    readLegacySideLabels(data);

  return (
    <>
      {vertices.map((vertex) => (
        <VertexLabel key={vertex.key} vertex={vertex} vertices={vertices} />
      ))}
      {Object.entries(sideLabels ?? {}).map(([edge, label]) => (
        <SideLabel edge={edge} key={edge} label={label} vertices={vertices} />
      ))}
      {Object.entries(angleLabels ?? {}).map(([vertexKey, label]) => (
        <AngleLabel key={vertexKey} label={label} vertexKey={vertexKey} vertices={vertices} />
      ))}
    </>
  );
}

function GeometrySummary({ data }: { data: Record<string, unknown> }) {
  return (
    <VisualFrame>
      <text className="fill-slate-700 text-xs font-semibold" x="40" y="80">
        {buildGeometrySummary(data)}
      </text>
    </VisualFrame>
  );
}

function getTriangleItems(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function isSimilarTrianglesData(data: Record<string, unknown>): boolean {
  const diagramType = `${asString(data.diagram_type)} ${asString(data.type)}`.toLowerCase();
  return diagramType.includes("similar") || getTriangleItems(data.triangles).length >= 2;
}

function buildGeometrySummary(data: Record<string, unknown>): string {
  const triangles = getTriangleItems(data.triangles);
  if (triangles.length >= 2) {
    const triangleText = triangles
      .map((triangle) => {
        const name = asString(triangle.name) || getVertexNames(triangle.vertices).join("");
        const sides = readLabelMap(triangle.side_labels) ?? readLabelMap(triangle.sideLabels);
        const sideText = sides ? Object.entries(sides).map(([edge, value]) => `${edge}=${value}`).join(", ") : "no side labels";
        return `${name}: ${sideText}`;
      })
      .join(". ");
    const correspondence = readLabelMap(data.correspondence);
    return correspondence ? `${triangleText}. ${formatCorrespondence(correspondence)}` : triangleText;
  }
  return "Geometry visual unavailable.";
}

function formatCorrespondence(correspondence: LabelMap): string {
  return Object.entries(correspondence).map(([from, to]) => `${from}↔${to}`).join(", ");
}

function fitVerticesToBox(vertices: VertexPoint[], box: SvgBox): VertexPoint[] {
  const bounds = getVertexBounds(vertices);
  const width = Math.max(1, bounds.xMax - bounds.xMin);
  const height = Math.max(1, bounds.yMax - bounds.yMin);
  const targetWidth = Math.max(1, box.xMax - box.xMin);
  const targetHeight = Math.max(1, box.yMax - box.yMin);
  const scale = Math.min(targetWidth / width, targetHeight / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = box.xMin + (targetWidth - scaledWidth) / 2 - bounds.xMin * scale;
  const offsetY = box.yMin + (targetHeight - scaledHeight) / 2 - bounds.yMin * scale;

  return vertices.map((vertex) => ({
    ...vertex,
    x: vertex.x * scale + offsetX,
    y: vertex.y * scale + offsetY
  }));
}

function getVertexBounds(vertices: VertexPoint[]): SvgBox {
  const xs = vertices.map((vertex) => vertex.x);
  const ys = vertices.map((vertex) => vertex.y);
  return {
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys)
  };
}

function boxCenterX(box: SvgBox): number {
  return (box.xMin + box.xMax) / 2;
}

function getTriangleGeometry(
  data: Record<string, unknown>,
  visualType: VisualType,
  offset: SvgPoint = { x: 0, y: 0 },
  scale = 1
): TriangleGeometry {
  const names = getVertexNames(data.vertices);
  const vertexLabels = readLabelMap(data.vertex_labels) ?? readLabelMap(data.vertexLabels);
  const coordinates = getVertexCoordinates(data.vertices);
  const rightAngleAt = asString(data.right_angle_at) || asString(data.rightAngleAt);
  const sideLabels = readLabelMap(data.side_labels) ?? readLabelMap(data.sideLabels) ?? readLegacySideLabels(data);
  const defaultGeometry = getDefaultGeometry(names, visualType, rightAngleAt, sideLabels, readLabelMap(data.angle_labels) ?? readLabelMap(data.angleLabels));
  const hasCoordinates = Object.keys(coordinates).length >= 3;

  const vertices = names.map((key, index) => {
    const fallback = defaultGeometry.points[key] ?? defaultPointForIndex(index);
    const point = coordinates[key] ?? fallback;
    return {
      key,
      label: vertexLabels?.[key] ?? key,
      x: point.x * scale + offset.x,
      y: point.y * scale + offset.y
    };
  });

  return {
    mode: hasCoordinates ? "exact_to_scale" : defaultGeometry.mode,
    vertices
  };
}

function getDefaultGeometry(
  names: string[],
  visualType: VisualType,
  rightAngleAt: string,
  sideLabels: LabelMap | null,
  angleLabels: LabelMap | null
): { mode: GeometryRenderMode; points: Record<string, SvgPoint> } {
  const exactRight = visualType === "right_triangle" || rightAngleAt
    ? buildExactRightTriangle(names, rightAngleAt, sideLabels, angleLabels)
    : null;
  if (exactRight) {
    return { mode: "exact_to_scale", points: exactRight };
  }

  const proportionalSideLabels = sideLabels;
  const proportional = proportionalSideLabels
    ? buildProportionalTriangle(names, proportionalSideLabels)
    : null;
  if (proportional && proportionalSideLabels) {
    return {
      mode: countNumericSides(names, proportionalSideLabels) >= 3 ? "exact_to_scale" : "near_to_scale",
      points: proportional
    };
  }
  return {
    mode: "schematic_not_to_scale",
    points: visualType === "right_triangle" ? getRightTriangleDefaults(names, rightAngleAt) : DEFAULT_TRIANGLE_POINTS
  };
}

function buildExactRightTriangle(
  names: string[],
  rightAngleAt: string,
  sideLabels: LabelMap | null,
  angleLabels: LabelMap | null
): Record<string, SvgPoint> | null {
  if (!sideLabels) {
    return null;
  }
  const right = rightAngleAt && names.includes(rightAngleAt) ? rightAngleAt : names[0];
  const [verticalVertex, horizontalVertex] = names.filter((name) => name !== right);
  if (!verticalVertex || !horizontalVertex) {
    return null;
  }

  const verticalKnown = readNumericSide(sideLabels, right, verticalVertex);
  const horizontalKnown = readNumericSide(sideLabels, right, horizontalVertex);
  const hypotenuseKnown = readNumericSide(sideLabels, verticalVertex, horizontalVertex);
  const special = getSpecialRightTriangleRatio(angleLabels);
  let vertical = verticalKnown;
  let horizontal = horizontalKnown;

  if (vertical !== null && horizontal !== null) {
    return buildRightTrianglePoints(right, verticalVertex, horizontalVertex, vertical, horizontal);
  }

  if (hypotenuseKnown !== null && special) {
    const short = hypotenuseKnown * special.shortLegRatio;
    const long = hypotenuseKnown * special.longLegRatio;
    vertical = vertical ?? long;
    horizontal = horizontal ?? short;
    return buildRightTrianglePoints(right, verticalVertex, horizontalVertex, vertical, horizontal);
  }

  if (hypotenuseKnown !== null && vertical !== null && hypotenuseKnown > vertical) {
    horizontal = Math.sqrt(hypotenuseKnown ** 2 - vertical ** 2);
    return buildRightTrianglePoints(right, verticalVertex, horizontalVertex, vertical, horizontal);
  }

  if (hypotenuseKnown !== null && horizontal !== null && hypotenuseKnown > horizontal) {
    vertical = Math.sqrt(hypotenuseKnown ** 2 - horizontal ** 2);
    return buildRightTrianglePoints(right, verticalVertex, horizontalVertex, vertical, horizontal);
  }

  return null;
}

function buildRightTrianglePoints(
  right: string,
  verticalVertex: string,
  horizontalVertex: string,
  verticalLength: number,
  horizontalLength: number
): Record<string, SvgPoint> {
  const maxSide = Math.max(verticalLength, horizontalLength);
  const scale = 220 / maxSide;
  const vertical = Math.max(32, Math.min(230, verticalLength * scale));
  const horizontal = Math.max(32, Math.min(260, horizontalLength * scale));
  const rightPoint = { x: 140, y: 220 };

  return {
    [right]: rightPoint,
    [verticalVertex]: { x: rightPoint.x, y: rightPoint.y - vertical },
    [horizontalVertex]: { x: rightPoint.x + horizontal, y: rightPoint.y }
  };
}

function getSpecialRightTriangleRatio(angleLabels: LabelMap | null): { shortLegRatio: number; longLegRatio: number } | null {
  const angles = Object.values(angleLabels ?? {}).map(parseAngleDegrees).filter((value): value is number => value !== null);
  if (angles.some((angle) => Math.abs(angle - 45) <= 1)) {
    return { shortLegRatio: Math.SQRT1_2, longLegRatio: Math.SQRT1_2 };
  }
  if (angles.some((angle) => Math.abs(angle - 30) <= 1) || angles.some((angle) => Math.abs(angle - 60) <= 1)) {
    return { shortLegRatio: 0.5, longLegRatio: Math.sqrt(3) / 2 };
  }
  return null;
}

function parseAngleDegrees(label: string): number | null {
  const match = label.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function buildProportionalTriangle(names: string[], sideLabels: LabelMap): Record<string, SvgPoint> | null {
  const [a, b, c] = names;
  const ab = readNumericSide(sideLabels, a, b);
  const bc = readNumericSide(sideLabels, b, c);
  const ac = readNumericSide(sideLabels, a, c);

  if (ab === null && bc === null && ac === null) {
    return null;
  }

  const baseValue = ab ?? Math.max(1, Math.min(ac ?? 10, bc ?? 10));
  const leftValue = ac ?? Math.max(1, baseValue * 0.9);
  const rightValue = bc ?? Math.max(1, baseValue * 1.1);
  const hasAllThreeSides = ab !== null && bc !== null && ac !== null;
  const maxSide = Math.max(baseValue, leftValue, rightValue);
  const scale = 230 / maxSide;
  const base = hasAllThreeSides ? baseValue * scale : Math.max(120, Math.min(280, baseValue * scale));
  const left = hasAllThreeSides ? leftValue * scale : Math.max(95, Math.min(280, leftValue * scale));
  const right = hasAllThreeSides ? rightValue * scale : Math.max(95, Math.min(280, rightValue * scale));
  const aPoint = { x: 120, y: 220 };
  const bPoint = { x: 120 + base, y: 220 };
  const projection = (left ** 2 + base ** 2 - right ** 2) / (2 * base);
  const heightSquared = Math.max(left ** 2 - projection ** 2, 72 ** 2);
  const cPoint = {
    x: Math.max(88, Math.min(432, aPoint.x + projection)),
    y: Math.max(52, aPoint.y - Math.sqrt(heightSquared))
  };

  return {
    [a]: aPoint,
    [b]: bPoint,
    [c]: cPoint
  };
}

function readNumericSide(labels: LabelMap, first: string, second: string): number | null {
  const value = labels[`${first}${second}`] ?? labels[`${second}${first}`] ?? labels[`${first}-${second}`] ?? labels[`${second}-${first}`];
  if (!value) {
    return null;
  }
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function countNumericSides(names: string[], labels: LabelMap): number {
  const [a, b, c] = names;
  return [
    readNumericSide(labels, a, b),
    readNumericSide(labels, b, c),
    readNumericSide(labels, a, c)
  ].filter((value) => value !== null).length;
}

function getScaleNote(data: Record<string, unknown>, mode: GeometryRenderMode): string {
  if (mode === "exact_to_scale") {
    return "";
  }
  if (mode === "near_to_scale") {
    return data.not_to_scale === true || data.notToScale === true ? "Diagram not perfectly to scale" : "";
  }
  return data.not_to_scale === true || data.notToScale === true ? "Not to scale" : "";
}

function bestMode(first: GeometryRenderMode, second: GeometryRenderMode): GeometryRenderMode {
  if (first === "schematic_not_to_scale" || second === "schematic_not_to_scale") {
    return "schematic_not_to_scale";
  }
  if (first === "near_to_scale" || second === "near_to_scale") {
    return "near_to_scale";
  }
  return "exact_to_scale";
}

function getVertexNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    const names = value
      .map((item, index) => {
        if (typeof item === "string") {
          return item;
        }
        if (isRecord(item)) {
          return asString(item.label) || asString(item.name) || asString(item.id) || defaultVertexName(index);
        }
        return defaultVertexName(index);
      })
      .filter(Boolean);
    return normalizeThreeNames(names);
  }

  if (isRecord(value)) {
    return normalizeThreeNames(Object.keys(value));
  }

  return ["A", "B", "C"];
}

function normalizeThreeNames(names: string[]): string[] {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  return unique.length >= 3 ? unique.slice(0, 3) : ["A", "B", "C"].map((fallback, index) => unique[index] ?? fallback);
}

function getVertexCoordinates(value: unknown): Record<string, SvgPoint> {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, SvgPoint>>((acc, item, index) => {
      if (!isRecord(item)) {
        return acc;
      }
      const key = asString(item.label) || asString(item.name) || asString(item.id) || defaultVertexName(index);
      const x = readNumber(item.x);
      const y = readNumber(item.y);
      if (key && x !== null && y !== null) {
        acc[key] = { x, y };
      }
      return acc;
    }, {});
  }

  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, SvgPoint>>((acc, [key, item]) => {
    if (!isRecord(item)) {
      return acc;
    }
    const x = readNumber(item.x);
    const y = readNumber(item.y);
    if (x !== null && y !== null) {
      acc[key] = { x, y };
    }
    return acc;
  }, {});
}

function getRightTriangleDefaults(names: string[], rightAngleAt: string): Record<string, SvgPoint> {
  const [first, second, third] = names;
  const right = rightAngleAt && names.includes(rightAngleAt) ? rightAngleAt : first;
  const others = names.filter((name) => name !== right);

  return {
    [right]: { x: 150, y: 220 },
    [others[0] ?? second]: { x: 150, y: 70 },
    [others[1] ?? third]: { x: 390, y: 220 }
  };
}

function defaultPointForIndex(index: number): SvgPoint {
  return [DEFAULT_TRIANGLE_POINTS.A, DEFAULT_TRIANGLE_POINTS.B, DEFAULT_TRIANGLE_POINTS.C][index] ?? { x: 260, y: 140 };
}

function defaultVertexName(index: number): string {
  return ["A", "B", "C"][index] ?? `V${index + 1}`;
}

function readNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readLabelMap(value: unknown): LabelMap | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value)
    .map(([key, label]) => [key, String(label ?? "").trim()] as const)
    .filter(([, label]) => label.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function readLegacySideLabels(data: Record<string, unknown>): LabelMap | null {
  const labels: LabelMap = {};
  const baseLabel = asString(data.baseLabel);
  const leftLabel = asString(data.leftLabel);
  const rightLabel = asString(data.rightLabel);

  if (baseLabel) {
    labels.AB = baseLabel;
  }
  if (leftLabel) {
    labels.AC = leftLabel;
  }
  if (rightLabel) {
    labels.BC = rightLabel;
  }

  return Object.keys(labels).length > 0 ? labels : null;
}

function VertexLabel({ vertex, vertices }: { vertex: VertexPoint; vertices: VertexPoint[] }) {
  const offset = outwardOffset(vertex, vertices, 18);
  return (
    <text className="fill-slate-800 text-xs font-bold" textAnchor="middle" x={vertex.x + offset.x} y={vertex.y + offset.y + 4}>
      {vertex.label}
    </text>
  );
}

function SideLabel({ edge, label, vertices }: { edge: string; label: string; vertices: VertexPoint[] }) {
  const endpoints = findEdge(edge, vertices);
  if (!endpoints || !label) {
    return null;
  }
  const [a, b] = endpoints;
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const offset = outwardOffset(midpoint, vertices, 18);

  return (
    <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={midpoint.x + offset.x} y={midpoint.y + offset.y + 4}>
      {label}
    </text>
  );
}

function AngleLabel({ label, vertexKey, vertices }: { label: string; vertexKey: string; vertices: VertexPoint[] }) {
  const vertex = findVertex(vertexKey, vertices);
  if (!vertex || !label) {
    return null;
  }
  const centroid = getCentroid(vertices);
  const point = moveToward(vertex, centroid, 34);

  return (
    <text className="fill-slate-800 text-xs font-semibold" textAnchor="middle" x={point.x} y={point.y + 4}>
      {label}
    </text>
  );
}

function RightAngleMarker({ at, vertices }: { at: string; vertices: VertexPoint[] }) {
  const vertex = findVertex(at, vertices);
  if (!vertex) {
    return null;
  }
  const others = vertices.filter((item) => item.key !== vertex.key);
  if (others.length < 2) {
    return null;
  }
  const size = 20;
  const u = unitVector(vertex, others[0]);
  const v = unitVector(vertex, others[1]);
  const p1 = { x: vertex.x + u.x * size, y: vertex.y + u.y * size };
  const corner = { x: p1.x + v.x * size, y: p1.y + v.y * size };
  const p2 = { x: vertex.x + v.x * size, y: vertex.y + v.y * size };

  return <path d={`M${p1.x} ${p1.y} L${corner.x} ${corner.y} L${p2.x} ${p2.y}`} fill="none" stroke="#64748b" strokeWidth="2" />;
}

function getExteriorExtension(data: Record<string, unknown>, vertices: VertexPoint[]) {
  const extendedSide = asString(data.extended_side) || asString(data.extendedSide);
  const exteriorAt = asString(data.exterior_angle_at) || asString(data.exteriorAngleAt);
  if (!extendedSide || !exteriorAt) {
    return null;
  }
  const endpoints = findEdge(extendedSide, vertices);
  const atVertex = findVertex(exteriorAt, vertices);
  if (!endpoints || !atVertex) {
    return null;
  }
  const anchor = endpoints.find((point) => point.key === atVertex.key);
  const other = endpoints.find((point) => point.key !== atVertex.key);
  if (!anchor || !other) {
    return null;
  }

  const direction = unitVector(other, anchor);
  const to = clampPoint({ x: anchor.x + direction.x * 78, y: anchor.y + direction.y * 78 });
  const label = asString(data.exterior_angle_label) || asString(data.exteriorAngleLabel);
  const labelPoint = clampPoint({ x: anchor.x + direction.x * 42, y: anchor.y + direction.y * 42 - 14 });
  return { from: anchor, label, labelPoint, to };
}

function ExteriorAngleLabel({ label, point }: { label: string; point: SvgPoint }) {
  return (
    <text className="fill-slate-800 text-xs font-semibold" textAnchor="middle" x={point.x} y={point.y}>
      {label}
    </text>
  );
}

function findEdge(edge: string, vertices: VertexPoint[]): [VertexPoint, VertexPoint] | null {
  const normalized = edge.replace(/\s+/g, "");
  const direct = splitEdgeName(normalized);
  const first = findVertex(direct[0], vertices);
  const second = findVertex(direct[1], vertices);
  return first && second ? [first, second] : null;
}

function splitEdgeName(edge: string): [string, string] {
  if (edge.includes("-")) {
    const [first = "", second = ""] = edge.split("-");
    return [first, second];
  }
  if (edge.length === 2) {
    return [edge[0], edge[1]];
  }
  const sorted = [...edge].filter((char) => /[A-Za-z]/.test(char));
  return [sorted[0] ?? "", sorted[1] ?? ""];
}

function findVertex(key: string, vertices: VertexPoint[]): VertexPoint | null {
  return vertices.find((vertex) => vertex.key === key || vertex.label === key) ?? null;
}

function outwardOffset(point: SvgPoint, vertices: VertexPoint[], distance: number): SvgPoint {
  const centroid = getCentroid(vertices);
  const vector = { x: point.x - centroid.x, y: point.y - centroid.y };
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: (vector.x / length) * distance, y: (vector.y / length) * distance };
}

function getCentroid(vertices: VertexPoint[]): SvgPoint {
  return {
    x: vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length,
    y: vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length
  };
}

function moveToward(from: SvgPoint, to: SvgPoint, distance: number): SvgPoint {
  const vector = { x: to.x - from.x, y: to.y - from.y };
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: from.x + (vector.x / length) * distance, y: from.y + (vector.y / length) * distance };
}

function unitVector(from: SvgPoint, to: SvgPoint): SvgPoint {
  const vector = { x: to.x - from.x, y: to.y - from.y };
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function clampPoint(point: SvgPoint): SvgPoint {
  return {
    x: Math.max(18, Math.min(SVG_WIDTH - 18, point.x)),
    y: Math.max(18, Math.min(SVG_HEIGHT - 18, point.y))
  };
}

function toPointString(point: SvgPoint): string {
  return `${point.x},${point.y}`;
}

function Caption({ data }: { data: Record<string, unknown> }) {
  const caption = asString(data.caption) || asString(data.target_label) || asString(data.targetLabel);
  return caption ? (
    <text className="fill-slate-600 text-xs" textAnchor="middle" x="260" y="282">
      {caption}
    </text>
  ) : null;
}
