import type { ReactNode } from "react";

/**
 * Render only the canonical underline marker used in student-visible data.
 * All other HTML-like text remains ordinary React text and is never parsed.
 */
export function StudentText({ children }: { children: string }): ReactNode {
  const value = String(children ?? "");
  const nodes: ReactNode[] = [];
  const marker = /<u>([\s\S]*?)<\/u>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(value)) !== null) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    nodes.push(<u key={`underline-${match.index}`}>{match[1]}</u>);
    cursor = match.index + match[0].length;
  }

  if (nodes.length === 0) return value;
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}
