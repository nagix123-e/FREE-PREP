import katex from "katex";
import { useMemo } from "react";

export function MathRenderer({ latex }: { latex: string }) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true
      }),
    [latex]
  );

  return (
    <div
      className="overflow-auto rounded-md border border-line bg-slate-50 p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
