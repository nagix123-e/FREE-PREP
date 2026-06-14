import * as Papa from "papaparse";
import type { ParseResult } from "papaparse";
import {
  type ModuleNumber,
  type PackageType,
  type Question,
  type QuestionType,
  type RawCsvQuestion,
  type Route,
  type Section,
  type VisualType,
  type ValidationIssue,
  type ValidationSummary
} from "../types";

const EXPECTED_COUNTS = new Map([
  ["RW-1-base", 27],
  ["RW-2-hard", 27],
  ["MATH-1-base", 22],
  ["MATH-2-hard", 22]
]);

const PACKAGE_RULES: Record<
  PackageType,
  { totalRows: number; keys: string[]; label: string; allowedSections: Section[] }
> = {
  full_test: {
    totalRows: 98,
    keys: ["RW-1-base", "RW-2-hard", "MATH-1-base", "MATH-2-hard"],
    label: "Full test",
    allowedSections: ["RW", "MATH"]
  },
  rw_section: {
    totalRows: 54,
    keys: ["RW-1-base", "RW-2-hard"],
    label: "RW section",
    allowedSections: ["RW"]
  },
  math_section: {
    totalRows: 44,
    keys: ["MATH-1-base", "MATH-2-hard"],
    label: "Math section",
    allowedSections: ["MATH"]
  }
};

const CSV_ROW_OFFSET = 2;
const REQUIRED_IMPORT_HEADERS = [
  "test_id",
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
  "question_type",
  "passage",
  "question",
  "explanation",
  "time_estimate_sec",
  "visual_type",
  "visual_json",
  "table_markdown",
  "equation_latex",
  "tags"
];

const ALIASED_HEADERS = new Map([
  ["content_domain", ["content_domain", "domain"]],
  ["skill_group", ["skill_group", "skill"]]
]);

const LEGACY_BACKFILL_HEADERS = new Set([
  "skill_code",
  "skill_label",
  "question_topic",
  "visual_type",
  "visual_json"
]);

const VISUAL_TYPES = new Set([
  "none",
  "table",
  "line_graph",
  "bar_graph",
  "scatter_plot",
  "coordinate_plane",
  "function_graph",
  "triangle",
  "right_triangle",
  "rectangle",
  "circle",
  "number_line",
  "box_plot",
  "pie_chart"
]);

const CHOICE_LETTERS = ["A", "B", "C", "D"] as const;

export function parseCsvFile(file: File): Promise<ValidationSummary> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transform: (value) => value.trim(),
      complete: (result) => resolve(validateParseResult(result)),
      error: (error) =>
        resolve({
          valid: false,
          questions: [],
          counts: {},
          visualTypeCounts: {},
          contentDomainCounts: {},
          skillGroupCounts: {},
          packageType: null,
          rowCount: 0,
          sectionCounts: emptySectionCounts(),
          issues: [{ level: "error", message: `CSV parse error: ${error.message}` }]
        })
    });
  });
}

export function validateParseResult(result: ParseResult<Record<string, string>>): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const fields = result.meta.fields ?? [];
  const missingHeaders = getMissingHeaders(fields);

  for (const header of missingHeaders) {
    issues.push({ level: "error", message: `Missing required header: ${header}` });
  }

  for (const parseError of result.errors) {
    issues.push({
      level: "error",
      row: parseError.row === undefined ? undefined : parseError.row + CSV_ROW_OFFSET,
      message: parseError.message
    });
  }

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      questions: [],
      counts: {},
      visualTypeCounts: {},
      contentDomainCounts: {},
      skillGroupCounts: {},
      packageType: null,
      rowCount: 0,
      sectionCounts: emptySectionCounts(),
      issues
    };
  }

  const seenQuestionIds = new Set<string>();
  const questions: Question[] = [];
  const counts: Record<string, number> = {};
  const visualTypeCounts: Record<string, number> = {};
  const contentDomainCounts: Record<string, number> = {};
  const skillGroupCounts: Record<string, number> = {};
  const sectionCounts = emptySectionCounts();

  result.data.forEach((row, index) => {
    const rowNumber = index + CSV_ROW_OFFSET;
    const raw = normalizeRawCsvQuestion(row as Record<string, string>);
    const rowIssues = validateRow(raw, rowNumber, seenQuestionIds);
    issues.push(...rowIssues);

    if (rowIssues.some((issue) => issue.level === "error")) {
      return;
    }

    const section = raw.section as Section;
    const moduleNumber = Number(raw.module) as ModuleNumber;
    const route = raw.route as Route;
    const key = countKey(section, moduleNumber, route);
    counts[key] = (counts[key] ?? 0) + 1;
    sectionCounts[section] = (sectionCounts[section] ?? 0) + 1;
    const visualType = raw.visual_type || "none";
    const contentDomain = raw.content_domain || "Unspecified";
    const skillGroup = raw.skill_group || "Unspecified";
    visualTypeCounts[visualType] = (visualTypeCounts[visualType] ?? 0) + 1;
    contentDomainCounts[contentDomain] = (contentDomainCounts[contentDomain] ?? 0) + 1;
    skillGroupCounts[skillGroup] = (skillGroupCounts[skillGroup] ?? 0) + 1;
    questions.push(toQuestion(raw, section, moduleNumber, route, raw.question_type as QuestionType));
  });

  const packageType = detectPackageType(questions);
  if (!packageType && questions.length > 0) {
    issues.push({
      level: "error",
      message: "Invalid section values. Expected all RW, all MATH, or a complete RW/MATH full test."
    });
  }

  if (packageType) {
    validatePackageCounts(packageType, questions.length, counts, sectionCounts, issues);
  }

  return {
    valid: !issues.some((issue) => issue.level === "error"),
    questions,
    counts,
    visualTypeCounts,
    contentDomainCounts,
    skillGroupCounts,
    packageType,
    rowCount: questions.length,
    sectionCounts,
    issues
  };
}

