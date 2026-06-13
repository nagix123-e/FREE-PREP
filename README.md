# SAT Practice Simulator

SAT Practice Simulator is a local desktop app for importing CSV-based SAT-style practice sets, taking fixed-route practice tests, reviewing answers, and tracking estimated practice performance over time.

This project is an unofficial SAT practice simulator.
It is not affiliated with, endorsed by, or sponsored by College Board.

Scores shown in the app are Practice Score / Estimated Score values only. They are not official SAT scores.

## What The App Does

- Imports SAT-style CSV files generated outside the app.
- Validates module routes, question counts, question types, duplicate IDs, and visual JSON.
- Stores question sets, attempts, responses, notes, highlights, and review lists locally in SQLite.
- Runs a fixed full practice test:
  - RW Module 1 base
  - RW Module 2 hard
  - Math Module 1 base
  - Math Module 2 hard
- Supports focused practice by domain, skill, topic, mistakes, and review list.
- Renders tables, coordinate planes, function graphs, and SAT-style diagrams from CSV visual data.

## Download For General Users

General users do not need Rust, Cargo, Node.js, npm, pnpm, yarn, or the Tauri CLI.

1. Open the project's GitHub Releases page.
2. Download the installer for your operating system.
3. Install and launch SAT Practice Simulator.
4. Import a CSV from the Import CSV screen.

## Windows Install

Download the `.msi` or `.exe` file from GitHub Releases, then run it.

Unsigned Windows apps may show a SmartScreen warning. This project does not require global developer tools or command-line setup for normal use.

## macOS Install

Download the `.dmg` or `.app` bundle from GitHub Releases.

If macOS warns that the app is from an unidentified developer, right-click the app and choose Open. Code signing and notarization are planned for a future release.

## Linux Install

Download the `.deb` or `.AppImage` from GitHub Releases.

For `.deb`, install with your package manager. For `.AppImage`, mark the file executable and launch it from your desktop environment.

## CSV Import

1. Open SAT Practice Simulator.
2. Select Import CSV from the left navigation.
3. Choose a CSV file.
4. Review validation results.
5. Save valid sets to SQLite.
6. Open Question Sets to preview or start a practice test.

Sample data is available at [sample_data/sample_sat_practice.csv](sample_data/sample_sat_practice.csv).

## Documentation

- [CSV schema](docs/csv-schema.md)
- [Visual JSON schema](docs/visual-schema.md)
- [Scoring spec](docs/scoring-spec.md)
- [Import guide](docs/import-guide.md)
- [Release guide](docs/release-guide.md)
- [Troubleshooting](docs/troubleshooting.md)

## Local Data Storage

The app stores user data locally through the Tauri SQLite plugin. Packaged desktop builds store data in the app data area managed by the operating system:

- Windows: AppData
- macOS: Application Support
- Linux: user config/data directories

Local SQLite databases and build outputs are excluded from Git.

## Developer Setup

Developers need Node.js, npm, Rust, Cargo, and platform-specific Tauri prerequisites.

```bash
npm install
npm run dev
npm run tauri:dev
```

Useful scripts:

```bash
npm run typecheck
npm run lint
npm run build
npm run tauri:build
```

## GitHub Desktop Publish Steps

1. Open GitHub Desktop.
2. Choose File > Add Local Repository.
3. Select this project folder.
4. Review changed files.
5. Commit the source, docs, workflows, package files, lock file, and Tauri config.
6. Choose Publish repository.
7. Keep generated folders such as `node_modules`, `dist`, and `src-tauri/target` out of the commit.

## Release Creation

1. Commit all release changes.
2. Push to GitHub.
3. Create a tag such as `v0.1.0`.
4. Push the tag.
5. GitHub Actions release workflow builds Windows, macOS, and Linux packages.
6. Download generated artifacts and confirm the release assets.

See [docs/release-guide.md](docs/release-guide.md).

## Troubleshooting

- If CSV validation fails, check required headers and the 27/27/22/22 full-test count.
- If a visual does not render, inspect `visual_type` and `visual_json`.
- If the app cannot save, confirm the packaged app has access to its local app data directory.
- Windows SmartScreen and macOS unidentified developer warnings can appear for unsigned builds.

See [docs/troubleshooting.md](docs/troubleshooting.md).

## License

MIT. See [LICENSE](LICENSE).
