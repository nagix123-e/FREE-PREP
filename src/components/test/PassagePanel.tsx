import type { Question } from "../../types";
import { VisualRenderer } from "../visual/VisualRenderer";
import { CrossTextPassage, splitCrossTextPassage } from "./CrossTextPassage";
import { MathRenderer } from "./MathRenderer";
import { StudentText } from "./StudentText";

export function PassagePanel({
  question
}: {
  question: Question;
}) {
  const passageText = normalizePassageText(question.passage);
  const hasPassage = passageText.length > 0;
  const crossTextParts = question.section === "RW" ? splitCrossTextPassage(passageText) : null;
  const hasTable = question.visualType === "table" && question.tableMarkdown.trim().length > 0;
  const hasVisualJson = question.visualType !== "none" && question.visualJson.trim().length > 0;
  const hasReferenceVisual = hasTable || hasVisualJson;
  const shouldShowPassageFirst = question.section === "RW" && hasPassage;

  return (
    <article className="relative h-full overflow-auto border-r border-line bg-white p-6">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {question.section === "RW" ? "Passage" : "Reference"}
      </div>
      {shouldShowPassageFirst ? (
        crossTextParts ? (
          <CrossTextPassage parts={crossTextParts} />
        ) : (
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            <StudentText>{passageText}</StudentText>
          </div>
        )
      ) : null}
      {!shouldShowPassageFirst && hasReferenceVisual ? (
        <div className="mt-4">
          <VisualRenderer
            fallbackEquationText={question.question}
            tableMarkdown={question.tableMarkdown}
            visualJson={question.visualJson}
            visualType={question.visualType}
          />
        </div>
      ) : null}
      {!shouldShowPassageFirst && !hasReferenceVisual && hasPassage ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          <StudentText>{passageText}</StudentText>
        </div>
      ) : null}
      {!shouldShowPassageFirst && !hasReferenceVisual && !hasPassage ? (
        <div className="mt-4 rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
          No passage provided.
        </div>
      ) : null}
      {shouldShowPassageFirst && hasReferenceVisual ? (
        <div className="mt-5">
          <VisualRenderer
            fallbackEquationText={question.question}
            tableMarkdown={question.tableMarkdown}
            visualJson={question.visualJson}
            visualType={question.visualType}
          />
        </div>
      ) : null}
      {question.section === "MATH" && question.equationLatex ? (
        <div className="mt-5">
          <MathRenderer latex={question.equationLatex} />
        </div>
      ) : null}
    </article>
  );
}

function normalizePassageText(value: string): string {
  return String(value || "").replace(/\\n/g, "\n").trim();
}
