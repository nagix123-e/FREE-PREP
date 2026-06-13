import { createSqliteIntegerId, getDatabase, listQuestions } from "../lib/database";
import type { AttemptMode, Question } from "../types";

export interface PracticeConfig {
  questionSetId: number;
  mode: AttemptMode;
  filterValue: string;
  questionCount: number;
  randomize: boolean;
  timerEnabled: boolean;
}

export async function getAvailableFilters(questionSetId: number): Promise<{
  domains: string[];
  skills: string[];
  topics: string[];
}> {
  const questions = await listQuestions(questionSetId);
  return {
    domains: unique(questions.map((question) => question.contentDomain)),
    skills: unique(questions.map((question) => question.skillGroup)),
    topics: unique(questions.map((question) => question.questionTopic || "Unspecified"))
  };
}

export async function buildPracticeQuestions(config: PracticeConfig): Promise<Question[]> {
  if (config.mode === "mistake_practice") {
    return getMistakeQuestions(config);
  }
  if (config.mode === "review_list_practice") {
    return getReviewListQuestions(config);
  }

  const questions = await listQuestions(config.questionSetId);
  const filtered = questions.filter((question) => {
    if (config.mode === "domain_practice") {
      return question.contentDomain === config.filterValue;
    }
    if (config.mode === "skill_practice") {
      return question.skillGroup === config.filterValue;
    }
    if (config.mode === "topic_practice") {
      return (question.questionTopic || "Unspecified") === config.filterValue;
    }
    return true;
  });
  return limitQuestions(filtered, config.questionCount, config.randomize);
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

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