export function getPackageTypeLabel(packageType: PackageType): string {
  if (packageType === "full_test") return "Full Test Package";
  if (packageType === "rw_section") return "RW Section Package";
  return "Math Section Package";
}

function detectPackageType(questions: Question[]): PackageType | null {
  const sections = new Set(questions.map((question) => question.section));
  if (sections.has("RW") && sections.has("MATH")) return "full_test";
  if (sections.size === 1 && sections.has("RW")) return "rw_section";
  if (sections.size === 1 && sections.has("MATH")) return "math_section";
  return null;
}

function validatePackageCounts(
  packageType: PackageType,
  rowCount: number,
  counts: Record<string, number>,
  sectionCounts: Record<Section, number>,
  issues: ValidationIssue[]
): void {
  const rule = PACKAGE_RULES[packageType];
  const disallowedSections = (["RW", "MATH"] as Section[]).filter(
    (section) => !rule.allowedSections.includes(section) && sectionCounts[section] > 0
  );
  for (const section of disallowedSections) {
    issues.push({
      level: "error",
      message: `${rule.label} package cannot contain ${section} rows; found ${sectionCounts[section]}.`
    });
  }

  for (const key of rule.keys) {
    const expected = EXPECTED_COUNTS.get(key) ?? 0;
    const actual = counts[key] ?? 0;
    if (actual !== expected) {
      issues.push({
        level: "error",
        message: `Expected ${formatCountKey(key)} ${expected}, found ${actual}.`
      });
    }
  }

  for (const [key, actual] of Object.entries(counts)) {
    if (actual > 0 && !rule.keys.includes(key)) {
      issues.push({
        level: "error",
        message: `${formatCountKey(key)} is not allowed in ${rule.label} package; found ${actual}.`
      });
    }
  }

  if (rowCount !== rule.totalRows) {
    issues.push({
      level: "error",
      message: `${rule.label} package requires ${rule.totalRows} rows; found ${rowCount}.`
    });
  }
}

function formatCountKey(key: string): string {
  const [section, moduleNumber, route] = key.split("-");
  return `${section} Module ${moduleNumber} ${route}`;
}

function emptySectionCounts(): Record<Section, number> {
  return { RW: 0, MATH: 0 };
}

function getMissingHeaders(fields: string[]): string[] {
  const hasLegacyTaxonomy = fields.includes("domain") || fields.includes("skill");
  return REQUIRED_IMPORT_HEADERS.filter((header) => {
    if (hasLegacyTaxonomy && LEGACY_BACKFILL_HEADERS.has(header)) {
      return false;
    }
    const aliases = ALIASED_HEADERS.get(header) ?? [header];
    return !aliases.some((alias) => fields.includes(alias));
  });
}

