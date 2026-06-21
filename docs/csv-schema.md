# CSV Schema

FREE PREP imports CSV files with one row per question.

## Canonical Headers

```csv
test_id,exam_version,generation_batch_id,target_score_band,question_id,section,module,route,question_number,content_domain,skill_group,skill_code,skill_label,question_topic,difficulty,scoring_weight,question_type,passage,question,choice_a,choice_b,choice_c,choice_d,correct_answer,correct_choice_index,explanation,time_estimate_sec,visual_type,visual_json,table_markdown,equation_latex,student_response_type,correct_numeric_answer,answer_tolerance,primary_skill,secondary_skill,tags
```

## Legacy Compatibility

The old headers `domain` and `skill` are accepted as compatibility aliases:

- `domain` maps to `content_domain`
- `skill` maps to `skill_group`

`image_path` is deprecated and is not required by the current validator.

## Module Rules

- `section` must be `RW` or `MATH`.
- `module` must be `1` or `2`.
- `route` must be `base` or `hard`.
- `module=1` requires `route=base`.
- `module=2` requires `route=hard`.

## Full Test Counts

A complete full practice test has 98 questions:

- RW Module 1 base: 27
- RW Module 2 hard: 27
- Math Module 1 base: 22
- Math Module 2 hard: 22

All `question_type` values count toward these totals.

## Question Types

### multiple_choice

Required:

- `choice_a`
- `choice_b`
- `choice_c`
- `choice_d`
- `correct_answer` as `A`, `B`, `C`, or `D`
- `correct_choice_index`

### student_response

Required:

- `correct_numeric_answer`
- `answer_tolerance`

Not required:

- `correct_answer`
- `correct_choice_index`
- `choice_a`
- `choice_b`
- `choice_c`
- `choice_d`

Student responses allow integers, decimals, fractions, and negative numbers.

## Visual Columns

Current visual columns:

- `visual_type`
- `visual_json`
- `table_markdown`

See [visual-schema.md](visual-schema.md).

## IDs

`question_id` must be unique within a question set.
