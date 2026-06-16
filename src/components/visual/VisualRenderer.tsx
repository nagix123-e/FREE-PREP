import type { VisualType } from "../../types";
import { validateVisualData } from "../../services/visualValidationService";
import { TableRenderer } from "./TableRenderer";
import { RendererFactory } from "./RendererFactory";
import { VisualUnavailableFallback } from "./VisualErrorFallback";

export function VisualRenderer({
  fallbackEquationText,
  tableMarkdown,
  visualJson,
  visualType
}: {
  fallbackEquationText?: string;
  tableMarkdown?: string;
  visualJson?: string;
  visualType?: VisualType | string;
}) {
  try {
    const type = visualType || "none";

    if ((type === "none" || type === "table") && tableMarkdown?.trim()) {
      return <TableRenderer data={{ type: "table" }} tableMarkdown={tableMarkdown} />;
    }

    const validation = validateVisualData(type, visualJson ?? "");
    if (validation.status === "empty") {
      return null;
    }
    if (validation.status === "unsupported") {
      logVisualIssue("Unsupported visual type", { visualType: type, visualJson });
      return <VisualUnavailableFallback />;
    }
    if (validation.status === "invalid" || !validation.type || !validation.data) {
      logVisualIssue("Invalid visual data", { visualType: type, visualJson });
      return <VisualUnavailableFallback />;
    }
    const data =
      validation.type === "function_graph"
        ? withFallbackEquation(validation.data, fallbackEquationText)
        : validation.data;

    return (
      <RendererFactory
        data={data}
        tableMarkdown={tableMarkdown}
        visualType={validation.type}
      />
    );
  } catch (error) {
    logVisualIssue("Failed to render visual", { error, visualType, visualJson });
    return <VisualUnavailableFallback />;
  }
}

function withFallbackEquation(
  data: Record<string, unknown>,
  fallbackEquationText?: string
): Record<string, unknown> {
  if (typeof data.equation === "string" || typeof data.equationLabel === "string" || Array.isArray(data.points)) {
    return data;
  }

  const equation = extractEquation(fallbackEquationText ?? "");
  return equation ? { ...data, equation } : data;
}

function extractEquation(text: string): string {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(/(?:f\(x\)|y)=([^,.;?]+)/i);
  return match ? `y=${match[1]}` : "";
}

function logVisualIssue(message: string, detail: unknown) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") {
    console.warn(message, detail);
  }
}
