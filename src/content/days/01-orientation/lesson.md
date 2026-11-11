## Welcome: what you are about to learn

You already know JavaScript and the basics of programming. Over the next 30 days you will add two tools to that foundation and use them to build a real application.

**React** is a library for building user interfaces out of small, reusable pieces called *components*. Instead of telling the browser *how* to change the page step by step ("find the button, change its text, add a row to the table"), you describe *what* the page should look like for the current data, and React works out the changes. That single idea, *UI as a function of data*, is why React took over the front-end world.

**TypeScript** is JavaScript plus a type system. You write ordinary JavaScript and add light annotations that describe the shape of your data. The TypeScript compiler then catches mistakes before you run the code: typos in property names, calling a function with the wrong arguments, forgetting to handle `null`. For React apps, TypeScript also powers the autocomplete you will come to rely on.

**Vite** is the build tool that wires it all together: a dev server with instant reload, and a production bundler.

> **The thinking pattern for the whole course:** every lesson introduces a concept, shows the *reasoning* a working developer uses when applying it, and then puts you in the editor. You will learn far more from the 20 minutes of practice than from the 15 minutes of reading, so do not skip the exercises.

### How a day is structured

| Block | Minutes | What you do |
| --- | --- | --- |
| Learn | 15 | Read the concept and the thinking pattern on this side. |
| Walkthrough | 10 | Follow a worked example, often with code to run. |
| Practice | 20 | Solve 2–3 exercises on the right. Press **Check** to run the tests. |
| Challenge | 10 | A harder exercise that proves you own the topic. |
| CRM step | 5 | Apply today's idea to **Nimbus CRM**, your own project. |

If you run over an hour, stop anyway. Consistency beats intensity. Unfinished exercises are saved and waiting for tomorrow.

### How the practice environment works

- The editor on the right is a real code editor with TypeScript autocomplete and error squiggles.
- **Run** compiles your code and shows it in the Preview tab (React components render; plain scripts print to the Console tab).
- **Check** runs hidden tests against your code and tells you exactly which expectation failed. For TypeScript exercises it also type-checks your code.
- Stuck? Open **Hints & solution**. Hints come one at a time. The solution comes with an explanation, and you can load it into the editor to tinker with.
- Your code, progress and notes are saved in this browser automatically.

## The CRM you will build

Along the way you will build **Nimbus CRM**, a small customer-relationship-management app, on your own computer. A CRM is a perfect learning project because it touches everything a real app needs:

- **Contacts and companies:** lists, search, filters, detail pages, forms with validation.
- **Deals:** a sales pipeline with stages, a Kanban board and money calculations.
- **Activities:** a timeline of calls, emails and tasks.
- **Dashboard:** charts and KPIs computed from the data.
- **Plumbing:** routing, API calls, caching, offline support, authentication, tests, deployment.

Each day ends with a small, concrete CRM step. By Day 30 you will have an app you can show someone, and you will understand every line of it.

A mock CRM API is hosted alongside this course (see **Mock CRM API docs** in the sidebar). From Day 14 your CRM talks to it over HTTP, with realistic latency, errors and pagination.

## Install the tools

You need three things on your machine. Do this now; the course assumes it from tomorrow.

### 1. Node.js (which includes npm)

Download the current LTS version from [nodejs.org](https://nodejs.org/en/download). Then confirm in a terminal:

```bash
node --version   # v20 or newer is fine
npm --version
```

### 2. A code editor

[Visual Studio Code](https://code.visualstudio.com/) is the common choice and has first-class TypeScript support built in. Install these extensions: **ESLint**, **Prettier**, and **ES7+ React/Redux/React-Native snippets** (optional).

### 3. Git

Check with `git --version`. If it is missing, install from [git-scm.com](https://git-scm.com/downloads). You will push your CRM to GitHub on Day 29.

## Walkthrough: create your first React + TypeScript project

Open a terminal in the folder where you keep projects and run:

```bash
npm create vite@latest nimbus-crm -- --template react-ts
cd nimbus-crm
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). You should see the Vite + React starter page with a counter button. Click it: the count goes up. Edit `src/App.tsx`, save, and watch the browser update instantly without a full reload. That is Vite's hot module replacement.

### The files that matter

```text
nimbus-crm/
├── index.html          ← the single HTML page; has <div id="root">
├── package.json        ← dependencies and scripts (dev, build, preview)
├── tsconfig.json       ← TypeScript settings (leave as generated)
├── vite.config.ts      ← Vite settings and plugins
└── src/
    ├── main.tsx        ← entry point: mounts <App /> into #root
    ├── App.tsx         ← your top-level component
    ├── App.css         ← styles for App
    └── index.css       ← global styles
```

Open `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Read it line by line, because this is the whole bootstrapping story:

1. `createRoot(...)` tells React which DOM element it owns.
2. `.render(<App />)` asks React to draw the `App` component inside it.
3. `<StrictMode>` turns on extra development-only checks. Keep it.
4. The `!` after `getElementById('root')` is TypeScript: "I promise this is not null". You will learn why that is needed on Day 3.

Now open `src/App.tsx`. The `.tsx` extension means "TypeScript with JSX". JSX is the HTML-looking syntax inside JavaScript. Notice `useState(0)`: that is React state, the subject of Day 6. For today, just change the heading text and the button label, and see the page update.

### Thinking pattern: read generated code before writing your own

Professional developers do not memorise boilerplate. They read what a tool generated, identify the few lines they own, and leave the rest alone. Every time you start a project with a generator, spend five minutes reading every file. Today that is six files; it pays off for months.

## JavaScript refresher: the bits React leans on

Tomorrow is a full session on modern JavaScript. Today's exercises warm up three features you will use on every single day of this course.

**Arrow functions** are short function expressions that keep the surrounding `this`:

```js
const double = (n) => n * 2;
const greet = (name) => `Hello, ${name}!`;        // template literal
const add = (a, b) => {
  const sum = a + b;                               // block body needs return
  return sum;
};
```

**Array methods** replace loops with intent-revealing names:

```js
const prices = [10, 25, 40];
prices.map((p) => p * 1.1);          // [11, 27.5, 44]  → transform each item
prices.filter((p) => p > 20);        // [25, 40]        → keep some items
prices.reduce((sum, p) => sum + p, 0); // 75            → fold into one value
```

**Objects and `const`:** `const` means the *binding* cannot be reassigned. The object it points to can still change. React cares a lot about *not* mutating objects, which is Day 2's topic.

```js
const contact = { name: 'Ava', email: 'ava@example.com' };
contact.name = 'Ava N.';   // allowed, and often a bug in React code
contact = {};              // TypeError: Assignment to constant variable
```

## CRM step: create the project

Create the Nimbus CRM project you will grow every day.

```bash
npm create vite@latest nimbus-crm -- --template react-ts
cd nimbus-crm
npm install
git init && git add -A && git commit -m "Day 1: Vite + React + TypeScript starter"
```

Then make it yours: in `src/App.tsx` replace the starter content with a heading that says **Nimbus CRM** and a paragraph with today's date. Delete the Vite and React logos and their imports.

- [ ] Node.js LTS and VS Code installed
- [ ] `nimbus-crm` created with the `react-ts` template and running on localhost
- [ ] `App.tsx` shows a "Nimbus CRM" heading and the starter logos are gone
- [ ] First git commit made
