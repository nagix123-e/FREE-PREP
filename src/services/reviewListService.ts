import { getDatabase } from "../lib/database";
import type { Question, ReviewListItem } from "../types";

export async function addToReviewList(questionId: number, note = "", priority = 1): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO review_list (question_id, created_at, note, priority)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(question_id) DO UPDATE SET note = excluded.note, priority = excluded.priority`,
    [questionId, new Date().toISOString(), note, priority]
  );
}

export async function removeFromReviewList(questionId: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM review_list WHERE question_id = $1", [questionId]);
}

export async function listReviewList(): Promise<ReviewListItem[]> {
  const db = await getDatabase();
  const rows = await db.select<ReviewListRow[]>(
    `SELECT review_list.*, questions.question_set_id
     FROM review_list
     JOIN questions ON questions.id = review_list.question_id
     ORDER BY priority DESC, created_at DESC`
  );
  return rows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    questionSetId: row.question_set_id,
    createdAt: row.created_at,
    note: row.note,
    priority: row.priority
  }));
}

export async function isInReviewList(questionId: number): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ id: number }>>(
    "SELECT id FROM review_list WHERE question_id = $1",
    [questionId]
  );
  return rows.length > 0;
}

interface ReviewListRow {
  id: number;
  question_id: number;
  question_set_id: number;
  created_at: string;
  note: string;
  priority: number;
}

export type ReviewQuestion = Question & { reviewNote?: string; reviewPriority?: number };
