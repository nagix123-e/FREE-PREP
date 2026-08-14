import type { ReactNode } from "react";

export type StudentTextToken =
  | { type: "text"; value: string }
  | { type: "underline"; value: string };

/**
 * Tokenize the canonical underline markup used in current content and the
 * legacy delimiter still present in previously saved local question sets.
 * Invalid markup remains plain text rather than being partially interpreted.
 */
export function tokenizeStudentText(value: string): StudentTextToken[] {
  const input = String(value ?? "");
  const marker = /<u>([\s\S]*?)<\/u>|__([\s\S]*?)__/g;
  const matches = [...input.matchAll(marker)];

  if (matches.length === 0) return [{ type: "text", value: input }];

  const tokens: StudentTextToken[] = [];
  let cursor = 0;

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ type: "text", value: input.slice(cursor, start) });
    tokens.push({ type: "underline", value: match[1] ?? match[2] ?? "" });
    cursor = start + match[0].length;
  }

  if (cursor < input.length) tokens.push({ type: "text", value: input.slice(cursor) });
  return tokens;
}

/**
 * Render canonical and legacy underline markers without interpreting arbitrary
 * HTML. The legacy form is display-only compatibility for saved local data.
 */
export function StudentText({ children }: { children: string }): ReactNode {
  return tokenizeStudentText(children).map((token, index) =>
    token.type === "underline" ? <u key={`underline-${index}`}>{token.value}</u> : token.value
  );
}
