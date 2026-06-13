import { getDatabase } from "../lib/database";
import type { NoteRecord } from "../types";

export async function saveNote(input: Omit<NoteRecord, "id" | "updatedAt">): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO notes (attempt_id, question_id, note, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(attempt_id, question_id) DO UPDATE SET
       note = excluded.note,
       updated_at = excluded.updated_at`,
    [input.attemptId, input.questionId, input.note, new Date().toISOString()]
  );
}

export async function getNote(attemptId: number, questionId: number): Promise<NoteRecord | null> {
  const db = await getDatabase();
  const rows = await db.select<NoteRow[]>(
    "SELECT * FROM notes WHERE attempt_id = $1 AND question_id = $2",
    [attemptId, questionId]
  );
  return rows[0] ? toNote(rows[0]) : null;
}

export async function listNotes(attemptId: number): Promise<NoteRecord[]> {
  const db = await getDatabase();
  const rows = await db.select<NoteRow[]>(
    "SELECT * FROM notes WHERE attempt_id = $1 ORDER BY updated_at DESC",
    [attemptId]
  );
  return rows.map(toNote);
}

interface NoteRow {
  id: number;
  attempt_id: number;
  question_id: number;
  note: string;
  updated_at: string;
}

function toNote(row: NoteRow): NoteRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    note: row.note,
    updatedAt: row.updated_at
  };
}
