# Release Guide

This guide is for maintainers publishing FREE PREP through GitHub Releases.

## Before Release

Update version numbers when preparing a new release:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `CHANGELOG.md`

For macOS releases, also confirm `src-tauri/entitlements.plist` is present and `src-tauri/tauri.conf.json` keeps hardened runtime enabled under `bundle.macOS`.

```bash
npm install
npm run typecheck
npm run build
npm run tauri:build
```

Confirm:

- CSV import still works.
- Sample CSV imports.
- SQLite saves locally.
- Question Sets persist after restart.
- Practice Score wording is used instead of official score wording.
- No official SAT, Bluebook, or College Board branding is included.

## GitHub Desktop Publish

1. Open GitHub Desktop.
2. Add this local repository.
3. Confirm `.gitignore` excludes generated output.
4. Commit source code, docs, workflows, lock files, and Tauri config.
5. Publish repository.

## macOS Signing And Notarization

macOS DMG releases must be signed and notarized before they are useful for general users. Unsigned downloaded builds can show:

```text
"FREE PREP" is damaged and can't be opened. You should move it to the Bin.
```

Before pushing a release tag, add these repository secrets in GitHub:

- `APPLE_CERTIFICATE`: base64-encoded Developer ID Application `.p12` certificate.
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`.
- `APPLE_SIGNING_IDENTITY`: Developer ID Application identity, for example `Developer ID Application: Name (TEAMID)`.
- `APPLE_API_ISSUER`: App Store Connect API Issuer ID.
- `APPLE_API_KEY_ID`: App Store Connect API Key ID.
- `APPLE_API_KEY_P8`: complete contents of the downloaded App Store Connect `.p8` private-key file.

### Apple and GitHub setup

1. In Apple Developer, open **Certificates, Identifiers & Profiles** and create a **Developer ID Application** certificate. Install it into Keychain Access, then export the certificate and its private key as a password-protected `.p12` file.
2. In App Store Connect, open **Users and Access > Integrations**, create an API key with **Developer** access, and immediately download its `.p8` file.
3. In GitHub, open this repository's **Settings > Secrets and variables > Actions** and add all six secrets listed above. Do not add the `.p12` or `.p8` files to this repository.

Create the certificate secret on macOS after exporting the Developer ID Application certificate as `.p12`:

```bash
base64 -i DeveloperIDApplication.p12 -o apple-certificate.base64
```

Copy the contents of `apple-certificate.base64` into the `APPLE_CERTIFICATE` GitHub secret.

Create an App Store Connect API key with Developer access, then copy its Issuer ID and Key ID into the matching secrets. Download the `.p8` file immediately (Apple only allows one download) and paste its complete contents into `APPLE_API_KEY_P8`. The workflow writes this secret to a temporary file on the macOS runner and removes it when the job ends.

The release workflow intentionally fails before building any release assets if the required Apple secrets are missing. This prevents publishing another unsigned DMG that triggers Gatekeeper damage warnings.

## Tag Release

```bash
git status
git add .
git commit -m "Release v1.2.4"
git push origin main
git tag v1.2.4
git push origin v1.2.4
```

The release workflow runs on tags that start with `v`.
GitHub Actions creates a GitHub Release and uploads packaged desktop app assets.

## Expected Artifacts

Windows:

- `FREE PREP for Windows` `.exe` installer

macOS:

- signed and notarized `FREE PREP for macOS` `.dmg`

Linux:

- `FREE PREP for Linux` `.AppImage`

Local builds are written under:

```text
src-tauri/target/release/bundle/
```

## User Download Guidance

Do not direct general users to GitHub's Download ZIP button. Download ZIP is source code for developers.
General users should download platform installers from GitHub Releases:

- Windows: `.exe` installer
- macOS: `.dmg`
- Linux: `.AppImage`

## Code Signing

Windows signing is not configured yet, so SmartScreen warnings can still appear.

macOS signing and notarization are configured in the release workflow and require the Apple secrets listed above. If those secrets are not present, the release workflow fails instead of publishing an unsigned DMG.
