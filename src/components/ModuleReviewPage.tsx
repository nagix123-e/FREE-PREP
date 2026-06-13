import { useMemo } from "react";
import { TEST_MODULES } from "../lib/testPlan";
import { useAppStore } from "../store/appStore";
import {
  selectModuleQuestions,
  useTestSessionStore
} from "../store/testSessionStore";
import type { Question, ResponseRecord } from "../types";

export function ModuleReviewPage() {
  const { navigate, selectedSetId, selectedAttemptId } = useAppStore();
  const moduleIndex = useTestSessionStore((state) => state.moduleIndex);
  const questionIndex = useTestSessionStore((state) => state.questionIndex);
  const allQuestions = useTestSessionStore((state) => state.questions);
  const responsesByQuestionId = useTestSessionStore((state) => state.responsesByQuestionId);
  const setQuestionIndex = useTestSessionStore((state) => state.setQuestionIndex);
  const submitModule = useTestSessionStore((state) => state.submitModule);
  const spec = TEST_MODULES[moduleIndex];
  const questions = useMemo(
    () => selectModuleQuestions({ questions: allQuestions, moduleIndex }),
    [allQuestions, moduleIndex]
  );
  const stats = getReviewStats(questions, responsesByQuestionId);

  async function handleQuestionClick(index: number) {
    await setQuestionIndex(index);
    navigate("test", selectedSetId ?? undefined, selectedAttemptId ?? undefined);
  }

  async function handleSubmit() {
    const nextRoute = await submitModule();
    if (nextRoute === "sectionBreak") {
      navigate("sectionBreak", selectedSetId ?? undefined, selectedAttemptId ?? undefined);
      return;
    }
    if (nextRoute === "result") {
      navigate("result", selectedSetId ?? undefined, selectedAttemptId ?? undefined);
      return;
    }
    navigate("test", selectedSetId ?? undefined, selectedAttemptId ?? undefined);
  }

  return (
    <section className="mx-auto max-w-5xl rounded-md border border-line bg-white shadow-panel">
      <div className="border-b border-line p-6">
        <h2 className="text-xl font-semibold">{spec?.title ?? "Module"} Review</h2>
        <p className="mt-1 text-sm text-muted">Check unanswered or starred questions before submitting.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 p-6">
        <Metric label="Answered" value={stats.answered} />
        <Metric label="Unanswered" value={stats.unanswered} />
        <Metric label="Marked" value={stats.marked} />
      </div>

      <div className="border-t border-line p-6">
        <div className="grid grid-cols-6 gap-3">
          {questions.map((question, index) => {
            const response = question.id ? responsesByQuestionId[question.id] : undefined;
            const answered = Boolean(response?.selectedAnswer);
            const marked = Boolean(response?.marked);
            return (
              <button
                className={`rounded-md border p-3 text-left text-sm ${
                  index === questionIndex ? "border-teal-600 bg-teal-50" : "border-line hover:bg-slate-50"
                }`}
                key={question.id}
                onClick={() => void handleQuestionClick(index)}
                type="button"
              >
                <div className="font-semibold">Question {index + 1}</div>
                <div className="mt-1 text-xs text-muted">
                  {answered ? "Answered" : "Unanswered"} {marked ? "· Marked" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-line bg-slate-50 px-6 py-4">
        <button
          className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => navigate("test", selectedSetId ?? undefined, selectedAttemptId ?? undefined)}
          type="button"
        >
          Go Back to Questions
        </button>
        <button
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          onClick={() => void handleSubmit()}
          type="button"
        >
          Submit Module
        </button>
      </footer>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</div>
    </div>
  );
}

function getReviewStats(
  questions: Question[],
  responsesByQuestionId: Record<number, ResponseRecord>
) {
  return questions.reduce(
    (stats, question) => {
      const response = question.id ? responsesByQuestionId[question.id] : undefined;
      if (response?.selectedAnswer) {
        stats.answered += 1;
      } else {
        stats.unanswered += 1;
      }
      if (response?.marked) {
        stats.marked += 1;
      }
      return stats;
    },
    { answered: 0, unanswered: 0, marked: 0 }
  );
}
