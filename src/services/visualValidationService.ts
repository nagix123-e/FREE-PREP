import type { VisualType } from "../types";
import { getVisualSchema, isSupportedVisualType } from "./visualSchemaService";

export type VisualValidationStatus = "valid" | "invalid" | "unsupported" | "empty";

export interface VisualValidationResult {
  status: VisualValidationStatus;
  type: VisualType | null;
  data: Record<string, unknown> | null;
  message?: string;
}

export function validateVisualData(
  visualType: VisualType | string,
  visualJson: string
): VisualValidationResult {
  const normalizedType = visualType || "none";
  if (!isSupportedVisualType(normalizedType)) {
    return { status: "unsupported", type: null, data: null, message: "Unsupported visual type" };
  }

  if (normalizedType === "none" && !visualJson.trim()) {
    return { status: "empty", type: "none", data: null };
  }

  if (!visualJson.trim()) {
    const schema = getVisualSchema(normalizedType);
    if (schema.required.length > 0) {
      return { status: "invalid", type: normalizedType, data: null, message: "Visual data invalid" };
    }
    return { status: "valid", type: normalizedType, data: { type: normalizedType } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(visualJson);
  } catch {
    return { status: "invalid", type: normalizedType, data: null, message: "Visual data invalid" };
  }

  if (!isRecord(parsed)) {
    return { status: "invalid", type: normalizedType, data: null, message: "Visual data invalid" };
  }

  const embeddedType = typeof parsed.type === "string" ? parsed.type : normalizedType;
  if (!isSupportedVisualType(embeddedType)) {
    return { status: "unsupported", type: null, data: null, message: "Unsupported visual type" };
  }

  const type = normalizedType === "none" ? embeddedType : normalizedType;
  const schema = getVisualSchema(type);
  const missing = schema.required.filter((key) => parsed[key] === undefined || parsed[key] === null);
  if (missing.length > 0 || !hasShapeForType(type, parsed)) {
    return { status: "invalid", type, data: null, message: "Visual data invalid" };
  }

  return { status: "valid", type, data: { ...parsed, type } };
}

function hasShapeForType(type: VisualType, data: Record<string, unknown>): boolean {
  switch (type) {
    case "line_graph":
    case "scatter_plot":
      return isPointArray(data.points);
    case "function_graph":
      return data.points === undefined || isPointArray(data.points);
    case "bar_graph":
      return Array.isArray(data.bars);
    case "box_plot":
      return ["min", "q1", "median", "q3", "max"].every((key) => isFiniteNumber(data[key]));
    case "pie_chart":
      return Array.isArray(data.slices);
    case "table":
      return (
        (data.headers === undefined || Array.isArray(data.headers)) &&
        (data.rows === undefined || Array.isArray(data.rows))
      );
    default:
      return true;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function asNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export interface VisualPoint {
  x: number;
  y: number;
  label?: string;
}

export function toPoint(value: unknown): VisualPoint | null {
  if (!isRecord(value)) {
    return null;
  }
  const x = value.x;
  const y = value.y;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
    return null;
  }
  return { x, y, label: asString(value.label) || undefined };
}

export function toPointArray(value: unknown): VisualPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(toPoint).filter((point): point is VisualPoint => point !== null);
}

function isPointArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => toPoint(item) !== null);
}
