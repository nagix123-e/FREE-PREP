import { useEffect, useMemo, useState } from "react";
import { saveResponse } from "../services/testSessionService";
import { addToReviewList } from "../services/reviewListService";
import { listHighlights } from "../services/highlightService";
import { listNotes } from "../services/noteService";
import { getScoreResult } from "../services/scoringService";
import { getQuestionSet } from "../lib/database";
import { useAppStore } from "../store/appStore";
import type { GradedQuestion, QuestionSet, ResponseRecord, ScoreResult } from "../types";
import { ReviewQuestionCard } from "./review/ReviewQuestionCard";
import { DropdownSelect } from "./ui/DropdownSelect";

type BaseFilter = "all" | "incorrect" | "correct" | "marked" | "unanswered" | "rw" | "math";

export function ReviewAnswersPage() {
  const {
    selectedAttemptId,
    selectedSetId,
    navigate,
    setDbError,
    reviewFilterPreset,
    setReviewFilterPreset
  } = useAppStore();
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [isLoadingQuestionSet, setIsLoadingQuestionSet] = useState(Boolean(selectedSetId));
  const [reviewPassword, setReviewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [baseFilter, setBaseFilter] = useState<BaseFilter>(
    reviewFilterPreset === "incorrect" ? "incorrect" : "all"
  );
  const [domain, setDomain] = useState("");
  const [skillGroup, setSkillGroup] = useState("");
  const [topic, setTopic] = useState("");
  const [specialFilter, setSpecialFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [notedQuestionIds, setNotedQuestionIds] = useState<Set<number>>(new Set());
  const [highlightedQuestionIds, setHighlightedQuestionIds] = useState<Set<number>>(new Set());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!selectedAttemptId) {
      return;
    }
    getScoreResult(selectedAttemptId)
      .then((nextResult) => {
        setResult(nextResult);
        setDbError(null);
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : "Could not load answer review.")
      );
  }, [selectedAttemptId, setDbError]);

  useEffect(() => {
    setReviewPassword("");
    setPasswordError("");
    setIsUnlocked(false);

    if (!selectedSetId) {
      setQuestionSet(null);
      setIsLoadingQuestionSet(false);
      return;
    }

    setIsLoadingQuestionSet(true);
    getQuestionSet(selectedSetId)
      .then((nextSet) => {
        setQuestionSet(nextSet);
        setDbError(null);
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : "Could not load question set protection.")
      )
      .finally(() => setIsLoadingQuestionSet(false));
  }, [selectedSetId, setDbError]);

  useEffect(() => {
    if (!selectedAttemptId) return;
    void Promise.all([listNotes(selectedAttemptId), listHighlights(selectedAttemptId)])
      .then(([notes, highlights]) => {
        setNotedQuestionIds(new Set(notes.map((note) => note.questionId)));
        setHighlightedQuestionIds(new Set(highlights.map((highlight) => highlight.questionId)));
      })
      .catch(() => undefined);
  }, [selectedAttemptId]);

  useEffect(() => {
    setReviewFilterPreset(null);
  }, [setReviewFilterPreset]);

  const filtered = useMemo(() => {
    const items = result?.gradedQuestions ?? [];
    const filteredItems = items.filter((item) => {
      if (!matchesBaseFilter(item, baseFilter)) {
        return false;
      }
      if (domain && item.question.contentDomain !== domain) {
        return false;
      }
      if (skillGroup && item.question.skillGroup !== skillGroup) {
        return false;
      }
      if (topic && (item.question.questionTopic || "Unspecified") !== topic) {
        return false;
      }
      if (specialFilter === "weak" && item.question.scoringWeight >= 0 && item.isCorrect) {
        return false;
      }
      if (specialFilter === "notes" && (!item.question.id || !notedQuestionIds.has(item.question.id))) {
        return false;
      }
      if (specialFilter === "highlighted" && (!item.question.id || !highlightedQuestionIds.has(item.question.id))) {
        return false;
      }
      return true;
    });
    return sortItems(filteredItems, sortBy);
  }, [baseFilter, domain, highlightedQuestionIds, notedQuestionIds, result, skillGroup, sortBy, specialFilter, topic]);

  useEffect(() => {
    setIndex(0);
  }, [baseFilter, domain, skillGroup, specialFilter, sortBy, topic]);

  const current = filtered[index] ?? null;
  const domains = unique(result?.gradedQuestions.map((item) => item.question.contentDomain) ?? []);
  const skills = unique(result?.gradedQuestions.map((item) => item.question.skillGroup) ?? []);
  const topics = unique(result?.gradedQuestions.map((item) => item.question.questionTopic || "Unspecified") ?? []);

  async function handleAddToReviewList() {
    if (!current || !selectedAttemptId || !current.question.id) {
      return;
    }
    await saveResponse(makeResponse(current, selectedAttemptId, current.selectedAnswer, true));
    if (current.question.id) {
      await addToReviewList(current.question.id, "Added from answer review", 2);
    }
    setResult(await getScoreResult(selectedAttemptId));
  }

  if (!selectedAttemptId) {
    return <div className="text-sm text-muted">No attempt selected.</div>;
  }

  if (isLoadingQuestionSet) {
    return <div className="text-sm text-muted">Loading answer review...</div>;
  }

  if (questionSet?.previewPassword && !isUnlocked) {
    return (
      <section className="mx-auto max-w-md rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Password required for answer review</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your score is available, but answers and explanations for this question set require the 6-character password.
        </p>
        <input
          autoComplete="off"
          className="mt-5 w-full rounded-md border border-line px-3 py-2 text-sm tracking-[0.2em] outline-none focus:border-teal-600"
          maxLength={6}
          onChange={(event) => {
            setReviewPassword(event.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 6));
            setPasswordError("");
          }}
          placeholder="A1B2C3"
          type="password"
          value={reviewPassword}
        />
        {passwordError ? <div className="mt-3 text-xs font-semibold text-red-700">{passwordError}</div> : null}
        <div className="mt-5 flex gap-3">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            onClick={() => {
              if (reviewPassword === questionSet.previewPassword) {
                setIsUnlocked(true);
              } else {
                setPasswordError("The review password does not match.");
              }
            }}
            type="button"
          >
            Open answer review
          </button>
          <button
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("result", selectedSetId ?? undefined, selectedAttemptId)}
            type="button"
          >
            Back to score
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Review Answers</h2>
            <p className="mt-1 text-sm text-muted">{filtered.length} questions in current filter</p>
          </div>
          <button
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("result", selectedSetId ?? undefined, selectedAttemptId)}
            type="button"
          >
            Back To Result
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <DropdownSelect label="Filter" onChange={(value) => setBaseFilter(value as BaseFilter)} value={baseFilter} options={[
            { value: "all", label: "All" },
            { value: "incorrect", label: "Incorrect Only" },
            { value: "correct", label: "Correct Only" },
            { value: "marked", label: "Marked Only" },
            { value: "unanswered", label: "Unanswered Only" },
            { value: "rw", label: "RW Only" },
            { value: "math", label: "Math Only" }
          ]} />
          <DropdownSelect label="Content Domain" onChange={setDomain} value={domain} options={[
            { value: "", label: "All Domains" },
            ...domains.map((item) => ({ value: item, label: item }))
          ]} />
          <DropdownSelect label="Skill Group" onChange={setSkillGroup} value={skillGroup} options={[
            { value: "", label: "All Skills" },
            ...skills.map((item) => ({ value: item, label: item }))
          ]} />
          <DropdownSelect label="Question Topic" onChange={setTopic} value={topic} options={[
            { value: "", label: "All Topics" },
            ...topics.map((item) => ({ value: item, label: item }))
          ]} />
          <DropdownSelect label="Review Focus" onChange={setSpecialFilter} value={specialFilter} options={[
            { value: "", label: "Standard" },
            { value: "weak", label: "Show only weak skills" },
            { value: "notes", label: "Show only notes" },
            { value: "highlighted", label: "Show only highlighted" }
          ]} />
          <DropdownSelect label="Sort" onChange={setSortBy} value={sortBy} options={[
            { value: "", label: "Original order" },
            { value: "difficulty", label: "Sort by difficulty" },
            { value: "time", label: "Sort by time spent" },
            { value: "domain", label: "Sort by domain" }
          ]} />
        </div>
      </section>

      {current ? <ReviewQuestionCard item={current} /> : <div className="text-sm text-muted">No questions match this filter.</div>}

      <footer className="flex items-center justify-between rounded-md border border-line bg-white p-4 shadow-panel">
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={index === 0} onClick={() => setIndex(Math.max(0, index - 1))} type="button">
          Previous
        </button>
        <div className="flex gap-3">
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void handleAddToReviewList()} type="button">
            Add To Review List
          </button>
        </div>
        <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" disabled={index >= filtered.length - 1} onClick={() => setIndex(Math.min(filtered.length - 1, index + 1))} type="button">
          Next
        </button>
      </footer>
    </div>
  );
}

