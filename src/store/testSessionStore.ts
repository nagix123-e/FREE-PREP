import { create } from "zustand";
import { getModuleDurationSec, getModuleIndexesForAttemptMode, getModuleQuestions, TEST_MODULES } from "../lib/testPlan";
import {
  completeAttempt,
  createFullHardAttempt,
  loadAttempt,
  saveAttemptPosition,
  saveResponse
} from "../services/testSessionService";
import { gradeStudentResponse } from "../services/scoringService";
import type { Attempt, PracticeTestCourse, Question, ResponseRecord } from "../types";

interface TestSessionState {
  attempt: Attempt | null;
  questions: Question[];
  responsesByQuestionId: Record<number, ResponseRecord>;
  moduleIndex: number;
  questionIndex: number;
  remainingTimeSec: number;
  timerHidden: boolean;
  loading: boolean;
  error: string | null;
  startAttempt: (questionSetId: number, course?: PracticeTestCourse) => Promise<Attempt>;
  resumeAttempt: (attemptId: number) => Promise<void>;
  setTimerHidden: (hidden: boolean) => void;
  tickTimer: () => void;
  setQuestionIndex: (questionIndex: number) => Promise<void>;
  nextQuestion: () => Promise<void>;
  previousQuestion: () => Promise<void>;
  selectAnswer: (question: Question, answer: string) => Promise<void>;
  setStudentResponse: (question: Question, answer: string) => Promise<void>;
  toggleMarked: (question: Question) => Promise<void>;
  toggleEliminatedChoice: (question: Question, choice: string) => Promise<void>;
  enterModuleReview: () => Promise<void>;
  pauseAttempt: () => Promise<void>;
  submitModule: () => Promise<"test" | "sectionBreak" | "result">;
}

export const useTestSessionStore = create<TestSessionState>((set, get) => ({
  attempt: null,
  questions: [],
  responsesByQuestionId: {},
  moduleIndex: 0,
  questionIndex: 0,
  remainingTimeSec: getModuleDurationSec(0),
  timerHidden: false,
  loading: false,
  error: null,

  startAttempt: async (questionSetId, course = "all") => {
    set({ loading: true, error: null });
    try {
      const { attempt, questions, responses } = await createFullHardAttempt(questionSetId, course);
      const moduleIndex = findModuleIndex(attempt);
      set({
        attempt,
        questions,
        responsesByQuestionId: mapResponses(responses),
        moduleIndex,
        questionIndex: 0,
        remainingTimeSec: attempt.remainingTimeSec ?? getModuleDurationSec(moduleIndex),
        timerHidden: false,
        loading: false
      });
      return attempt;
    } catch (error) {
      set({ loading: false, error: formatError(error) });
      throw error;
    }
  },

  resumeAttempt: async (attemptId) => {
    set({ loading: true, error: null });
    try {
      const { attempt, questions, responses } = await loadAttempt(attemptId);
      const moduleIndex = Math.max(
        0,
        TEST_MODULES.findIndex(
          (spec) => spec.section === attempt.currentSection && spec.module === attempt.currentModule
        )
      );
      set({
        attempt,
        questions,
        responsesByQuestionId: mapResponses(responses),
        moduleIndex,
        questionIndex: attempt.currentQuestionIndex,
        remainingTimeSec: attempt.remainingTimeSec ?? getModuleDurationSec(moduleIndex),
        timerHidden: false,
        loading: false
      });
    } catch (error) {
      set({ loading: false, error: formatError(error) });
    }
  },

  setTimerHidden: (timerHidden) => set({ timerHidden }),

  tickTimer: () => {
    const { remainingTimeSec } = get();
    if (remainingTimeSec > 0) {
      set({ remainingTimeSec: remainingTimeSec - 1 });
    }
  },

  setQuestionIndex: async (questionIndex) => {
    const { attempt, moduleIndex, remainingTimeSec } = get();
    set({ questionIndex });
    if (attempt) {
      await saveAttemptPosition({
        attemptId: attempt.id,
        status: "in_progress",
        moduleIndex,
        questionIndex,
        remainingTimeSec
      });
    }
  },

  nextQuestion: async () => {
    const moduleQuestions = selectModuleQuestions(get());
    const nextIndex = Math.min(get().questionIndex + 1, Math.max(moduleQuestions.length - 1, 0));
    await get().setQuestionIndex(nextIndex);
  },

  previousQuestion: async () => {
    const nextIndex = Math.max(get().questionIndex - 1, 0);
    await get().setQuestionIndex(nextIndex);
  },

  selectAnswer: async (question, answer) => {
    await upsertResponse(question, answer, get, set);
  },

  setStudentResponse: async (question, answer) => {
    if (!isAllowedStudentResponse(answer)) {
      return;
    }
    await upsertResponse(question, answer, get, set);
  },

  toggleMarked: async (question) => {
    const existing = getExistingResponse(question, get);
    await persistResponse({
      ...existing,
      marked: !existing.marked
    }, set, get);
  },

  toggleEliminatedChoice: async (question, choice) => {
    const existing = getExistingResponse(question, get);
    const nextChoices = existing.eliminatedChoices.includes(choice)
      ? existing.eliminatedChoices.filter((item) => item !== choice)
      : [...existing.eliminatedChoices, choice];

    await persistResponse({
      ...existing,
      eliminatedChoices: nextChoices
    }, set, get);
  },

  enterModuleReview: async () => {
    const { attempt, moduleIndex, questionIndex, remainingTimeSec } = get();
    if (attempt) {
      await saveAttemptPosition({
        attemptId: attempt.id,
        status: "module_review",
        moduleIndex,
        questionIndex,
        remainingTimeSec
      });
    }
  },

  pauseAttempt: async () => {
    const { attempt, moduleIndex, questionIndex, remainingTimeSec } = get();
    if (attempt) {
      await saveAttemptPosition({
        attemptId: attempt.id,
        status: "paused",
        moduleIndex,
        questionIndex,
        remainingTimeSec
      });
      set({ attempt: { ...attempt, status: "paused", remainingTimeSec } });
    }
  },

  submitModule: async () => {
    const { attempt, moduleIndex } = get();
    if (!attempt) {
      return "result";
    }

    const activeModuleIndexes = getModuleIndexesForAttemptMode(attempt.mode);
    const lastModuleIndex = activeModuleIndexes[activeModuleIndexes.length - 1] ?? TEST_MODULES.length - 1;

    if (moduleIndex === lastModuleIndex) {
      await completeAttempt(attempt.id);
      set({
        attempt: { ...attempt, status: "completed", completedAt: new Date().toISOString() }
      });
      return "result";
    }

    if (attempt.mode === "full_hard_practice" && moduleIndex === 1) {
      await saveAttemptPosition({
        attemptId: attempt.id,
        status: "section_break",
        moduleIndex,
        questionIndex: 0,
        remainingTimeSec: 0
      });
      return "sectionBreak";
    }

    const nextModuleIndex = moduleIndex + 1;
    const nextRemaining = getModuleDurationSec(nextModuleIndex);
    set({
      moduleIndex: nextModuleIndex,
      questionIndex: 0,
      remainingTimeSec: nextRemaining
    });
    await saveAttemptPosition({
      attemptId: attempt.id,
      status: "in_progress",
      moduleIndex: nextModuleIndex,
      questionIndex: 0,
      remainingTimeSec: nextRemaining
    });
    return "test";
  }
}));

