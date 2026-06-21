# Scoring Spec

FREE PREP reports practice-only estimates:

- `Practice Score`
- `Estimated Score`
- `RW Practice Score`
- `Math Practice Score`

These are not official SAT scores.

Scoring behavior:

- Multiple choice answers are graded against `correct_answer`.
- Student response answers accept integers, decimals, fractions, and negative numbers.
- `answer_tolerance` is applied when numeric comparison is possible.
- `scoring_weight` defaults to `1` when omitted or invalid.
- If a question set has score conversion rows, section scores use the closest matching raw score conversion.
- Otherwise, section scores are estimated linearly from 200 to 800.

Breakdowns are reported by module, content domain, skill group, question topic, and visual type.
