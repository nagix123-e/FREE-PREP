import { getDatabase, listQuestions } from "../lib/database";
import { TEST_MODULES } from "../lib/testPlan";
import type {
  BreakdownRow,
  GradedQuestion,
  Question,
  ResponseRecord,
  ScoreResult,
  Section
} from "../types";

export function gradeMultipleChoice(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

export function normalizeNumericAnswer(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^-?\d+\/\d+$/.test(normalized)) {
    const [numeratorRaw, denominatorRaw] = normalized.split("/");
    const numerator = Number(numeratorRaw);
    const denominator = Number(denominatorRaw);
    return denominator === 0 ? null : numerator / denominator;
  }

  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return Number(normalized);
  }

  return null;
}

export function gradeStudentResponse(
  userAnswer: string,
  correctAnswer: string,
  toleranceRaw: string
): boolean {
  const userValue = normalizeNumericAnswer(userAnswer);
  const correctValue = normalizeNumericAnswer(correctAnswer);
  if (userValue === null || correctValue === null) {
    return userAnswer.trim() !== "" && userAnswer.trim() === correctAnswer.trim();
  }

  const tolerance = Number(toleranceRaw);
  if (Number.isFinite(tolerance)) {
    return Math.abs(userValue - correctValue) <= tolerance;
  }

  return Math.abs(userValue - correctValue) < 0.0000001;
}

export function calculateWeightedRawScore(gradedQuestions: GradedQuestion[], section?: Section) {
  return gradedQuestions.reduce(
    (score, item) => {
      if (section && item.question.section !== section) {
        return score;
      }
      score.weightedTotal += item.weight;
      if (item.isCorrect) {
        score.weightedCorrect += item.weight;
      }
      return score;
    },
    { weightedCorrect: 0, weightedTotal: 0 }
  );
}

export async function calculateSectionScore(input: {
  questionSetId: number;
  section: Section;
  weightedCorrect: number;
  weightedTotal: number;
}): Promise<number> {
  const conversionScore = await findConversionScore(
    input.questionSetId,
    input.section,
    input.weightedCorrect
  );
  if (conversionScore !== null) {
    return clampScore(conversionScore, 200, 800);
  }

  const ratio = input.weightedTotal > 0 ? input.weightedCorrect / input.weightedTotal : 0;
  return clampScore(200 + Math.round((ratio * 600) / 10) * 10, 200, 800);
}

export function calculateTotalScore(rwScore: number, mathScore: number): number {
  return clampScore(rwScore + mathScore, 400, 1600);
}

export function calculateGenreScore(weightedCorrect: number, weightedTotal: number): number {
  if (weightedTotal <= 0) {
    return 0;
  }
  return clampScore(Math.round((weightedCorrect / weightedTotal) * 100), 0, 100);
}

export function classifyStrength(
  total: number,
  genreScore: number
): BreakdownRow["strength"] {
  if (total < 3) {
    return "Not Enough Data";
  }
  if (genreScore >= 80) {
    return "Strong";
  }
  if (genreScore >= 60) {
    return "Needs Review";
  }
  return "Weak";
}

export async function gradeAttempt(attemptId: number): Promise<ScoreResult> {
  const db = await getDatabase();
  const attemptRows = await db.select<Array<{ question_set_id: number }>>(
    "SELECT question_set_id FROM attempts WHERE id = $1",
    [attemptId]
  );
  const questionSetId = attemptRows[0]?.question_set_id;
  if (!questionSetId) {
    throw new Error("Attempt not found for grading.");
  }

  const questions = await listQuestions(questionSetId);
  const responses = await loadResponses(attemptId);
  const responsesByQuestionId = new Map(responses.map((response) => [response.questionId, response]));
  const gradedQuestions = questions.map((question) =>
    gradeQuestion(question, responsesByQuestionId.get(question.id ?? -1) ?? null)
  );

  for (const item of gradedQuestions) {
    if (!item.question.id) {
      continue;
    }
    const response = responsesByQuestionId.get(item.question.id);
    await saveGradedResponse(attemptId, item.question.id, response, item.isCorrect);
  }

  const rwRaw = calculateWeightedRawScore(gradedQuestions, "RW");
  const mathRaw = calculateWeightedRawScore(gradedQuestions, "MATH");
  const rwScore = await calculateSectionScore({ questionSetId, section: "RW", ...rwRaw });
  const mathScore = await calculateSectionScore({ questionSetId, section: "MATH", ...mathRaw });
  const totalScore = calculateTotalScore(rwScore, mathScore);
  const result = buildScoreResult(attemptId, gradedQuestions, rwScore, mathScore, totalScore);

  await db.execute(
    `UPDATE attempts
     SET practice_score = $1,
         rw_score = $2,
         math_score = $3,
         completed_at = COALESCE(completed_at, $4),
         status = 'completed'
     WHERE id = $5`,
    [totalScore, rwScore, mathScore, new Date().toISOString(), attemptId]
  );

  return result;
}

export async function getScoreResult(attemptId: number): Promise<ScoreResult> {
  return gradeAttempt(attemptId);
}

