# AGENTS.md

## Purpose
This file defines working rules for AI developers in `client`.
It is a workflow guide, not a product specification.

## Source Of Truth (Priority Order)
When requirements conflict, use this order:
1. `../docs/REBUILD_PLAN.md`
2. `../docs/REQUIREMENTS.md`
3. `../docs/DESIGN.md`
4. `../docs/DOCS_GUIDE.md` (documentation governance)
5. `../docs/TASKS.md`
6. `../docs/QA_MANUAL.md`
7. `../docs/NEXT_STEPS.md` (execution priority guide)

Do not silently override higher-priority docs.
If a change is needed, update docs first and then code.

## Documentation Rules
- Follow `../docs/DOCS_GUIDE.md` for where and how to update docs.
- Keep `../docs/TASKS.md` checkboxes aligned with real implementation/test status.
- Use `../docs/NEXT_STEPS.md` for short-term execution order.

## Tech And Tooling Lock
- Framework: Next.js (App Router)
- Language: JavaScript only (`.js`, `.jsx`)
- Package manager: npm only
- UI: Tailwind CSS + shadcn/ui
- Image orientation parsing: `exifr`
- Static image WebP encoder: `@jsquash/webp` (WASM/libwebp)
- Animated WebP encoder: `@ffmpeg/ffmpeg` (lazy-loaded)
- ZIP: `fflate`

## Product Invariants (Do Not Break)
- Conversion is local browser-only. No server upload/storage/processing.
- Route and SEO:
  - `/` redirects to `/to-webp`
  - canonical is `/to-webp`
  - sitemap includes `/to-webp` only
- Supported input: JPG/JPEG, PNG, GIF, APNG
- Rejected input: unsupported formats
- Output: WebP (lossy/lossless)
- Default quality: `80` (UI range `0-100`)
- Default lossless: `false`
- Default effort: `4` (range `1-6`)
- Default fps: `null` (original timing)
- Default loop: `0` (infinite)
- Default frameDelayMode: `original`
- Default dropDuplicateFrames: `false`
- When `lossless=true`, quality is fixed to `100`
- Resize modes:
  - `original`
  - `percent` (up/down scale)
  - `max` (keep ratio, downscale-only)
  - `exact` (direct px)
- Limits:
  - max file size: `50MB`
  - max dimension: `8192`
  - max total pixels: `25,000,000`
  - max batch files: `50`
  - zip warn threshold: `300MB` (confirm)
  - zip hard limit: `500MB` (disable)
- Reject UX:
  - rejected files are not added to list
  - reason is shown immediately via toast
- Cancel policy:
  - soft cancel only
  - pending -> canceled immediately
  - processing -> canceled at checkpoints

## Required Dev Commands
Run inside `e:\\git\\ez2\\client`:
- `npm install` (or `npm ci` in CI)
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

If Playwright browser is missing:
- `npx playwright install chromium`

## AI Change Workflow
1. Read relevant docs from `../docs/` before coding.
2. Keep module boundaries from `DESIGN.md`:
   - `lib/converters/*`
   - `hooks/use-conversion-queue.js`
   - `components/converter/*`
   - `lib/download/*`
3. Implement minimal, focused changes.
4. Run quality gates: `lint`, `build`, `test:e2e`.
5. Update `../docs/TASKS.md` checkboxes to reflect progress.
6. If behavior/policy changed, update docs in the same change following `../docs/DOCS_GUIDE.md`.
7. Keep `../docs/NEXT_STEPS.md` current for remaining work priority when milestones move.

## Definition Of Done
A task is done only when:
- behavior matches docs,
- `npm run lint` passes,
- `npm run build` passes,
- related e2e tests pass (`npm run test:e2e`),
- `../docs/TASKS.md` is updated.

## PowerShell Encoding Guard
- Use explicit UTF-8 in shell file operations.
  - Read: `Get-Content <path> -Encoding UTF8`
  - Write/Append: `Set-Content/Add-Content <path> -Encoding UTF8`
- Reason: Windows PowerShell 5.1 may decode UTF-8 (no BOM) files using ANSI by default.
