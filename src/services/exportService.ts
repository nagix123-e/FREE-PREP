import { getDatabase } from "../lib/database";

export interface ExportBundle {
  exportedAt: string;
  questionSets: unknown[];
  questions: unknown[];
  attempts: unknown[];
  responses: unknown[];
  reviewList: unknown[];
  settings: unknown[];
}

export async function buildJsonExport(): Promise<string> {
  const db = await getDatabase();
  const bundle: ExportBundle = {
    exportedAt: new Date().toISOString(),
    questionSets: await db.select("SELECT * FROM question_sets"),
    questions: await db.select("SELECT * FROM questions"),
    attempts: await db.select("SELECT * FROM attempts"),
    responses: await db.select("SELECT * FROM responses"),
    reviewList: await db.select("SELECT * FROM review_list"),
    settings: await db.select("SELECT * FROM app_settings")
  };
  return JSON.stringify(bundle, null, 2);
}

export async function buildCsvExport(): Promise<string> {
  const db = await getDatabase();
  const attempts = await db.select<Array<Record<string, string | number | null>>>(
    "SELECT * FROM attempts ORDER BY started_at DESC"
  );
  if (attempts.length === 0) {
    return "id,question_set_id,mode,status,practice_score,rw_score,math_score,started_at,completed_at\n";
  }
  const headers = Object.keys(attempts[0]);
  return [
    headers.join(","),
    ...attempts.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(",")
    )
  ].join("\n");
}

function csvEscape(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.split('"').join('""')}"` : text;
}
