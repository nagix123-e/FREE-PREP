import { useEffect, useMemo, useState } from "react";
import { applyHighlight, removeHighlight, replaceHighlightColor } from "../services/highlightService";
import { loadSettings } from "../services/settingsService";
import { TEST_MODULES } from "../lib/testPlan";
import { useAppStore } from "../store/appStore";
import {
  getQuestionResponse,
  selectModuleQuestions,
  useTestSessionStore
} from "../store/testSessionStore";
import { MarkForReviewButton } from "./test/MarkForReviewButton";
import { CalculatorModal } from "./test/CalculatorModal";
import { HighlightToolbar } from "./test/HighlightToolbar";
import {
  createHighlightMarker,
  findSelectedHighlightMarker,
  getHighlightMarkerColor,
  getHighlightMarkerOffsets,
  setHighlightMarkerColor,
  unwrapHighlightMarker
} from "./test/highlightDom";
import { KeyboardShortcutHelp } from "./test/KeyboardShortcutHelp";
import { NotesPanel } from "./test/NotesPanel";
import { PauseDialog } from "./test/PauseDialog";
import { PassagePanel } from "./test/PassagePanel";
import { QuestionMenu } from "./test/QuestionMenu";
import { QuestionPanel } from "./test/QuestionPanel";
import { ReferenceSheetModal } from "./test/ReferenceSheetModal";
import { TestNavigation } from "./test/TestNavigation";
import { TimerBar } from "./test/TimerBar";

