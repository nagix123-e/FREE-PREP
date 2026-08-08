import { getDatabase, listQuestions } from "../lib/database";
import type { GradedQuestion, Question } from "../types";

export const SPACED_REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const SPACED_REVIEW_SESSION_LIMIT = 20;

export interface SpacedReviewSummary {
  dueNow: number;
  dueToday: number;
  upcoming: number;
  totalScheduled: number;
  nextDueAt: string | null;
}

interface SpacedReviewItemRow {
  question_set_id: number;
  question_id: number;
}

export async function scheduleIncorrectQuestions(input: {
  attemptId: number;
  gradedQuestions: GradedQuestion[];
}): Promise<void> {
  for (const item of input.gradedQuestions) {
    if (!item.isAnswered || item.isCorrect || !item.question.id || !item.question.questionSetId) {
      continue;
    }
    await scheduleIncorrectQuestion({
      attemptId: input.attemptId,
      questionSetId: item.question.questionSetId,
      questionId: item.question.id
    });
  }
}

export async function scheduleIncorrectQuestion(input: {
  attemptId: number;
  questionSetId: number;
  questionId: number;
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  await db.execute(
    `INSERT INTO spaced_review_items (
      question_set_id, question_id, stage, due_at, last_result,
      last_source_attempt_id, created_at, updated_at
    ) VALUES ($1, $2, 0, $3, 'incorrect', $4, $5, $5)
    ON CONFLICT(question_set_id, question_id) DO UPDATE SET
      stage = 0,
      due_at = excluded.due_at,
      last_result = 'incorrect',
      correct_streak = 0,
      resolved_at = NULL,
      last_source_attempt_id = excluded.last_source_attempt_id,
      updated_at = excluded.updated_at
    WHERE spaced_review_items.last_source_attempt_id IS NULL
       OR spaced_review_items.last_source_attempt_id != excluded.last_source_attempt_id`,
    [
      input.questionSetId,
      input.questionId,
      addLocalCalendarDays(now, SPACED_REVIEW_INTERVAL_DAYS[0]),
      input.attemptId,
      nowIso
    ]
  );
}

export async function getSpacedReviewSummary(now = new Date()): Promise<SpacedReviewSummary> {
  await backfillSpacedReviewFromExistingMistakes();
  await deleteSpacedReviewItemIfSourceMissing();
  const db = await getDatabase();
  const nowIso = now.toISOString();
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(24, 0, 0, 0);
  const rows = await db.select<Array<{ due_now: number; due_today: number; upcoming: number; total_scheduled: number; next_due_at: string | null }>>(
    `SELECT
      SUM(CASE WHEN due_at <= $1 THEN 1 ELSE 0 END) AS due_now,
      SUM(CASE WHEN due_at < $2 THEN 1 ELSE 0 END) AS due_today,
      SUM(CASE WHEN due_at > $1 THEN 1 ELSE 0 END) AS upcoming,
      COUNT(*) AS total_scheduled,
      MIN(CASE WHEN due_at > $1 THEN due_at END) AS next_due_at
     FROM spaced_review_items
     WHERE resolved_at IS NULL`,
    [nowIso, startOfTomorrow.toISOString()]
  );
  const row = rows[0];
  return {
    dueNow: Number(row?.due_now) || 0,
    dueToday: Number(row?.due_today) || 0,
    upcoming: Number(row?.upcoming) || 0,
    totalScheduled: Number(row?.total_scheduled) || 0,
    nextDueAt: row?.next_due_at ?? null
  };
}

export async function listDueSpacedReviewItems(limit = SPACED_REVIEW_SESSION_LIMIT, now = new Date()): Promise<Question[]> {
  await backfillSpacedReviewFromExistingMistakes();
  await deleteSpacedReviewItemIfSourceMissing();
  const db = await getDatabase();
  const rows = await db.select<SpacedReviewItemRow[]>(
    `SELECT question_set_id, question_id
     FROM spaced_review_items
     WHERE resolved_at IS NULL
       AND due_at <= $1
     ORDER BY due_at ASC, stage ASC, question_set_id ASC, question_id ASC
     LIMIT $2`,
    [now.toISOString(), Math.max(1, Math.min(limit, SPACED_REVIEW_SESSION_LIMIT))]
  );
  const setIds = [...new Set(rows.map((row) => row.question_set_id))];
  const questionGroups = await Promise.all(setIds.map((setId) => listQuestions(setId)));
  const byId = new Map(questionGroups.flat().flatMap((question) => question.id ? [[question.id, question] as const] : []));
  return rows.flatMap((row) => {
    const question = byId.get(row.question_id);
    return question ? [question] : [];
  });
}

export async function updateSpacedReviewResults(input: {
  attemptId: number;
  gradedQuestions: GradedQuestion[];
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();

  for (const item of input.gradedQuestions) {
    if (!item.isAnswered || !item.question.id || !item.question.questionSetId) {
      continue;
    }
    const rows = await db.select<Array<{
      id: number;
      stage: number;
      correct_streak: number;
      last_review_attempt_id: number | null;
    }>>(
      `SELECT id, stage, correct_streak, last_review_attempt_id
       FROM spaced_review_items
       WHERE question_set_id = $1 AND question_id = $2`,
      [item.question.questionSetId, item.question.id]
    );
    const scheduled = rows[0];
    if (!scheduled || scheduled.last_review_attempt_id === input.attemptId) {
      continue;
    }

    const correctStreak = item.isCorrect ? scheduled.correct_streak + 1 : 0;
    const isResolved = item.isCorrect && correctStreak >= 2;
    const stage = item.isCorrect ? Math.min(scheduled.stage + 1, SPACED_REVIEW_INTERVAL_DAYS.length) : 0;
    const dueAt = addLocalCalendarDays(now, intervalDaysForStage(stage));
    await db.execute(
      `UPDATE spaced_review_items
       SET stage = $1,
           due_at = $2,
           last_reviewed_at = $3,
           last_result = $4,
           correct_streak = $5,
           resolved_at = $6,
           last_review_attempt_id = $7,
           updated_at = $3
       WHERE id = $8
         AND (last_review_attempt_id IS NULL OR last_review_attempt_id != $7)`,
      [
        stage,
        dueAt,
        nowIso,
        item.isCorrect ? "correct" : "incorrect",
        correctStreak,
        isResolved ? nowIso : null,
        input.attemptId,
        scheduled.id
      ]
    );
  }
}

export async function deleteSpacedReviewItemIfSourceMissing(): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `DELETE FROM spaced_review_items
     WHERE NOT EXISTS (
       SELECT 1 FROM questions
       WHERE questions.id = spaced_review_items.question_id
         AND questions.question_set_id = spaced_review_items.question_set_id
     )`
  );
}

