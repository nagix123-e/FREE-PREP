import katex from "katex";
import { useEffect, useMemo, useState } from "react";
import { getPackageTypeLabel } from "../lib/csvValidation";
import { getQuestionSet, listQuestions } from "../lib/database";
import { useAppStore } from "../store/appStore";
import type { Question, QuestionSet } from "../types";
import { VisualRenderer } from "./visual/VisualRenderer";

export function PreviewScreen() {
  const { selectedSetId, navigate, setDbError, tutorial, setTutorialStep } = useAppStore();
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [previewPassword, setPreviewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) ?? questions[0] ?? null,
    [questions, selectedQuestionId]
  );

  useEffect(() => {
    if (!selectedSetId) {
      return;
    }

    Promise.all([getQuestionSet(selectedSetId), listQuestions(selectedSetId)])
      .then(([nextSet, nextQuestions]) => {
        setSet(nextSet);
        setQuestions(nextQuestions);
        setSelectedQuestionId(nextQuestions[0]?.id ?? null);
        setPreviewPassword("");
        setPasswordError("");
        setIsUnlocked(false);
        setDbError(null);
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : "Could not load preview.")
      );
  }, [selectedSetId, setDbError]);

  if (!selectedSetId) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">No question set selected</h2>
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

  if (set?.previewPassword && !isUnlocked) {
    return (
      <section className="mx-auto max-w-md rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold">Preview password required</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter the 6-character password set for this question set.</p>
        <input
          autoComplete="off"
          className="mt-5 w-full rounded-md border border-line px-3 py-2 text-sm tracking-[0.2em] outline-none focus:border-teal-600"
          maxLength={6}
          onChange={(event) => {
            setPreviewPassword(event.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 6));
            setPasswordError("");
          }}
          placeholder="A1B2C3"
          type="password"
          value={previewPassword}
        />
        {passwordError ? <div className="mt-3 text-xs font-semibold text-red-700">{passwordError}</div> : null}
        <button
          className="mt-5 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          onClick={() => {
            if (previewPassword === set.previewPassword) {
              setIsUnlocked(true);
            } else {
              setPasswordError("The preview password does not match.");
            }
          }}
          type="button"
        >
          Open preview
        </button>
      </section>
    );
  }

  return (
    <div className="preview-layout-grid grid gap-6">
      <aside className="rounded-md border border-line bg-white shadow-panel">
        <div className="border-b border-line p-4">
          <h2 className="csv-name-wrap font-semibold">{set?.name ?? "Question Set"}</h2>
          <p className="mt-1 text-xs text-muted">
            {questions.length} questions
            {set ? ` · ${getPackageTypeLabel(set.packageType)}` : ""}
          </p>
          {set ? (
            <p className="mt-1 text-xs text-muted">
              RW {set.sectionCounts.RW} / Math {set.sectionCounts.MATH}
            </p>
          ) : null}
          {set ? (
            <button
              className={`mt-3 w-full rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600 ${
                tutorial.active && tutorial.importedSetId === selectedSetId && tutorial.step === "question_sets"
                  ? "tutorial-active-target tutorial-target-ring"
                  : ""
              }`}
              onClick={() => {
                if (tutorial.active && tutorial.importedSetId === selectedSetId) {
                  setTutorialStep(set.packageType === "full_test" ? "test_overview_continue" : "setup_start");
                }
                navigate(set.packageType === "full_test" ? "testOverview" : "setup", selectedSetId);
              }}
              type="button"
            >
              {getPreviewStartLabel(set.packageType)}
            </button>
          ) : null}
        </div>
        <div className="preview-question-list overflow-auto p-2">
          {questions.map((question) => (
            <button
              className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm ${
                selectedQuestion?.id === question.id
                  ? "bg-teal-50 text-teal-800"
                  : "hover:bg-slate-50"
              }`}
              key={question.id}
              onClick={() => setSelectedQuestionId(question.id ?? null)}
              type="button"
            >
              <div className="font-semibold">
                {question.section} M{question.module} Q{question.questionNumber}
              </div>
              <div className="mt-1 truncate text-xs text-muted">{question.domain || question.skill}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-md border border-line bg-white shadow-panel">
        {selectedQuestion ? (
          <QuestionDetail question={selectedQuestion} />
        ) : (
          <div className="p-6 text-sm text-muted">No questions found.</div>
        )}
      </section>
    </div>
  );
}

function getPreviewStartLabel(packageType: QuestionSet["packageType"]): string {
  if (packageType === "rw_section") return "Start RW Only Practice Test";
  if (packageType === "math_section") return "Start Math Only Practice Test";
  return "Start Full Hard Practice Test";
}

function QuestionDetail({ question }: { question: Question }) {
  return (
    <div className="preview-detail-grid grid">
      <article className="border-r border-line p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
          <span>{question.section}</span>
          <span>Module {question.module}</span>
          <span>{question.route}</span>
          <span>{question.difficulty || "difficulty unset"}</span>
        </div>
        {question.passage ? (
          <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {question.passage}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
            No passage for this question.
          </div>
        )}
        <div className="mt-5">
          <VisualRenderer
            tableMarkdown={question.tableMarkdown}
            visualJson={question.visualJson}
            visualType={question.visualType}
          />
        </div>
      </article>

      <article className="p-6">
        <div className="text-sm font-semibold text-slate-500">Question {question.questionNumber}</div>
        <div className="mt-3 whitespace-pre-wrap text-base font-medium leading-7 text-ink">
          {question.question}
        </div>

        {question.equationLatex ? <LatexBlock latex={question.equationLatex} /> : null}

        {question.questionType === "multiple_choice" ? (
          <div className="mt-5 space-y-3">
            {[
              ["A", question.choiceA],
              ["B", question.choiceB],
              ["C", question.choiceC],
              ["D", question.choiceD]
            ].map(([letter, text]) => (
              <div
                className={`rounded-md border p-3 text-sm ${
                  question.correctAnswer === letter
                    ? "border-teal-200 bg-teal-50"
                    : "border-line bg-white"
                }`}
                key={letter}
              >
                <span className="mr-2 font-semibold">{letter}.</span>
                {text}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-line bg-slate-50 p-4 text-sm">
            Student response answer: <span className="font-semibold">{question.correctNumericAnswer}</span>
          </div>
        )}

        <div className="mt-6 rounded-md border border-line bg-slate-50 p-4">
          <div className="text-sm font-semibold">Correct Answer</div>
          <div className="mt-1 text-sm text-slate-700">
            {question.questionType === "student_response"
              ? question.correctNumericAnswer
              : question.correctAnswer}
          </div>
          <div className="mt-4 text-sm font-semibold">Explanation</div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {question.explanation || "No explanation provided."}
          </div>
        </div>
      </article>
    </div>
  );
}

function LatexBlock({ latex }: { latex: string }) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true
      }),
    [latex]
  );

  return (
    <div
      className="mt-5 overflow-auto rounded-md border border-line bg-slate-50 p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
