# Rollback Runbook

Use this runbook when a release causes a production-impacting regression and the safest response is to redeploy the previous known-good release.

## Release Tag Rule
- Release tags use `release/vX.Y.Z`.
- Every production deployment should record the exact git SHA and release tag.
- The rollback target is the latest previous `release/vX.Y.Z` tag that passed release checks.

## When To Roll Back
- Conversion route fails to load or crashes for common supported inputs.
- Download or ZIP output is broken across supported browsers.
- A release introduces a privacy regression, server upload, or non-local processing.
- A production-only issue cannot be fixed quickly with a small forward patch.

## Pre-Rollback Checks
1. Identify the current deployed SHA and release tag.
2. Identify the previous known-good `release/vX.Y.Z` tag.
3. Confirm the incident is not caused by CDN cache, hosting outage, or browser extension interference.
4. Post the rollback decision and target tag in the release/incident thread.

## Local Verification
Run from `D:\git\ez2\client` after checking out the rollback target:

```powershell
npm ci
npm run lint
npm run build
npm run test:e2e
```

If Playwright browsers are missing:

```powershell
npx playwright install chromium
```

## Rollback Steps
1. Check out the rollback target tag:

```powershell
git fetch --tags
git checkout release/vX.Y.Z
```

2. Install and verify:

```powershell
npm ci
npm run lint
npm run build
npm run test:e2e
```

3. Redeploy the checked-out tag using the production hosting workflow.
4. Verify the production URLs:
   - `/to-webp`
   - `/to-png`
   - `/to-jpg`
   - `/to-avif`
   - `/to-gif`
   - `/robots.txt`
   - `/sitemap.xml`
5. Record the rollback time, target tag, verification result, and any follow-up issue.

## After Rollback
- Keep the bad release tag for investigation; do not rewrite history.
- Open a fix-forward issue for the regression.
- Add a regression test before re-releasing.
- Create a new release tag for the fixed version.