function normalizeRawCsvQuestion(row: Record<string, string>): RawCsvQuestion {
  return {
    test_id: row.test_id ?? "",
    exam_version: row.exam_version ?? "",
    generation_batch_id: row.generation_batch_id ?? "",
    target_score_band: row.target_score_band ?? "",
    question_id: row.question_id ?? "",
    section: row.section ?? "",
    module: row.module ?? "",
    route: row.route ?? "",
    question_number: row.question_number ?? "",
    domain: row.domain,
    skill: row.skill,
    difficulty: row.difficulty ?? "",
    scoring_weight: row.scoring_weight ?? "1",
    question_type: row.question_type ?? "",
    passage: row.passage ?? "",
    question: row.question ?? "",
    choice_a: row.choice_a ?? "",
    choice_b: row.choice_b ?? "",
    choice_c: row.choice_c ?? "",
    choice_d: row.choice_d ?? "",
    correct_answer: row.correct_answer ?? "",
    correct_choice_index: row.correct_choice_index ?? "",
    explanation: row.explanation ?? "",
    time_estimate_sec: row.time_estimate_sec ?? "",
    visual_type: row.visual_type ?? "none",
    visual_json: normalizeNoneValue(row.visual_json),
    table_markdown: row.table_markdown ?? "",
    equation_latex: row.equation_latex ?? "",
    student_response_type: row.student_response_type ?? "",
    correct_numeric_answer: row.correct_numeric_answer ?? "",
    answer_tolerance: row.answer_tolerance ?? "",
    primary_skill: row.primary_skill ?? "",
    secondary_skill: row.secondary_skill ?? "",
    tags: row.tags ?? "",
    content_domain: row.content_domain || row.domain || "",
    skill_group: row.skill_group || row.skill || "",
    skill_code: row.skill_code ?? "",
    skill_label: row.skill_label ?? "",
    question_topic: row.question_topic ?? "",
    graph_json: row.graph_json,
    diagram_json: row.diagram_json,
    image_definition: row.image_definition,
    legacy_visual_data: row.legacy_visual_data,
    visual_payload_v1: row.visual_payload_v1
  };
}

function validateRow(
  raw: RawCsvQuestion,
  row: number,
  seenQuestionIds: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const section = raw.section;
  const moduleValue = Number(raw.module);
  const route = raw.route;
  const questionType = raw.question_type;

  if (!raw.question_id) {
    issues.push({ level: "error", row, message: "question_id is required." });
  } else if (seenQuestionIds.has(raw.question_id)) {
    issues.push({ level: "error", row, message: `Duplicate question_id: ${raw.question_id}` });
  } else {
    seenQuestionIds.add(raw.question_id);
  }

  if (section !== "RW" && section !== "MATH") {
    issues.push({ level: "error", row, message: "section must be RW or MATH." });
  }

  if (moduleValue !== 1 && moduleValue !== 2) {
    issues.push({ level: "error", row, message: "module must be 1 or 2." });
  }

  if (route !== "base" && route !== "hard") {
    issues.push({ level: "error", row, message: "route must be base or hard." });
  }

  if (moduleValue === 1 && route !== "base") {
    issues.push({ level: "error", row, message: "module=1 only allows route=base." });
  }

  if (moduleValue === 2 && route !== "hard") {
    issues.push({ level: "error", row, message: "module=2 only allows route=hard." });
  }

  if (questionType !== "multiple_choice" && questionType !== "student_response") {
    issues.push({
      level: "error",
      row,
      message: "question_type must be multiple_choice or student_response."
    });
  }

  const correctChoiceIndex = Number(raw.correct_choice_index);

  if (questionType === "multiple_choice") {
    const missingChoices = ["choice_a", "choice_b", "choice_c", "choice_d"].filter(
      (field) => !raw[field as keyof RawCsvQuestion]
    );
    if (missingChoices.length > 0) {
      issues.push({
        level: "error",
        row,
        message: `multiple_choice requires ${missingChoices.join(", ")}.`
      });
    }
    if (!raw.correct_answer) {
      issues.push({ level: "error", row, message: "multiple_choice requires correct_answer." });
    } else if (!CHOICE_LETTERS.includes(raw.correct_answer.trim().toUpperCase() as (typeof CHOICE_LETTERS)[number])) {
      issues.push({
        level: "error",
        row,
        message: "multiple_choice requires correct_answer A, B, C, or D."
      });
    }
    if (!raw.correct_choice_index) {
      issues.push({ level: "error", row, message: "multiple_choice requires correct_choice_index." });
    } else if (!isValidChoiceIndex(correctChoiceIndex)) {
      issues.push({
        level: "error",
        row,
        message: "multiple_choice requires correct_choice_index 1-4."
      });
    }
  }

  if (questionType === "student_response") {
    if (!raw.correct_numeric_answer) {
      issues.push({ level: "error", row, message: "student_response requires correct_numeric_answer." });
    } else if (!isNumericAnswer(raw.correct_numeric_answer)) {
      issues.push({
        level: "error",
        row,
        message: "student_response correct_numeric_answer must be an integer, decimal, fraction, or negative number."
      });
    }
    if (!raw.answer_tolerance) {
      issues.push({ level: "error", row, message: "student_response requires answer_tolerance." });
    } else if (!Number.isFinite(Number(raw.answer_tolerance)) || Number(raw.answer_tolerance) < 0) {
      issues.push({
        level: "error",
        row,
        message: "student_response answer_tolerance must be a non-negative number."
      });
    }
  }

  if (!VISUAL_TYPES.has(raw.visual_type || "none")) {
    issues.push({ level: "error", row, message: "visual_type is not supported." });
  }

  if (raw.visual_json) {
    try {
      JSON.parse(raw.visual_json);
    } catch {
      issues.push({ level: "error", row, message: "visual_json must be valid JSON." });
    }
  }

  if (!Number.isFinite(Number(raw.question_number))) {
    issues.push({ level: "error", row, message: "question_number must be numeric." });
  }

  return issues;
}

