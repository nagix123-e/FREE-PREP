import Database from "@tauri-apps/plugin-sql";
import type { PackageType, Question, QuestionSet, Section, SetStatus } from "../types";

const DB_URL = "sqlite:sat-practice-simulator.db";

let dbPromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (!isTauriRuntime()) {
    throw new Error("SQLite storage is available when the app is running in Tauri desktop mode.");
  }
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).then(async (db) => {
      await initializeSchema(db);
      return db;
    });
  }
  return dbPromise;
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in globalThis;
}

export async function initializeSchema(db: Database): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS question_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      imported_at TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      status TEXT NOT NULL,
      package_type TEXT NOT NULL DEFAULT 'full_test',
      source_filename TEXT NOT NULL DEFAULT '',
      row_count INTEGER NOT NULL DEFAULT 0,
      section_counts TEXT NOT NULL DEFAULT ''
    )
  `);
  await ensureColumn(db, "question_sets", "package_type", "TEXT NOT NULL DEFAULT 'full_test'");
  await ensureColumn(db, "question_sets", "source_filename", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "question_sets", "row_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "question_sets", "section_counts", "TEXT NOT NULL DEFAULT ''");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_set_id INTEGER NOT NULL,
      test_id TEXT NOT NULL,
      exam_version TEXT NOT NULL DEFAULT '',
      generation_batch_id TEXT NOT NULL DEFAULT '',
      target_score_band TEXT NOT NULL DEFAULT '',
      question_id TEXT NOT NULL,
      section TEXT NOT NULL,
      module INTEGER NOT NULL,
      route TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      domain TEXT NOT NULL,
      skill TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question_type TEXT NOT NULL,
      passage TEXT NOT NULL,
      question TEXT NOT NULL,
      choice_a TEXT NOT NULL,
      choice_b TEXT NOT NULL,
      choice_c TEXT NOT NULL,
      choice_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      correct_choice_index INTEGER,
      explanation TEXT NOT NULL,
      time_estimate_sec INTEGER,
      visual_type TEXT NOT NULL DEFAULT 'none',
      visual_json TEXT NOT NULL DEFAULT '',
      table_markdown TEXT NOT NULL,
      image_path TEXT NOT NULL,
      equation_latex TEXT NOT NULL,
      student_response_type TEXT NOT NULL DEFAULT '',
      correct_numeric_answer TEXT NOT NULL DEFAULT '',
      answer_tolerance TEXT NOT NULL,
      primary_skill TEXT NOT NULL DEFAULT '',
      secondary_skill TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL,
      content_domain TEXT NOT NULL DEFAULT '',
      skill_group TEXT NOT NULL DEFAULT '',
      skill_code TEXT NOT NULL DEFAULT '',
      skill_label TEXT NOT NULL DEFAULT '',
      question_topic TEXT NOT NULL DEFAULT '',
      scoring_weight REAL NOT NULL DEFAULT 1,
      FOREIGN KEY (question_set_id) REFERENCES question_sets(id) ON DELETE CASCADE,
      UNIQUE(question_set_id, question_id)
    )
  `);
  await ensureColumn(db, "questions", "exam_version", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "generation_batch_id", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "target_score_band", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "test_id", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "question_id", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "section", "TEXT NOT NULL DEFAULT 'RW'");
  await ensureColumn(db, "questions", "module", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn(db, "questions", "route", "TEXT NOT NULL DEFAULT 'base'");
  await ensureColumn(db, "questions", "question_number", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "questions", "domain", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "skill", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "difficulty", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "question_type", "TEXT NOT NULL DEFAULT 'multiple_choice'");
  await ensureColumn(db, "questions", "passage", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "question", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "choice_a", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "choice_b", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "choice_c", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "choice_d", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "correct_answer", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "correct_choice_index", "INTEGER");
  await ensureColumn(db, "questions", "explanation", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "time_estimate_sec", "INTEGER");
  await ensureColumn(db, "questions", "visual_type", "TEXT NOT NULL DEFAULT 'none'");
  await ensureColumn(db, "questions", "visual_json", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "table_markdown", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "image_path", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "equation_latex", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "student_response_type", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "correct_numeric_answer", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "answer_tolerance", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "primary_skill", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "secondary_skill", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "tags", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "content_domain", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "skill_group", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "skill_code", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "skill_label", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "question_topic", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "questions", "scoring_weight", "REAL NOT NULL DEFAULT 1");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_set_id INTEGER NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      current_section TEXT,
      current_module INTEGER,
      current_question_index INTEGER NOT NULL DEFAULT 0,
      remaining_time_sec INTEGER,
      practice_score INTEGER,
      rw_score INTEGER,
      math_score INTEGER,
      FOREIGN KEY (question_set_id) REFERENCES question_sets(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT,
      is_correct INTEGER,
      marked INTEGER NOT NULL DEFAULT 0,
      eliminated_choices TEXT NOT NULL DEFAULT '',
      time_spent_sec INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);
  await ensureColumn(db, "attempts", "remaining_time_sec", "INTEGER");
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS responses_attempt_question_idx
    ON responses(attempt_id, question_id)
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS score_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_set_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      raw_score REAL NOT NULL,
      scaled_score INTEGER NOT NULL,
      FOREIGN KEY (question_set_id) REFERENCES question_sets(id) ON DELETE CASCADE,
      UNIQUE(question_set_id, section, raw_score)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS review_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(question_id)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_text TEXT NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(attempt_id, question_id)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS trend_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    )
  `);
}

async function ensureColumn(
  db: Database,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  const rows = await db.select<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);
  if (!rows.some((row) => row.name === columnName)) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export async function saveQuestionSet(input: {
  name: string;
  description: string;
  questions: Question[];
  status: SetStatus;
  packageType?: PackageType;
  sourceFilename?: string;
  rowCount?: number;
  sectionCounts?: Record<Section, number>;
}): Promise<QuestionSet> {
  const db = await getDatabase();
  const importedAt = new Date().toISOString();
  const questionSetId = createSqliteIntegerId();
  const sectionCounts = input.sectionCounts ?? countSections(input.questions);
  const packageType = input.packageType ?? inferPackageType(input.questions, input.questions.length, sectionCounts);
  const rowCount = input.rowCount ?? input.questions.length;

  try {
    await db.execute(
      `INSERT INTO question_sets (
        id, name, description, imported_at, total_questions, status,
        package_type, source_filename, row_count, section_counts
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        questionSetId,
        input.name,
        input.description,
        importedAt,
        input.questions.length,
        input.status,
        packageType,
        input.sourceFilename ?? "",
        rowCount,
        JSON.stringify(sectionCounts)
      ]
    );

    for (const question of input.questions) {
      try {
        await insertQuestion(db, questionSetId, question);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not save question ${question.questionId || question.questionNumber}: ${message}`
        );
      }
    }

    return {
      id: questionSetId,
      name: input.name,
      description: input.description,
      importedAt,
      totalQuestions: input.questions.length,
      status: input.status,
      packageType,
      sourceFilename: input.sourceFilename ?? "",
      rowCount,
      sectionCounts
    };
  } catch (error) {
    try {
      await db.execute("DELETE FROM question_sets WHERE id = $1", [questionSetId]);
    } catch {
      // Keep the original save error visible to the UI.
    }
    throw error;
  }
}

export function createSqliteIntegerId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export async function listQuestionSets(): Promise<QuestionSet[]> {
  const db = await getDatabase();
  const rows = await db.select<QuestionSetRow[]>(
    `SELECT id, name, description, imported_at, total_questions, status,
            package_type, source_filename, row_count, section_counts
     FROM question_sets
     ORDER BY imported_at DESC`
  );
  return rows.map(toQuestionSet);
}

export async function getQuestionSet(id: number): Promise<QuestionSet | null> {
  const db = await getDatabase();
  const rows = await db.select<QuestionSetRow[]>(
    `SELECT id, name, description, imported_at, total_questions, status,
            package_type, source_filename, row_count, section_counts
     FROM question_sets
     WHERE id = $1`,
    [id]
  );
  return rows[0] ? toQuestionSet(rows[0]) : null;
}

export async function deleteQuestionSet(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute(
    `DELETE FROM responses
     WHERE attempt_id IN (SELECT id FROM attempts WHERE question_set_id = $1)
        OR question_id IN (SELECT id FROM questions WHERE question_set_id = $1)`,
    [id]
  );
  await db.execute(
    `DELETE FROM highlights
     WHERE attempt_id IN (SELECT id FROM attempts WHERE question_set_id = $1)
        OR question_id IN (SELECT id FROM questions WHERE question_set_id = $1)`,
    [id]
  );
  await db.execute(
    `DELETE FROM notes
     WHERE attempt_id IN (SELECT id FROM attempts WHERE question_set_id = $1)
        OR question_id IN (SELECT id FROM questions WHERE question_set_id = $1)`,
    [id]
  );
  await db.execute(
    "DELETE FROM review_list WHERE question_id IN (SELECT id FROM questions WHERE question_set_id = $1)",
    [id]
  );
  await db.execute("DELETE FROM score_conversions WHERE question_set_id = $1", [id]);
  await db.execute("DELETE FROM attempts WHERE question_set_id = $1", [id]);
  await db.execute("DELETE FROM questions WHERE question_set_id = $1", [id]);
  await db.execute("DELETE FROM question_sets WHERE id = $1", [id]);
}

export async function listQuestions(questionSetId: number): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.select<QuestionRow[]>(
    `SELECT *
     FROM questions
     WHERE question_set_id = $1
     ORDER BY
       CASE section WHEN 'RW' THEN 1 ELSE 2 END,
       module,
       question_number`,
    [questionSetId]
  );
  return rows.map(toQuestion);
}

export async function combineSectionQuestionSets(input: {
  rwSetId: number;
  mathSetId: number;
  name: string;
  description: string;
}): Promise<QuestionSet> {
  if (input.rwSetId === input.mathSetId) {
    throw new Error("Select one RW Section package and one Math Section package.");
  }

  const [rwSet, mathSet] = await Promise.all([
    getQuestionSet(input.rwSetId),
    getQuestionSet(input.mathSetId)
  ]);
  if (!rwSet || !mathSet) {
    throw new Error("Could not find both source packages.");
  }
  if (rwSet.packageType !== "rw_section") {
    throw new Error("The selected RW package must be an RW Section Package.");
  }
  if (mathSet.packageType !== "math_section") {
    throw new Error("The selected Math package must be a Math Section Package.");
  }

  const [rwQuestions, mathQuestions] = await Promise.all([
    listQuestions(input.rwSetId),
    listQuestions(input.mathSetId)
  ]);
  validateSectionPackageForCombine("rw_section", rwQuestions);
  validateSectionPackageForCombine("math_section", mathQuestions);

  const duplicates = findDuplicateQuestionIds([...rwQuestions, ...mathQuestions]);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate question_id values after combine: ${duplicates.join(", ")}`);
  }

  const combinedQuestions = [...rwQuestions, ...mathQuestions].map(({ id, questionSetId, ...question }) => question);
  validateSectionPackageForCombine("full_test", combinedQuestions);

  return saveQuestionSet({
    name: input.name,
    description: input.description,
    questions: combinedQuestions,
    status: "valid",
    packageType: "full_test",
    sourceFilename: "combined",
    rowCount: combinedQuestions.length,
    sectionCounts: countSections(combinedQuestions)
  });
}

