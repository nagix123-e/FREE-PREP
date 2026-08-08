import { create } from "zustand";
import type { AttemptMode, Question, ResponseRecord } from "../types";
import {
  buildPracticeQuestions,
  completePracticeAttempt,
  createPracticeAttempt,
  type PracticeConfig,
  updatePracticeAttemptProgress
} from "../services/practiceService";
import { saveResponse } from "../services/testSessionService";
import { gradeMultipleChoice, gradeStudentResponse } from "../services/scoringService";

interface PracticeState {
  attemptId: number | null;
  questionSetId: number | null;
  mode: AttemptMode | null;
  questions: Question[];
  responsesByQuestionId: Record<number, ResponseRecord>;
  index: number;
  remainingTimeSec: number;
  timerEnabled: boolean;
  timerHidden: boolean;
  activeQuestionStartedAtMs: number;
  startPractice: (config: PracticeConfig) => Promise<number>;
  setIndex: (index: number) => Promise<void>;
  answer: (question: Question, value: string) => Promise<void>;
  toggleEliminatedChoice: (question: Question, choice: string) => Promise<void>;
  toggleMarked: (question: Question) => Promise<void>;
  tickTimer: () => Promise<void>;
  setTimerHidden: (hidden: boolean) => void;
  pausePractice: () => Promise<void>;
  resumePractice: () => Promise<void>;
  finishPractice: () => Promise<void>;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  attemptId: null,
  questionSetId: null,
  mode: null,
  questions: [],
  responsesByQuestionId: {},
  index: 0,
  remainingTimeSec: 0,
  timerEnabled: false,
  timerHidden: false,
  activeQuestionStartedAtMs: Date.now(),
  startPractice: async (config) => {
    const questions = await buildPracticeQuestions(config);
    if (questions.length === 0) {
      throw new Error("No practice questions are available.");
    }
    const effectiveConfig = { ...config, questionCount: questions.length };
    const attemptId = await createPracticeAttempt(effectiveConfig);
    set({
      attemptId,
      questionSetId: config.questionSetId,
      mode: config.mode,
      questions,
      responsesByQuestionId: {},
      index: 0,
      remainingTimeSec: effectiveConfig.timerEnabled ? effectiveConfig.questionCount * 90 : 0,
      timerEnabled: effectiveConfig.timerEnabled,
      timerHidden: !effectiveConfig.timerEnabled,
      activeQuestionStartedAtMs: Date.now()
    });
    return attemptId;
  },
  setIndex: async (index) => {
    await persistActivePracticeQuestionTime(set, get);
    const state = get();
    const nextIndex = Math.max(0, Math.min(index, state.questions.length - 1));
    set({ index: nextIndex, activeQuestionStartedAtMs: Date.now() });
    if (state.attemptId) {
      await updatePracticeAttemptProgress({
        attemptId: state.attemptId,
        questionIndex: nextIndex,
        remainingTimeSec: state.timerEnabled ? state.remainingTimeSec : null
      });
    }
  },
  answer: async (question, value) => {
    const response = makeResponse(get(), question, value);
    await saveResponse(response);
    set({
      responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response },
      activeQuestionStartedAtMs: Date.now()
    });
  },
  toggleEliminatedChoice: async (question, choice) => {
    const current = get().responsesByQuestionId[question.id ?? -1];
    const response = makeResponse(get(), question, current?.selectedAnswer ?? "");
    response.eliminatedChoices = current?.eliminatedChoices.includes(choice)
      ? current.eliminatedChoices.filter((item) => item !== choice)
      : [...(current?.eliminatedChoices ?? []), choice];
    await saveResponse(response);
    set({
      responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response },
      activeQuestionStartedAtMs: Date.now()
    });
  },
  toggleMarked: async (question) => {
    const current = get().responsesByQuestionId[question.id ?? -1];
    const response = makeResponse(get(), question, current?.selectedAnswer ?? "");
    response.marked = !current?.marked;
    await saveResponse(response);
    set({
      responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response },
      activeQuestionStartedAtMs: Date.now()
    });
  },
  tickTimer: async () => {
    const state = get();
    if (!state.timerEnabled || state.remainingTimeSec <= 0) return;
    const remainingTimeSec = Math.max(0, state.remainingTimeSec - 1);
    set({ remainingTimeSec });
    if (state.attemptId && remainingTimeSec % 15 === 0) {
      await updatePracticeAttemptProgress({
        attemptId: state.attemptId,
        questionIndex: state.index,
        remainingTimeSec
      });
    }
  },
  setTimerHidden: (hidden) => set({ timerHidden: hidden }),
  pausePractice: async () => {
    await persistActivePracticeQuestionTime(set, get);
    const state = get();
    if (!state.attemptId) return;
    await updatePracticeAttemptProgress({
      attemptId: state.attemptId,
      questionIndex: state.index,
      remainingTimeSec: state.timerEnabled ? state.remainingTimeSec : null,
      status: "paused"
    });
  },
  resumePractice: async () => {
    const state = get();
    if (!state.attemptId) return;
    await updatePracticeAttemptProgress({
      attemptId: state.attemptId,
      questionIndex: state.index,
      remainingTimeSec: state.timerEnabled ? state.remainingTimeSec : null,
      status: "in_progress"
    });
    set({ activeQuestionStartedAtMs: Date.now() });
  },
  finishPractice: async () => {
    await persistActivePracticeQuestionTime(set, get);
    const state = get();
    if (!state.attemptId) return;
    for (const question of state.questions) {
      if (!question.id || state.responsesByQuestionId[question.id]) {
        continue;
      }
      await saveResponse(makeBlankResponse(state, question));
    }
    await updatePracticeAttemptProgress({
      attemptId: state.attemptId,
      questionIndex: state.index,
      remainingTimeSec: state.timerEnabled ? state.remainingTimeSec : null
    });
    await completePracticeAttempt(state.attemptId);
  }
}));

