# Contributing

Thank you for improving FREE PREP.

Please keep changes focused and avoid adding official SAT, Bluebook, College Board logos, branding, or copied UI.

## Local Setup

```bash
npm install
npm run typecheck
npm run build
npm run tauri:dev
```

## Pull Request Checklist

- Keep CSV schema changes documented in `docs/csv-schema.md`.
- Keep visual renderer changes documented in `docs/visual-schema.md`.
- Do not commit local databases, `.env` files, `node_modules`, `dist`, or Rust target output.
- Use Practice Score / Estimated Score wording for scoring features.
- Add screenshots only to `screenshots/` when they are intended for documentation.
