import { getModuleDurationSec } from "../lib/testPlan";
import { useAppStore } from "../store/appStore";
import { useTestSessionStore } from "../store/testSessionStore";

export function SectionBreakPage() {
  const { selectedSetId, selectedAttemptId, navigate, setDbError } = useAppStore();
  const attempt = useTestSessionStore((state) => state.attempt);
  const moduleIndex = useTestSessionStore((state) => state.moduleIndex);
  const setQuestionIndex = useTestSessionStore((state) => state.setQuestionIndex);

  async function handleStartMath() {
    const nextModuleIndex = 2;
    useTestSessionStore.setState({
      moduleIndex: nextModuleIndex,
      questionIndex: 0,
      remainingTimeSec: getModuleDurationSec(nextModuleIndex)
    });
    try {
      await setQuestionIndex(0);
      navigate("test", selectedSetId ?? attempt?.questionSetId, selectedAttemptId ?? attempt?.id);
    } catch (error: unknown) {
      useTestSessionStore.setState({ moduleIndex });
      setDbError(error instanceof Error ? error.message : "Could not start Math section.");
    }
  }

  return (
    <section className="mx-auto mt-16 max-w-2xl rounded-md border border-line bg-white p-8 text-center shadow-panel">
      <h2 className="text-2xl font-semibold">Section Break</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Reading and Writing is complete. The next section is Math, starting with Math Module 1.
      </p>
      <button
        className="mt-6 rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600"
        onClick={() => void handleStartMath()}
        type="button"
      >
        Start Math Section
      </button>
    </section>
  );
}
