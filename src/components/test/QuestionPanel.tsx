import type { Question, ResponseRecord } from "../../types";
import { ChoiceList } from "./ChoiceList";
import { MathRenderer } from "./MathRenderer";
import { StudentResponseInput } from "./StudentResponseInput";

export function QuestionPanel({
  question,
  response,
  onSelectAnswer,
  onStudentResponse,
  onToggleEliminated
}: {
  question: Question;
  response: ResponseRecord | null;
  onSelectAnswer: (answer: string) => void;
  onStudentResponse: (answer: string) => void;
  onToggleEliminated: (choice: string) => void;
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
        {question.question}
      </div>

      {question.section === "MATH" && question.equationLatex ? (
        <div className="mt-5">
          <MathRenderer latex={question.equationLatex} />
        </div>
      ) : null}

      {question.questionType === "student_response" ? (
        <StudentResponseInput
          answerFormat={question.section === "MATH" ? getStudentResponseAnswerFormat(question.correctNumericAnswer) : undefined}
          onChange={onStudentResponse}
          value={response?.selectedAnswer ?? ""}
        />
      ) : (
        <ChoiceList
          choices={choices}
          eliminatedChoices={response?.eliminatedChoices ?? []}
          onSelect={onSelectAnswer}
          onToggleEliminated={onToggleEliminated}
          selectedAnswer={response?.selectedAnswer ?? ""}
        />
      )}
    </article>
  );
}

function getStudentResponseAnswerFormat(value: string): "Decimal" | "Fraction" | "Integer" {
  const answer = value.trim();
  if (answer.includes("/")) return "Fraction";
  if (answer.includes(".")) return "Decimal";
  return "Integer";
}
