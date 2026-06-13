import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { usePracticeStore } from "../../store/practiceStore";
import { DropdownSelect } from "../ui/DropdownSelect";
import { NeonCheckbox } from "../ui/NeonCheckbox";

type PracticeSetupMode = "mistake_practice" | "review_list_practice";

export function PracticeSetupPage({ mode }: { mode: PracticeSetupMode }) {
  const { questionSets, navigate } = useAppStore();
  const startPractice = usePracticeStore((state) => state.startPractice);
  const [questionSetId, setQuestionSetId] = useState(questionSets[0]?.id ?? 0);
  const [questionCount, setQuestionCount] = useState(20);
  const [randomize, setRandomize] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    if (!questionSetId) {
      setError("Choose a question set before starting practice.");
      return;
    }
    try {
      await startPractice({ questionSetId, mode, questionCount, randomize, timerEnabled });
      navigate("practiceRunner", questionSetId);
    } catch (startError: unknown) {
      setError(formatError(startError, "Could not start practice."));
    }
  }

  return (
    <section className="mx-auto max-w-3xl rounded-md border border-line bg-white p-6 shadow-panel">
      <h2 className="text-2xl font-semibold">{titleForMode(mode)}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <DropdownSelect
            label="Question Set"
            onChange={(value) => setQuestionSetId(Number(value))}
            options={questionSets.map((set) => ({ value: set.id.toString(), label: set.name }))}
            value={questionSetId.toString()}
          />
          {questionSets.length === 0 ? <div className="mt-2 text-xs text-red-700">No saved question sets are available.</div> : null}
        </div>
        <DropdownSelect
          label="Question Count"
          onChange={(value) => setQuestionCount(Number(value))}
          options={[10, 20, 30, 50, 100].map((count) => ({ value: count.toString(), label: count.toString() }))}
          value={questionCount.toString()}
        />
        <label className="flex items-center gap-3 text-sm font-semibold">
          <NeonCheckbox ariaLabel="Randomize questions" checked={randomize} onChange={setRandomize} />
          Randomize
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <NeonCheckbox ariaLabel="Enable timer" checked={timerEnabled} onChange={setTimerEnabled} />
          Timer
        </label>
      </div>
      <button className="mt-6 rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white" onClick={() => void handleStart()} type="button">
        Start Practice
      </button>
      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
    </section>
  );
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function titleForMode(mode: PracticeSetupMode): string {
  if (mode === "mistake_practice") return "Mistake Practice";
  return "Review List Practice";
}
