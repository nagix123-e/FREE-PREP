import { createSqliteIntegerId, getDatabase, listQuestions } from "../lib/database";
import type { Question } from "../types";

export type PracticeMode = "mistake_practice" | "review_list_practice";

export interface PracticeConfig {
  questionSetId: number;
  mode: PracticeMode;
  questionCount: number;
  randomize: boolean;
  timerEnabled: boolean;
}

export async function buildPracticeQuestions(config: PracticeConfig): Promise<Question[]> {
  if (config.mode === "mistake_practice") {
    return getMistakeQuestions(config);
  }
  if (config.mode === "review_list_practice") {
    return getReviewListQuestions(config);
  }
  return [];
}

export async function createPracticeAttempt(config: PracticeConfig): Promise<number> {
  const db = await getDatabase();
  const attemptId = createSqliteIntegerId();
  await db.execute(
    `INSERT INTO attempts (
      id, question_set_id, mode, status, started_at, current_question_index, remaining_time_sec
    ) VALUES ($1, $2, $3, 'in_progress', $4, 0, $5)`,
    [
      attemptId,
      config.questionSetId,
      config.mode,
      new Date().toISOString(),
      config.timerEnabled ? config.questionCount * 90 : null
    ]
  );
  return attemptId;
}

async function getMistakeQuestions(config: PracticeConfig): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ question_id: number }>>(
    `SELECT DISTINCT responses.question_id
     FROM responses
     JOIN questions ON questions.id = responses.question_id
     JOIN attempts ON attempts.id = responses.attempt_id
     WHERE questions.question_set_id = $1
       AND responses.is_correct = 0
     ORDER BY attempts.started_at DESC`,
    [config.questionSetId]
  );
  const ids = new Set(rows.map((row) => row.question_id));
  const questions = (await listQuestions(config.questionSetId)).filter((question) => question.id && ids.has(question.id));
  return limitQuestions(questions, config.questionCount, config.randomize);
}

async function getReviewListQuestions(config: PracticeConfig): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ question_id: number }>>(
    `SELECT review_list.question_id
     FROM review_list
     JOIN questions ON questions.id = review_list.question_id
     WHERE questions.question_set_id = $1
     ORDER BY review_list.priority DESC, review_list.created_at DESC`,
    [config.questionSetId]
  );
  const ids = new Set(rows.map((row) => row.question_id));
  const questions = (await listQuestions(config.questionSetId)).filter((question) => question.id && ids.has(question.id));
  return limitQuestions(questions, config.questionCount, config.randomize);
}

function limitQuestions(questions: Question[], count: number, randomize: boolean): Question[] {
  const source = randomize ? shuffle(questions) : questions;
  return source.slice(0, count);
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}
