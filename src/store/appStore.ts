import { create } from "zustand";
import type { QuestionSet, RouteKey } from "../types";

interface AppState {
  route: RouteKey;
  selectedSetId: number | null;
  selectedAttemptId: number | null;
  reviewFilterPreset: string | null;
  questionSets: QuestionSet[];
  dbError: string | null;
  navigate: (route: RouteKey, selectedSetId?: number, selectedAttemptId?: number) => void;
  setQuestionSets: (sets: QuestionSet[]) => void;
  setDbError: (message: string | null) => void;
  setReviewFilterPreset: (preset: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  route: "home",
  selectedSetId: null,
  selectedAttemptId: null,
  reviewFilterPreset: null,
  questionSets: [],
  dbError: null,
  navigate: (route, selectedSetId, selectedAttemptId) =>
    set({
      route,
      selectedSetId: selectedSetId ?? null,
      selectedAttemptId: selectedAttemptId ?? null
    }),
  setQuestionSets: (questionSets) => set({ questionSets }),
  setDbError: (dbError) => set({ dbError }),
  setReviewFilterPreset: (reviewFilterPreset) => set({ reviewFilterPreset })
}));
