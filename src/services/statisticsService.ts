import { getScoreResult } from "./scoringService";
import { listAttemptHistory } from "./attemptService";
import type { BreakdownRow } from "../types";

export interface StatisticsSummary {
  accuracy: number;
  averageTimeSec: number;
  fastestCorrectSec: number;
  slowestCorrectSec: number;
  markedFrequency: number;
  mostMissedDomains: BreakdownRow[];
  mostMissedSkills: BreakdownRow[];
  mostMissedTopics: BreakdownRow[];
}

export async function getStatisticsSummary(): Promise<StatisticsSummary> {
  const attempts = (await listAttemptHistory()).filter(
    (attempt) => attempt.status === "completed" && !attempt.archived
  );
  const results = await Promise.all(attempts.map((attempt) => getScoreResult(attempt.id)));
  const graded = results.flatMap((result) => result.gradedQuestions);
  const correctItems = graded.filter((item) => item.isCorrect && (item.response?.timeSpentSec ?? 0) > 0);
  const totalTime = graded.reduce((sum, item) => sum + (item.response?.timeSpentSec ?? 0), 0);
  const marked = graded.filter((item) => item.response?.marked).length;

  return {
    accuracy: graded.length > 0 ? Math.round((graded.filter((item) => item.isCorrect).length / graded.length) * 100) : 0,
    averageTimeSec: graded.length > 0 ? Math.round(totalTime / graded.length) : 0,
    fastestCorrectSec:
      correctItems.length > 0
        ? Math.min(...correctItems.map((item) => item.response?.timeSpentSec ?? 0))
        : 0,
    slowestCorrectSec:
      correctItems.length > 0
        ? Math.max(...correctItems.map((item) => item.response?.timeSpentSec ?? 0))
        : 0,
    markedFrequency: graded.length > 0 ? Math.round((marked / graded.length) * 100) : 0,
    mostMissedDomains: sortWeak(results.flatMap((result) => result.domainBreakdown)),
    mostMissedSkills: sortWeak(results.flatMap((result) => result.skillBreakdown)),
    mostMissedTopics: sortWeak(results.flatMap((result) => result.topicBreakdown))
  };
}

function sortWeak(rows: BreakdownRow[]): BreakdownRow[] {
  return [...rows]
    .filter((row) => row.total > 0)
    .sort((a, b) => a.genreScore - b.genreScore)
    .slice(0, 8);
}
