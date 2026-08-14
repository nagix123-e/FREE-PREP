import type { GradedQuestion } from "../../types";
import { MathRenderer } from "../test/MathRenderer";
import { VisualRenderer } from "../visual/VisualRenderer";
import { AnswerComparison } from "./AnswerComparison";
import { ExplanationBlock } from "./ExplanationBlock";
import { StudentText } from "../test/StudentText";

export function ReviewQuestionCard({ item }: { item: GradedQuestion }) {
  const question = item.question;
  const choices = [
    ["A", question.choiceA],
    ["B", question.choiceB],
    ["C", question.choiceC],
    ["D", question.choiceD]
  ];

  return (
    <article className="space-y-5 rounded-md border border-line bg-white p-6 shadow-panel">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <span>Question {question.questionNumber}</span>
        <span>{question.section}</span>
        <span>Module {question.module}</span>
        <span>{question.contentDomain}</span>
        <span>{question.skillGroup}</span>
        <span>{question.difficulty || "Difficulty unset"}</span>
      </div>

      {question.passage ? (
        <div className="whitespace-pre-wrap rounded-md border border-line bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <StudentText>{question.passage}</StudentText>
        </div>
      ) : null}

      <VisualRenderer
        tableMarkdown={question.tableMarkdown}
        visualJson={question.visualJson}
        visualType={question.visualType}
      />

      {question.equationLatex ? <MathRenderer latex={question.equationLatex} /> : null}

      <div className="whitespace-pre-wrap text-base font-medium leading-7"><StudentText>{question.question}</StudentText></div>

      {question.questionType === "multiple_choice" ? (
        <div className="space-y-2">
          {choices.map(([letter, text]) => (
            <div
              className={`rounded-md border p-3 text-sm ${
                question.correctAnswer === letter ? "border-teal-200 bg-teal-50" : "border-line"
              }`}
              key={letter}
            >
              <span className="mr-2 font-semibold">{letter}.</span>
              <StudentText>{text}</StudentText>
            </div>
          ))}
        </div>
      ) : null}

      <AnswerComparison
        correctAnswer={
          question.questionType === "student_response"
            ? question.correctNumericAnswer
            : question.correctAnswer
        }
        isCorrect={item.isCorrect}
        selectedAnswer={item.selectedAnswer}
      />

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Meta label="Time Spent" value={`${item.response?.timeSpentSec ?? 0}s`} />
        <Meta label="Marked" value={item.response?.marked ? "Yes" : "No"} />
        <Meta label="Topic" value={question.questionTopic || "Unspecified"} />
      </div>

      <ExplanationBlock explanation={question.explanation} />
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
