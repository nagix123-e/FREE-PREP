import type { ReactNode } from "react";

export type StudentTextToken =
  | { type: "text"; value: string }
  | { type: "underline"; value: string }
  | { type: "blank" };

/**
 * Tokenize the canonical underline markup used in current content and the
 * legacy delimiter still present in previously saved local question sets.
 * Invalid markup remains plain text rather than being partially interpreted.
 */
export function tokenizeStudentText(value: string): StudentTextToken[] {
  const input = String(value ?? "");
  // Four underscores are accepted for legacy CSVs; the boundary guards keep
  // three- and six-character runs from being partially interpreted.
  const marker = /<u>([\s\S]*?)<\/u>|(?<!_)_{4,5}(?!_)|__([\s\S]*?)__/g;
  const matches = [...input.matchAll(marker)];

  if (matches.length === 0) return [{ type: "text", value: input }];

  const tokens: StudentTextToken[] = [];
  let cursor = 0;

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ type: "text", value: input.slice(cursor, start) });
    if (match[0].startsWith("_")) {
      tokens.push({ type: "blank" });
    } else {
      tokens.push({ type: "underline", value: match[1] ?? match[2] ?? "" });
    }
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
    token.type === "underline" ? (
      <u key={`underline-${index}`}>{token.value}</u>
    ) : token.type === "blank" ? (
      <span aria-label="blank" className="student-text-blank" key={`blank-${index}`}>
        {"\u00a0"}
      </span>
    ) : (
      token.value
    )
  );
}
