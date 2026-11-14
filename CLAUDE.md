# CLAUDE.md

Guidance for working on this repository.

## Project Scope

**Learn React & TypeScript in 30 Days** is a self-paced learning platform for developers who already know JavaScript and programming basics.

- A 30-day plan, one hour per day, starting with setup and ending with a deployed app.
- Learners build a CRM ("Nimbus CRM") step by step in their own local project, from basics to advanced topics: APIs, caching, offline data, storage, auth, performance, testing and deployment.
- Each day teaches the concept and the thinking pattern, walks through an example, offers practice with automatic feedback, and ends with a challenge and a CRM step.
- Every topic links to a formal reference (react.dev, TypeScript Handbook, MDN and others).
- No database and no backend of our own beyond a mock CRM API. Data lives in JSON content files and the browser's `localStorage`.
- Hosted on GitHub, deployed on Vercel.

Out of scope: user accounts, a real database, AI-generated feedback, server-side progress storage.

Live site: https://learn-react-beryl-sigma.vercel.app
Repository: https://github.com/shehan81-corder/learn-react
Original requirements: `.claude/requirements.md`

## Features (high level)

| Area | What it does |
| --- | --- |
| Course | 30 days in 5 phases, 4 exercises per day (3 practices and 1 challenge), 120 in total |
| Primers (optional) | Two self-paced primers outside the 30-day plan: **DOM & Virtual DOM** and **TypeScript basics**. 4 units each, 2 practices + 1 challenge per unit (24 exercises). Routes `/primers`, `/primers/:id`, `/primers/:id/:unit`. They never count towards day completion |
| Lesson widgets | Interactive demos embedded in primer lessons with a ` ```widget ` block: `dom-tree`, `jsx-to-object`, `vdom-diff`, `keys-demo`, `fiber-loop` |
| Split-screen day page | Lesson on the left, practice workspace on the right, draggable divider, tabs on narrow screens |
| Practice workspace | Monaco editor with TypeScript checking, Run (live preview and console) and Check (hidden tests plus type checks) |
| Feedback | Failing tests explain what is wrong; hints one at a time; revealable model solution with explanation |
| CRM roadmap | Per-day checklist for the learner's local Nimbus CRM, aggregated on `/crm` |
| Progress | Exercises passed, drafts, notes and CRM checklist saved in `localStorage`; export and import as JSON |
| Theming | Light and dark mode, follows the OS until the user chooses |
| Mock CRM API | REST API for contacts, companies, deals, activities and auth, with `?delay=` and `?fail=` chaos options; docs and a "Try it" panel at `/api-docs` |
| Content QA | `/verify` page runs every exercise's solution and starter in the real sandbox |

## System Design

The app is a static single-page React application plus a small set of serverless functions. There is no server-side state.

**Content pipeline.** Each day is two Markdown files in `src/content/days/NN-name/`: `lesson.md` and `exercises.md`. Day metadata (titles, objectives, reference links, phases) lives in `src/content/curriculum.ts`. `src/content/parse.ts` splits lessons into sections (the `## CRM step` section becomes the CRM checklist) and parses exercises into `{ prompt, starter, solution, tests, typeTests, hints }`. Files are loaded eagerly with `import.meta.glob`.

**Primers.** Metadata in `src/content/primers.ts` (bundled with the shell); content in `src/content/primers/<id>/NN-slug/{lesson,exercises}.md`, loaded by `src/content/primerContent.ts`, which only the lazy-loaded `PrimerUnitPage` and `VerifyPage` import, so primer text stays out of the main bundle. Days and primer units share the `StudyUnit` type, so `LessonPane` and `PracticePane` render both; progress keys are `"3"` for a day and `"dom-2"` for a unit, and primer exercise ids are `dom-2-p1`, `dom-2-p2`, `dom-2-challenge`. Widgets live in `src/features/widgets/` and are provided to Markdown through the `MarkdownWidgets` context.

**Practice sandbox.** Learner code never runs in the app's own page.

1. `src/editor/` hosts Monaco. `typecheck.ts` type-checks the code (plus optional `### typetests`) with Monaco's TypeScript worker.
2. `src/sandbox/transform.ts` compiles TS/TSX/JSX to ESM with Sucrase and rewrites bare imports to `esm.sh` URLs.
3. `src/sandbox/srcdoc.ts` builds an HTML document containing the compiled code, the test code and `harness.js`, and `useRunner.ts` runs it in a sandboxed `iframe` (`allow-scripts`, opaque origin). **Run** uses the visible Preview iframe. **Check** uses a separate off-screen iframe so focus and layout APIs work.
4. `harness.js` provides the test globals (`test`, `expect`, `fn`, `render`, `click`, `type`, `submit`, `keyDown`, `flush`, `sleep`, `useFakeTimers`), captures console output and errors, and reports results to the parent with `postMessage`.

**State.** `src/state/progress.ts` is a small external store backed by `localStorage` (read with `useSyncExternalStore`). `src/state/theme.ts` does the same for the theme.

