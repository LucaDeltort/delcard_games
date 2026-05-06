# Deployment

## Overview

All deploys go through GitHub Actions — Netlify auto-builds are disabled (`ignore = "exit 1"` in `netlify.toml`).

| Workflow | Trigger | Target |
| --- | --- | --- |
| `ci.yml` | Push to `main`/`dev`, PRs to `main` | None (validation only) |
| `preview.yml` | PR opened / updated | Netlify draft deploy |
| `deploy.yml` | Push to `main`, manual dispatch | Netlify production |

Production deploy is gated: lint and type-check must pass before the deploy job runs.

## Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | netlify.com → User settings → OAuth applications → Personal access tokens |
| `NETLIFY_SITE_ID` | netlify.com → Site → Site configuration → Site ID |

## Setting Up a New Environment

1. Create a Netlify site (import from GitHub or blank).
2. In the Netlify site settings, **disable** the build integration to avoid double deploys:
   Site configuration → Build & deploy → Continuous deployment → **Stop builds**.
3. Add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` as GitHub secrets.
4. Push to `main` — `deploy.yml` handles the rest.

## Manual Deploy

Trigger a production deploy without pushing: GitHub → Actions → **Deploy** → **Run workflow**.

## Build

```
npm run build   # outputs to build/
```

No environment variables required — app is fully client-side.
