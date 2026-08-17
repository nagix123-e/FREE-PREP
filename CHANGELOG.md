# Changelog

## 1.3.0

- Added password-protected Kiosk Mode for local supervised sessions.
- Kiosk controls now use one state-aware Start or End button in Settings.

## 1.2.7.1

- Remove a Spaced Review item from the due queue after two consecutive correct review responses, while retaining completion state so historical mistake backfill does not re-add it.

## 1.2.7

- Added local-first Spaced Review with automatic scheduling for incorrect responses and existing local mistake-history backfill.

## 1.2.6

- Fixed dashboard image export so charts and all dashboard sections, including Visual Question Performance, are included without clipping.

## 1.2.4

- Added signed and notarized macOS release builds alongside Windows and Linux installers.
- Improved Marketplace reliability, local device passkeys, achievement records, time tracking, and Math student-response input.

## 0.1.0

- Initial local desktop release preparation.
- CSV import and validation for FREE PREP question sets.
- SQLite persistence for question sets, attempts, responses, notes, highlights, and review list data.
- Fixed full-test route: RW base, RW hard, Math base, Math hard.
- Focused practice modes.
- Review answers, score history, statistics, and import/export tools.
- Visual renderer support for tables, coordinate planes, function graphs, charts, and geometric diagrams.
- GitHub Actions build and release workflow scaffolding.
