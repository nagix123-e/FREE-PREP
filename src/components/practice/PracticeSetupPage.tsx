import { useEffect, useMemo, useState } from "react";
import { listQuestions } from "../../lib/database";
import { useAppStore } from "../../store/appStore";
import { usePracticeStore } from "../../store/practiceStore";
import { countMistakeQuestions } from "../../services/practiceService";
import type { Question, QuestionSet } from "../../types";
import { DropdownSelect } from "../ui/DropdownSelect";
import { NeonCheckbox } from "../ui/NeonCheckbox";

type PracticeSetupMode = "mistake_practice" | "domain_practice" | "review_list_practice";
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50, 100];

export function PracticeSetupPage({ mode }: { mode: PracticeSetupMode }) {
  const { questionSets, navigate } = useAppStore();
  const startPractice = usePracticeStore((state) => state.startPractice);
  const [questionSetId, setQuestionSetId] = useState(questionSets[0]?.id ?? 0);
  const [selectedSetIds, setSelectedSetIds] = useState<number[]>(() => questionSets[0]?.id ? [questionSets[0].id] : []);
  const [domainQuestions, setDomainQuestions] = useState<Question[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [availableMistakeQuestionCount, setAvailableMistakeQuestionCount] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(20);
  const [randomize, setRandomize] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [error, setError] = useState("");
  const isDomainPractice = mode === "domain_practice";
  const isMistakePractice = mode === "mistake_practice";
  const activeSetIds = useMemo(
    () => (isDomainPractice ? selectedSetIds : questionSetId ? [questionSetId] : []),
    [isDomainPractice, questionSetId, selectedSetIds]
  );
  const visibleQuestionSets = useMemo(
    () => getVisibleQuestionSetsForDomain(questionSets, domainQuestions, domain),
    [domain, domainQuestions, questionSets]
  );
  const availableDomainQuestionCount = useMemo(
    () => countAvailableDomainQuestions(domainQuestions, domain, activeSetIds),
    [activeSetIds, domain, domainQuestions]
  );
  const maxSelectableQuestionCount = isDomainPractice
    ? availableDomainQuestionCount
    : isMistakePractice
      ? availableMistakeQuestionCount ?? 0
      : Infinity;

  useEffect(() => {
    if (!isDomainPractice) {
      return;
    }
    if (selectedSetIds.length === 0 && visibleQuestionSets[0]?.id) {
      setSelectedSetIds([visibleQuestionSets[0].id]);
    }
  }, [isDomainPractice, selectedSetIds.length, visibleQuestionSets]);

  useEffect(() => {
    if (!isDomainPractice || questionSets.length === 0) {
      setDomainQuestions([]);
      setDomains([]);
      setDomain("");
      return;
    }

    let canceled = false;
    Promise.all(questionSets.map((set) => listQuestions(set.id)))
      .then((groups) => {
        if (canceled) return;
        const questions = groups.flat();
        const nextDomains = [...new Set(
          questions
            .map((question) => (question.contentDomain || question.domain).trim())
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));
        setDomainQuestions(questions);
        setDomains(nextDomains);
        setDomain((current) => (nextDomains.includes(current) ? current : nextDomains[0] ?? ""));
      })
      .catch(() => {
        if (!canceled) {
          setDomainQuestions([]);
          setDomains([]);
          setDomain("");
        }
      });

    return () => {
      canceled = true;
    };
  }, [isDomainPractice, questionSets]);

  useEffect(() => {
    if (!isDomainPractice) {
      return;
    }
    const visibleIds = new Set(visibleQuestionSets.map((set) => set.id));
    setSelectedSetIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));
      return next.length > 0 ? next : visibleQuestionSets[0]?.id ? [visibleQuestionSets[0].id] : [];
    });
  }, [isDomainPractice, visibleQuestionSets]);

  useEffect(() => {
    if (!isDomainPractice || availableDomainQuestionCount <= 0 || questionCount <= availableDomainQuestionCount) {
      return;
    }
    const nextCount = [...QUESTION_COUNT_OPTIONS].reverse().find((count) => count <= availableDomainQuestionCount) ?? availableDomainQuestionCount;
    setQuestionCount(nextCount);
  }, [availableDomainQuestionCount, isDomainPractice, questionCount]);

  useEffect(() => {
    if (!isMistakePractice || !questionSetId) {
      setAvailableMistakeQuestionCount(null);
      return;
    }

    let canceled = false;
    countMistakeQuestions(questionSetId)
      .then((count) => {
        if (!canceled) {
          setAvailableMistakeQuestionCount(count);
        }
      })
      .catch(() => {
        if (!canceled) {
          setAvailableMistakeQuestionCount(0);
        }
      });

    return () => {
      canceled = true;
    };
  }, [isMistakePractice, questionSetId]);

  useEffect(() => {
    if (!isMistakePractice || availableMistakeQuestionCount === null || availableMistakeQuestionCount <= 0 || questionCount <= availableMistakeQuestionCount) {
      return;
    }
    const nextCount = [...QUESTION_COUNT_OPTIONS].reverse().find((count) => count <= availableMistakeQuestionCount) ?? availableMistakeQuestionCount;
    setQuestionCount(nextCount);
  }, [availableMistakeQuestionCount, isMistakePractice, questionCount]);

  async function handleStart() {
    setError("");
    if (activeSetIds.length === 0) {
      setError(isDomainPractice ? "Choose at least one question set before starting practice." : "Choose a question set before starting practice.");
      return;
    }
    if (isDomainPractice && !domain) {
      setError("Choose a content domain before starting practice.");
      return;
    }
    if (isDomainPractice && questionCount > availableDomainQuestionCount) {
      setError(`Only ${availableDomainQuestionCount} questions are available for this domain selection.`);
      return;
    }
    if (isMistakePractice && availableMistakeQuestionCount !== null && questionCount > availableMistakeQuestionCount) {
      setError(`Only ${availableMistakeQuestionCount} mistaken questions are available for this question set.`);
      return;
    }
    try {
      await startPractice({
        questionSetId: activeSetIds[0],
        questionSetIds: activeSetIds,
        mode,
        domain: isDomainPractice ? domain : undefined,
        questionCount,
        randomize,
        timerEnabled
      });
      navigate("practiceRunner", activeSetIds[0]);
    } catch (startError: unknown) {
      setError(formatError(startError, "Could not start practice."));
    }
  }

  function toggleQuestionSet(id: number, checked: boolean) {
    setSelectedSetIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  return (
    <section className="mx-auto max-w-3xl rounded-md border border-line bg-white p-6 shadow-panel">
      <h2 className="text-2xl font-semibold">{titleForMode(mode)}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {isDomainPractice ? (
          <div className="col-span-2 rounded-md border border-line bg-slate-50 p-4">
            <div className="text-sm font-semibold">Question Sets</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {visibleQuestionSets.map((set) => (
                <label className="flex min-w-0 items-center gap-3 rounded-md border border-line bg-white p-3 text-sm font-semibold" key={set.id}>
                  <NeonCheckbox
                    ariaLabel={`Use ${set.name}`}
                    checked={selectedSetIds.includes(set.id)}
                    onChange={(checked) => toggleQuestionSet(set.id, checked)}
                  />
                  <span className="min-w-0">
                    <span className="csv-name-wrap block">{set.name}</span>
                    <span className="mt-1 block text-xs font-semibold uppercase text-slate-500">{labelForPackage(set)}</span>
                  </span>
                </label>
              ))}
            </div>
            {visibleQuestionSets.length === 0 && questionSets.length > 0 ? (
              <div className="mt-2 text-xs text-red-700">No question sets match the selected domain.</div>
            ) : null}
            {questionSets.length === 0 ? <div className="mt-2 text-xs text-red-700">No saved question sets are available.</div> : null}
          </div>
        ) : (
          <div>
            <DropdownSelect
              label="Question Set"
              onChange={(value) => setQuestionSetId(Number(value))}
              options={questionSets.map((set) => ({ value: set.id.toString(), label: set.name }))}
              value={questionSetId.toString()}
            />
            {questionSets.length === 0 ? <div className="mt-2 text-xs text-red-700">No saved question sets are available.</div> : null}
          </div>
        )}
        {isDomainPractice ? (
          <DropdownSelect
            label="Content Domain"
            onChange={setDomain}
            options={domains.map((item) => ({ value: item, label: item }))}
            value={domain}
          />
        ) : null}
        <QuestionCountSelector
          maxCount={maxSelectableQuestionCount}
          onChange={setQuestionCount}
          value={questionCount}
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

function QuestionCountSelector({
  maxCount,
  onChange,
  value
}: {
  maxCount: number;
  onChange: (count: number) => void;
  value: number;
}) {
  const options = getQuestionCountOptions(maxCount);
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">Question Count</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((count) => {
          const disabled = count > maxCount;
          return (
            <button
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                disabled
                  ? "border-red-200 bg-red-50 text-red-700 opacity-80"
                  : value === count
                    ? "border-transparent bg-teal-700 text-white"
                    : "border-line bg-white text-slate-700 hover:bg-slate-50"
              }`}
              disabled={disabled}
              key={count}
              onClick={() => onChange(count)}
              type="button"
            >
              {count}
            </button>
          );
        })}
      </div>
      {Number.isFinite(maxCount) ? (
        <div className="mt-2 text-xs text-muted">{maxCount} available questions</div>
      ) : null}
    </div>
  );
}

function countAvailableDomainQuestions(
  questions: Question[],
  domain: string,
  selectedSetIds: number[]
): number {
  const selectedIds = new Set(selectedSetIds);
  return questions.filter((question) => {
    const domainMatches = normalizeDomain(question.contentDomain || question.domain) === normalizeDomain(domain);
    return domainMatches && question.questionSetId !== undefined && selectedIds.has(question.questionSetId);
  }).length;
}

function getVisibleQuestionSetsForDomain(
  questionSets: QuestionSet[],
  questions: Question[],
  domain: string
): QuestionSet[] {
  if (!domain) {
    return questionSets;
  }

  return questionSets.filter((set) => {
    const matchingQuestions = questions.filter(
      (question) =>
        question.questionSetId === set.id &&
        normalizeDomain(question.contentDomain || question.domain) === normalizeDomain(domain)
    );
    if (matchingQuestions.length === 0) {
      return false;
    }

    const sections = new Set(matchingQuestions.map((question) => question.section));
    if (set.packageType === "full_test") {
      return true;
    }
    if (set.packageType === "rw_section") {
      return sections.has("RW");
    }
    if (set.packageType === "math_section") {
      return sections.has("MATH");
    }
    return false;
  });
}

function getQuestionCountOptions(maxCount: number): number[] {
  if (!Number.isFinite(maxCount)) {
    return QUESTION_COUNT_OPTIONS;
  }
  const options = [...QUESTION_COUNT_OPTIONS];
  if (maxCount > 0 && !options.includes(maxCount)) {
    options.unshift(maxCount);
  }
  return [...new Set(options)].sort((a, b) => a - b);
}

function labelForPackage(set: QuestionSet): string {
  if (set.packageType === "rw_section") return "RW";
  if (set.packageType === "math_section") return "Math";
  return "Full practice";
}

function normalizeDomain(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function titleForMode(mode: PracticeSetupMode): string {
  if (mode === "mistake_practice") return "Mistake Practice";
  if (mode === "domain_practice") return "Domain Practice";
  return "Review List Practice";
}