function toQuestion(
  raw: RawCsvQuestion,
  section: Section,
  moduleNumber: ModuleNumber,
  route: Route,
  questionType: QuestionType
): Question {
  const estimate = Number(raw.time_estimate_sec);
  const weight = Number(raw.scoring_weight);
  const correctChoiceIndex = raw.correct_choice_index
    ? Number(raw.correct_choice_index)
    : Number.NaN;
  const migratedVisualJson = migrateLegacyVisualJson(raw);

  return {
    testId: raw.test_id,
    examVersion: raw.exam_version,
    generationBatchId: raw.generation_batch_id,
    targetScoreBand: raw.target_score_band,
    questionId: raw.question_id,
    section,
    module: moduleNumber,
    route,
    questionNumber: Number(raw.question_number),
    domain: raw.content_domain || raw.domain || "",
    skill: raw.skill_group || raw.skill || "",
    difficulty: raw.difficulty,
    questionType,
    passage: raw.passage,
    question: raw.question,
    choiceA: raw.choice_a,
    choiceB: raw.choice_b,
    choiceC: raw.choice_c,
    choiceD: raw.choice_d,
    correctAnswer: questionType === "multiple_choice" ? normalizeCorrectAnswer(raw) || raw.correct_answer : "",
    correctChoiceIndex: Number.isFinite(correctChoiceIndex) ? correctChoiceIndex : null,
    explanation: raw.explanation,
    timeEstimateSec: Number.isFinite(estimate) ? estimate : null,
    visualType: (raw.visual_type || "none") as VisualType,
    visualJson: migratedVisualJson,
    tableMarkdown: raw.table_markdown,
    imagePath: "",
    equationLatex: raw.equation_latex,
    studentResponseType: raw.student_response_type,
    correctNumericAnswer: raw.correct_numeric_answer,
    answerTolerance: raw.answer_tolerance,
    primarySkill: raw.primary_skill,
    secondarySkill: raw.secondary_skill,
    tags: raw.tags,
    contentDomain: raw.content_domain || raw.domain || "",
    skillGroup: raw.skill_group || raw.skill || "",
    skillCode: raw.skill_code ?? "",
    skillLabel: raw.skill_label ?? "",
    questionTopic: raw.question_topic ?? "",
    scoringWeight: Number.isFinite(weight) && weight > 0 ? weight : 1
  };
}

function migrateLegacyVisualJson(raw: RawCsvQuestion): string {
  if (raw.visual_json) {
    return raw.visual_json;
  }

  const legacyValue =
    raw.graph_json ||
    raw.diagram_json ||
    raw.image_definition ||
    raw.legacy_visual_data ||
    raw.visual_payload_v1 ||
    "";

  if (!legacyValue) {
    return "";
  }

  try {
    const parsed = JSON.parse(legacyValue) as Record<string, unknown>;
    return JSON.stringify({ ...parsed, type: raw.visual_type || parsed.type || "none" });
  } catch {
    return JSON.stringify({ type: raw.visual_type || "none", legacyText: legacyValue });
  }
}

function normalizeCorrectAnswer(raw: RawCsvQuestion): string {
  const direct = raw.correct_answer.trim().toUpperCase();
  if (CHOICE_LETTERS.includes(direct as (typeof CHOICE_LETTERS)[number])) {
    return direct;
  }

  const index = Number(raw.correct_choice_index);
  if (Number.isInteger(index) && index >= 1 && index <= 4) {
    return CHOICE_LETTERS[index - 1];
  }

  if (Number.isInteger(index) && index >= 0 && index <= 3) {
    return CHOICE_LETTERS[index];
  }

  return "";
}

function isNumericAnswer(value: string): boolean {
  const normalized = value.trim();
  return /^-?(?:\d+(?:\.\d*)?|\.\d+|\d+\/\d+)$/.test(normalized);
}

function isValidChoiceIndex(index: number): boolean {
  return Number.isInteger(index) && ((index >= 1 && index <= 4) || (index >= 0 && index <= 3));
}

function normalizeNoneValue(value: string | undefined): string {
  const text = value ?? "";
  return text.trim().toLowerCase() === "none" ? "" : text;
}

function countKey(section: Section, moduleNumber: ModuleNumber, route: Route): string {
  return `${section}-${moduleNumber}-${route}`;
}
