import { asNumber, asString } from "../../services/visualValidationService";
import {
  getBounds,
  getPoints,
  normalizeBounds,
  PADDING,
  scaleX,
  scaleY,
  SVG_HEIGHT,
  SVG_WIDTH,
  VisualFrame,
  type ChartBounds
} from "./chartUtils";
import { VisualErrorFallback } from "./VisualErrorFallback";

type ParsedFunction =
  | { kind: "linear"; a: number; b: number; evaluate: (x: number) => number }
  | { kind: "vertexQuadratic"; a: number; h: number; k: number; evaluate: (x: number) => number };

interface PlotPoint {
  x: number;
  y: number;
}

export function FunctionGraphRenderer({ data }: { data: Record<string, unknown> }) {
  const equation = asString(data.equation) || asString(data.equationLabel);
  const parsed = parseEquation(equation);
  const xMin = asNumber(data.xMin, -5);
  const xMax = asNumber(data.xMax, 5);

  if (!parsed) {
    return <PointFunctionGraph data={data} />;
  }

  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
    return <VisualErrorFallback message="Unable to render graph" />;
  }

  const points = sampleFunction(parsed, xMin, xMax);
  if (points.length < 2) {
    return <VisualErrorFallback message="Unable to render graph" />;
  }

  const bounds = getFunctionBounds(data, points, xMin, xMax);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.x, bounds)} ${scaleY(point.y, bounds)}`)
    .join(" ");

  return (
    <VisualFrame>
      <GraphFrame bounds={bounds} title={asString(data.title)} />
      <path d={path} fill="none" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {parsed.kind === "vertexQuadratic" ? (
        <circle cx={scaleX(parsed.h, bounds)} cy={scaleY(parsed.k, bounds)} fill="#7c3aed" r="4" />
      ) : null}
      <text className="fill-slate-700 text-xs font-semibold" x={SVG_WIDTH - PADDING} y="24" textAnchor="end">
        {equation}
      </text>
    </VisualFrame>
  );
}

function PointFunctionGraph({ data }: { data: Record<string, unknown> }) {
  const points = getPoints(data);
  if (points.length < 2) {
    return <VisualErrorFallback message="Unable to render graph" />;
  }

  const bounds = getBounds(data, points);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.x, bounds)} ${scaleY(point.y, bounds)}`)
    .join(" ");

  return (
    <VisualFrame>
      <GraphFrame bounds={bounds} title={asString(data.title)} />
      <path d={path} fill="none" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {asString(data.equationLabel) ? (
        <text className="fill-slate-700 text-xs font-semibold" x={SVG_WIDTH - PADDING} y="24" textAnchor="end">
          {asString(data.equationLabel)}
        </text>
      ) : null}
    </VisualFrame>
  );
}

function parseEquation(rawEquation: string): ParsedFunction | null {
  const equation = rawEquation.replace(/\s+/g, "").replace(/^f\(x\)=/i, "y=");
  const expression = equation.replace(/^y=/i, "");
  if (!expression) {
    return null;
  }

  const vertex = parseVertexQuadratic(expression);
  if (vertex) {
    return vertex;
  }

  return parseLinear(expression);
}

function parseLinear(expression: string): ParsedFunction | null {
  const constant = parseSignedNumber(expression);
  if (constant !== null) {
    return { kind: "linear", a: 0, b: constant, evaluate: () => constant };
  }

  const match = expression.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+)?)x([+-](?:\d+(?:\.\d+)?|\.\d+))?$/i);
  if (!match) {
    return null;
  }

  const a = parseCoefficient(match[1]);
  const b = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return null;
  }

  return {
    kind: "linear",
    a,
    b,
    evaluate: (x) => a * x + b
  };
}

function parseVertexQuadratic(expression: string): ParsedFunction | null {
  const match = expression.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)?)?\(x([+-](?:\d+(?:\.\d+)?|\.\d+))\)\^2([+-](?:\d+(?:\.\d+)?|\.\d+))?$/i
  );
  if (!match) {
    return null;
  }

  const a = parseCoefficient(match[1] ?? "");
  const signedH = Number(match[2]);
  const h = -signedH;
  const k = match[3] ? Number(match[3]) : 0;
  if (!Number.isFinite(a) || !Number.isFinite(h) || !Number.isFinite(k)) {
    return null;
  }

  return {
    kind: "vertexQuadratic",
    a,
    h,
    k,
    evaluate: (x) => a * (x - h) ** 2 + k
  };
}

