import { listAttemptHistory } from "./attemptService";
import { getScoreResult } from "./scoringService";
import { listReviewList } from "./reviewListService";
import { getVisualQuestionPerformance } from "./visualAnalyticsService";
import type { DashboardSummary } from "../types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const attempts = await listAttemptHistory();
  const completed = attempts.filter((attempt) => attempt.status === "completed");
  const detailedCompleted = completed.filter((attempt) => !attempt.archived);
  const results = await Promise.all(detailedCompleted.slice(0, 12).map((attempt) => getScoreResult(attempt.id)));
  const allDomainRows = results.flatMap((result) => result.domainBreakdown);
  const allSkillRows = results.flatMap((result) => result.skillBreakdown);
  const reviewList = await listReviewList();
  const visualPerformance = await getVisualQuestionPerformance();

  return {
    totalTestsTaken: completed.length,
    averagePracticeScore: average(completed.map((attempt) => attempt.practiceScore ?? 0)),
    bestPracticeScore: Math.max(...completed.map((attempt) => attempt.practiceScore ?? 0), 0),
    averageRwScore: average(completed.map((attempt) => attempt.rwScore ?? 0)),
    averageMathScore: average(completed.map((attempt) => attempt.mathScore ?? 0)),
    totalQuestionsAnswered: completed.reduce((sum, attempt) => sum + Math.round((attempt.accuracy / 100) * 98), 0),
    totalStudyTimeSec: completed.reduce((sum, attempt) => sum + attempt.durationSec, 0),
    reviewListCount: reviewList.length,
    recentScores: attempts.slice(0, 5),
    weakAreas: [...allDomainRows, ...allSkillRows]
      .filter((row) => row.genreScore < 70 && row.total >= 5)
      .sort((a, b) => a.genreScore - b.genreScore)
      .slice(0, 6),
    strongAreas: [...allDomainRows, ...allSkillRows]
      .filter((row) => row.genreScore >= 90 && row.total >= 5)
      .sort((a, b) => b.genreScore - a.genreScore)
      .slice(0, 6),
    visualPerformance
  };
}

function average(values: number[]): number {
  const filtered = values.filter((value) => value > 0);
  if (filtered.length === 0) {
    return 0;
  }
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}
