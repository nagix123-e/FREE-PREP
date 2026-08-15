import type { Question, ResponseRecord } from "../../types";
import { ChoiceList } from "./ChoiceList";
import { MathRenderer } from "./MathRenderer";
import { StudentResponseInput } from "./StudentResponseInput";
import { StudentText } from "./StudentText";

export function QuestionPanel({
  question,
  response,
  onSelectAnswer,
  onStudentResponse,
  onToggleEliminated,
  onCheck,
  showFeedback,
  showExplanation
}: {
  question: Question;
  response: ResponseRecord | null;
  onSelectAnswer: (answer: string) => void;
  onStudentResponse: (answer: string) => void;
  onToggleEliminated: (choice: string) => void;
  onCheck?: () => void;
  showFeedback?: boolean;
  showExplanation?: boolean;
}) {
  const choices = [
    { letter: "A", text: question.choiceA },
    { letter: "B", text: question.choiceB },
    { letter: "C", text: question.choiceC },
    { letter: "D", text: question.choiceD }
  ];

  return (
    <article className="h-full overflow-auto bg-white p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <span>{question.section}</span>
        <span>Module {question.module}</span>
        <span>Question {question.questionNumber}</span>
      </div>
      <div className="mt-4 whitespace-pre-wrap text-base font-medium leading-7 text-ink">
        <StudentText>{question.question}</StudentText>
      </div>

      {question.section === "MATH" && question.equationLatex ? (
        <div className="mt-5">
          <MathRenderer latex={question.equationLatex} />
        </div>
      ) : null}

      {question.questionType === "student_response" ? (
        <>
          <StudentResponseInput
            answerFormat={question.section === "MATH" ? getStudentResponseAnswerFormat(question.correctNumericAnswer) : undefined}
            onChange={onStudentResponse}
            value={response?.selectedAnswer ?? ""}
          />
          {onCheck ? (
            <button
              className="mt-3 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!response?.selectedAnswer}
              onClick={onCheck}
              type="button"
            >
              Check
            </button>
          ) : null}
        </>
      ) : (
        <ChoiceList
          choices={choices}
          eliminatedChoices={response?.eliminatedChoices ?? []}
          onSelect={onSelectAnswer}
          onToggleEliminated={onToggleEliminated}
          selectedAnswer={response?.selectedAnswer ?? ""}
          onCheck={onCheck}
          checkDisabled={!response?.selectedAnswer}
        />
      )}

      {showFeedback ? (
        <div className={`mt-5 rounded-md border p-4 text-sm font-semibold ${response?.isCorrect ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {response?.isCorrect ? "Correct" : "Incorrect"}
        </div>
      ) : null}
      {showExplanation ? (
        <section className="mt-5 rounded-md border border-line bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-ink">Explanation</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Correct answer: <span className="font-semibold"><StudentText>{question.questionType === "student_response" ? question.correctNumericAnswer : question.correctAnswer}</StudentText></span>
          </p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700"><StudentText>{question.explanation || "No explanation provided."}</StudentText></div>
        </section>
      ) : null}
    </article>
  );
}

function getStudentResponseAnswerFormat(value: string): "Decimal" | "Fraction" | "Integer" {
  const answer = value.trim();
  if (answer.includes("/")) return "Fraction";
  if (answer.includes(".")) return "Decimal";
  return "Integer";
}