export function TestRunnerPage() {
  const {
    selectedAttemptId,
    selectedSetId,
    navigate,
    setDbError,
    tutorial,
    setTutorialStep,
    recordTutorialHistory
  } = useAppStore();
  const attempt = useTestSessionStore((state) => state.attempt);
  const moduleIndex = useTestSessionStore((state) => state.moduleIndex);
  const questionIndex = useTestSessionStore((state) => state.questionIndex);
  const remainingTimeSec = useTestSessionStore((state) => state.remainingTimeSec);
  const timerHidden = useTestSessionStore((state) => state.timerHidden);
  const responsesByQuestionId = useTestSessionStore((state) => state.responsesByQuestionId);
  const loading = useTestSessionStore((state) => state.loading);
  const error = useTestSessionStore((state) => state.error);
  const resumeAttempt = useTestSessionStore((state) => state.resumeAttempt);
  const tickTimer = useTestSessionStore((state) => state.tickTimer);
  const setTimerHidden = useTestSessionStore((state) => state.setTimerHidden);
  const setQuestionIndex = useTestSessionStore((state) => state.setQuestionIndex);
  const previousQuestion = useTestSessionStore((state) => state.previousQuestion);
  const nextQuestion = useTestSessionStore((state) => state.nextQuestion);
  const selectAnswer = useTestSessionStore((state) => state.selectAnswer);
  const setStudentResponse = useTestSessionStore((state) => state.setStudentResponse);
  const toggleMarked = useTestSessionStore((state) => state.toggleMarked);
  const toggleEliminatedChoice = useTestSessionStore((state) => state.toggleEliminatedChoice);
  const enterModuleReview = useTestSessionStore((state) => state.enterModuleReview);
  const pauseAttempt = useTestSessionStore((state) => state.pauseAttempt);
  const resumePausedAttempt = useTestSessionStore((state) => state.resumePausedAttempt);
  const questions = useTestSessionStore((state) => state.questions);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const moduleQuestions = useMemo(
    () => selectModuleQuestions({ questions, moduleIndex }),
    [moduleIndex, questions]
  );
  const isLastQuestion = questionIndex >= moduleQuestions.length - 1;
  const currentQuestion = moduleQuestions[questionIndex] ?? null;
  const currentResponse = getQuestionResponse(responsesByQuestionId, currentQuestion);
  const spec = TEST_MODULES[moduleIndex];

  useEffect(() => {
    if (!attempt && selectedAttemptId) {
      void resumeAttempt(selectedAttemptId);
    }
  }, [attempt, resumeAttempt, selectedAttemptId]);

  useEffect(() => {
    setPaused(attempt?.status === "paused");
  }, [attempt?.status]);

  useEffect(() => {
    loadSettings()
      .then((settings) => {
        setTimerHidden(!settings.timerDefaultVisible);
      })
      .catch(() => undefined);
  }, [setTimerHidden]);

  useEffect(() => {
    if (!attempt || paused || remainingTimeSec <= 0) {
      return;
    }
    const intervalId = window.setInterval(() => tickTimer(), 1000);
    return () => window.clearInterval(intervalId);
  }, [attempt, paused, remainingTimeSec, tickTimer]);

  useEffect(() => {
    if (attempt && remainingTimeSec === 0) {
      void handleReviewModule();
    }
  }, [attempt, remainingTimeSec]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowRight") void nextQuestion();
      if (event.key === "ArrowLeft") void previousQuestion();
      if (event.key.toLowerCase() === "m" && currentQuestion) void toggleMarked(currentQuestion);
      if (event.key.toLowerCase() === "q") setMenuOpen(true);
      if (event.key.toLowerCase() === "p") void handlePause();
      if (event.key.toLowerCase() === "t") setTimerHidden(!timerHidden);
      if (event.ctrlKey && event.key === "Enter") void handleReviewModule();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const firstUnanswered = useMemo(
    () => moduleQuestions.findIndex((question) => !getQuestionResponse(responsesByQuestionId, question)?.selectedAnswer),
    [moduleQuestions, responsesByQuestionId]
  );
  const firstMarked = useMemo(
    () => moduleQuestions.findIndex((question) => getQuestionResponse(responsesByQuestionId, question)?.marked),
    [moduleQuestions, responsesByQuestionId]
  );

  async function handleReviewModule() {
    try {
      await enterModuleReview();
      navigate("moduleReview", selectedSetId ?? attempt?.questionSetId, selectedAttemptId ?? attempt?.id);
    } catch (reviewError: unknown) {
      setDbError(reviewError instanceof Error ? reviewError.message : "Could not open module review.");
    }
  }

  async function handleJump(index: number) {
    await setQuestionIndex(index);
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

  async function handlePause() {
    await pauseAttempt();
    setPaused(true);
  }

  async function handleTutorialPauseExit() {
    const activeAttemptId = attempt?.id;
    if (tutorial.active && tutorial.step === "pause_exit" && activeAttemptId && tutorial.practiceSessionId === activeAttemptId) {
      recordTutorialHistory(activeAttemptId);
      setTutorialStep("score_history_delete");
    }
    navigate("home");
  }

  async function handleSelectAnswer(answer: string) {
    if (!currentQuestion) return;
    await selectAnswer(currentQuestion, answer);
    if (
      tutorial.active &&
      tutorial.step === "answer_one_rw" &&
      tutorial.practiceSessionId === attempt?.id &&
      currentQuestion.section === "RW"
    ) {
      setTutorialStep("mark_review");
    }
  }

  function handleOpenShortcuts() {
    setShortcutsOpen(true);
    if (tutorial.active && tutorial.step === "shortcuts" && tutorial.practiceSessionId === attempt?.id) {
      setTutorialStep("pause_exit");
    }
  }

  function handleTutorialMark() {
    if (!currentQuestion) return;
    void toggleMarked(currentQuestion);
    if (tutorial.active && tutorial.step === "mark_review" && tutorial.practiceSessionId === attempt?.id) {
      setTutorialStep("notes");
    }
  }

  function handleOpenNotes() {
    setNotesOpen(true);
    if (tutorial.active && tutorial.step === "notes" && tutorial.practiceSessionId === attempt?.id) {
      setTutorialStep("shortcuts");
    }
  }

  async function handleTutorialHighlight(color: "yellow" | "blue" | "pink") {
    await handleHighlight(color);
    if (tutorial.active && tutorial.step === "highlight" && tutorial.practiceSessionId === attempt?.id) {
      setTutorialStep("answer_one_rw");
    }
  }

  async function handleHighlight(color: "yellow" | "blue" | "pink") {
    if (!attempt || !currentQuestion?.id) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    if (!selection || selection.rangeCount === 0 || !selectedText) return;
    const range = selection.getRangeAt(0);
    const existingMarker = findSelectedHighlightMarker(range);
    const textForStorage = (existingMarker?.textContent ?? selectedText).trim();
    if (!textForStorage) return;
    const passage = currentQuestion.passage || "";
    const fallbackStartOffset = Math.max(0, passage.indexOf(textForStorage));
    const { startOffset, endOffset } = existingMarker
      ? getHighlightMarkerOffsets(existingMarker, fallbackStartOffset, textForStorage.length)
      : { startOffset: fallbackStartOffset, endOffset: fallbackStartOffset + textForStorage.length };
    const highlightInput = {
      attemptId: attempt.id,
      questionId: currentQuestion.id,
      selectedText: textForStorage,
      startOffset,
      endOffset,
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
        createHighlightMarker(range, color, startOffset, endOffset);
      }
    } catch {
      // Saving still succeeds even if the browser cannot wrap a cross-node selection.
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    } finally {
      selection.removeAllRanges();
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted">Loading practice test...</div>;
  }

  if (error) {
    return <div className="m-8 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>;
  }

  if (!attempt || !currentQuestion || !spec) {
    return (
      <section className="m-8 rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">No active practice test</h2>
        <button
          className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate("sets")}
          type="button"
        >
          Open Question Sets
        </button>
      </section>
    );
  }

  return (
    <div className="test-shell-frame flex h-screen flex-col bg-slate-50 px-3 pb-1 pt-3 text-ink">
      <header className="flex items-center justify-between rounded-t-md border border-line bg-white px-6 py-3">
        <div>
          <div className="text-sm font-semibold">{spec.title}</div>
          <div className="mt-1 text-xs text-muted">
            Question {questionIndex + 1} of {moduleQuestions.length}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TimerBar
            hidden={timerHidden}
            onToggleHidden={() => setTimerHidden(!timerHidden)}
            remainingTimeSec={remainingTimeSec}
          />
          <div className={tutorial.active && tutorial.step === "highlight" ? "tutorial-active-target tutorial-inline-target tutorial-target-ring" : ""}>
            <HighlightToolbar onHighlight={(color) => void handleTutorialHighlight(color)} />
          </div>
          <MarkForReviewButton
            className={tutorial.active && tutorial.step === "mark_review" ? "tutorial-active-target tutorial-target-ring" : ""}
            marked={Boolean(currentResponse?.marked)}
            onToggle={handleTutorialMark}
          />
          <button className={`rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${tutorial.active && tutorial.step === "notes" ? "tutorial-active-target tutorial-target-ring" : ""}`} onClick={handleOpenNotes} type="button">
            Notes
          </button>
          {currentQuestion.section === "MATH" ? (
            <>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setReferenceOpen(true)} type="button">
                Reference
              </button>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setCalculatorOpen(true)} type="button">
                Calculator
              </button>
            </>
          ) : null}
          <button className={`rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${tutorial.active && tutorial.step === "shortcuts" ? "tutorial-active-target tutorial-target-ring" : ""}`} onClick={handleOpenShortcuts} type="button">
            Shortcuts
          </button>
          <button
            className={`rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${tutorial.active && tutorial.step === "pause_exit" ? "tutorial-active-target tutorial-target-ring" : ""}`}
            onClick={() => void handlePause()}
            type="button"
          >
            Pause
          </button>
        </div>
      </header>

      <div className="test-runner-grid grid min-h-0 flex-1 border-x border-line bg-white">
        <PassagePanel key={`passage-${currentQuestion.id}`} question={currentQuestion} />
        <div className={`h-full min-h-0 ${tutorial.active && tutorial.step === "answer_one_rw" ? "tutorial-active-target tutorial-target-ring test-question-target" : ""}`}>
        <QuestionPanel
          key={`question-${currentQuestion.id}`}
          onSelectAnswer={(answer) => void handleSelectAnswer(answer)}
          onStudentResponse={(answer) => void setStudentResponse(currentQuestion, answer)}
          onToggleEliminated={(choice) => void toggleEliminatedChoice(currentQuestion, choice)}
          question={currentQuestion}
          response={currentResponse}
        />
        </div>
      </div>

      <TestNavigation
        canGoBack={questionIndex > 0}
        canGoNext={!isLastQuestion}
        onBack={() => void previousQuestion()}
        onNext={() => void nextQuestion()}
        onOpenMenu={() => setMenuOpen(true)}
        onReview={() => void handleReviewModule()}
        submitMode={isLastQuestion}
      />

      {menuOpen ? (
        <QuestionMenu
          currentIndex={questionIndex}
          onClose={() => setMenuOpen(false)}
          onJump={(index) => void handleJump(index)}
          onReviewMarked={() => void handleReviewMarked()}
          onReviewUnanswered={() => void handleReviewUnanswered()}
          questions={moduleQuestions}
          responsesByQuestionId={responsesByQuestionId}
        />
      ) : null}
      {paused ? (
        <PauseDialog
          exitButtonClassName={tutorial.active && tutorial.step === "pause_exit" ? "tutorial-active-target tutorial-target-ring" : ""}
          onExit={() => void handleTutorialPauseExit()}
          onResume={() => {
            void resumePausedAttempt();
            setPaused(false);
          }}
        />
      ) : null}
      {notesOpen && currentQuestion.id ? (
        <NotesPanel attemptId={attempt.id} onClose={() => setNotesOpen(false)} questionId={currentQuestion.id} />
      ) : null}
      {referenceOpen ? <ReferenceSheetModal onClose={() => setReferenceOpen(false)} /> : null}
      {calculatorOpen ? <CalculatorModal onClose={() => setCalculatorOpen(false)} /> : null}
      {shortcutsOpen ? <KeyboardShortcutHelp onClose={() => setShortcutsOpen(false)} /> : null}
    </div>
  );
}
