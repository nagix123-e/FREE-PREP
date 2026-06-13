import { getDatabase } from "../lib/database";
import type { AttemptSummary } from "../types";

export async function listAttemptHistory(): Promise<AttemptSummary[]> {
  const db = await getDatabase();
  const rows = await db.select<AttemptHistoryRow[]>(
    `SELECT
       attempts.*,
       question_sets.name AS question_set_name,
       COALESCE(
         (SELECT COUNT(*) FROM responses WHERE responses.attempt_id = attempts.id AND responses.is_correct = 1),
         0
       ) AS correct_count,
       COALESCE(
         (SELECT COUNT(*) FROM responses WHERE responses.attempt_id = attempts.id),
         0
       ) AS response_count,
       COALESCE(
         (SELECT SUM(time_spent_sec) FROM responses WHERE responses.attempt_id = attempts.id),
         0
       ) AS duration_sec
     FROM attempts
     JOIN question_sets ON question_sets.id = attempts.question_set_id
     ORDER BY attempts.started_at DESC`
  );

  return rows.map((row) => ({
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
    mathScore: row.math_score,
    questionSetName: row.question_set_name,
    accuracy: row.response_count > 0 ? Math.round((row.correct_count / row.response_count) * 100) : 0,
    durationSec: row.duration_sec
  }));
}

export async function deleteAttempt(attemptId: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM attempts WHERE id = $1", [attemptId]);
}

interface AttemptHistoryRow {
  id: number;
  question_set_id: number;
  mode: AttemptSummary["mode"];
  status: AttemptSummary["status"];
  started_at: string;
  completed_at: string | null;
  current_section: AttemptSummary["currentSection"];
  current_module: AttemptSummary["currentModule"];
  current_question_index: number;
  remaining_time_sec: number | null;
  practice_score: number | null;
  rw_score: number | null;
  math_score: number | null;
  question_set_name: string;
  correct_count: number;
  response_count: number;
  duration_sec: number;
}
