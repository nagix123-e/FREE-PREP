import { useEffect, useMemo, useState } from "react";
import { applyHighlight, removeHighlight, replaceHighlightColor } from "../../services/highlightService";
import { addToReviewList } from "../../services/reviewListService";
import { useAppStore } from "../../store/appStore";
import { usePracticeStore } from "../../store/practiceStore";
import type { HighlightRecord, ResponseRecord } from "../../types";
import { CalculatorModal } from "../test/CalculatorModal";
import { HighlightToolbar } from "../test/HighlightToolbar";
import { KeyboardShortcutHelp } from "../test/KeyboardShortcutHelp";
import { MarkForReviewButton } from "../test/MarkForReviewButton";
import { NotesPanel } from "../test/NotesPanel";
import { PassagePanel } from "../test/PassagePanel";
import { PauseDialog } from "../test/PauseDialog";
import { QuestionMenu } from "../test/QuestionMenu";
import { QuestionPanel } from "../test/QuestionPanel";
import { ReferenceSheetModal } from "../test/ReferenceSheetModal";
import { TestNavigation } from "../test/TestNavigation";
import { TimerBar } from "../test/TimerBar";

export function PracticeRunnerPage() {
  const { navigate, setDbError } = useAppStore();
  const {
    attemptId,
    questionSetId,
    mode,
    questions,
    index,
    responsesByQuestionId,
    remainingTimeSec,
    timerEnabled,
    timerHidden,
    setIndex,
    answer,
    toggleEliminatedChoice,
    toggleMarked,
    tickTimer,
    setTimerHidden,
    pausePractice,
    resumePractice,
    finishPractice
  } = usePracticeStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const question = questions[index] ?? null;
  const response = question?.id ? responsesByQuestionId[question.id] ?? null : null;
  const isLastQuestion = index >= questions.length - 1;

  useEffect(() => {
    if (!timerEnabled || paused || remainingTimeSec <= 0) return;
    const intervalId = window.setInterval(() => {
      void tickTimer();
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [paused, remainingTimeSec, tickTimer, timerEnabled]);

  useEffect(() => {
    if (timerEnabled && remainingTimeSec === 0 && questions.length > 0) {
      void handleFinishPractice();
    }
  }, [remainingTimeSec, timerEnabled, questions.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowRight") void handleNext();
      if (event.key === "ArrowLeft") void handleBack();
      if (event.key.toLowerCase() === "m" && question) void handleToggleMarked();
      if (event.key.toLowerCase() === "q") setMenuOpen(true);
      if (event.key.toLowerCase() === "p") void handlePause();
      if (event.key.toLowerCase() === "t" && timerEnabled) setTimerHidden(!timerHidden);
      if (event.ctrlKey && event.key === "Enter") void handleFinishPractice();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const firstUnanswered = useMemo(
    () => questions.findIndex((item) => !getPracticeResponse(responsesByQuestionId, item.id)?.selectedAnswer),
    [questions, responsesByQuestionId]
  );
  const firstMarked = useMemo(
    () => questions.findIndex((item) => getPracticeResponse(responsesByQuestionId, item.id)?.marked),
    [questions, responsesByQuestionId]
  );

  async function handleBack() {
    if (index > 0) {
      await setIndex(index - 1);
    }
  }

  async function handleNext() {
    if (!isLastQuestion) {
      await setIndex(index + 1);
    }
  }

  async function handleJump(nextIndex: number) {
    await setIndex(nextIndex);
    setMenuOpen(false);
  }

  async function handleReviewUnanswered() {
    if (firstUnanswered >= 0) {
      await handleJump(firstUnanswered);
    }
  }

  async function handleReviewMarked() {
    if (firstMarked >= 0) {
      await handleJump(firstMarked);
    }
  }

  async function handleToggleMarked() {
    if (!question) return;
    await toggleMarked(question);
    if (question.id) {
      await addToReviewList(question.id, "Added from practice", 2);
    }
  }

  async function handlePause() {
    await pausePractice();
    setPaused(true);
  }

  async function handleFinishPractice() {
    try {
      await finishPractice();
      navigate("result", questionSetId ?? undefined, attemptId ?? undefined);
    } catch (error: unknown) {
      setDbError(error instanceof Error ? error.message : "Could not finish practice.");
      navigate("dashboard");
    }
  }

  async function handleHighlight(color: HighlightRecord["color"]) {
    if (!attemptId || !question?.id) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    if (!selection || selection.rangeCount === 0 || !selectedText) return;
    const range = selection.getRangeAt(0);
    const existingMarker = findSelectedHighlightMarker(range);
    const textForStorage = (existingMarker?.textContent ?? selectedText).trim();
    if (!textForStorage) return;
    const passage = question.passage || question.question || "";
    const startOffset = Math.max(0, passage.indexOf(textForStorage));
    const highlightInput = {
      attemptId,
      questionId: question.id,
      selectedText: textForStorage,
      startOffset,
      endOffset: startOffset + textForStorage.length,
      color
    };

    try {
      if (existingMarker) {
        const existingColor = getHighlightMarkerColor(existingMarker);
        if (existingColor === color) {
          await removeHighlight(highlightInput);
          unwrapHighlightMarker(existingMarker);
        } else {
          await replaceHighlightColor(highlightInput);
          setHighlightMarkerColor(existingMarker, color);
        }
      } else {
        const action = await applyHighlight(highlightInput);
        if (action === "removed") return;
        const marker = document.createElement("mark");
        marker.className = `practice-highlight practice-highlight-${color}`;
        range.surroundContents(marker);
      }
    } catch {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    } finally {
      selection.removeAllRanges();
    }
  }

  if (!question) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">No practice questions found</h2>
        <button className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate("dashboard")} type="button">
          Back to Dashboard
        </button>
      </section>
    );
  }

  return (
    <div className="test-shell-frame flex h-screen flex-col bg-slate-50 px-3 pb-1 pt-3 text-ink">
      <header className="flex items-center justify-between rounded-t-md border border-line bg-white px-6 py-3">
        <div>
          <div className="text-sm font-semibold">{formatPracticeTitle(mode)}</div>
          <div className="mt-1 text-xs text-muted">
            Question {index + 1} of {questions.length}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {timerEnabled ? (
            <TimerBar
              hidden={timerHidden}
              onToggleHidden={() => setTimerHidden(!timerHidden)}
              remainingTimeSec={remainingTimeSec}
            />
          ) : null}
          <HighlightToolbar onHighlight={(color) => void handleHighlight(color)} />
          <MarkForReviewButton marked={Boolean(response?.marked)} onToggle={() => void handleToggleMarked()} />
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setNotesOpen(true)} type="button">
            Notes
          </button>
          {question.section === "MATH" ? (
            <>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setReferenceOpen(true)} type="button">
                Reference
              </button>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setCalculatorOpen(true)} type="button">
                Calculator
              </button>
            </>
          ) : null}
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setShortcutsOpen(true)} type="button">
            Shortcuts
          </button>
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void handlePause()} type="button">
            Pause
          </button>
        </div>
      </header>

      <div className="test-runner-grid grid min-h-0 flex-1 border-x border-line bg-white">
        <PassagePanel question={question} />
        <QuestionPanel
          onSelectAnswer={(value) => void answer(question, value)}
          onStudentResponse={(value) => void answer(question, value)}
          onToggleEliminated={(choice) => void toggleEliminatedChoice(question, choice)}
          question={question}
          response={response}
        />
      </div>

      <TestNavigation
        canGoBack={index > 0}
        canGoNext={!isLastQuestion}
        onBack={() => void handleBack()}
        onNext={() => void handleNext()}
        onOpenMenu={() => setMenuOpen(true)}
        onReview={() => void handleFinishPractice()}
        reviewLabel="Finish Practice"
        submitLabel="Finish Practice"
        submitMode={isLastQuestion}
      />

      {menuOpen ? (
        <QuestionMenu
          currentIndex={index}
          onClose={() => setMenuOpen(false)}
          onJump={(nextIndex) => void handleJump(nextIndex)}
          onReviewMarked={() => void handleReviewMarked()}
          onReviewUnanswered={() => void handleReviewUnanswered()}
          questions={questions}
          responsesByQuestionId={responsesByQuestionId}
        />
      ) : null}
      {paused ? (
        <PauseDialog
          onExit={() => navigate("home")}
          onResume={() => {
            void resumePractice();
            setPaused(false);
          }}
        />
      ) : null}
      {notesOpen && attemptId && question.id ? (
        <NotesPanel attemptId={attemptId} onClose={() => setNotesOpen(false)} questionId={question.id} />
      ) : null}
      {referenceOpen ? <ReferenceSheetModal onClose={() => setReferenceOpen(false)} /> : null}
      {calculatorOpen ? <CalculatorModal onClose={() => setCalculatorOpen(false)} /> : null}
      {shortcutsOpen ? <KeyboardShortcutHelp onClose={() => setShortcutsOpen(false)} /> : null}
    </div>
  );
}