**Mock API.** `api/_lib/` holds an in-memory store (seeded deterministically), validators and a router. In development a Vite middleware (`vite.config.ts`) serves it at `/api`. On Vercel, `vercel.json` rewrites every `/api/*` request to the single function `api/index.ts`, passing the original path as `?__path=`.

**Verification.** `src/pages/VerifyPage.tsx` runs every exercise: the solution must pass all tests and type checks, and the starter must fail. Results are exposed as `window.__verify`.

## Sketch Diagram

```text
                          Browser (learner)
 ┌──────────────────────────────────────────────────────────────────────┐
 │  React app (Vite build)                                              │
 │                                                                      │
 │  Pages: Home · Day · Primers · CRM roadmap · API docs · /verify      │
 │                                                                      │
 │  ┌───────────── Day page ──────────────┐                             │
 │  │  Lesson pane     │  Practice pane   │                             │
 │  │  (Markdown,      │  ┌────────────┐  │      localStorage           │
 │  │   CRM checklist, │  │ Monaco     │  │   ┌──────────────────────┐  │
 │  │   references)    │  │ editor     │  │   │ progress · drafts ·  │  │
 │  │                  │  └─────┬──────┘  │   │ notes · theme        │  │
 │  │                  │   Run  │ Check   │   └──────────▲───────────┘  │
 │  └──────────────────┴────────┼─────────┘              │              │
 │                              ▼                  state/progress.ts     │
 │            Sucrase compile + type check                              │
 │                              │ srcdoc                                │
 │                  ┌───────────▼────────────┐                          │
 │                  │ sandboxed iframe       │  postMessage             │
 │                  │ learner code + tests   │──────────────► results   │
 │                  │ + harness.js           │                          │
 │                  └───────────┬────────────┘                          │
 └──────────────────────────────┼───────────────────────────────────────┘
                                │ imports (react, router, query ...)
                                ▼
                         esm.sh CDN          Monaco from jsDelivr

 Content (bundled):  src/content/days/NN-*/{lesson,exercises}.md
                     src/content/curriculum.ts
 Primers (lazy):     src/content/primers/<id>/NN-*/{lesson,exercises}.md
                     src/content/primers.ts (metadata, bundled)

            GitHub ──push──► Vercel ──► static site (dist/)
                                   └──► /api/*  ──rewrite──► api/index.ts
                                                  (in-memory mock CRM API)
```

## Tech Stack

- **Language and UI:** TypeScript (strict), React 19, React Router 7
- **Build:** Vite 8, `@vitejs/plugin-react`
- **Editor and sandbox:** `@monaco-editor/react` (Monaco loaded from jsDelivr), Sucrase, `esm.sh` for in-sandbox libraries
- **Content rendering:** `react-markdown`, `remark-gfm`, `rehype-highlight`, `lucide-react` icons
- **Styling:** plain CSS with design tokens and a `data-theme` attribute for dark mode (`src/styles/global.css`)
- **API:** Node serverless function on Vercel (`api/`), no database
- **Hosting and CI:** GitHub, Vercel (deploys on push to `main`)

## Install Instructions

Requirements: Node 20 or newer, npm.

```bash
git clone https://github.com/shehan81-corder/learn-react.git
cd learn-react
npm install
npm run dev            # http://localhost:5173, mock API served at /api
```

Other commands:

```bash
npm run build          # type-check (tsc -b) and build into dist/
npm run preview        # serve the production build locally
npm run typecheck      # type-check only
npm run check:content  # structural checks on the 30 days of content
```

Deploy:

```bash
vercel --prod          # project is already linked; pushing to main also deploys
```

Verify content after changing any lesson, exercise, or the sandbox: run `npm run dev`, open `/verify?from=1&to=30` and press **Run verification**. Use `?day=N` for a single day, and `?primer=dom`, `?primer=typescript` or `?primer=all` for the primers.

## Working in this repo

- **Primer units** have exactly 2 practices and 1 challenge (ids depend on it), no CRM step, and widget names must exist in `src/features/widgets/index.ts`. `npm run check:content` enforces this.
- **Exercise format** (`exercises.md`): `# practice: Title` or `# challenge: Title`, then `### meta`, `### prompt`, `### starter`, `### solution`, `### tests`, optional `### typetests`, `### explanation`, `### hints`. Each day has exactly 3 practices and 1 challenge. `npm run check:content` enforces this.
- **Every exercise must be verified:** the solution passes and the starter fails.
- **Keep tests deterministic.** Use `useFakeTimers()` for time, inject dependencies (`storage`, `fetchFn`) instead of touching globals. The sandbox has an opaque origin, so no `localStorage` or IndexedDB there.
- **Do not use `requestAnimationFrame` or real timers in the harness.** Hidden iframes pause and throttle them.
- **API imports use `.js` extensions** (`./http.js`) so Vercel's ESM runtime can resolve them.
- Editor typings for React Router, TanStack Query and the test globals live in `src/editor/libTypes.ts`. Update them when an exercise uses a new library.
- Known follow-up: the main bundle includes all lesson text (about 530 KB gzipped); day content could be lazy-loaded.
