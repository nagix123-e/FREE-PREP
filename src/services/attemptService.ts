import { getDatabase } from "../lib/database";
import type { AttemptSummary } from "../types";

export async function listAttemptHistory(): Promise<AttemptSummary[]> {
  const db = await getDatabase();
  const rows = await db.select<LiveAttemptHistoryRow[]>(
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
  const archivedRows = await db.select<ArchivedAttemptHistoryRow[]>(
    `SELECT *
     FROM score_history_snapshots
     ORDER BY started_at DESC`
  );

  const liveAttempts = rows.map((row) => {
    const recordedDurationSec = Number(row.duration_sec) || 0;
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
      mathScore: row.math_score,
      questionSetName: row.question_set_name,
      accuracy: row.response_count > 0 ? Math.round((row.correct_count / row.response_count) * 100) : 0,
      durationSec: recordedDurationSec > 0 ? recordedDurationSec : deriveAttemptDurationSec(row),
      archived: false
    };
  });

  const archivedAttempts = archivedRows.map(toArchivedAttemptSummary);

  return [...liveAttempts, ...archivedAttempts].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
  );
}

export async function deleteAttempt(attemptId: number): Promise<void> {
  const db = await getDatabase();
  if (attemptId < 0) {
    await db.execute("DELETE FROM score_history_snapshots WHERE id = $1", [Math.abs(attemptId)]);
    return;
  }
  await db.execute("DELETE FROM attempts WHERE id = $1", [attemptId]);
}

interface LiveAttemptHistoryRow {
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

interface ArchivedAttemptHistoryRow {
  id: number;
  source_attempt_id: number;
  question_set_id: number;
  question_set_name: string;
  mode: AttemptSummary["mode"];
  status: AttemptSummary["status"];
  started_at: string;
  completed_at: string | null;
  practice_score: number | null;
  rw_score: number | null;
  math_score: number | null;
  accuracy: number;
  duration_sec: number;
  created_at: string;
}

function toArchivedAttemptSummary(row: ArchivedAttemptHistoryRow): AttemptSummary {
  return {
    id: -row.id,
    questionSetId: row.question_set_id,
    mode: row.mode,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    currentSection: null,
    currentModule: null,
    currentQuestionIndex: 0,
    remainingTimeSec: null,
    practiceScore: row.practice_score,
    rwScore: row.rw_score,
    mathScore: row.math_score,
    questionSetName: row.question_set_name,
    accuracy: row.accuracy,
    durationSec: row.duration_sec,
    archived: true
  };
}

function deriveAttemptDurationSec(row: LiveAttemptHistoryRow): number {
  if (!row.completed_at) {
    return 0;
  }

  const startedAtMs = Date.parse(row.started_at);
  const completedAtMs = Date.parse(row.completed_at);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(completedAtMs) || completedAtMs <= startedAtMs) {
    return 0;
  }

  return Math.round((completedAtMs - startedAtMs) / 1000);
}
