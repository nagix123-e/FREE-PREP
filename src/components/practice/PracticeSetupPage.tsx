import { useEffect, useMemo, useState } from "react";
import { getAvailableFilters } from "../../services/practiceService";
import { useAppStore } from "../../store/appStore";
import { usePracticeStore } from "../../store/practiceStore";
import type { AttemptMode } from "../../types";
import { DropdownSelect } from "../ui/DropdownSelect";
import { NeonCheckbox } from "../ui/NeonCheckbox";

const DEFAULT_OPTIONS = {
  domain_practice: ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions", "Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"],
  skill_practice: ["Central Ideas and Details", "Command of Evidence", "Inferences", "Words in Context", "Text Structure and Purpose", "Cross-Text Connections", "Rhetorical Synthesis", "Transitions", "Boundaries", "Form Structure and Sense", "Linear Equations", "Linear Functions", "Systems of Equations", "Nonlinear Functions", "Equivalent Expressions", "Ratios Rates and Proportions", "Percentages", "Probability", "Statistics", "Area and Volume", "Lines Angles and Triangles", "Right Triangles", "Trigonometry", "Circles"],
  topic_practice: ["Vocabulary", "Punctuation", "Sentence Boundaries", "Transition Words", "Evidence Questions", "Graphs", "Linear Systems", "Quadratics", "Exponents", "Functions", "Probability", "Geometry", "Trigonometry"]
};

export function PracticeSetupPage({ mode }: { mode: AttemptMode }) {
  const { questionSets, navigate } = useAppStore();
  const startPractice = usePracticeStore((state) => state.startPractice);
  const [questionSetId, setQuestionSetId] = useState(questionSets[0]?.id ?? 0);
  const [filterValue, setFilterValue] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [randomize, setRandomize] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [available, setAvailable] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!questionSetId || mode === "mistake_practice" || mode === "review_list_practice") {
      return;
    }
    getAvailableFilters(questionSetId).then((filters) => {
      const values = mode === "domain_practice" ? filters.domains : mode === "skill_practice" ? filters.skills : filters.topics;
      setAvailable(values);
      setFilterValue(values[0] ?? defaultOptions(mode)[0] ?? "");
    });
  }, [mode, questionSetId]);

  const options = useMemo(() => available.length > 0 ? available : defaultOptions(mode), [available, mode]);

  async function handleStart() {
    setError("");
    if (!questionSetId) {
      setError("Choose a question set before starting practice.");
      return;
    }
    if (mode !== "mistake_practice" && mode !== "review_list_practice" && !filterValue.trim()) {
      setError("Choose a focus area before starting practice.");
      return;
    }
    try {
      await startPractice({ questionSetId, mode, filterValue, questionCount, randomize, timerEnabled });
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
        {mode !== "mistake_practice" && mode !== "review_list_practice" ? (
          <div>
            <DropdownSelect
              label="Focus"
              onChange={setFilterValue}
              options={options.map((option) => ({ value: option, label: option }))}
              value={filterValue}
            />
            {!filterValue.trim() ? <div className="mt-2 text-xs text-red-700">Focus area is required.</div> : null}
          </div>
        ) : null}
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

function defaultOptions(mode: AttemptMode): string[] {
  if (mode === "domain_practice") return DEFAULT_OPTIONS.domain_practice;
  if (mode === "skill_practice") return DEFAULT_OPTIONS.skill_practice;
  if (mode === "topic_practice") return DEFAULT_OPTIONS.topic_practice;
  return [];
}

function titleForMode(mode: AttemptMode): string {
  if (mode === "domain_practice") return "Domain Practice";
  if (mode === "skill_practice") return "Skill Practice";
  if (mode === "topic_practice") return "Topic Practice";
  if (mode === "mistake_practice") return "Mistake Practice";
  return "Review List Practice";
}
