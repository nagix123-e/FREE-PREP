import { listAttemptHistory } from "./attemptService";
import { getScoreResult } from "./scoringService";

export type TrendFilter = "last5" | "last10" | "last30days" | "all";
export type ScoreTrendMode = "total" | "rw" | "math" | "all";

export interface ScoreTrendPoint {
  label: string;
  total: number;
  rw: number;
  math: number;
}

export interface CategoryTrendPoint {
  label: string;
  category: string;
  score: number;
  total: number;
}

export interface WeaknessTrend {
  weakAreasNow: string[];
  improvedAreas: string[];
  decliningAreas: string[];
  mostMissedTopics: string[];
}

export async function getScoreTrend(filter: TrendFilter): Promise<ScoreTrendPoint[]> {
  const attempts = filterAttempts(await listAttemptHistory(), filter)
    .filter((attempt) => attempt.status === "completed")
    .reverse();
  return attempts.map((attempt) => ({
    label: formatDate(attempt.completedAt ?? attempt.startedAt),
    total: attempt.practiceScore ?? 0,
    rw: attempt.rwScore ?? 0,
    math: attempt.mathScore ?? 0
  }));
}

export async function getCategoryTrend(
  type: "domain" | "skill",
  filter: TrendFilter
): Promise<CategoryTrendPoint[]> {
  const attempts = filterAttempts(await listAttemptHistory(), filter)
    .filter((attempt) => attempt.status === "completed")
    .reverse();
  const results = await Promise.all(attempts.map((attempt) => getScoreResult(attempt.id)));
  return results.flatMap((result, index) =>
    (type === "domain" ? result.domainBreakdown : result.skillBreakdown)
      .filter((row) => row.total >= 3)
      .map((row) => {
        const attempt = attempts[index];
        return {
          label: attempt?.completedAt ? formatDate(attempt.completedAt) : `Attempt ${index + 1}`,
          category: row.label,
          score: row.genreScore,
          total: row.total
        };
      })
  );
}

export async function getWeaknessTrend(): Promise<WeaknessTrend> {
  const attempts = (await listAttemptHistory()).filter((attempt) => attempt.status === "completed").slice(0, 6);
  const results = await Promise.all(attempts.map((attempt) => getScoreResult(attempt.id)));
  const latest = results.slice(0, 3).flatMap((result) => [...result.domainBreakdown, ...result.skillBreakdown]);
  const previous = results.slice(3, 6).flatMap((result) => [...result.domainBreakdown, ...result.skillBreakdown]);
  const previousMap = new Map(previous.map((row) => [row.label, row.genreScore]));

  return {
    weakAreasNow: latest.filter((row) => row.genreScore < 70 && row.total >= 5).map((row) => row.label).slice(0, 8),
    improvedAreas: latest
      .filter((row) => row.genreScore - (previousMap.get(row.label) ?? row.genreScore) >= 10)
      .map((row) => row.label)
      .slice(0, 8),
    decliningAreas: latest
      .filter((row) => row.genreScore - (previousMap.get(row.label) ?? row.genreScore) <= -10)
      .map((row) => row.label)
      .slice(0, 8),
    mostMissedTopics: results
      .flatMap((result) => result.topicBreakdown)
      .sort((a, b) => a.genreScore - b.genreScore)
      .map((row) => row.label)
      .slice(0, 8)
  };
}

function filterAttempts<T extends { startedAt: string }>(attempts: T[], filter: TrendFilter): T[] {
  if (filter === "last5") return attempts.slice(0, 5);
  if (filter === "last10") return attempts.slice(0, 10);
  if (filter === "last30days") {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return attempts.filter((attempt) => new Date(attempt.startedAt).getTime() >= cutoff);
  }
  return attempts;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
