import { useEffect, useMemo, useState } from "react";
import * as Papa from "papaparse";
import { getPackageTypeLabel, parseCsvText } from "../lib/csvValidation";
import {
  listQuestionSets,
  listQuestions,
  listTeacherDrafts,
  deleteTeacherDraft,
  saveTeacherDraft,
  updateQuestionSetQuestions,
  type TeacherDraft
} from "../lib/database";
import { useAppStore, type TutorialStep } from "../store/appStore";
import type { PackageType, Question, QuestionSet, QuestionType, Section, VisualType } from "../types";
import { VisualRenderer } from "./visual/VisualRenderer";

type BuilderRow = Record<string, string>;

const RW_DOMAINS = [
  "Craft and Structure",
  "Information and Ideas",
  "Standard English Conventions",
  "Expression of Ideas"
];

const MATH_DOMAINS = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry"
];

const RW_DOMAIN_DISTRIBUTION: Record<"1-base" | "2-hard", Array<[string, number]>> = {
  "1-base": [
    ["Craft and Structure", 7],
    ["Information and Ideas", 7],
    ["Standard English Conventions", 7],
    ["Expression of Ideas", 6]
  ],
  "2-hard": [
    ["Craft and Structure", 8],
    ["Information and Ideas", 7],
    ["Standard English Conventions", 7],
    ["Expression of Ideas", 5]
  ]
};

const MATH_DOMAIN_PATTERN = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry"
];

const MATH_VISUAL_OPTIONS: Array<[VisualType, string]> = [
  ["none", "No visual"],
  ["right_triangle", "Right triangle"],
  ["triangle", "Triangle"],
  ["rectangle", "Rectangle"],
  ["circle", "Circle"],
  ["number_line", "Number line"],
  ["coordinate_plane", "Coordinate plane"],
  ["function_graph", "Function graph"],
  ["line_graph", "Line graph"],
  ["bar_graph", "Bar graph"],
  ["scatter_plot", "Scatter plot"],
  ["table", "Table"]
];

const CSV_HEADERS = [
  "test_id",
  "preview_password",
  "exam_version",
  "generation_batch_id",
  "target_score_band",
  "question_id",
  "section",
  "module",
  "route",
  "question_number",
  "content_domain",
  "skill_group",
  "skill_code",
  "skill_label",
  "question_topic",
  "difficulty",
  "scoring_weight",
  "question_type",
  "passage",
  "question",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct_answer",
  "correct_choice_index",
  "explanation",
  "time_estimate_sec",
  "visual_type",
  "visual_json",
  "table_markdown",
  "equation_latex",
  "student_response_type",
  "correct_numeric_answer",
  "answer_tolerance",
  "primary_skill",
  "secondary_skill",
  "tags"
];

const BLUEPRINTS: Record<
  PackageType,
  Array<{ section: Section; module: "1" | "2"; route: "base" | "hard"; count: number }>
> = {
  full_test: [
    { section: "RW", module: "1", route: "base", count: 27 },
    { section: "RW", module: "2", route: "hard", count: 27 },
    { section: "MATH", module: "1", route: "base", count: 22 },
    { section: "MATH", module: "2", route: "hard", count: 22 }
  ],
  rw_section: [
    { section: "RW", module: "1", route: "base", count: 27 },
    { section: "RW", module: "2", route: "hard", count: 27 }
  ],
  math_section: [
    { section: "MATH", module: "1", route: "base", count: 22 },
    { section: "MATH", module: "2", route: "hard", count: 22 }
  ]
};

