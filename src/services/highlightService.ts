import { getDatabase } from "../lib/database";
import type { HighlightRecord } from "../types";

export async function saveHighlight(input: Omit<HighlightRecord, "id" | "createdAt">): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO highlights (
      attempt_id, question_id, selected_text, start_offset, end_offset, color, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.attemptId,
      input.questionId,
      input.selectedText,
      input.startOffset,
      input.endOffset,
      input.color,
      new Date().toISOString()
    ]
  );
}

export async function applyHighlight(input: Omit<HighlightRecord, "id" | "createdAt">): Promise<"created" | "updated" | "removed"> {
  const db = await getDatabase();
  const existingRows = await db.select<Array<{ id: number; color: HighlightRecord["color"] }>>(
    `SELECT id, color
     FROM highlights
     WHERE attempt_id = $1
       AND question_id = $2
       AND start_offset = $3
       AND end_offset = $4
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.attemptId, input.questionId, input.startOffset, input.endOffset]
  );
  const existing = existingRows[0];

  if (existing?.color === input.color) {
    await db.execute("DELETE FROM highlights WHERE id = $1", [existing.id]);
    return "removed";
  }

  if (existing) {
    await db.execute(
      `UPDATE highlights
       SET selected_text = $1,
           color = $2,
           created_at = $3
       WHERE id = $4`,
      [input.selectedText, input.color, new Date().toISOString(), existing.id]
    );
    return "updated";
  }

  await saveHighlight(input);
  return "created";
}

export async function removeHighlight(input: Omit<HighlightRecord, "id" | "createdAt">): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `DELETE FROM highlights
     WHERE attempt_id = $1
       AND question_id = $2
       AND (
         (start_offset = $3 AND end_offset = $4)
         OR (selected_text = $5 AND color = $6)
       )`,
    [
      input.attemptId,
      input.questionId,
      input.startOffset,
      input.endOffset,
      input.selectedText,
      input.color
    ]
  );
}

export async function replaceHighlightColor(input: Omit<HighlightRecord, "id" | "createdAt">): Promise<void> {
  const db = await getDatabase();
  const existingRows = await db.select<Array<{ id: number }>>(
    `SELECT id
     FROM highlights
     WHERE attempt_id = $1
       AND question_id = $2
       AND (
         (start_offset = $3 AND end_offset = $4)
         OR selected_text = $5
       )
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.attemptId, input.questionId, input.startOffset, input.endOffset, input.selectedText]
  );
  const existing = existingRows[0];

  if (!existing) {
    await saveHighlight(input);
    return;
  }

  await db.execute(
    `UPDATE highlights
     SET selected_text = $1,
         start_offset = $2,
         end_offset = $3,
         color = $4,
         created_at = $5
     WHERE id = $6`,
    [
      input.selectedText,
      input.startOffset,
      input.endOffset,
      input.color,
      new Date().toISOString(),
      existing.id
    ]
  );
}

export async function listHighlights(attemptId: number, questionId?: number): Promise<HighlightRecord[]> {
  const db = await getDatabase();
  const rows = questionId
    ? await db.select<HighlightRow[]>(
        "SELECT * FROM highlights WHERE attempt_id = $1 AND question_id = $2 ORDER BY created_at DESC",
        [attemptId, questionId]
      )
    : await db.select<HighlightRow[]>(
        "SELECT * FROM highlights WHERE attempt_id = $1 ORDER BY created_at DESC",
        [attemptId]
      );
  return rows.map(toHighlight);
}

export async function hasHighlights(attemptId: number, questionId: number): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ id: number }>>(
    "SELECT id FROM highlights WHERE attempt_id = $1 AND question_id = $2 LIMIT 1",
    [attemptId, questionId]
  );
  return rows.length > 0;
}

interface HighlightRow {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  color: HighlightRecord["color"];
  created_at: string;
}

function toHighlight(row: HighlightRow): HighlightRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    selectedText: row.selected_text,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    color: row.color,
    createdAt: row.created_at
  };
}
