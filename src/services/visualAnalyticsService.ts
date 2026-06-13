import { getDatabase } from "../lib/database";
import type { BreakdownRow, VisualType } from "../types";
import { calculateGenreScore, classifyStrength } from "./scoringService";
import { isSupportedVisualType } from "./visualSchemaService";

interface VisualPerformanceRow {
  visual_type: string;
  total: number;
  correct: number;
  weighted_total: number | null;
  weighted_correct: number | null;
  average_time_sec: number | null;
}

export async function getVisualQuestionPerformance(): Promise<BreakdownRow[]> {
  const db = await getDatabase();
  const rows = await db.select<VisualPerformanceRow[]>(`
    SELECT
      COALESCE(NULLIF(q.visual_type, ''), 'none') AS visual_type,
      COUNT(*) AS total,
      SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
      SUM(COALESCE(q.scoring_weight, 1)) AS weighted_total,
      SUM(CASE WHEN r.is_correct = 1 THEN COALESCE(q.scoring_weight, 1) ELSE 0 END) AS weighted_correct,
      AVG(COALESCE(r.time_spent_sec, 0)) AS average_time_sec
    FROM responses r
    INNER JOIN questions q ON q.id = r.question_id
    INNER JOIN attempts a ON a.id = r.attempt_id
    WHERE a.status = 'completed'
    GROUP BY COALESCE(NULLIF(q.visual_type, ''), 'none')
    ORDER BY total DESC, visual_type ASC
  `);

  return rows.map((row) => {
    const label = formatVisualType(row.visual_type);
    const weightedCorrect = row.weighted_correct ?? 0;
    const weightedTotal = row.weighted_total ?? 0;
    const genreScore = calculateGenreScore(weightedCorrect, weightedTotal);
    return {
      label,
      correct: row.correct,
      total: row.total,
      weightedCorrect,
      weightedTotal,
      accuracy: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0,
      genreScore,
      averageTimeSec: Math.round(row.average_time_sec ?? 0),
      strength: classifyStrength(row.total, genreScore)
    };
  });
}

export function formatVisualType(value: string): string {
  const type: VisualType = isSupportedVisualType(value) ? value : "none";
  if (type === "none") {
    return "No Visual";
  }
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
