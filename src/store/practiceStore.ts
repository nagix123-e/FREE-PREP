import { create } from "zustand";
import type { AttemptMode, Question, ResponseRecord } from "../types";
import { buildPracticeQuestions, createPracticeAttempt, type PracticeConfig } from "../services/practiceService";
import { saveResponse } from "../services/testSessionService";
import { gradeMultipleChoice, gradeStudentResponse } from "../services/scoringService";

interface PracticeState {
  attemptId: number | null;
  mode: AttemptMode | null;
  questions: Question[];
  responsesByQuestionId: Record<number, ResponseRecord>;
  index: number;
  startPractice: (config: PracticeConfig) => Promise<number>;
  setIndex: (index: number) => void;
  answer: (question: Question, value: string) => Promise<void>;
  toggleEliminatedChoice: (question: Question, choice: string) => Promise<void>;
  toggleMarked: (question: Question) => Promise<void>;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  attemptId: null,
  mode: null,
  questions: [],
  responsesByQuestionId: {},
  index: 0,
  startPractice: async (config) => {
    const [attemptId, questions] = await Promise.all([
      createPracticeAttempt(config),
      buildPracticeQuestions(config)
    ]);
    set({ attemptId, mode: config.mode, questions, responsesByQuestionId: {}, index: 0 });
    return attemptId;
  },
  setIndex: (index) => set({ index }),
  answer: async (question, value) => {
    const response = makeResponse(get(), question, value);
    await saveResponse(response);
    set({ responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response } });
  },
  toggleEliminatedChoice: async (question, choice) => {
    const current = get().responsesByQuestionId[question.id ?? -1];
    const response = makeResponse(get(), question, current?.selectedAnswer ?? "");
    response.eliminatedChoices = current?.eliminatedChoices.includes(choice)
      ? current.eliminatedChoices.filter((item) => item !== choice)
      : [...(current?.eliminatedChoices ?? []), choice];
    await saveResponse(response);
    set({ responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response } });
  },
  toggleMarked: async (question) => {
    const current = get().responsesByQuestionId[question.id ?? -1];
    const response = makeResponse(get(), question, current?.selectedAnswer ?? "");
    response.marked = !current?.marked;
    await saveResponse(response);
    set({ responsesByQuestionId: { ...get().responsesByQuestionId, [response.questionId]: response } });
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
  return {
    attemptId: state.attemptId,
    questionId: question.id,
    selectedAnswer,
    isCorrect,
    marked: current?.marked ?? false,
    eliminatedChoices: current?.eliminatedChoices ?? [],
    timeSpentSec: current?.timeSpentSec ?? 0
  };
}
