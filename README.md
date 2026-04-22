# client

Local browser-based image converter built with Next.js (App Router, JavaScript).

## Documentation Rules
- AI/dev workflow guide: `AGENTS.md`
- Docs governance: `../docs/DOCS_GUIDE.md`
- Current execution priority: `../docs/NEXT_STEPS.md`
- Product specs:
  - `../docs/REBUILD_PLAN.md`
  - `../docs/REQUIREMENTS.md`
  - `../docs/DESIGN.md`
  - `../docs/TASKS.md`
  - `../docs/QA_MANUAL.md`

## Getting Started

Run from `D:\git\ez2\client`:

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000/to-webp`
- `http://localhost:3000/to-png`
- `http://localhost:3000/to-jpg`
- `http://localhost:3000/to-avif`
- `http://localhost:3000/to-gif`
- `http://localhost:3000/lab/loading-benchmark`
- `http://localhost:3000/lab/qa-runner`
- `http://localhost:3000/robots.txt`
- `http://localhost:3000/sitemap.xml`

## Quality Commands

```bash
npm run lint
npm run build
npm run test:e2e
```

Playwright uses port `3100` by default to avoid conflicts with other local apps.
Override it when needed:

```powershell
$env:PLAYWRIGHT_PORT='3200'; npm run test:e2e
```

If Playwright browser is missing:

```bash
npx playwright install chromium
```

## Release Notes
- Changelog: `CHANGELOG.md`
- Rollback runbook: `ROLLBACK_RUNBOOK.md`
