# Changelog

All notable changes for this project are tracked here.

## v0.1.1 - 2026-04-24

### Added
- Common converter header, format tabs, and refined tool UI across WebP/PNG/JPG/AVIF/GIF routes.
- Firebase Hosting configuration via `firebase.json` and `.firebaserc`.
- GitHub Actions workflows for Firebase Hosting preview/live deploys.
- Static alias pages so public short URLs continue to resolve in export builds.

### Changed
- Switched Next.js production output to static export for Firebase Hosting deployment.
- Replaced proxy-based alias redirects with export-friendly route pages and client-side canonical redirects.
- Updated default public site URL to `https://ez2convert.web.app`.

### Verification
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

## v0.1.0 - 2026-04-23

### Added
- Local browser-only converter routes for WebP, PNG, JPG, AVIF, and GIF.
- Mixed static image, animated image, and video conversion flows where supported by the target format.
- Download support for individual files and ZIP archives.
- Playwright Chromium e2e coverage for conversion, route rendering, validation, and failure paths.
- GitHub Actions CI for lint, build, and e2e smoke coverage.
- Public route alias redirects to canonical converter routes.

### Changed
- Playwright e2e now defaults to port `3100` to avoid conflicts with other local apps.
- Playwright e2e runs with one worker for stable wasm/ffmpeg browser execution.

### Known Warnings
- AVIF encode uses `@jsquash/avif`; webpack may print non-fatal worker dynamic dependency and circular chunk warnings.
- Animated/video AVIF output is not implemented because the current default ffmpeg.wasm core does not include a usable AV1 encoder.

### Verification
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
