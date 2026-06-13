import { useAppStore } from "../../store/appStore";
import { usePracticeStore } from "../../store/practiceStore";
import { addToReviewList } from "../../services/reviewListService";
import { PassagePanel } from "../test/PassagePanel";
import { QuestionPanel } from "../test/QuestionPanel";

export function PracticeRunnerPage() {
  const navigate = useAppStore((state) => state.navigate);
  const { questions, index, responsesByQuestionId, setIndex, answer, toggleEliminatedChoice, toggleMarked } = usePracticeStore();
  const question = questions[index] ?? null;
  const response = question?.id ? responsesByQuestionId[question.id] ?? null : null;

  if (!question) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">No practice questions found</h2>
        <button className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate("dashboard")} type="button">
          Back to Dashboard
        </button>
      </section>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
        <div>
          <div className="text-sm font-semibold">Focused Practice</div>
          <div className="mt-1 text-xs text-muted">Question {index + 1} of {questions.length}</div>
        </div>
        <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => {
          void toggleMarked(question);
          if (question.id) void addToReviewList(question.id, "Added from practice", 2);
        }} type="button">
          {response?.marked ? "Saved to Review" : "Add To Review List"}
        </button>
      </header>
      <div className="test-runner-grid grid min-h-0 flex-1">
        <PassagePanel question={question} />
        <QuestionPanel
          onSelectAnswer={(value) => void answer(question, value)}
          onStudentResponse={(value) => void answer(question, value)}
          onToggleEliminated={(choice) => void toggleEliminatedChoice(question, choice)}
          question={question}
          response={response}
        />
      </div>
      <footer className="flex justify-between border-t border-line bg-white px-6 py-4">
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={index === 0} onClick={() => setIndex(index - 1)} type="button">Back</button>
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => navigate("dashboard")} type="button">Finish Practice</button>
        <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" disabled={index >= questions.length - 1} onClick={() => setIndex(index + 1)} type="button">Next</button>
      </footer>
    </div>
  );
}