async function insertQuestion(db: Database, questionSetId: number, question: Question): Promise<void> {
  await db.execute(
    `INSERT INTO questions (
      question_set_id, test_id, exam_version, generation_batch_id, target_score_band,
      question_id, section, module, route, question_number,
      domain, skill, difficulty, question_type, passage, question, choice_a, choice_b,
      choice_c, choice_d, correct_answer, correct_choice_index, explanation, time_estimate_sec,
      visual_type, visual_json, table_markdown, image_path, equation_latex,
      student_response_type, correct_numeric_answer, answer_tolerance, primary_skill,
      secondary_skill, tags, content_domain, skill_group, skill_code, skill_label,
      question_topic, scoring_weight
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
      $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
    )`,
    [
      questionSetId,
      textValue(question.testId),
      textValue(question.examVersion),
      textValue(question.generationBatchId),
      textValue(question.targetScoreBand),
      textValue(question.questionId),
      textValue(question.section),
      numberValue(question.module, 1),
      textValue(question.route),
      numberValue(question.questionNumber, 0),
      textValue(question.domain || question.contentDomain),
      textValue(question.skill || question.skillGroup),
      textValue(question.difficulty),
      textValue(question.questionType),
      textValue(question.passage),
      textValue(question.question),
      textValue(question.choiceA),
      textValue(question.choiceB),
      textValue(question.choiceC),
      textValue(question.choiceD),
      textValue(question.correctAnswer),
      nullableNumberValue(question.correctChoiceIndex),
      textValue(question.explanation),
      nullableNumberValue(question.timeEstimateSec),
      textValue(question.visualType || "none"),
      textValue(question.visualJson),
      textValue(question.tableMarkdown),
      "",
      textValue(question.equationLatex),
      textValue(question.studentResponseType),
      textValue(question.correctNumericAnswer),
      textValue(question.answerTolerance),
      textValue(question.primarySkill),
      textValue(question.secondarySkill),
      textValue(question.tags),
      textValue(question.contentDomain || question.domain),
      textValue(question.skillGroup || question.skill),
      textValue(question.skillCode),
      textValue(question.skillLabel),
      textValue(question.questionTopic),
      numberValue(question.scoringWeight, 1)
    ]
  );
}

function textValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function numberValue(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function nullableNumberValue(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

const PACKAGE_EXPECTED_COUNTS: Record<PackageType, Record<string, number>> = {
  full_test: {
    "RW-1-base": 27,
    "RW-2-hard": 27,
    "MATH-1-base": 22,
    "MATH-2-hard": 22
  },
  rw_section: {
    "RW-1-base": 27,
    "RW-2-hard": 27
  },
  math_section: {
    "MATH-1-base": 22,
    "MATH-2-hard": 22
  }
};

const PACKAGE_EXPECTED_TOTALS: Record<PackageType, number> = {
  full_test: 98,
  rw_section: 54,
  math_section: 44
};

function countSections(questions: Question[]): Record<Section, number> {
  return questions.reduce<Record<Section, number>>(
    (counts, question) => {
      counts[question.section] = (counts[question.section] ?? 0) + 1;
      return counts;
    },
    { RW: 0, MATH: 0 }
  );
}

function inferPackageType(
  questions: Question[],
  rowCount: number,
  sectionCounts: Record<Section, number>
): PackageType {
  const hasRw = sectionCounts.RW > 0;
  const hasMath = sectionCounts.MATH > 0;
  if (hasRw && hasMath) return "full_test";
  if (hasRw && !hasMath) return "rw_section";
  if (hasMath && !hasRw) return "math_section";
  return rowCount === 44 && questions.every((question) => question.section === "MATH")
    ? "math_section"
    : "full_test";
}

function inferPackageTypeFromMetadata(
  totalQuestions: number,
  sectionCounts: Record<Section, number>
): PackageType {
  const hasRw = sectionCounts.RW > 0;
  const hasMath = sectionCounts.MATH > 0;
  if (hasRw && !hasMath) return "rw_section";
  if (hasMath && !hasRw) return "math_section";
  if (totalQuestions === 54 && sectionCounts.RW === 54) return "rw_section";
  if (totalQuestions === 44 && sectionCounts.MATH === 44) return "math_section";
  return "full_test";
}

function isPackageType(value: unknown): value is PackageType {
  return value === "full_test" || value === "rw_section" || value === "math_section";
}

function parseSectionCounts(value: string | null): Record<Section, number> {
  if (!value) {
    return { RW: 0, MATH: 0 };
  }
  try {
    const parsed = JSON.parse(value) as Partial<Record<Section, unknown>>;
    return {
      RW: Number(parsed.RW) || 0,
      MATH: Number(parsed.MATH) || 0
    };
  } catch {
    return { RW: 0, MATH: 0 };
  }
}

function validateSectionPackageForCombine(packageType: PackageType, questions: Question[]): void {
  const expectedTotal = PACKAGE_EXPECTED_TOTALS[packageType];
  if (questions.length !== expectedTotal) {
    throw new Error(`${formatPackageType(packageType)} requires ${expectedTotal} rows; found ${questions.length}.`);
  }

  const counts = questions.reduce<Record<string, number>>((nextCounts, question) => {
    const key = `${question.section}-${question.module}-${question.route}`;
    nextCounts[key] = (nextCounts[key] ?? 0) + 1;
    return nextCounts;
  }, {});

  const expectedCounts = PACKAGE_EXPECTED_COUNTS[packageType];
  for (const [key, expected] of Object.entries(expectedCounts)) {
    const actual = counts[key] ?? 0;
    if (actual !== expected) {
      throw new Error(`Expected ${formatCountKey(key)} ${expected}, found ${actual}.`);
    }
  }

  for (const [key, actual] of Object.entries(counts)) {
    if (actual > 0 && !(key in expectedCounts)) {
      throw new Error(`${formatCountKey(key)} is not allowed in ${formatPackageType(packageType)}; found ${actual}.`);
    }
  }
}

function findDuplicateQuestionIds(questions: Question[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const question of questions) {
    if (seen.has(question.questionId)) {
      duplicates.add(question.questionId);
    }
    seen.add(question.questionId);
  }
  return [...duplicates];
}

function formatPackageType(packageType: PackageType): string {
  if (packageType === "rw_section") return "RW section package";
  if (packageType === "math_section") return "Math section package";
  return "Full test package";
}

function formatCountKey(key: string): string {
  const [section, moduleNumber, route] = key.split("-");
  return `${section} Module ${moduleNumber} ${route}`;
}

interface QuestionSetRow {
  id: number;
  name: string;
  description: string;
  imported_at: string;
  total_questions: number;
  status: SetStatus;
  package_type: PackageType | null;
  source_filename: string | null;
  row_count: number | null;
  section_counts: string | null;
}

interface QuestionRow {
  id: number;
  question_set_id: number;
  test_id: string;
  exam_version: string;
  generation_batch_id: string;
  target_score_band: string;
  question_id: string;
  section: Question["section"];
  module: Question["module"];
  route: Question["route"];
  question_number: number;
  domain: string;
  skill: string;
  difficulty: string;
  question_type: Question["questionType"];
  passage: string;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  correct_choice_index: number | null;
  explanation: string;
  time_estimate_sec: number | null;
  visual_type: Question["visualType"];
  visual_json: string;
  table_markdown: string;
  image_path: string;
  equation_latex: string;
  student_response_type: string;
  correct_numeric_answer: string;
  answer_tolerance: string;
  primary_skill: string;
  secondary_skill: string;
  tags: string;
  content_domain: string;
  skill_group: string;
  skill_code: string;
  skill_label: string;
  question_topic: string;
  scoring_weight: number;
}

function toQuestionSet(row: QuestionSetRow): QuestionSet {
  const sectionCounts = parseSectionCounts(row.section_counts);
  const rowCount = row.row_count && row.row_count > 0 ? row.row_count : row.total_questions;
  const packageType = isPackageType(row.package_type)
    ? row.package_type
    : inferPackageTypeFromMetadata(row.total_questions, sectionCounts);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    importedAt: row.imported_at,
    totalQuestions: row.total_questions,
    status: row.status,
    packageType,
    sourceFilename: row.source_filename ?? "",
    rowCount,
    sectionCounts
  };
}

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    questionSetId: row.question_set_id,
    testId: row.test_id,
    examVersion: row.exam_version,
    generationBatchId: row.generation_batch_id,
    targetScoreBand: row.target_score_band,
    questionId: row.question_id,
    section: row.section,
    module: row.module,
    route: row.route,
    questionNumber: row.question_number,
    domain: row.domain,
    skill: row.skill,
    difficulty: row.difficulty,
    questionType: row.question_type,
    passage: row.passage,
    question: row.question,
    choiceA: row.choice_a,
    choiceB: row.choice_b,
    choiceC: row.choice_c,
    choiceD: row.choice_d,
    correctAnswer: row.correct_answer,
    correctChoiceIndex: row.correct_choice_index,
    explanation: row.explanation,
    timeEstimateSec: row.time_estimate_sec,
    visualType: row.visual_type || "none",
    visualJson: row.visual_json,
    tableMarkdown: row.table_markdown,
    imagePath: row.image_path,
    equationLatex: row.equation_latex,
    studentResponseType: row.student_response_type,
    correctNumericAnswer: row.correct_numeric_answer,
    answerTolerance: row.answer_tolerance,
    primarySkill: row.primary_skill,
    secondarySkill: row.secondary_skill,
    tags: row.tags,
    contentDomain: row.content_domain || row.domain,
    skillGroup: row.skill_group || row.skill,
    skillCode: row.skill_code,
    skillLabel: row.skill_label,
    questionTopic: row.question_topic,
    scoringWeight: row.scoring_weight || 1
  };
}
