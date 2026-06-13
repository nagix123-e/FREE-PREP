# Import Guide

## Import A CSV

1. Open SAT Practice Simulator.
2. Select Import CSV in the left navigation.
3. Choose a CSV file.
4. Review validation results.
5. Fix any row-level errors in the source CSV.
6. Enter a question set name.
7. Save to SQLite.

## Validation Summary

The validation panel shows:

- Module counts for RW and Math.
- Full Test total count.
- Visual Types.
- Content Domains.
- Skill Groups.
- Row-level issues.

## Common Validation Errors

- Missing required header.
- Duplicate `question_id`.
- Invalid `section`, `module`, or `route`.
- Module 1 not using `base`.
- Module 2 not using `hard`.
- `multiple_choice` missing choices or correct-answer fields.
- `student_response` missing `correct_numeric_answer` or `answer_tolerance`.
- Invalid `visual_json`.

## Sample CSV

Use [sample_data/sample_sat_practice.csv](../sample_data/sample_sat_practice.csv) for a quick import check. It is intentionally small and is not a complete 98-question practice test.
