# Learn React & TypeScript in 30 Days

A self-paced learning platform for developers who know JavaScript basics. One hour a day for 30 days, building a CRM ("Nimbus CRM") along the way.

Each day has:

- **A lesson** (left pane): the concept, the thinking pattern behind it, a worked walkthrough and links to the formal docs.
- **Practice and a challenge** (right pane): a live editor with TypeScript, a sandboxed preview, hidden tests that explain exactly what is wrong, hints, and a model solution with an explanation.
- **A CRM step**: a concrete checklist that moves your own local Nimbus CRM project forward.

Progress, code drafts and notes are saved in the browser (`localStorage`). Light and dark themes are supported.

## The 30 days

| Phase | Days |
| --- | --- |
| 1. Foundations | 1 Setup · 2 Modern JS · 3 TypeScript basics · 4 Narrowing, generics, utility types · 5 Components, JSX, props · 6 State and events |
| 2. Core React | 7 Thinking in React · 8 Effects · 9 Styling and dark mode · 10 Forms · 11 Lists and derived state · 12 Routing · 13 Context and reducers |
| 3. Data and APIs | 14 Fetching · 15 Custom hooks · 16 Mutations · 17 TanStack Query · 18 Caching and offline · 19 Storage and PWA · 20 Authentication |
| 4. Advanced | 21 Performance · 22 Advanced TypeScript · 23 Component patterns · 24 Error boundaries and Suspense · 25 State at scale · 26 Testing |
| 5. Ship it | 27 Dashboards · 28 Accessibility · 29 Build, CI, deploy · 30 Capstone |

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173 (the mock CRM API is served at /api by the dev server)
npm run build        # type-check + production build into dist/
npm run check:content  # structural checks on the course content
```

Node 20 or newer.

## How it is built

- **Vite + React + TypeScript**, React Router, `react-markdown` for lessons.
- **Editor:** Monaco with a TypeScript language service. Simplified typings for React Router, TanStack Query and the test helpers live in `src/editor/libTypes.ts`.
- **Sandbox:** your code is compiled in the browser with Sucrase and run in a sandboxed `iframe`. React and other libraries load from `esm.sh`. The test harness (`src/sandbox/harness.js`) provides `expect`, `fn`, `render`, `click`, `type`, `useFakeTimers` and friends.
- **Content:** each day is `src/content/days/NN-name/lesson.md` plus `exercises.md`; metadata and reference links are in `src/content/curriculum.ts`.
- **Mock CRM API:** `api/` is a small REST API (contacts, companies, deals, activities, auth) that runs as Vercel serverless functions in production and as Vite middleware in development. Add `?delay=1500` or `?fail=0.3` to any request to practise loading and error states. See `/api-docs` in the app.

## Verifying the content

Every exercise is checked in the real sandbox: the model solution must pass all tests and type checks, and the starter code must fail. Run the dev server, open `/verify?from=1&to=30` and press **Run verification**. The page exposes its results as `window.__verify`.

## Deploy

The project deploys to Vercel with no configuration beyond `vercel.json` (single-page-app rewrite and CORS for `/api`).

```bash
vercel --prod
```

## Exercise file format

```text
# practice: Title            (or "# challenge: Title")
### meta        minutes, language (js | ts | tsx), mode
### prompt      markdown shown above the editor
### starter     one fenced code block
### solution    one fenced code block
### tests       test code run after the learner's module loads (globals: test, expect, fn, render, ...)
### typetests   optional TypeScript appended to the learner's code and type-checked
### explanation markdown shown with the solution
### hints       bullet list
```
