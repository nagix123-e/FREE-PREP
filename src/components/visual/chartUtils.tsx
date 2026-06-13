import type { ReactNode } from "react";
import {
  asNumber,
  asString,
  isFiniteNumber,
  isRecord,
  toPointArray,
  type VisualPoint
} from "../../services/visualValidationService";

export interface ChartBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export const SVG_WIDTH = 520;
export const SVG_HEIGHT = 300;
export const PADDING = 42;

export function getTitle(data: Record<string, unknown>): string {
  return asString(data.title);
}

export function getPoints(data: Record<string, unknown>): VisualPoint[] {
  return toPointArray(data.points);
}

export function getBounds(data: Record<string, unknown>, points: VisualPoint[]): ChartBounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xMin = asNumber(data.xMin, xs.length > 0 ? Math.min(...xs, 0) : -5);
  const xMax = asNumber(data.xMax, xs.length > 0 ? Math.max(...xs, 10) : 5);
  const yMin = asNumber(data.yMin, ys.length > 0 ? Math.min(...ys, 0) : -5);
  const yMax = asNumber(data.yMax, ys.length > 0 ? Math.max(...ys, 10) : 5);
  return normalizeBounds({ xMin, xMax, yMin, yMax });
}

export function normalizeBounds(bounds: ChartBounds): ChartBounds {
  return {
    xMin: bounds.xMin === bounds.xMax ? bounds.xMin - 1 : bounds.xMin,
    xMax: bounds.xMin === bounds.xMax ? bounds.xMax + 1 : bounds.xMax,
    yMin: bounds.yMin === bounds.yMax ? bounds.yMin - 1 : bounds.yMin,
    yMax: bounds.yMin === bounds.yMax ? bounds.yMax + 1 : bounds.yMax
  };
}

export function scaleX(x: number, bounds: ChartBounds): number {
  return PADDING + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * (SVG_WIDTH - PADDING * 2);
}

export function scaleY(y: number, bounds: ChartBounds): number {
  return SVG_HEIGHT - PADDING - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (SVG_HEIGHT - PADDING * 2);
}

export function AxisFrame({ title }: { title?: string }) {
  return (
    <>
      <rect x={PADDING} y={PADDING / 2} width={SVG_WIDTH - PADDING * 2} height={SVG_HEIGHT - PADDING * 1.5} fill="#fff" stroke="#cbd5e1" />
      <line x1={PADDING} y1={SVG_HEIGHT - PADDING} x2={SVG_WIDTH - PADDING} y2={SVG_HEIGHT - PADDING} stroke="#334155" />
      <line x1={PADDING} y1={PADDING / 2} x2={PADDING} y2={SVG_HEIGHT - PADDING} stroke="#334155" />
      {title ? (
        <text x={SVG_WIDTH / 2} y={18} textAnchor="middle" className="fill-slate-700 text-xs font-semibold">
          {title}
        </text>
      ) : null}
    </>
  );
}

export function VisualFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-auto rounded-md border border-line bg-white p-3">
      <svg aria-label="Question visual" className="h-auto w-full min-w-visual" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img">
        {children}
      </svg>
    </div>
  );
}

export function getStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function getRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function getNumericRecordValue(item: Record<string, unknown>, key: string, fallback: number): number {
  return isFiniteNumber(item[key]) ? item[key] : fallback;
}