export function selectModuleQuestions(state: Pick<TestSessionState, "questions" | "moduleIndex">): Question[] {
  return getModuleQuestions(state.questions, state.moduleIndex);
}

export function getQuestionResponse(
  responsesByQuestionId: Record<number, ResponseRecord>,
  question: Question | null
): ResponseRecord | null {
  return question?.id ? responsesByQuestionId[question.id] ?? null : null;
}

function mapResponses(responses: ResponseRecord[]): Record<number, ResponseRecord> {
  return Object.fromEntries(responses.map((response) => [response.questionId, response]));
}

function findModuleIndex(attempt: Attempt): number {
  const moduleIndex = TEST_MODULES.findIndex(
    (spec) => spec.section === attempt.currentSection && spec.module === attempt.currentModule
  );
  return Math.max(0, moduleIndex);
}

async function upsertResponse(
  question: Question,
  answer: string,
  get: () => TestSessionState,
  set: (partial: Partial<TestSessionState>) => void
): Promise<void> {
  const existing = getExistingResponse(question, get);
  await persistResponse(
    {
      ...existing,
      selectedAnswer: answer,
      isCorrect: answer ? gradeAnswer(question, answer) : null
    },
    set,
    get
  );
}

async function persistResponse(
  response: ResponseRecord,
  set: (partial: Partial<TestSessionState>) => void,
  get: () => TestSessionState
): Promise<void> {
  await saveResponse(response);
  set({
    responsesByQuestionId: {
      ...get().responsesByQuestionId,
      [response.questionId]: response
    }
  });
}

function getExistingResponse(question: Question, get: () => TestSessionState): ResponseRecord {
  const attempt = get().attempt;
  if (!attempt || !question.id) {
    throw new Error("No active attempt or question id.");
  }

  return (
    get().responsesByQuestionId[question.id] ?? {
      attemptId: attempt.id,
      questionId: question.id,
      selectedAnswer: "",
      isCorrect: null,
      marked: false,
      eliminatedChoices: [],
      timeSpentSec: 0
    }
  );
}

function isAllowedStudentResponse(value: string): boolean {
  return value === "" || /^-?(?:\d+(?:\.\d*)?|\.\d+|\d+\/\d+)$/.test(value);
}

function normalizeAnswer(value: string): string {
  return value.trim().toUpperCase();
}

function gradeAnswer(question: Question, answer: string): boolean {
  if (question.questionType === "student_response") {
    return gradeStudentResponse(answer, question.correctNumericAnswer, question.answerTolerance);
  }
  return normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Could not update practice session.";
}