function parseCoefficient(value: string): number {
  if (!value || value === "+") {
    return 1;
  }
  if (value === "-") {
    return -1;
  }
  return Number(value);
}

function parseSignedNumber(value: string): number | null {
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
    return Number(value);
  }
  return null;
}

function sampleFunction(parsed: ParsedFunction, xMin: number, xMax: number): PlotPoint[] {
  const steps = 160;
  const points: PlotPoint[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / steps;
    const y = parsed.evaluate(x);
    if (Number.isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

function getFunctionBounds(
  data: Record<string, unknown>,
  points: PlotPoint[],
  xMin: number,
  xMax: number
): ChartBounds {
  const yValues = points.map((point) => point.y);
  const sampledYMin = Math.min(...yValues, 0);
  const sampledYMax = Math.max(...yValues, 0);
  const span = sampledYMax - sampledYMin || 2;
  const yPadding = span * 0.12;

  return normalizeBounds({
    xMin,
    xMax,
    yMin: asNumber(data.yMin, sampledYMin - yPadding),
    yMax: asNumber(data.yMax, sampledYMax + yPadding)
  });
}

function GraphFrame({ bounds, title }: { bounds: ChartBounds; title?: string }) {
  const xTicks = makeTicks(bounds.xMin, bounds.xMax);
  const yTicks = makeTicks(bounds.yMin, bounds.yMax);
  const xAxisY = bounds.yMin <= 0 && bounds.yMax >= 0 ? scaleY(0, bounds) : scaleY(bounds.yMin, bounds);
  const yAxisX = bounds.xMin <= 0 && bounds.xMax >= 0 ? scaleX(0, bounds) : scaleX(bounds.xMin, bounds);

  return (
    <>
      <rect
        fill="#fff"
        height={SVG_HEIGHT - PADDING * 1.5}
        stroke="#cbd5e1"
        width={SVG_WIDTH - PADDING * 2}
        x={PADDING}
        y={PADDING / 2}
      />

      {xTicks.map((tick) => (
        <g key={`x-${tick}`}>
          <line
            stroke="#e2e8f0"
            x1={scaleX(tick, bounds)}
            x2={scaleX(tick, bounds)}
            y1={PADDING / 2}
            y2={SVG_HEIGHT - PADDING}
          />
          <line stroke="#334155" x1={scaleX(tick, bounds)} x2={scaleX(tick, bounds)} y1={xAxisY - 4} y2={xAxisY + 4} />
          <text className="fill-slate-600 text-[10px]" textAnchor="middle" x={scaleX(tick, bounds)} y={SVG_HEIGHT - 16}>
            {formatTick(tick)}
          </text>
        </g>
      ))}

      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            stroke="#e2e8f0"
            x1={PADDING}
            x2={SVG_WIDTH - PADDING}
            y1={scaleY(tick, bounds)}
            y2={scaleY(tick, bounds)}
          />
          <line stroke="#334155" x1={yAxisX - 4} x2={yAxisX + 4} y1={scaleY(tick, bounds)} y2={scaleY(tick, bounds)} />
          <text className="fill-slate-600 text-[10px]" textAnchor="end" x={PADDING - 8} y={scaleY(tick, bounds) + 3}>
            {formatTick(tick)}
          </text>
        </g>
      ))}

      <line stroke="#0f172a" strokeWidth="1.5" x1={PADDING} x2={SVG_WIDTH - PADDING} y1={xAxisY} y2={xAxisY} />
      <line stroke="#0f172a" strokeWidth="1.5" x1={yAxisX} x2={yAxisX} y1={PADDING / 2} y2={SVG_HEIGHT - PADDING} />

      {title ? (
        <text className="fill-slate-700 text-xs font-semibold" textAnchor="middle" x={SVG_WIDTH / 2} y={18}>
          {title}
        </text>
      ) : null}
    </>
  );
}

function makeTicks(min: number, max: number): number[] {
  const rawStep = (max - min) / 6;
  const step = niceStep(rawStep);
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];

  for (let value = first; value <= max + step * 0.001; value += step) {
    if (value >= min - step * 0.001) {
      ticks.push(roundTick(value));
    }
  }

  return ticks;
}

function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function roundTick(value: number): number {
  return Math.abs(value) < 0.0000001 ? 0 : Number(value.toFixed(6));
}

function formatTick(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
