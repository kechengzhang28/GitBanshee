# Build & Distribution

## Overview

GitBanshee distributes through three platform installers built in parallel via GitHub Actions on tag push:

| Platform | Installer | Signing |
|----------|-----------|---------|
| **Windows** | `.msi` (WiX) | Authenticode (certificate + signtool) |
| **macOS** | `.dmg` | Apple Notarization (Developer ID + notarytool) |
| **Linux** | `.deb` + `.AppImage` | GPG key (dpkg-sig) |

## CI/CD Pipeline

A single GitHub Actions workflow triggers on version tags (`v*`). All three platforms build in parallel using Tauri's official action. Artifacts attach to the GitHub Release.

### Platform Dependencies

- **Windows** — WebView2 (pre-installed on Windows Server 2022+)
- **macOS** — Xcode + macOS SDK (pre-installed on GitHub's ARM runner)
- **Linux** — `libwebkit2gtk-4.1-dev` (Tauri install script handles this)

## Code Signing

**Windows:** OV/EV certificate stored as GitHub Secrets. Pipeline signs `.msi` with `signtool.exe` before upload.

**macOS:** Apple Developer ID certificate + App Store Connect API Key stored as Secrets. Pipeline signs the `.dmg` and submits it to notarization; without this, Gatekeeper blocks the app.

**Linux:** GPG private key stored as a Secret. `.deb` is signed for users who verify via `apt`. `.AppImage` is not embedded-signable; a checksum file is GPG-signed instead.

## Secrets Required

| Secret | Platform | Purpose |
|--------|----------|---------|
| PFX certificate + password | Windows | Authenticode signing |
| Developer ID cert + API Key | macOS | Signing + notarization |
| GPG private key | Linux | Repository signing |
| `GITHUB_TOKEN` | All (auto-provided) | Release attachment |

## Versioning

Semantic versioning (`MAJOR.MINOR.PATCH`). Tag push triggers the workflow (`git tag v1.0.0 && git push --tags`). The pipeline stamps the tag into `tauri.conf.json`.

## Offline Fallback

Without CI, builds must happen on native hardware per platform. macOS ARM builds require Apple hardware — there is no cross-compilation path.
