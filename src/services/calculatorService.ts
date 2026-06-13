export function calculateExpression(expression: string): string {
  const normalized = expression
    .split("√").join("sqrt")
    .split("^2").join("**2")
    .replace(/\bsqrt\s*\(/g, "Math.sqrt(");

  if (!/^[0-9+\-*/().\sMathsqrt*]+$/.test(normalized)) {
    return "Invalid expression";
  }

  try {
    const fn = new Function(`"use strict"; return (${normalized});`);
    const result = fn() as unknown;
    return typeof result === "number" && Number.isFinite(result) ? String(result) : "Invalid expression";
  } catch {
    return "Invalid expression";
  }
}
