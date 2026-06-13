import type { BreakdownRow } from "../types";

export function buildRecommendedPractice(weakAreas: BreakdownRow[]): string[] {
  const recommendations = weakAreas.slice(0, 5).map((area) => `Practice ${area.label}`);
  return recommendations.length > 0
    ? recommendations
    : ["Review incorrect questions", "Complete one timed module", "Practice one mixed set"];
}
