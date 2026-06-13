# Troubleshooting

## App Will Not Open

Unsigned builds may trigger operating system warnings.

- Windows: SmartScreen may warn before launch.
- macOS: right-click the app and choose Open if Gatekeeper blocks the first launch.
- Linux: make AppImage files executable if needed.

## CSV Does Not Import

Check:

- Required headers in [csv-schema.md](csv-schema.md).
- `section`, `module`, and `route` values.
- `question_id` uniqueness.
- `visual_json` is valid JSON.
- `student_response` rows use `correct_numeric_answer` and `answer_tolerance`.

## Save To SQLite Fails

Packaged builds store data in the operating system's app data directory. If saving fails:

- Restart the app.
- Check whether the app has permission to write to its app data folder.
- Avoid running from a read-only location.

## Visual Is Blank Or Missing

The app should display an error fallback instead of a blank visual. Check:

- `visual_type`
- `visual_json.type`
- Required fields for the visual type
- Deprecated `xRange` / `yRange` usage

## Release Build Fails

Check:

- Node and npm versions in GitHub Actions.
- Rust toolchain installation.
- Linux WebKit and Tauri dependencies.
- `npm run build` passes before `npm run tauri:build`.