function sortItems(items: GradedQuestion[], sortBy: string): GradedQuestion[] {
  const copy = [...items];
  if (sortBy === "time") {
    return copy.sort((a, b) => (b.response?.timeSpentSec ?? 0) - (a.response?.timeSpentSec ?? 0));
  }
  if (sortBy === "domain") {
    return copy.sort((a, b) => a.question.contentDomain.localeCompare(b.question.contentDomain));
  }
  if (sortBy === "difficulty") {
    const rank = new Map([["hard", 0], ["medium", 1], ["easy", 2]]);
    return copy.sort((a, b) => (rank.get(a.question.difficulty) ?? 9) - (rank.get(b.question.difficulty) ?? 9));
  }
  return copy;
}

function matchesBaseFilter(item: GradedQuestion, filter: BaseFilter): boolean {
  if (filter === "incorrect") return !item.isCorrect && item.isAnswered;
  if (filter === "correct") return item.isCorrect;
  if (filter === "marked") return Boolean(item.response?.marked);
  if (filter === "unanswered") return !item.isAnswered;
  if (filter === "rw") return item.question.section === "RW";
  if (filter === "math") return item.question.section === "MATH";
  return true;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function makeResponse(
  item: GradedQuestion,
  attemptId: number,
  selectedAnswer: string,
  marked: boolean
): ResponseRecord {
  if (!item.question.id) {
    throw new Error("Question id is missing.");
  }
  return {
    attemptId,
    questionId: item.question.id,
    selectedAnswer,
    isCorrect: null,
    marked,
    eliminatedChoices: item.response?.eliminatedChoices ?? [],
    timeSpentSec: item.response?.timeSpentSec ?? 0
  };
}
