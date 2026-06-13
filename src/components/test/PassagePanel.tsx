import type { Question } from "../../types";
import { VisualRenderer } from "../visual/VisualRenderer";
import { MathRenderer } from "./MathRenderer";

export function PassagePanel({
  question
}: {
  question: Question;
}) {
  return (
    <article className="relative h-full overflow-auto border-r border-line bg-white p-6">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {question.section === "RW" ? "Passage" : "Reference"}
      </div>
      {question.passage ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {question.passage}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
          No passage provided.
        </div>
      )}
      <div className="mt-5">
        <VisualRenderer
          fallbackEquationText={question.question}
          tableMarkdown={question.tableMarkdown}
          visualJson={question.visualJson}
          visualType={question.visualType}
        />
      </div>
      {question.section === "MATH" && question.equationLatex ? (
        <div className="mt-5">
          <MathRenderer latex={question.equationLatex} />
        </div>
      ) : null}
    </article>
  );
}
