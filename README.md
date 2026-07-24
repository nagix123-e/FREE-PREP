# FREE PREP

Free Practice Simulator for the SAT® Exam

FREE PREP is a local desktop app for importing CSV-based SAT-style practice sets, taking fixed-route practice tests, reviewing answers, and tracking estimated practice performance over time.

This project is an unofficial SAT practice simulator.
Not affiliated with or endorsed by College Board.

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
- Supports full fixed-route practice tests, RW-only tests, Math-only tests, mistake practice, and review-list practice.
- Renders tables, coordinate planes, function graphs, and SAT-style diagrams from CSV visual data.

## For Users: Download The Desktop App

General users do not need Rust, Cargo, Node.js, npm, pnpm, yarn, or the Tauri CLI.

Download ZIP is for developers who want to inspect or build the source code.
If you only want to use the app, download the installer from GitHub Releases.

1. Open the project's GitHub Releases page.
2. Download the installer for your operating system.
3. Install and launch FREE PREP.
4. Import a CSV from the Import CSV screen.

## Windows Install

1. Open GitHub Releases.
2. Download the `FREE PREP for Windows` `.exe` installer.
3. Run the installer.
4. Launch FREE PREP from the Start Menu.

Unsigned Windows apps may show a SmartScreen warning. This project does not require global developer tools or command-line setup for normal use.

## macOS Install

1. Open GitHub Releases.
2. Download the latest `FREE PREP for macOS` `.dmg` file.
3. Open the `.dmg`.
4. Drag FREE PREP into Applications.
5. Launch it from Applications.

Current macOS release builds are intended to be signed and notarized through GitHub Actions. If macOS says the app is damaged and should be moved to the Bin, delete that copy and download the newest signed `.dmg` from GitHub Releases instead of using an older unsigned build or Download ZIP.

## Linux Install

1. Open GitHub Releases.
2. Download the `FREE PREP for Linux` `.AppImage` file.
3. Mark it executable and launch it.

Example AppImage command:

```bash
chmod +x SAT-Practice-Simulator*.AppImage
./SAT-Practice-Simulator*.AppImage
```

## CSV Import

1. Open FREE PREP.
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

## For Developers: Build From Source

Developers need Node.js, npm, Rust, Cargo, and platform-specific Tauri prerequisites.

```bash
git clone <repository-url>
cd SAT
npm install
npm run tauri:dev
```

Useful scripts:

```bash
npm run typecheck
npm run lint
npm run build
npm run tauri:build
```

Local desktop bundles are generated under:

```text
src-tauri/target/release/bundle/
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

macOS releases require Apple Developer ID signing and notarization secrets in GitHub Actions before tagging a release. See [docs/release-guide.md](docs/release-guide.md).

See [docs/release-guide.md](docs/release-guide.md).

## Troubleshooting

- If CSV validation fails, check required headers and the 27/27/22/22 full-test count.
- If a visual does not render, inspect `visual_type` and `visual_json`.
- If the app cannot save, confirm the packaged app has access to its local app data directory.
- Windows SmartScreen warnings can appear for unsigned Windows builds.
- macOS "damaged and can't be opened" warnings usually mean the downloaded build was not signed and notarized. Use the latest signed `.dmg` from GitHub Releases.

See [docs/troubleshooting.md](docs/troubleshooting.md).

## License

MIT. See [LICENSE](LICENSE).