export function TeacherBuilderPage() {
  const {
    navigate,
    tutorial,
    startTeacherTutorial,
    exitTutorial,
    setTutorialStep,
    questionSets,
    setQuestionSets,
    setDbError
  } = useAppStore();
  const [packageType, setPackageType] = useState<PackageType>("rw_section");
  const [testId, setTestId] = useState("teacher-set-001");
  const [previewPassword, setPreviewPassword] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloadState, setDownloadState] = useState<"idle" | "done">("idle");
  const [drafts, setDrafts] = useState<TeacherDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editState, setEditState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadedSetId, setLoadedSetId] = useState<number | null>(null);
  const [rows, setRows] = useState<BuilderRow[]>(() => createRows("rw_section", "teacher-set-001", ""));

  const csvText = useMemo(() => Papa.unparse(rows, { columns: CSV_HEADERS }), [rows]);
  const summary = useMemo(() => parseCsvText(csvText), [csvText]);
  const activeRow = rows[activeIndex] ?? rows[0];
  const completedCount = rows.filter(isContentReady).length;
  const teacherTutorialActive = tutorial.active && tutorial.step.startsWith("teacher_");

  useEffect(() => {
    listTeacherDrafts().then(setDrafts).catch((error) => setDbError(error instanceof Error ? error.message : String(error)));
  }, [setDbError]);

  function rebuild(nextPackageType: PackageType, nextTestId = testId, nextPreviewPassword = previewPassword) {
    setRows(createRows(nextPackageType, nextTestId, nextPreviewPassword));
    setActiveIndex(0);
    setLoadedSetId(null);
  }

  function updateTestId(value: string) {
    setTestId(value);
    rebuild(packageType, value);
    if (isTeacherStep(tutorial.step, "teacher_test_id") && value.trim()) {
      setTutorialStep("teacher_question");
    }
  }

  function updatePreviewPassword(value: string) {
    const normalized = value.replace(/[^A-Za-z0-9]/g, "").slice(0, 6);
    setPreviewPassword(normalized);
    setRows((current) => current.map((row) => ({ ...row, preview_password: normalized })));
  }

  function updateActive(field: string, value: string) {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== activeIndex) return row;
        const patch: BuilderRow = { [field]: value };
        if (field === "question_type") {
          Object.assign(patch, defaultAnswerFields(value as QuestionType));
        }
        if (field === "correct_answer") {
          patch.correct_choice_index = choiceIndex(value);
        }
        if (field === "content_domain") {
          patch.skill_group = value;
          patch.skill_label = value;
          patch.skill_code = row.section === "MATH" ? skillCodeForMathDomain(value) : skillCodeForRwDomain(value);
        }
        if (field === "visual_type") {
          patch.visual_json = createVisualTemplate(value as VisualType);
          patch.table_markdown = value === "table" ? "| x | y |\n|---|---|\n| 1 | 2 |" : "";
        }
        return { ...row, ...patch };
      })
    );
    advanceTeacherTutorial(field, value);
  }

  function updateActiveVisualJson(mutator: (data: Record<string, unknown>, row: BuilderRow) => Record<string, unknown>) {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== activeIndex) return row;
        const visualType = (row.visual_type || "none") as VisualType;
        const currentData = parseVisualData(row);
        const nextData = mutator(currentData, row);
        const normalizedData = { ...nextData, type: nextData.type || visualType };
        return { ...row, visual_json: JSON.stringify(normalizedData, null, 2) };
      })
    );
  }

  function downloadCsv() {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(testId)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadState("done");
    if (isTeacherStep(tutorial.step, "teacher_download")) {
      setTutorialStep("teacher_done");
    }
    window.setTimeout(() => setDownloadState("idle"), 2600);
  }

  function handlePackageTypeChange(nextPackageType: PackageType) {
    setPackageType(nextPackageType);
    rebuild(nextPackageType);
    if (isTeacherStep(tutorial.step, "teacher_set_type")) {
      setTutorialStep("teacher_test_id");
    }
  }

  async function saveDraft() {
    const draftId = `teacher-builder:${slugify(testId) || "untitled"}`;
    setDraftState("saving");
    try {
      await saveTeacherDraft({
        id: draftId,
        name: testId.trim() || "Untitled question set",
        data: { packageType, testId, previewPassword, activeIndex, rows }
      });
      setDrafts(await listTeacherDrafts());
      setDraftState("saved");
      window.setTimeout(() => setDraftState("idle"), 2200);
    } catch (error) {
      setDraftState("error");
      setDbError(error instanceof Error ? error.message : String(error));
    }
  }

  function loadDraft(draft: TeacherDraft) {
    const data = draft.data as Partial<{
      packageType: PackageType;
      testId: string;
      previewPassword: string;
      activeIndex: number;
      rows: BuilderRow[];
    }>;
    if (!data.rows || !Array.isArray(data.rows) || !data.testId || !data.packageType) {
      setDbError("This saved draft is incomplete and cannot be opened.");
      return;
    }
    setPackageType(data.packageType);
    setTestId(data.testId);
    setPreviewPassword(data.previewPassword ?? data.rows[0]?.preview_password ?? "");
    setRows(data.rows);
    setActiveIndex(Math.max(0, Math.min(data.activeIndex ?? 0, data.rows.length - 1)));
    setLoadedSetId(null);
  }

  async function deleteDraft() {
    const draft = drafts.find((item) => item.id === selectedDraftId);
    if (!draft) return;
    try {
      await deleteTeacherDraft(draft.id);
      setDrafts(await listTeacherDrafts());
      setSelectedDraftId("");
    } catch (error) {
      setDbError(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadQuestionSetForEditing(set: QuestionSet) {
    try {
      const questions = await listQuestions(set.id);
      if (questions.length === 0) throw new Error("This question set has no editable questions.");
      setPackageType(set.packageType);
      setTestId(questions[0].testId || set.name);
      setPreviewPassword(set.previewPassword);
      setRows(questions.map((question) => questionToBuilderRow(question, set.previewPassword)));
      setActiveIndex(0);
      setLoadedSetId(set.id);
      setEditState("idle");
    } catch (error) {
      setDbError(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveImportedEdits() {
    if (!loadedSetId) return;
    if (!summary.valid) {
      setEditState("error");
      setDbError("Fix CSV validation issues before saving edits to this question set.");
      return;
    }
    setEditState("saving");
    try {
      await updateQuestionSetQuestions({
        questionSetId: loadedSetId,
        questions: summary.questions,
        status: "valid",
        rowCount: summary.rowCount,
        sectionCounts: summary.sectionCounts,
        previewPassword: summary.previewPassword
      });
      setQuestionSets(await listQuestionSets());
      setEditState("saved");
      window.setTimeout(() => setEditState("idle"), 2200);
    } catch (error) {
      setEditState("error");
      setDbError(error instanceof Error ? error.message : String(error));
    }
  }

  function advanceTeacherTutorial(field: string, value: string) {
    if (!teacherTutorialActive || !value.trim()) return;
    const transitions: Partial<Record<string, TutorialStep>> = {
      question: "teacher_choice_a",
      choice_a: "teacher_choice_b",
      choice_b: "teacher_correct_answer",
      correct_answer: "teacher_explanation",
      explanation: "teacher_content_domain",
      content_domain: "teacher_download"
    };
    const expectedFieldByStep: Partial<Record<TutorialStep, string>> = {
      teacher_question: "question",
      teacher_choice_a: "choice_a",
      teacher_choice_b: "choice_b",
      teacher_correct_answer: "correct_answer",
      teacher_explanation: "explanation",
      teacher_content_domain: "content_domain"
    };
    if (expectedFieldByStep[tutorial.step] === field && transitions[field]) {
      setTutorialStep(transitions[field]);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-ink">
      <div className="mx-auto max-w-[1500px] space-y-6">
      {teacherTutorialActive ? (
        <>
          <div className="tutorial-block-layer" aria-hidden="true" />
          <TeacherTutorialBanner onExit={exitTutorial} step={tutorial.step} />
        </>
      ) : null}
      {downloadState === "done" ? (
        <div className="download-confirmation-toast" role="status">
          <span className="download-confirmation-toast__check">✓</span>
          <span>
            CSV downloaded
            <span className="download-confirmation-toast__file">{slugify(testId)}.csv</span>
          </span>
        </div>
      ) : null}
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Question Maker Console</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create RW, Math, or Total SAT-format question sets and download an import-ready CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => navigate("home")}
              type="button"
            >
              Back to FREE PREP
            </button>
            <button
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={startTeacherTutorial}
              type="button"
            >
              Tutorial
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
                downloadState === "done" ? "download-success-button" : "bg-teal-700"
              } ${isTeacherStep(tutorial.step, "teacher_download") ? "tutorial-active-target tutorial-target-ring" : ""}`}
              onClick={downloadCsv}
              type="button"
            >
              {downloadState === "done" ? "Downloaded" : "Download CSV"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <div className="text-sm font-medium">
            <div>Saved drafts</div>
            <select
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
              onChange={(event) => setSelectedDraftId(event.target.value)}
              value={selectedDraftId}
            >
              <option value="">Choose a saved draft</option>
              {drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={!selectedDraftId}
                onClick={() => {
                  const draft = drafts.find((item) => item.id === selectedDraftId);
                  if (draft) loadDraft(draft);
                }}
                type="button"
              >
                Open draft
              </button>
              <button
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={!selectedDraftId}
                onClick={() => void deleteDraft()}
                type="button"
              >
                Delete draft
              </button>
            </div>
          </div>
          <label className="text-sm font-medium">
            Edit imported question set
            <select
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
              defaultValue=""
              onChange={(event) => {
                const set = questionSets.find((item) => String(item.id) === event.target.value);
                if (set) void loadQuestionSetForEditing(set);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Choose a local set to edit</option>
              {questionSets.map((set) => (
                <option disabled={set.hasAttempts} key={set.id} value={set.id}>
                  {set.name}{set.hasAttempts ? " (has practice history)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            className="mt-7 rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={draftState === "saving"}
            onClick={() => void saveDraft()}
            type="button"
          >
            {draftState === "saving" ? "Saving draft..." : draftState === "saved" ? "Draft saved" : "Save draft"}
          </button>
          <div className="mt-7 flex gap-3">
            {loadedSetId ? (
              <button
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={editState === "saving"}
                onClick={() => void saveImportedEdits()}
                type="button"
              >
                {editState === "saving" ? "Saving changes..." : editState === "saved" ? "Changes saved" : "Save changes"}
              </button>
            ) : (
              <button
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => rebuild(packageType)}
                type="button"
              >
                New set
              </button>
            )}
          </div>
        </div>

        {loadedSetId ? (
          <div className="mt-3 text-xs font-semibold text-teal-700">Editing an imported local question set. Save changes to update it in place.</div>
        ) : null}

        <div className="mt-6 grid grid-cols-5 gap-4">
          <label className="text-sm font-medium">
            Set type
            <select
              className={`mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 ${
                isTeacherStep(tutorial.step, "teacher_set_type") ? "tutorial-active-target tutorial-target-ring" : ""
              }`}
              onChange={(event) => {
                handlePackageTypeChange(event.target.value as PackageType);
              }}
              value={packageType}
            >
              <option value="rw_section">RW Section</option>
              <option value="math_section">Math Section</option>
              <option value="full_test">Total / Full Test</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Test ID
            <input
              className={`mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600 ${
                isTeacherStep(tutorial.step, "teacher_test_id") ? "tutorial-active-target tutorial-target-ring" : ""
              }`}
              onChange={(event) => updateTestId(event.target.value)}
              value={testId}
            />
          </label>
          <label className="text-sm font-medium">
            Preview password <span className="text-xs font-normal text-muted">optional, 6 letters/numbers</span>
            <input
              className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600"
              maxLength={6}
              onChange={(event) => updatePreviewPassword(event.target.value)}
              placeholder="A1B2C3"
              value={previewPassword}
            />
          </label>
          <Metric label="Questions" value={`${rows.length}`} />
          <Metric label="Ready" value={`${completedCount}/${rows.length}`} />
        </div>
      </section>

      <div className="teacher-console-grid grid gap-6">
        <aside className="rounded-md border border-line bg-white p-5 shadow-panel">
          <div className="text-sm font-semibold">Question slots</div>
          <div className="teacher-question-list mt-4 space-y-2 overflow-auto pr-1">
            {rows.map((row, index) => (
              <button
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "border-teal-300 bg-teal-50" : "border-line bg-slate-50 hover:bg-slate-100"
                }`}
                key={row.question_id}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {row.section} M{row.module} Q{row.question_number}
                  </span>
                  <span className="text-xs text-muted">
                    {row.question_type === "student_response" ? "Grid-in" : "MC"}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-muted">{row.question || "Empty question"}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-md border border-line bg-white p-6 shadow-panel">
          {activeRow ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">
                    {activeRow.section} Module {activeRow.module} · Question {activeRow.question_number}
                  </h3>
                  <div className="mt-1 text-xs text-muted">{activeRow.question_id}</div>
                </div>
                <div className="grid min-w-[320px] grid-cols-2 gap-3">
                  <SelectField
                    label="Type"
                    onChange={(value) => updateActive("question_type", value)}
                    options={[
                      ["multiple_choice", "Multiple choice"],
                      ["student_response", "Student response"]
                    ]}
                    value={activeRow.question_type}
                  />
                  <SelectField
                    label="Difficulty"
                    onChange={(value) => updateActive("difficulty", value)}
                    options={[
                      ["easy", "Easy"],
                      ["medium", "Medium"],
                      ["hard", "Hard"]
                    ]}
                    value={activeRow.difficulty}
                  />
                </div>
              </div>

              <TextArea label="Passage" onChange={(value) => updateActive("passage", value)} value={activeRow.passage} />
              <TextArea
                className={isTeacherStep(tutorial.step, "teacher_question") ? "tutorial-active-target tutorial-target-ring" : ""}
                label="Question"
                onChange={(value) => updateActive("question", value)}
                value={activeRow.question}
              />

              {activeRow.question_type === "multiple_choice" ? (
                <div className="grid grid-cols-2 gap-4">
                  {(["choice_a", "choice_b", "choice_c", "choice_d"] as const).map((field) => (
                    <TextField
                      className={
                        isTeacherStep(tutorial.step, "teacher_choice_a") && field === "choice_a"
                          ? "tutorial-active-target tutorial-target-ring"
                          : isTeacherStep(tutorial.step, "teacher_choice_b") && field === "choice_b"
                            ? "tutorial-active-target tutorial-target-ring"
                            : ""
                      }
                      key={field}
                      label={field.replace("_", " ").toUpperCase()}
                      onChange={(value) => updateActive(field, value)}
                      value={activeRow[field]}
                    />
                  ))}
                  <SelectField
                    className={isTeacherStep(tutorial.step, "teacher_correct_answer") ? "tutorial-active-target tutorial-target-ring" : ""}
                    label="Correct answer"
                    onChange={(value) => updateActive("correct_answer", value)}
                    options={[
                      ["A", "A"],
                      ["B", "B"],
                      ["C", "C"],
                      ["D", "D"]
                    ]}
                    value={activeRow.correct_answer || "A"}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="Correct numeric answer"
                    onChange={(value) => updateActive("correct_numeric_answer", value)}
                    value={activeRow.correct_numeric_answer}
                  />
                  <TextField
                    label="Answer tolerance"
                    onChange={(value) => updateActive("answer_tolerance", value)}
                    value={activeRow.answer_tolerance}
                  />
                </div>
              )}

              {activeRow.section === "MATH" ? (
                <div className="rounded-md border border-line bg-slate-50 p-4">
                  <div className="text-sm font-semibold">Visual / diagram</div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Visual type"
                      onChange={(value) => updateActive("visual_type", value)}
                      options={MATH_VISUAL_OPTIONS}
                      value={activeRow.visual_type || "none"}
                    />
                    <TextField
                      label="Equation LaTeX"
                      onChange={(value) => updateActive("equation_latex", value)}
                      value={activeRow.equation_latex}
                    />
                  </div>
                  {activeRow.visual_type === "table" ? (
                    <TextArea
                      label="Table markdown"
                      onChange={(value) => updateActive("table_markdown", value)}
                      value={activeRow.table_markdown}
                    />
                  ) : null}
                  {activeRow.visual_type !== "none" ? (
                    <>
                      <VisualParameterControls onChange={updateActiveVisualJson} row={activeRow} />
                      <TextArea
                        label="Visual JSON"
                        onChange={(value) => updateActive("visual_json", value)}
                        value={activeRow.visual_json}
                      />
                      <VisualPreview row={activeRow} />
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Select a visual type to add a renderable diagram to this Math question.
                    </p>
                  )}
                </div>
              ) : null}

              <TextArea
                className={isTeacherStep(tutorial.step, "teacher_explanation") ? "tutorial-active-target tutorial-target-ring" : ""}
                label="Explanation"
                onChange={(value) => updateActive("explanation", value)}
                value={activeRow.explanation}
              />

              <div className="grid grid-cols-3 gap-4">
                <SelectField
                  className={isTeacherStep(tutorial.step, "teacher_content_domain") ? "tutorial-active-target tutorial-target-ring" : ""}
                  label="Content domain"
                  onChange={(value) => updateActive("content_domain", value)}
                  options={getDomainOptions(activeRow.section)}
                  value={activeRow.content_domain}
                />
                <TextField
                  label="Skill group"
                  onChange={(value) => updateActive("skill_group", value)}
                  value={activeRow.skill_group}
                />
                <TextField label="Tags" onChange={(value) => updateActive("tags", value)} value={activeRow.tags} />
              </div>
            </div>
          ) : null}
        </section>

        <aside className="rounded-md border border-line bg-white p-5 shadow-panel">
          <div className="text-sm font-semibold">CSV validation</div>
          <div
            className={`mt-4 rounded-md border p-3 text-sm ${
              summary.valid ? "border-teal-100 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {summary.valid ? `${getPackageTypeLabel(packageType)} is ready to download.` : "Fix the issues below."}
          </div>
          <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-xs text-muted">
            Rows: {summary.rowCount} · RW {summary.sectionCounts.RW} / Math {summary.sectionCounts.MATH}
          </div>
          <div className="mt-4 max-h-96 space-y-2 overflow-auto pr-1">
            {summary.issues.length === 0 ? (
              <div className="text-sm text-muted">No issues found.</div>
            ) : (
              summary.issues.slice(0, 16).map((issue, index) => (
                <button
                  className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-800"
                  key={`${issue.message}-${index}`}
                  onClick={() => {
                    if (issue.row) setActiveIndex(Math.max(0, issue.row - 2));
                  }}
                  type="button"
                >
                  {issue.row ? `Row ${issue.row}: ` : ""}
                  {issue.message}
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}

function TeacherTutorialBanner({ onExit, step }: { onExit: () => void; step: TutorialStep }) {
  const stepOrder: TutorialStep[] = [
    "teacher_set_type",
    "teacher_test_id",
    "teacher_question",
    "teacher_choice_a",
    "teacher_choice_b",
    "teacher_correct_answer",
    "teacher_explanation",
    "teacher_content_domain",
    "teacher_download",
    "teacher_done"
  ];
  const stepIndex = Math.max(0, stepOrder.indexOf(step));
  return (
    <div className="tutorial-banner mx-0 mt-0 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Tutorial Mode · Step {stepIndex + 1}/{stepOrder.length}</div>
          <div className="mt-1">{teacherTutorialInstruction(step)}</div>
        </div>
        <button
          className="rounded-md border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
          onClick={onExit}
          type="button"
        >
          Exit Tutorial
        </button>
      </div>
    </div>
  );
}

function teacherTutorialInstruction(step: TutorialStep): string {
  const instructions: Partial<Record<TutorialStep, string>> = {
    teacher_set_type: "Choose the question set type.",
    teacher_test_id: "Enter a Test ID for this CSV.",
    teacher_question: "Write the question prompt.",
    teacher_choice_a: "Write choice A.",
    teacher_choice_b: "Write choice B.",
    teacher_correct_answer: "Choose the correct answer.",
    teacher_explanation: "Write the explanation.",
    teacher_content_domain: "Choose the content domain.",
    teacher_download: "Download the CSV.",
    teacher_done: "Question maker tutorial complete."
  };
  return instructions[step] ?? "Follow the highlighted control.";
}

function isTeacherStep(currentStep: TutorialStep, expectedStep: TutorialStep): boolean {
  return currentStep === expectedStep;
}

function VisualPreview({ row }: { row: BuilderRow }) {
  return (
    <div className="visual-preview-panel mt-4">
      <div className="mb-3 text-xs font-semibold uppercase text-slate-500">Preview</div>
      <div className="visual-preview-panel__canvas">
        <VisualRenderer
          fallbackEquationText={row.equation_latex}
          tableMarkdown={row.table_markdown}
          visualJson={row.visual_json}
          visualType={row.visual_type as VisualType}
        />
      </div>
    </div>
  );
}

function VisualParameterControls({
  onChange,
  row
}: {
  onChange: (mutator: (data: Record<string, unknown>, row: BuilderRow) => Record<string, unknown>) => void;
  row: BuilderRow;
}) {
  const visualType = (row.visual_type || "none") as VisualType;
  const data = parseVisualData(row);
  const points = getRecordArray(data.points);
  const bars = getRecordArray(data.bars);
  const sideLabels = getRecord(data.sideLabels);

  if (visualType === "none") return null;

  const setValue = (field: string, value: string | number) => {
    onChange((current) => ({ ...current, [field]: value }));
  };
  const setSideLabel = (field: string, value: string) => {
    onChange((current) => ({ ...current, sideLabels: { ...getRecord(current.sideLabels), [field]: value } }));
  };
  const setPointValue = (index: number, field: string, value: string | number) => {
    onChange((current) => {
      const nextPoints = getRecordArray(current.points);
      nextPoints[index] = { ...(nextPoints[index] ?? {}), [field]: value };
      return { ...current, points: nextPoints };
    });
  };
  const setBarValue = (index: number, field: string, value: string | number) => {
    onChange((current) => {
      const nextBars = getRecordArray(current.bars);
      nextBars[index] = { ...(nextBars[index] ?? {}), [field]: value };
      return { ...current, bars: nextBars };
    });
  };

  return (
    <div className="mt-4 rounded-md border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Diagram controls</div>
        <div className="text-xs text-muted">These fields update Visual JSON. Direct JSON editing still works.</div>
      </div>

      {visualType === "right_triangle" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <TextField label="Base label" onChange={(value) => setValue("baseLabel", value)} value={textValue(data.baseLabel)} />
          <TextField label="Left label" onChange={(value) => setValue("leftLabel", value)} value={textValue(data.leftLabel)} />
          <TextField label="Hypotenuse label" onChange={(value) => setValue("rightLabel", value)} value={textValue(data.rightLabel)} />
          <TextField label="Caption" onChange={(value) => setValue("caption", value)} value={textValue(data.caption)} />
        </div>
      ) : null}

      {visualType === "triangle" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <TextField label="Side AB" onChange={(value) => setSideLabel("AB", value)} value={textValue(sideLabels.AB)} />
          <TextField label="Side BC" onChange={(value) => setSideLabel("BC", value)} value={textValue(sideLabels.BC)} />
          <TextField label="Side CA" onChange={(value) => setSideLabel("CA", value)} value={textValue(sideLabels.CA)} />
          <TextField label="Caption" onChange={(value) => setValue("caption", value)} value={textValue(data.caption)} />
        </div>
      ) : null}

      {visualType === "rectangle" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <TextField label="Width label" onChange={(value) => setValue("widthLabel", value)} value={textValue(data.widthLabel)} />
          <TextField label="Height label" onChange={(value) => setValue("heightLabel", value)} value={textValue(data.heightLabel)} />
          <TextField label="Caption" onChange={(value) => setValue("caption", value)} value={textValue(data.caption)} />
        </div>
      ) : null}

      {visualType === "circle" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <TextField label="Radius label" onChange={(value) => setValue("radiusLabel", value)} value={textValue(data.radiusLabel)} />
          <TextField label="Diameter label" onChange={(value) => setValue("diameterLabel", value)} value={textValue(data.diameterLabel)} />
          <TextField label="Caption" onChange={(value) => setValue("caption", value)} value={textValue(data.caption)} />
        </div>
      ) : null}

      {visualType === "number_line" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <NumberField label="Min" onChange={(value) => setValue("min", value)} value={numberValue(data.min)} />
          <NumberField label="Max" onChange={(value) => setValue("max", value)} value={numberValue(data.max)} />
          <NumberField label="Point value" onChange={(value) => setPointValue(0, "value", value)} value={numberValue(points[0]?.value)} />
          <TextField label="Point label" onChange={(value) => setPointValue(0, "label", value)} value={textValue(points[0]?.label)} />
        </div>
      ) : null}

      {visualType === "coordinate_plane" ? (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <NumberField label="x min" onChange={(value) => setValue("xMin", value)} value={numberValue(data.xMin)} />
          <NumberField label="x max" onChange={(value) => setValue("xMax", value)} value={numberValue(data.xMax)} />
          <NumberField label="y min" onChange={(value) => setValue("yMin", value)} value={numberValue(data.yMin)} />
          <NumberField label="y max" onChange={(value) => setValue("yMax", value)} value={numberValue(data.yMax)} />
          <NumberField label="Point x" onChange={(value) => setPointValue(0, "x", value)} value={numberValue(points[0]?.x)} />
          <NumberField label="Point y" onChange={(value) => setPointValue(0, "y", value)} value={numberValue(points[0]?.y)} />
          <TextField label="Point label" onChange={(value) => setPointValue(0, "label", value)} value={textValue(points[0]?.label)} />
        </div>
      ) : null}

      {visualType === "function_graph" ? (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <TextField label="Equation" onChange={(value) => setValue("equation", value)} value={textValue(data.equation)} />
          <NumberField label="x min" onChange={(value) => setValue("xMin", value)} value={numberValue(data.xMin)} />
          <NumberField label="x max" onChange={(value) => setValue("xMax", value)} value={numberValue(data.xMax)} />
        </div>
      ) : null}

      {visualType === "line_graph" || visualType === "scatter_plot" ? (
        <div className="mt-4 space-y-4">
          {visualType === "line_graph" ? (
            <TextField label="Title" onChange={(value) => setValue("title", value)} value={textValue(data.title)} />
          ) : null}
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div className="rounded-md border border-line bg-slate-50 p-3" key={index}>
                <div className="text-xs font-semibold text-muted">Point {index + 1}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <NumberField label="x" onChange={(value) => setPointValue(index, "x", value)} value={numberValue(points[index]?.x)} />
                  <NumberField label="y" onChange={(value) => setPointValue(index, "y", value)} value={numberValue(points[index]?.y)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {visualType === "bar_graph" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {[0, 1].map((index) => (
            <div className="rounded-md border border-line bg-slate-50 p-3" key={index}>
              <div className="text-xs font-semibold text-muted">Bar {index + 1}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <TextField label="Label" onChange={(value) => setBarValue(index, "label", value)} value={textValue(bars[index]?.label)} />
                <NumberField label="Value" onChange={(value) => setBarValue(index, "value", value)} value={numberValue(bars[index]?.value)} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {visualType === "table" ? (
        <p className="mt-4 text-xs text-muted">Use Table markdown below for the visible table. Visual JSON is kept for compatibility.</p>
      ) : null}
    </div>
  );
}

function questionToBuilderRow(question: Question, previewPassword: string): BuilderRow {
  return {
    test_id: question.testId,
    preview_password: previewPassword,
    exam_version: question.examVersion,
    generation_batch_id: question.generationBatchId,
    target_score_band: question.targetScoreBand,
    question_id: question.questionId,
    section: question.section,
    module: String(question.module),
    route: question.route,
    question_number: String(question.questionNumber),
    content_domain: question.contentDomain || question.domain,
    skill_group: question.skillGroup || question.skill,
    skill_code: question.skillCode,
    skill_label: question.skillLabel,
    question_topic: question.questionTopic,
    difficulty: question.difficulty,
    scoring_weight: String(question.scoringWeight),
    question_type: question.questionType,
    passage: question.passage,
    question: question.question,
    choice_a: question.choiceA,
    choice_b: question.choiceB,
    choice_c: question.choiceC,
    choice_d: question.choiceD,
    correct_answer: question.correctAnswer,
    correct_choice_index: question.correctChoiceIndex === null ? "" : String(question.correctChoiceIndex),
    explanation: question.explanation,
    time_estimate_sec: question.timeEstimateSec === null ? "" : String(question.timeEstimateSec),
    visual_type: question.visualType,
    visual_json: question.visualJson,
    table_markdown: question.tableMarkdown,
    equation_latex: question.equationLatex,
    student_response_type: question.studentResponseType,
    correct_numeric_answer: question.correctNumericAnswer,
    answer_tolerance: question.answerTolerance,
    primary_skill: question.primarySkill,
    secondary_skill: question.secondarySkill,
    tags: question.tags
  };
}

function createRows(packageType: PackageType, testId: string, previewPassword: string): BuilderRow[] {
  const batchId = `teacher-${new Date().toISOString().slice(0, 10)}`;
  return BLUEPRINTS[packageType].flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => {
      const questionNumber = String(index + 1);
      const prefix = `${testId}-${group.section.toLowerCase()}-m${group.module}`;
      const domain = getDefaultDomain(group.section, group.module, group.route, index);
      return {
        test_id: testId,
        preview_password: previewPassword,
        exam_version: "teacher-draft",
        generation_batch_id: batchId,
        target_score_band: "practice",
        question_id: `${prefix}-${questionNumber.padStart(2, "0")}`,
        section: group.section,
        module: group.module,
        route: group.route,
        question_number: questionNumber,
        content_domain: domain,
        skill_group: domain,
        skill_code: group.section === "RW" ? skillCodeForRwDomain(domain) : skillCodeForMathDomain(domain),
        skill_label: domain,
        question_topic: "",
        difficulty: "medium",
        scoring_weight: "1",
        question_type: "multiple_choice",
        passage: "",
        question: "",
        choice_a: "",
        choice_b: "",
        choice_c: "",
        choice_d: "",
        correct_answer: "A",
        correct_choice_index: "0",
        explanation: "",
        time_estimate_sec: group.section === "RW" ? "75" : "90",
        visual_type: "none",
        visual_json: "",
        table_markdown: "",
        equation_latex: "",
        student_response_type: "",
        correct_numeric_answer: "",
        answer_tolerance: "",
        primary_skill: "",
        secondary_skill: "",
        tags: group.section.toLowerCase()
      };
    })
  );
}

function getDefaultDomain(
  section: Section,
  moduleNumber: "1" | "2",
  route: "base" | "hard",
  index: number
): string {
  if (section === "MATH") {
    return MATH_DOMAIN_PATTERN[index % MATH_DOMAIN_PATTERN.length];
  }

  const distribution = RW_DOMAIN_DISTRIBUTION[`${moduleNumber}-${route}` as "1-base" | "2-hard"];
  let cursor = 0;
  for (const [domain, count] of distribution) {
    cursor += count;
    if (index < cursor) {
      return domain;
    }
  }
  return distribution[distribution.length - 1][0];
}

function getDomainOptions(section: string): Array<[string, string]> {
  const domains = section === "MATH" ? MATH_DOMAINS : RW_DOMAINS;
  return domains.map((domain) => [domain, domain]);
}

function parseVisualData(row: BuilderRow): Record<string, unknown> {
  try {
    const parsed = row.visual_json ? JSON.parse(row.visual_json) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const fallbackTemplate = createVisualTemplate((row.visual_type || "none") as VisualType);
    if (fallbackTemplate) {
      return JSON.parse(fallbackTemplate) as Record<string, unknown>;
    }
  }
  return {};
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(getRecord) : [];
}

function textValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function numberValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return "";
}

function skillCodeForRwDomain(domain: string): string {
  if (domain === "Craft and Structure") return "RW-CAS";
  if (domain === "Information and Ideas") return "RW-IA";
  if (domain === "Standard English Conventions") return "RW-SEC";
  return "RW-EOI";
}

function skillCodeForMathDomain(domain: string): string {
  if (domain === "Algebra") return "M-ALG";
  if (domain === "Advanced Math") return "M-ADV";
  if (domain === "Problem-Solving and Data Analysis") return "M-PSDA";
  return "M-GT";
}

function createVisualTemplate(visualType: VisualType): string {
  const templates: Partial<Record<VisualType, Record<string, unknown>>> = {
    right_triangle: {
      type: "right_triangle",
      baseLabel: "8",
      leftLabel: "6",
      rightLabel: "c",
      caption: "Right triangle"
    },
    triangle: {
      type: "triangle",
      sideLabels: { AB: "7", BC: "9", CA: "x" },
      caption: "Triangle ABC"
    },
    rectangle: {
      type: "rectangle",
      widthLabel: "7",
      heightLabel: "18",
      caption: "Rectangle"
    },
    circle: {
      type: "circle",
      radiusLabel: "r",
      diameterLabel: "12",
      caption: "Circle"
    },
    number_line: {
      type: "number_line",
      min: -5,
      max: 5,
      points: [{ value: 2, label: "x" }]
    },
    coordinate_plane: {
      type: "coordinate_plane",
      xMin: -5,
      xMax: 5,
      yMin: -5,
      yMax: 5,
      points: [{ x: 2, y: 3, label: "P" }]
    },
    function_graph: {
      type: "function_graph",
      equation: "y=2x+1",
      xMin: -5,
      xMax: 5
    },
    line_graph: {
      type: "line_graph",
      title: "Values",
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 }
      ]
    },
    bar_graph: {
      type: "bar_graph",
      bars: [
        { label: "A", value: 4 },
        { label: "B", value: 7 }
      ]
    },
    scatter_plot: {
      type: "scatter_plot",
      points: [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 5 }
      ]
    },
    table: {
      type: "table",
      headers: ["x", "y"],
      rows: [
        ["1", "2"],
        ["2", "4"]
      ]
    }
  };

  const template = templates[visualType];
  return template ? JSON.stringify(template, null, 2) : "";
}

function defaultAnswerFields(questionType: QuestionType): Partial<BuilderRow> {
  if (questionType === "student_response") {
    return {
      choice_a: "",
      choice_b: "",
      choice_c: "",
      choice_d: "",
      correct_answer: "",
      correct_choice_index: "",
      student_response_type: "numeric",
      correct_numeric_answer: "",
      answer_tolerance: "0"
    };
  }
  return {
    correct_answer: "A",
    correct_choice_index: "0",
    student_response_type: "",
    correct_numeric_answer: "",
    answer_tolerance: ""
  };
}

function isContentReady(row: BuilderRow): boolean {
  if (!row.question.trim() || !row.explanation.trim()) return false;
  if (row.question_type === "student_response") return Boolean(row.correct_numeric_answer.trim());
  return ["choice_a", "choice_b", "choice_c", "choice_d", "correct_answer"].every((field) => row[field]?.trim());
}

function choiceIndex(value: string): string {
  const index = ["A", "B", "C", "D"].indexOf(value.trim().toUpperCase());
  return index >= 0 ? String(index) : "";
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "teacher-set";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

function TextField({
  className = "",
  label,
  onChange,
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className={`mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600 ${className}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: string }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600"
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          onChange(Number.isFinite(nextValue) ? nextValue : 0);
        }}
        type="number"
        value={value}
      />
    </label>
  );
}

function TextArea({
  className = "",
  label,
  onChange,
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        className={`mt-2 min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal-600 ${className}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectField({
  className = "",
  label,
  onChange,
  options,
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        className={`mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 ${className}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