/**
 * Existing local databases predate spaced review. Import their completed incorrect
 * responses once without touching entries that already have a review schedule.
 */
export async function backfillSpacedReviewFromExistingMistakes(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    attempt_id: number;
    question_set_id: number;
    question_id: number;
    answered_at: string;
  }>>(
    `SELECT
       attempts.id AS attempt_id,
       questions.question_set_id AS question_set_id,
       questions.id AS question_id,
       COALESCE(attempts.completed_at, attempts.started_at) AS answered_at
     FROM responses
     JOIN attempts ON attempts.id = responses.attempt_id
     JOIN questions ON questions.id = responses.question_id
     WHERE attempts.status = 'completed'
       AND attempts.mode != 'spaced_review'
       AND responses.is_correct = 0
     ORDER BY answered_at DESC, attempts.id DESC`
  );
  const seen = new Set<string>();
  const nowIso = new Date().toISOString();

  for (const row of rows) {
    const key = `${row.question_set_id}:${row.question_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const answeredAt = new Date(row.answered_at);
    const dueAt = Number.isNaN(answeredAt.getTime())
      ? addLocalCalendarDays(new Date(), SPACED_REVIEW_INTERVAL_DAYS[0])
      : addLocalCalendarDays(answeredAt, SPACED_REVIEW_INTERVAL_DAYS[0]);
    await db.execute(
      `INSERT INTO spaced_review_items (
        question_set_id, question_id, stage, due_at, last_result,
        last_source_attempt_id, created_at, updated_at
      ) VALUES ($1, $2, 0, $3, 'incorrect', $4, $5, $5)
      ON CONFLICT(question_set_id, question_id) DO NOTHING`,
      [row.question_set_id, row.question_id, dueAt, row.attempt_id, nowIso]
    );
  }
}

function intervalDaysForStage(stage: number): number {
  return SPACED_REVIEW_INTERVAL_DAYS[Math.min(Math.max(stage, 0), SPACED_REVIEW_INTERVAL_DAYS.length - 1)];
}

function addLocalCalendarDays(from: Date, days: number): string {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}