function gradeQuestion(question: Question, response: ResponseRecord | null): GradedQuestion {
  const selectedAnswer = response?.selectedAnswer ?? "";
  const isAnswered = selectedAnswer.trim() !== "";
  const isCorrect =
    isAnswered &&
    (question.questionType === "student_response"
      ? gradeStudentResponse(selectedAnswer, question.correctNumericAnswer, question.answerTolerance)
      : gradeMultipleChoice(selectedAnswer, question.correctAnswer));

  return {
    question,
    response,
    selectedAnswer,
    isCorrect,
    isAnswered,
    weight: question.scoringWeight || 1
  };
}

function buildScoreResult(
  attemptId: number,
  gradedQuestions: GradedQuestion[],
  rwScore: number,
  mathScore: number,
  totalScore: number
): ScoreResult {
  const correct = gradedQuestions.filter((item) => item.isCorrect).length;
  const unanswered = gradedQuestions.filter((item) => !item.isAnswered).length;
  const marked = gradedQuestions.filter((item) => item.response?.marked).length;
  const incorrect = gradedQuestions.length - correct - unanswered;
  const timeSpentSec = gradedQuestions.reduce(
    (sum, item) => sum + (item.response?.timeSpentSec ?? 0),
    0
  );

  return {
    attemptId,
    totalScore,
    rwScore,
    mathScore,
    correct,
    incorrect,
    unanswered,
    marked,
    accuracy: gradedQuestions.length > 0 ? Math.round((correct / gradedQuestions.length) * 100) : 0,
    timeSpentSec,
    gradedQuestions,
    moduleBreakdown: buildModuleBreakdown(gradedQuestions),
    domainBreakdown: buildBreakdown(gradedQuestions, (item) => item.question.contentDomain),
    skillBreakdown: buildBreakdown(gradedQuestions, (item) => item.question.skillGroup),
    topicBreakdown: buildBreakdown(gradedQuestions, (item) => item.question.questionTopic || "Unspecified"),
    visualBreakdown: buildBreakdown(gradedQuestions, (item) =>
      item.question.visualType === "none" ? "No Visual" : item.question.visualType
    )
  };
}

function buildModuleBreakdown(gradedQuestions: GradedQuestion[]): BreakdownRow[] {
  return TEST_MODULES.map((spec) => {
    const items = gradedQuestions.filter(
      (item) =>
        item.question.section === spec.section &&
        item.question.module === spec.module &&
        item.question.route === spec.route
    );
    return summarizeBreakdown(spec.title, items);
  });
}

function buildBreakdown(
  gradedQuestions: GradedQuestion[],
  getLabel: (item: GradedQuestion) => string
): BreakdownRow[] {
  const groups = new Map<string, GradedQuestion[]>();
  for (const item of gradedQuestions) {
    const label = getLabel(item) || "Unspecified";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([label, items]) => summarizeBreakdown(label, items))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function summarizeBreakdown(label: string, items: GradedQuestion[]): BreakdownRow {
  const correct = items.filter((item) => item.isCorrect).length;
  const weighted = calculateWeightedRawScore(items);
  const genreScore = calculateGenreScore(weighted.weightedCorrect, weighted.weightedTotal);
  const timeSpent = items.reduce((sum, item) => sum + (item.response?.timeSpentSec ?? 0), 0);
  return {
    label,
    correct,
    total: items.length,
    weightedCorrect: weighted.weightedCorrect,
    weightedTotal: weighted.weightedTotal,
    accuracy: items.length > 0 ? Math.round((correct / items.length) * 100) : 0,
    genreScore,
    averageTimeSec: items.length > 0 ? Math.round(timeSpent / items.length) : 0,
    strength: classifyStrength(items.length, genreScore)
  };
}

async function findConversionScore(
  questionSetId: number,
  section: Section,
  rawScore: number
): Promise<number | null> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ scaled_score: number }>>(
    `SELECT scaled_score
     FROM score_conversions
     WHERE question_set_id = $1 AND section = $2 AND raw_score <= $3
     ORDER BY raw_score DESC
     LIMIT 1`,
    [questionSetId, section, rawScore]
  );
  return rows[0]?.scaled_score ?? null;
}

async function loadResponses(attemptId: number): Promise<ResponseRecord[]> {
  const db = await getDatabase();
  const rows = await db.select<ResponseRow[]>("SELECT * FROM responses WHERE attempt_id = $1", [
    attemptId
  ]);
  return rows.map(toResponseRecord);
}

async function saveGradedResponse(
  attemptId: number,
  questionId: number,
  response: ResponseRecord | undefined,
  isCorrect: boolean
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO responses (
      attempt_id, question_id, selected_answer, is_correct, marked, eliminated_choices, time_spent_sec
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET
      is_correct = excluded.is_correct`,
    [
      attemptId,
      questionId,
      response?.selectedAnswer ?? "",
      isCorrect ? 1 : 0,
      response?.marked ? 1 : 0,
      JSON.stringify(response?.eliminatedChoices ?? []),
      response?.timeSpentSec ?? 0
    ]
  );
}

interface ResponseRow {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_answer: string | null;
  is_correct: number | null;
  marked: number;
  eliminated_choices: string;
  time_spent_sec: number;
}

function toResponseRecord(row: ResponseRow): ResponseRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    selectedAnswer: row.selected_answer ?? "",
    isCorrect: row.is_correct === null ? null : row.is_correct === 1,
    marked: row.marked === 1,
    eliminatedChoices: parseEliminatedChoices(row.eliminated_choices),
    timeSpentSec: row.time_spent_sec
  };
}

function parseEliminatedChoices(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function clampScore(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