function makeResponse(state: PracticeState, question: Question, selectedAnswer: string): ResponseRecord {
  if (!state.attemptId || !question.id) {
    throw new Error("Practice attempt is not ready.");
  }
  const isCorrect = selectedAnswer
    ? question.questionType === "student_response"
      ? gradeStudentResponse(selectedAnswer, question.correctNumericAnswer, question.answerTolerance)
      : gradeMultipleChoice(selectedAnswer, question.correctAnswer)
    : null;
  const current = state.responsesByQuestionId[question.id];
  const elapsedSec = Math.max(0, Math.round((Date.now() - state.activeQuestionStartedAtMs) / 1000));
  return {
    attemptId: state.attemptId,
    questionId: question.id,
    selectedAnswer,
    isCorrect,
    marked: current?.marked ?? false,
    eliminatedChoices: current?.eliminatedChoices ?? [],
    timeSpentSec: (current?.timeSpentSec ?? 0) + elapsedSec
  };
}

async function persistActivePracticeQuestionTime(
  set: (partial: Partial<PracticeState>) => void,
  get: () => PracticeState
): Promise<void> {
  const state = get();
  const question = state.questions[state.index];
  if (!question?.id || !state.attemptId) return;
  const response = makeResponse(state, question, state.responsesByQuestionId[question.id]?.selectedAnswer ?? "");
  await saveResponse(response);
  set({
    responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response },
    activeQuestionStartedAtMs: Date.now()
  });
}

function makeBlankResponse(state: PracticeState, question: Question): ResponseRecord {
  if (!state.attemptId || !question.id) {
    throw new Error("Practice attempt is not ready.");
  }
  return {
    attemptId: state.attemptId,
    questionId: question.id,
    selectedAnswer: "",
    isCorrect: null,
    marked: state.responsesByQuestionId[question.id]?.marked ?? false,
    eliminatedChoices: state.responsesByQuestionId[question.id]?.eliminatedChoices ?? [],
    timeSpentSec: 0
  };
}