function getPracticeResponse(
  responsesByQuestionId: Record<number, ResponseRecord>,
  questionId: number | undefined
): ResponseRecord | undefined {
  return questionId ? responsesByQuestionId[questionId] : undefined;
}

function formatPracticeTitle(mode: ReturnType<typeof usePracticeStore.getState>["mode"]): string {
  if (mode === "mistake_practice") return "Mistake Practice";
  if (mode === "domain_practice") return "Domain Practice";
  if (mode === "review_list_practice") return "Review List Practice";
  return "Focused Practice";
}

function findSelectedHighlightMarker(range: Range): HTMLElement | null {
  const start =
    range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
  const end =
    range.endContainer instanceof HTMLElement
      ? range.endContainer
      : range.endContainer.parentElement;
  const startMarker = start?.closest("mark.practice-highlight");
  const endMarker = end?.closest("mark.practice-highlight");

  if (startMarker && startMarker === endMarker && startMarker instanceof HTMLElement) {
    return startMarker;
  }
  if (startMarker && range.commonAncestorContainer === startMarker && startMarker instanceof HTMLElement) {
    return startMarker;
  }
  return null;
}

function setHighlightMarkerColor(marker: HTMLElement, color: HighlightRecord["color"]): void {
  marker.classList.remove("practice-highlight-yellow", "practice-highlight-blue", "practice-highlight-pink");
  marker.classList.add(`practice-highlight-${color}`);
}

function getHighlightMarkerColor(marker: HTMLElement): HighlightRecord["color"] | null {
  if (marker.classList.contains("practice-highlight-blue")) return "blue";
  if (marker.classList.contains("practice-highlight-pink")) return "pink";
  if (marker.classList.contains("practice-highlight-yellow")) return "yellow";
  return null;
}

function unwrapHighlightMarker(marker: HTMLElement): void {
  const parent = marker.parentNode;
  if (!parent) return;
  while (marker.firstChild) {
    parent.insertBefore(marker.firstChild, marker);
  }
  parent.removeChild(marker);
  parent.normalize();
}
