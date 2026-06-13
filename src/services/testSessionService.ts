import { createSqliteIntegerId, getDatabase, listQuestions } from "../lib/database";
import { getModuleDurationSec, getModuleQuestions, TEST_MODULES } from "../lib/testPlan";
import { gradeAttempt } from "./scoringService";
import type { Attempt, Question, ResponseRecord } from "../types";

export async function createFullHardAttempt(questionSetId: number): Promise<{
  attempt: Attempt;
  questions: Question[];
  responses: ResponseRecord[];
}> {
  const questions = await listQuestions(questionSetId);
  validateFullHardQuestionSet(questions);

  const db = await getDatabase();
  const firstModule = TEST_MODULES[0];
  const startedAt = new Date().toISOString();
  const attemptId = createSqliteIntegerId();

  await db.execute(
    `INSERT INTO attempts (
      id, question_set_id, mode, status, started_at, current_section, current_module,
      current_question_index, remaining_time_sec
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      attemptId,
      questionSetId,
      "full_hard_practice",
      "in_progress",
      startedAt,
      firstModule.section,
      firstModule.module,
      0,
      getModuleDurationSec(0)
    ]
  );

  const attempt: Attempt = {
    id: attemptId,
    questionSetId,
    mode: "full_hard_practice",
    status: "in_progress",
    startedAt,
    completedAt: null,
    currentSection: firstModule.section,
    currentModule: firstModule.module,
    currentQuestionIndex: 0,
    remainingTimeSec: getModuleDurationSec(0),
    practiceScore: null,
    rwScore: null,
    mathScore: null
  };

  return { attempt, questions, responses: [] };
}

export async function loadAttempt(attemptId: number): Promise<{
  attempt: Attempt;
  questions: Question[];
  responses: ResponseRecord[];
}> {
  const db = await getDatabase();
  const rows = await db.select<AttemptRow[]>("SELECT * FROM attempts WHERE id = $1", [attemptId]);
  const row = rows[0];
  if (!row) {
    throw new Error("Practice attempt was not found.");
  }

  const attempt = toAttempt(row);
  const questions = await listQuestions(attempt.questionSetId);
  const responses = await listResponses(attempt.id);
  return { attempt, questions, responses };
}

export async function saveAttemptPosition(input: {
  attemptId: number;
  status: Attempt["status"];
  moduleIndex: number;
  questionIndex: number;
  remainingTimeSec: number;
}): Promise<void> {
  const db = await getDatabase();
  const spec = TEST_MODULES[input.moduleIndex];
  await db.execute(
    `UPDATE attempts
     SET status = $1,
         current_section = $2,
         current_module = $3,
         current_question_index = $4,
         remaining_time_sec = $5
     WHERE id = $6`,
    [
      input.status,
      spec?.section ?? null,
      spec?.module ?? null,
      input.questionIndex,
      input.remainingTimeSec,
      input.attemptId
    ]
  );
}

export async function completeAttempt(attemptId: number): Promise<void> {
  await gradeAttempt(attemptId);
}

export async function saveResponse(record: ResponseRecord): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO responses (
      attempt_id, question_id, selected_answer, is_correct, marked, eliminated_choices, time_spent_sec
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET
      selected_answer = excluded.selected_answer,
      is_correct = excluded.is_correct,
      marked = excluded.marked,
      eliminated_choices = excluded.eliminated_choices,
      time_spent_sec = excluded.time_spent_sec`,
    [
      record.attemptId,
      record.questionId,
      record.selectedAnswer,
      record.isCorrect === null ? null : record.isCorrect ? 1 : 0,
      record.marked ? 1 : 0,
      JSON.stringify(record.eliminatedChoices),
      record.timeSpentSec
    ]
  );
}

async function listResponses(attemptId: number): Promise<ResponseRecord[]> {
  const db = await getDatabase();
  const rows = await db.select<ResponseRow[]>(
    `SELECT *
     FROM responses
     WHERE attempt_id = $1`,
    [attemptId]
  );
  return rows.map(toResponseRecord);
}

function validateFullHardQuestionSet(questions: Question[]): void {
  const problems = TEST_MODULES.flatMap((spec, index) => {
    const actual = getModuleQuestions(questions, index).length;
    return actual === spec.questionCount
      ? []
      : [`${spec.title} requires ${spec.questionCount} questions; found ${actual}.`];
  });

  if (problems.length > 0) {
    throw new Error(problems.join(" "));
  }
}

interface AttemptRow {
  id: number;
  question_set_id: number;
  mode: Attempt["mode"];
  status: Attempt["status"];
  started_at: string;
  completed_at: string | null;
  current_section: Attempt["currentSection"];
  current_module: Attempt["currentModule"];
  current_question_index: number;
  remaining_time_sec: number | null;
  practice_score: number | null;
  rw_score: number | null;
  math_score: number | null;
}

interface ResponseRow {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_answer: string | null;
  is_correct: number | null;
  marked: number;
  eliminated_choices: string;
  time_spent_sec: number;
}

function toAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    questionSetId: row.question_set_id,
    mode: row.mode,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    currentSection: row.current_section,
    currentModule: row.current_module,
    currentQuestionIndex: row.current_question_index,
    remainingTimeSec: row.remaining_time_sec,
    practiceScore: row.practice_score,
    rwScore: row.rw_score,
    mathScore: row.math_score
  };
}

function toResponseRecord(row: ResponseRow): ResponseRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    selectedAnswer: row.selected_answer ?? "",
    isCorrect: row.is_correct === null ? null : row.is_correct === 1,
    marked: row.marked === 1,
    eliminatedChoices: parseEliminatedChoices(row.eliminated_choices),
    timeSpentSec: row.time_spent_sec
  };
}

function parseEliminatedChoices(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
