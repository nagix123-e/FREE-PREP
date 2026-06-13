import type { Question, ResponseRecord } from "../../types";

export function QuestionMenu({
  currentIndex,
  questions,
  responsesByQuestionId,
  onClose,
  onJump,
  onReviewMarked,
  onReviewUnanswered
}: {
  currentIndex: number;
  questions: Question[];
  responsesByQuestionId: Record<number, ResponseRecord>;
  onClose: () => void;
  onJump: (index: number) => void;
  onReviewMarked: () => void;
  onReviewUnanswered: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 bg-slate-950/30">
      <div className="question-menu-panel absolute right-6 top-20 rounded-md border border-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Question Menu</h2>
          <button className="text-sm font-semibold text-slate-600" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-6 gap-2">
            {questions.map((question, index) => {
              const response = question.id ? responsesByQuestionId[question.id] : undefined;
              const answered = Boolean(response?.selectedAnswer);
              const marked = Boolean(response?.marked);
              return (
                <button
                  className={`h-12 rounded-md border text-sm font-semibold ${
                    index === currentIndex
                      ? "border-teal-600 bg-teal-50 text-teal-800"
                      : "border-line hover:bg-slate-50"
                  }`}
                  key={question.id}
                  onClick={() => onJump(index)}
                  type="button"
                >
                  <div>{index + 1}</div>
                  <div className="question-menu-status leading-none">
                    {answered ? "✓" : "○"} {marked ? "★" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onReviewUnanswered}
              type="button"
            >
              Review Unanswered
            </button>
            <button
              className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onReviewMarked}
              type="button"
            >
              Review Marked
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
