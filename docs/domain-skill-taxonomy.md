# Domain And Skill Taxonomy

The canonical CSV separates broad categorization from display labels:

- `content_domain`: top-level reporting domain, such as Information and Ideas or Advanced Math.
- `skill_group`: grouped skill family used for dashboards and score review.
- `skill_code`: stable machine-readable skill identifier.
- `skill_label`: user-facing skill name.
- `question_topic`: narrow topic for targeted practice and review.
- `primary_skill`: main tested skill.
- `secondary_skill`: optional supporting skill.

The app stores all of these columns. Existing Phase 1-5 UI that expects `domain` or `skill` maps them to `content_domain` and `skill_group` for backward compatibility.
