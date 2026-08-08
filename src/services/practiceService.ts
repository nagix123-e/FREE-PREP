import { createSqliteIntegerId, getDatabase, listQuestions } from "../lib/database";
import type { Question, Section } from "../types";
import { gradeAttempt } from "./scoringService";
import { listDueSpacedReviewItems, SPACED_REVIEW_SESSION_LIMIT } from "./spacedReviewService";

export type PracticeMode = "mistake_practice" | "domain_practice" | "review_list_practice" | "spaced_review";
export type DomainPracticeScope = "full" | "rw" | "math";

export interface PracticeConfig {
  questionSetId: number;
  questionSetIds?: number[];
  mode: PracticeMode;
  domain?: string;
  domainScopes?: DomainPracticeScope[];
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
  if (config.mode === "domain_practice") {
    return getDomainQuestions(config);
  }
  if (config.mode === "spaced_review") {
    return listDueSpacedReviewItems(Math.min(config.questionCount, SPACED_REVIEW_SESSION_LIMIT));
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
      getPrimaryQuestionSetId(config),
      config.mode,
      new Date().toISOString(),
      config.timerEnabled ? config.questionCount * 90 : null
    ]
  );
  return attemptId;
}

export async function updatePracticeAttemptProgress(input: {
  attemptId: number;
  questionIndex: number;
  remainingTimeSec: number | null;
  status?: "in_progress" | "paused";
}): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE attempts
     SET current_question_index = $1,
         remaining_time_sec = $2,
         status = COALESCE($3, status)
     WHERE id = $4`,
    [input.questionIndex, input.remainingTimeSec, input.status ?? null, input.attemptId]
  );
}

export async function completePracticeAttempt(attemptId: number): Promise<void> {
  await gradeAttempt(attemptId);
}

export async function countMistakeQuestions(questionSetId: number): Promise<number> {
  if (!questionSetId) {
    return 0;
  }

  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(DISTINCT responses.question_id) AS count
     FROM responses
     JOIN questions ON questions.id = responses.question_id
     WHERE questions.question_set_id = $1
       AND responses.is_correct = 0`,
    [questionSetId]
  );
  return rows[0]?.count ?? 0;
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

async function getDomainQuestions(config: PracticeConfig): Promise<Question[]> {
  const domain = config.domain?.trim();
  if (!domain) {
    throw new Error("Choose a content domain before starting practice.");
  }

  const questionSetIds = getQuestionSetIds(config);
  const questionGroups = await Promise.all(questionSetIds.map((questionSetId) => listQuestions(questionSetId)));
  const allowedSections = getDomainPracticeSections(config.domainScopes);
  const questions = questionGroups
    .flat()
    .filter((question) => normalizeDomain(question.contentDomain || question.domain) === normalizeDomain(domain))
    .filter((question) => allowedSections === null || allowedSections.includes(question.section));

  return limitQuestions(questions, config.questionCount, config.randomize);
}

function getPrimaryQuestionSetId(config: PracticeConfig): number {
  return getQuestionSetIds(config)[0] ?? config.questionSetId;
}

function getQuestionSetIds(config: PracticeConfig): number[] {
  const ids = config.questionSetIds?.length ? config.questionSetIds : [config.questionSetId];
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}

function normalizeDomain(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getDomainPracticeSections(scopes: DomainPracticeScope[] | undefined): Section[] | null {
  if (!scopes?.length || scopes.includes("full")) {
    return null;
  }

  const sections: Section[] = [];
  if (scopes.includes("rw")) {
    sections.push("RW");
  }
  if (scopes.includes("math")) {
    sections.push("MATH");
  }
  return sections.length > 0 ? sections : null;
}

function limitQuestions(questions: Question[], count: number, randomize: boolean): Question[] {
  const source = randomize ? shuffle(questions) : questions;
  return source.slice(0, count);
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}
