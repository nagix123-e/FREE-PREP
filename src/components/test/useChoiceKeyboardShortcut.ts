import { useEffect } from "react";
import type { QuestionType } from "../../types";

const CHOICE_KEYS = new Set(["A", "B", "C", "D"]);

export function useChoiceKeyboardShortcut({
  enabled,
  questionType,
  onSelectAnswer
}: {
  enabled: boolean;
  questionType: QuestionType | undefined;
  onSelectAnswer: (answer: string) => void | Promise<void>;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!enabled || questionType !== "multiple_choice") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const choice = event.key.toUpperCase();
      if (!CHOICE_KEYS.has(choice)) return;

      event.preventDefault();
      void onSelectAnswer(choice);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onSelectAnswer, questionType]);
}
