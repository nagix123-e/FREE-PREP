import Database from "@tauri-apps/plugin-sql";
import type { PackageType, Question, QuestionSet, Section, SetStatus } from "../types";

const DB_URL = "sqlite:sat-practice-simulator.db";

export interface TeacherDraft {
  id: string;
  name: string;
  updatedAt: string;
  data: unknown;
}

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
      section_counts TEXT NOT NULL DEFAULT '',
      preview_password TEXT NOT NULL DEFAULT '',
      edit_passkey_credential_id TEXT NOT NULL DEFAULT ''
    )
  `);
  await ensureColumn(db, "question_sets", "package_type", "TEXT NOT NULL DEFAULT 'full_test'");
  await ensureColumn(db, "question_sets", "source_filename", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "question_sets", "row_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "question_sets", "section_counts", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "question_sets", "preview_password", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "question_sets", "edit_passkey_credential_id", "TEXT NOT NULL DEFAULT ''");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teacher_drafts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    )
  `);
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
    CREATE TABLE IF NOT EXISTS score_history_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_attempt_id INTEGER NOT NULL UNIQUE,
      question_set_id INTEGER NOT NULL,
      question_set_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      practice_score INTEGER,
      rw_score INTEGER,
      math_score INTEGER,
      accuracy INTEGER NOT NULL DEFAULT 0,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
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
  previewPassword?: string;
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
        package_type, source_filename, row_count, section_counts, preview_password
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
        JSON.stringify(sectionCounts),
        input.previewPassword ?? ""
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
      sectionCounts,
      previewPassword: input.previewPassword ?? "",
      editPasskeyCredentialId: "",
      hasAttempts: false
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
            package_type, source_filename, row_count, section_counts, preview_password, edit_passkey_credential_id,
            EXISTS(SELECT 1 FROM attempts WHERE attempts.question_set_id = question_sets.id) AS has_attempts
     FROM question_sets
     ORDER BY imported_at DESC`
  );
  return rows.map(toQuestionSet);
}

export async function getQuestionSet(id: number): Promise<QuestionSet | null> {
  const db = await getDatabase();
  const rows = await db.select<QuestionSetRow[]>(
    `SELECT id, name, description, imported_at, total_questions, status,
            package_type, source_filename, row_count, section_counts, preview_password, edit_passkey_credential_id,
            EXISTS(SELECT 1 FROM attempts WHERE attempts.question_set_id = question_sets.id) AS has_attempts
     FROM question_sets
     WHERE id = $1`,
    [id]
  );
  return rows[0] ? toQuestionSet(rows[0]) : null;
}

export async function deleteQuestionSet(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("PRAGMA foreign_keys = ON");
  await archiveScoreHistoryForQuestionSet(db, id);
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

async function archiveScoreHistoryForQuestionSet(db: Database, questionSetId: number): Promise<void> {
  const createdAt = new Date().toISOString();
  await db.execute(
    `INSERT OR IGNORE INTO score_history_snapshots (
       source_attempt_id,
       question_set_id,
       question_set_name,
       mode,
       status,
       started_at,
       completed_at,
       practice_score,
       rw_score,
       math_score,
       accuracy,
       duration_sec,
       created_at
     )
     SELECT
       attempts.id,
       attempts.question_set_id,
       question_sets.name,
       attempts.mode,
       attempts.status,
       attempts.started_at,
       attempts.completed_at,
       attempts.practice_score,
       attempts.rw_score,
       attempts.math_score,
       CASE
         WHEN COALESCE(response_totals.response_count, 0) > 0
           THEN ROUND((COALESCE(response_totals.correct_count, 0) * 100.0) / response_totals.response_count)
         ELSE 0
       END,
       CASE
         WHEN COALESCE(response_totals.duration_sec, 0) > 0
           THEN response_totals.duration_sec
         WHEN attempts.completed_at IS NOT NULL
           THEN MAX(0, ROUND((julianday(attempts.completed_at) - julianday(attempts.started_at)) * 86400))
         ELSE 0
       END,
       $2
     FROM attempts
     JOIN question_sets ON question_sets.id = attempts.question_set_id
     LEFT JOIN (
       SELECT
         attempt_id,
         COUNT(*) AS response_count,
         SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
         COALESCE(SUM(time_spent_sec), 0) AS duration_sec
       FROM responses
       GROUP BY attempt_id
     ) AS response_totals ON response_totals.attempt_id = attempts.id
     WHERE attempts.question_set_id = $1
       AND attempts.status = 'completed'`,
    [questionSetId, createdAt]
  );
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

export async function saveTeacherDraft(input: { id: string; name: string; data: unknown }): Promise<void> {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  await db.execute(
    `INSERT INTO teacher_drafts (id, name, updated_at, data_json)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       updated_at = excluded.updated_at,
       data_json = excluded.data_json`,
    [input.id, input.name, updatedAt, JSON.stringify(input.data)]
  );
}

export async function listTeacherDrafts(): Promise<TeacherDraft[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ id: string; name: string; updated_at: string; data_json: string }>>(
    "SELECT id, name, updated_at, data_json FROM teacher_drafts ORDER BY updated_at DESC"
  );
  return rows.flatMap((row) => {
    try {
      return [{ id: row.id, name: row.name, updatedAt: row.updated_at, data: JSON.parse(row.data_json) }];
    } catch {
      return [];
    }
  });
}

export async function deleteTeacherDraft(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM teacher_drafts WHERE id = $1", [id]);
}

export async function updateQuestionSetQuestions(input: {
  questionSetId: number;
  questions: Question[];
  status: SetStatus;
  rowCount?: number;
  sectionCounts?: Record<Section, number>;
  previewPassword?: string;
}): Promise<QuestionSet> {
  const db = await getDatabase();
  const set = await getQuestionSet(input.questionSetId);
  if (!set) throw new Error("Question set could not be found.");
  if (set.hasAttempts) {
    throw new Error("This set has practice history and cannot be edited in place.");
  }

  const stored = await db.select<Array<{ question_id: string }>>(
    "SELECT question_id FROM questions WHERE question_set_id = $1",
    [input.questionSetId]
  );
  const storedIds = new Set(stored.map((row) => row.question_id));
  const incomingIds = new Set(input.questions.map((question) => question.questionId));
  if (storedIds.size !== incomingIds.size || [...storedIds].some((id) => !incomingIds.has(id))) {
    throw new Error("Question IDs cannot be changed when editing an imported set.");
  }

  for (const question of input.questions) {
    await updateQuestion(db, input.questionSetId, question);
  }

  const sectionCounts = input.sectionCounts ?? countSections(input.questions);
  const nextPreviewPassword = input.previewPassword ?? set.previewPassword;
  await db.execute(
    `UPDATE question_sets
     SET total_questions = $1,
         status = $2,
         row_count = $3,
         section_counts = $4,
         preview_password = $5,
         edit_passkey_credential_id = CASE WHEN $5 = '' THEN '' ELSE edit_passkey_credential_id END
     WHERE id = $6`,
    [
      input.questions.length,
      input.status,
      input.rowCount ?? input.questions.length,
      JSON.stringify(sectionCounts),
      nextPreviewPassword,
      input.questionSetId
    ]
  );
  return (await getQuestionSet(input.questionSetId))!;
}

export async function setQuestionSetEditPasskey(questionSetId: number, credentialId: string): Promise<QuestionSet> {
  const db = await getDatabase();
  const set = await getQuestionSet(questionSetId);
  if (!set) throw new Error("Question set could not be found.");
  if (!set.previewPassword) throw new Error("Set an edit password before adding a device passkey.");
  await db.execute(
    "UPDATE question_sets SET edit_passkey_credential_id = $1 WHERE id = $2",
    [credentialId, questionSetId]
  );
  return (await getQuestionSet(questionSetId))!;
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

async function updateQuestion(db: Database, questionSetId: number, question: Question): Promise<void> {
  await db.execute(
    `UPDATE questions SET
      test_id = $1, exam_version = $2, generation_batch_id = $3, target_score_band = $4,
      section = $5, module = $6, route = $7, question_number = $8,
      domain = $9, skill = $10, difficulty = $11, question_type = $12, passage = $13,
      question = $14, choice_a = $15, choice_b = $16, choice_c = $17, choice_d = $18,
      correct_answer = $19, correct_choice_index = $20, explanation = $21, time_estimate_sec = $22,
      visual_type = $23, visual_json = $24, table_markdown = $25, equation_latex = $26,
      student_response_type = $27, correct_numeric_answer = $28, answer_tolerance = $29,
      primary_skill = $30, secondary_skill = $31, tags = $32, content_domain = $33,
      skill_group = $34, skill_code = $35, skill_label = $36, question_topic = $37,
      scoring_weight = $38
     WHERE question_set_id = $39 AND question_id = $40`,
    [
      textValue(question.testId),
      textValue(question.examVersion),
      textValue(question.generationBatchId),
      textValue(question.targetScoreBand),
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
      numberValue(question.scoringWeight, 1),
      questionSetId,
      textValue(question.questionId)
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
  preview_password: string | null;
  edit_passkey_credential_id: string | null;
  has_attempts?: number | boolean | string | null;
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
    sectionCounts,
    hasAttempts: row.has_attempts === true || row.has_attempts === 1 || row.has_attempts === "1",
    previewPassword: row.preview_password ?? "",
    editPasskeyCredentialId: row.edit_passkey_credential_id ?? ""
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
