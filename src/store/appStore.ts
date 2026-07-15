import { create } from "zustand";
import type { QuestionSet, RouteKey } from "../types";

export type TutorialStep =
  | "home"
  | "dashboard"
  | "import_csv"
  | "question_sets"
  | "test_overview_continue"
  | "rules_continue"
  | "device_check_confirm"
  | "device_check_start"
  | "setup_start"
  | "highlight"
  | "answer_one_rw"
  | "mark_review"
  | "notes"
  | "shortcuts"
  | "pause_exit"
  | "score_history_delete"
  | "teacher_set_type"
  | "teacher_test_id"
  | "teacher_question"
  | "teacher_choice_a"
  | "teacher_choice_b"
  | "teacher_correct_answer"
  | "teacher_explanation"
  | "teacher_content_domain"
  | "teacher_download"
  | "teacher_done"
  | "done";

export interface TutorialState {
  active: boolean;
  step: TutorialStep;
  importedSetId?: number;
  importedSetName?: string;
  practiceSessionId?: number;
  scoreHistoryId?: number;
  tutorialSessionId?: string;
}

const EMPTY_TUTORIAL_STATE: TutorialState = {
  active: false,
  step: "home"
};

interface AppState {
  route: RouteKey;
  selectedSetId: number | null;
  selectedAttemptId: number | null;
  reviewFilterPreset: string | null;
  questionSets: QuestionSet[];
  dbError: string | null;
  tutorial: TutorialState;
  navigate: (route: RouteKey, selectedSetId?: number, selectedAttemptId?: number) => void;
  setQuestionSets: (sets: QuestionSet[]) => void;
  setDbError: (message: string | null) => void;
  setReviewFilterPreset: (preset: string | null) => void;
  startTutorial: () => void;
  startTeacherTutorial: () => void;
  exitTutorial: () => void;
  setTutorialStep: (step: TutorialStep) => void;
  recordTutorialImport: (setId: number, setName: string) => void;
  recordTutorialPractice: (attemptId: number) => void;
  recordTutorialHistory: (attemptId: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  route: "home",
  selectedSetId: null,
  selectedAttemptId: null,
  reviewFilterPreset: null,
  questionSets: [],
  dbError: null,
  tutorial: EMPTY_TUTORIAL_STATE,
  navigate: (route, selectedSetId, selectedAttemptId) =>
    set({
      route,
      selectedSetId: selectedSetId ?? null,
      selectedAttemptId: selectedAttemptId ?? null
    }),
  setQuestionSets: (questionSets) => set({ questionSets }),
  setDbError: (dbError) => set({ dbError }),
  setReviewFilterPreset: (reviewFilterPreset) => set({ reviewFilterPreset }),
  startTutorial: () =>
    set({
      route: "home",
      selectedSetId: null,
      selectedAttemptId: null,
      tutorial: {
        active: true,
        step: "home",
        tutorialSessionId: `tutorial-${Date.now()}`
      }
    }),
  startTeacherTutorial: () =>
    set({
      route: "teacherBuilder",
      selectedSetId: null,
      selectedAttemptId: null,
      tutorial: {
        active: true,
        step: "teacher_set_type",
        tutorialSessionId: `teacher-tutorial-${Date.now()}`
      }
    }),
  exitTutorial: () =>
    set({
      route: "home",
      selectedSetId: null,
      selectedAttemptId: null,
      tutorial: EMPTY_TUTORIAL_STATE
    }),
  setTutorialStep: (step) =>
    set((state) => ({
      tutorial: state.tutorial.active ? { ...state.tutorial, step } : state.tutorial
    })),
  recordTutorialImport: (setId, setName) =>
    set((state) => ({
      tutorial: state.tutorial.active
        ? { ...state.tutorial, step: "question_sets", importedSetId: setId, importedSetName: setName }
        : state.tutorial
    })),
  recordTutorialPractice: (attemptId) =>
    set((state) => ({
      tutorial: state.tutorial.active
        ? { ...state.tutorial, step: "highlight", practiceSessionId: attemptId }
        : state.tutorial
    })),
  recordTutorialHistory: (attemptId) =>
    set((state) => ({
      tutorial: state.tutorial.active
        ? { ...state.tutorial, step: "score_history_delete", scoreHistoryId: attemptId }
        : state.tutorial
    }))
}));
