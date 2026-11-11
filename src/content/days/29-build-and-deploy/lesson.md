## Shipping is a skill, and it can be automated

A feature is not finished until real users can reach it. Deploying should be **boring**: a push to `main` builds the app, runs the checks and publishes it, with every pull request getting its own preview link. Today you will set that up for Nimbus CRM using the same stack this platform uses: **GitHub** for the code and CI, **Vercel** for hosting.

> **The thinking pattern:** *make the safe path the easy path.* If shipping needs a manual checklist, someone will skip a step. Put the checklist in automation (type-check, tests, build) so a broken change cannot reach production, and make rollback a single click.

## What `npm run build` does

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the built files locally to test them
```

1. `tsc -b` **type-checks** the whole project. (Vite itself strips types without checking, so this step is what makes type errors fail the build.)
2. `vite build` bundles and **minifies** your app with Rollup into `dist/`: `index.html` plus JS and CSS files with a **content hash** in the name (`index-3f9a2c.js`).

Hashed filenames are the key to caching: a changed file gets a *new name*, so browsers can cache the old ones for a year (`Cache-Control: immutable`) and still pick up updates instantly through the new `index.html`. Always test the **production build** (`npm run preview`), not just `npm run dev`: they behave differently (no HMR, StrictMode double-rendering is off, minification can expose bugs).

## Environment variables

Config that changes between environments (API URL, feature flags) must not be hard-coded.

```bash
# .env                (committed defaults, no secrets)
VITE_API_URL=http://localhost:5173
# .env.local          (not committed: local overrides)
# .env.production     (values used by `vite build`)
```

```ts
const apiUrl = import.meta.env.VITE_API_URL;     // typed via src/vite-env.d.ts
```

> **Critical rule:** only variables prefixed with **`VITE_`** are exposed to your code, and anything exposed is **embedded in the JavaScript bundle that every visitor downloads.** Never put real secrets (database passwords, private API keys) in a `VITE_` variable. In a front-end-only app there are *no* secrets: anything the browser needs, the user can read. Secrets belong on a server (a Vercel serverless function), which calls the secret-protected service on your behalf.

Validate configuration **once at startup** so a missing variable fails loudly in the build or on load, not as a mysterious `undefined` deep in a component. You will write that validator today.

## Bundle size

Every kilobyte of JavaScript costs download time, parse time and battery, especially on phones. Habits that keep it small:

- **Code-split** routes and heavy widgets with `lazy` (Day 24).
- **Import precisely.** `import { format } from 'date-fns'` tree-shakes; `import _ from 'lodash'` pulls in the whole library. Prefer ES-module builds (`lodash-es`) or native methods; replace `moment` with `Intl` or `date-fns`.
- **Analyse it.** `npm i -D rollup-plugin-visualizer` produces a treemap showing exactly which package is eating your budget. The biggest surprise is usually one dependency.
- **Avoid duplicates:** the same library appearing in two chunks, or two versions of React, shows up in the analysis.
- Compress images, use modern formats (WebP/AVIF) and lazy-load below-the-fold images.

Set a **budget** (for example, under 200 KB gzipped for the initial route) and check it in CI so it cannot creep.

## Continuous integration with GitHub Actions

CI runs your checks on every push and pull request on a clean machine. If anything fails, the change cannot be merged (when you turn on **branch protection**).

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci              # exact versions from package-lock.json; faster and reproducible
      - run: npm run typecheck
      - run: npm test -- --run
      - run: npm run build
```

Use **`npm ci`**, not `npm install`, in CI: it installs exactly what the lockfile says and fails if `package.json` and the lockfile disagree. Order the steps from fastest to slowest so failures show up quickly. Add `npm run lint` and, later, an end-to-end job.

## Deploying to Vercel

Vercel builds and hosts front-end apps with zero configuration for Vite:

1. **Push to GitHub** (below).
2. **Import the repository** in Vercel (or run `vercel` with the CLI). It detects Vite, runs `npm run build` and serves `dist/`.
3. Every **push to `main`** deploys to production; every **pull request** gets a unique **preview URL** to review before merging.
4. Set **environment variables** in the project settings (`VITE_API_URL`), separately for Production and Preview.
5. **Rollback** is instant: promote any previous deployment.

A single-page app needs one extra setting: deep links like `/contacts/ct_7` don't exist as files, so the host must serve `index.html` for them and let React Router take over:

```json
// vercel.json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

(The pattern keeps `/api/...` out of the rewrite so serverless functions still work. This very platform ships its mock CRM API as Vercel serverless functions in an `api/` folder.)

Useful response headers to add in the same file: long-lived caching for hashed assets, and basic security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`, and ideally a `Content-Security-Policy`).

### Creating the GitHub repository

```bash
git init -b main
git add -A && git commit -m "Nimbus CRM"
gh repo create nimbus-crm --public --source=. --remote=origin --push     # GitHub CLI
# or create the repo on github.com and:  git remote add origin <url> && git push -u origin main
```

Add a good `.gitignore` (`node_modules`, `dist`, `.env.local`, `.vercel`), a `README.md` (what it is, how to run it, how to test it) and never commit secrets. If you ever do, **rotate the secret**; deleting the commit does not make it safe.

## After the deploy

- **Smoke test** the production URL: deep-link refresh, login, a mutation, offline mode.
- **Monitor:** Vercel Analytics/Speed Insights for real-user performance; an error tracker (Sentry) wired to your error boundaries (Day 24).
- **Lighthouse** the production URL for performance, accessibility and PWA scores.
- **Keep dependencies fresh:** turn on Dependabot or Renovate; run `npm audit` and read what it says before blindly running `--force`.
- **Release hygiene:** meaningful commit messages, small pull requests, tags for notable versions, a short CHANGELOG.

## Walkthrough: from "works on my machine" to a live URL

1. **Run `npm run build && npm run preview`** and click through the app, because production differs from dev.
2. **Add `vercel.json`** with the SPA rewrite; create `.env.production` with the real API URL.
3. **Add the CI workflow**; push a branch and watch the checks run on the pull request.
4. **Connect Vercel**; open the preview URL from the PR; merge; watch production deploy.
5. **Break something deliberately** (a type error) on a branch to confirm CI blocks it; then fix it.
6. **Analyse the bundle**, pick the biggest dependency, and reduce it.

## CRM step: ship Nimbus CRM

1. Validate configuration at startup (`parseEnv`, as in today's first exercise) and fail clearly when `VITE_API_URL` is missing.
2. Add `vercel.json` (SPA rewrite, cache and security headers) and `.env.production`.
3. Add `.github/workflows/ci.yml` with typecheck, tests and build; turn on branch protection requiring it.
4. Create the GitHub repository and push; import it into Vercel and deploy.
5. Install `rollup-plugin-visualizer`, open the treemap, and reduce the largest chunk (lazy-load charts, drop an oversized library).
6. Run Lighthouse on the deployed URL and record the scores in the README.

- [ ] Config is validated at startup; no secrets in `VITE_` variables
- [ ] CI runs typecheck, tests and build on every PR
- [ ] The app is live on Vercel with working deep links
- [ ] The largest chunk is identified and reduced
