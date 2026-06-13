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
