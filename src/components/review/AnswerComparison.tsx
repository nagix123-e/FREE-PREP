export function AnswerComparison({
  correctAnswer,
  isCorrect,
  selectedAnswer
}: {
  correctAnswer: string;
  isCorrect: boolean;
  selectedAnswer: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-md border border-line bg-slate-50 p-3">
        <div className="text-xs font-semibold uppercase text-slate-500">Your Answer</div>
        <div className="mt-1 font-semibold">{selectedAnswer || "Unanswered"}</div>
      </div>
      <div className="rounded-md border border-line bg-slate-50 p-3">
        <div className="text-xs font-semibold uppercase text-slate-500">Correct Answer</div>
        <div className="mt-1 font-semibold">{correctAnswer}</div>
      </div>
      <div className="rounded-md border border-line bg-slate-50 p-3">
        <div className="text-xs font-semibold uppercase text-slate-500">Result</div>
        <div className={`mt-1 font-semibold ${isCorrect ? "text-teal-700" : "text-red-700"}`}>
          {isCorrect ? "Correct" : "Incorrect"}
        </div>
      </div>
    </div>
  );
}
