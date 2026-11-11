## You made it

Thirty days ago you knew JavaScript. Today you can build, test, secure, optimise and ship a real React and TypeScript application. Today is for **consolidating** what you learned, **reviewing** your CRM like a senior engineer would, and **choosing where to go next**.

> **The thinking pattern:** *good software is mostly good decisions made consistently.* The skill you have been practising is not memorising APIs (you can always look those up). It is recognising *what kind of problem you are looking at* (server state or UI state? derived or stored? a render problem or an effect problem?) and reaching for the right tool.

## The mental model in one page

Read this slowly. Every line is a day of the course.

- **React renders UI as a function of data.** Components are functions; props flow down; events flow up. (Days 5 to 7)
- **State is a snapshot.** You never mutate it; you replace it, using immutable updates, and each render sees one fixed snapshot. Store the *minimum*; **derive** the rest. (Days 2, 6, 7, 11)
- **Effects synchronise with the outside world**, with cleanup and an honest dependency list; they are *not* for transforming data or handling events. (Days 8, 15)
- **Server state is a cache** (TanStack Query): keys, staleness, invalidation, optimistic updates. **URL state** lives in the router. **Shared UI state** lives in context or a small store. (Days 12 to 18, 25)
- **TypeScript makes illegal states unrepresentable**: discriminated unions, generics, utility types, `satisfies`; validate at the boundary because `JSON.parse` returns lies. (Days 3, 4, 22)
- **Everything fails**, so design loading, error, empty and offline states, and contain failures with boundaries. (Days 14, 16, 18, 24)
- **Performance is measurement first**: colocate state, memoise with purpose, virtualise long lists, split code. (Days 21, 24, 29)
- **Accessibility is correctness**: semantic HTML, labels, focus management, keyboard, live regions. (Day 28)
- **Tests describe behaviour**; automation (CI) and deployment make shipping safe and boring. (Days 26, 29)

## A review checklist for your CRM

Open Nimbus CRM and walk through it as a reviewer. For each item either fix it or write down why not.

### Architecture and code organisation
- [ ] Folders by **feature** (`contacts/`, `deals/`, `auth/`) with shared `ui/`, `lib/`, `hooks/` underneath, not a giant `components/` dumping ground.
- [ ] API functions, query hooks and types for a resource live together; types are defined once.
- [ ] No component over ~150 lines or doing fetching, formatting and layout all at once.
- [ ] Naming is consistent (`useX`, `XProvider`, `onSomething`, `handleSomething`).

### State and data
- [ ] Server data is only in TanStack Query; no copies in context or a store.
- [ ] Filters, page and selected tab are in the URL.
- [ ] No derived data stored in state; no effects that only transform data.
- [ ] Mutations invalidate or update the right cache keys; optimistic updates have rollback.

### TypeScript
- [ ] No `any`; every `as` has a reason; boundaries (API responses) are validated.
- [ ] Unions and `satisfies` used for statuses, stages and config.
- [ ] `strict` is on and `npm run typecheck` is clean.

### Resilience and UX
- [ ] Every list and widget has loading, empty, error and (where relevant) offline states.
- [ ] Error boundaries at the top, per route and around risky widgets.
- [ ] Forms validate, show accessible errors, prevent double submits and keep user input on failure.

### Accessibility, performance, quality
- [ ] A keyboard-only run works; focus is managed in dialogs; Lighthouse accessibility 95+.
- [ ] Routes are lazy-loaded; the largest chunk is understood; the long list is virtualised or paginated.
- [ ] Tests cover the validators, reducers, hooks and the critical component flows; CI is green.

### Delivery
- [ ] README explains setup, scripts and architecture; no secrets in the repo; env validated at startup.
- [ ] CI blocks broken changes; Vercel previews every pull request.

## A refactor to try

Pick the messiest component in your project and apply the course to it in order:

1. **Describe** its job in one sentence. If you need "and", split it.
2. **List its state.** Delete anything derived. Move anything server-owned into Query and anything shareable into the URL.
3. **List its effects.** Delete the ones that are really event handlers or data transformations.
4. **Extract** a hook for the logic and a pure function for each calculation; add a test for each.
5. **Type** its props with a union if some combinations are invalid.
6. **Check** accessibility: roles, names, focus.
7. **Measure** before and after. Keep only what helped.

## Where to go next

Choose by what you want to build.

| Goal | Next step |
| --- | --- |
| **Full-stack apps and SEO** | **Next.js** (or **React Router framework mode**, **TanStack Start**): routing, server rendering, data loading and deployment in one. Learn **React Server Components** and Server Actions. |
| **A real backend** | Node.js with a framework (Express/Fastify/Hono), a database (PostgreSQL with Prisma or Drizzle), type-safe APIs (**tRPC** or OpenAPI), authentication (Auth.js/Clerk). Replace the mock API with your own. |
| **Design systems** | Storybook, Radix/React Aria primitives, Tailwind or CSS variables with tokens, visual regression tests. |
| **Quality** | Playwright end-to-end tests, Storybook interaction tests, MSW mocks shared between dev and tests. |
| **Complex UI logic** | State machines with **XState**, forms with **React Hook Form + Zod**, tables with **TanStack Table**, drag and drop with **dnd-kit**, animation with **Motion**. |
| **Mobile** | **React Native** and Expo: the same React model, native components. |
| **Performance deep-dive** | The **React Compiler**, Suspense for data, streaming, web vitals, profiling with the Performance panel. |
| **Fundamentals** | Revisit JavaScript deeply (closures, the event loop, prototypes) and the web platform (HTTP, caching, CSS layout). They outlast every framework. |

### A 30-60-90 day plan

- **Next 30 days:** finish and polish Nimbus CRM; add one feature that scares you (a drag-and-drop board, real-time updates, CSV import). Write a README with screenshots and deploy it.
- **Days 31 to 60:** build a second, different app **from scratch without the course**: a habit tracker, a notes app, a small shop. Use Next.js or React Router framework mode this time, and a real database.
- **Days 61 to 90:** read other people's code (the source of a library you use, such as Zustand: it is small), contribute a documentation fix or a small bug fix to an open-source project, and write up something you learned.

## Habits that keep you improving

- **Read the docs** ([react.dev](https://react.dev) is excellent) before tutorials; reread "You Might Not Need an Effect" every few months.
- **Read errors completely**, then read the code the stack trace points at.
- **Build small things weekly.** Skill comes from repetition.
- **Explain it to someone** (or write it down). If you can teach it you understand it.
- **Keep the feedback loop short:** type-check, tests and preview on every change.
- **Stay curious but selective.** The ecosystem moves quickly; the fundamentals you learned here barely move at all.

## Today's practice

The exercises today are a capstone built from earlier days:

1. **Validate an API response** at the boundary (Days 14 and 22).
2. **Build an API client** with auth, query strings and typed errors (Days 14, 16, 20).
3. **Write the reducer for an optimistic list** (Days 13 and 16).
4. **The capstone challenge:** a complete contacts mini-app (loading, error, search, optimistic add with failure handling, optimistic remove with rollback) wired to a fake API, using everything above.

## CRM step: finish and ship

1. Work through the review checklist above and fix at least five items.
2. Write the README (what it is, features, tech, how to run, how to test, architecture notes, a screenshot or two, the live URL).
3. Make sure the deployed app works end to end: sign in, browse, search, create, edit, delete, go offline, reload.
4. Tag a release (`v1.0.0`) and share the link with someone, and ask them to try to break it.
5. Write down three things you would do differently next time. That list is the start of your next project.

- [ ] Review checklist completed (at least five fixes made)
- [ ] README written, repository public, app live on Vercel
- [ ] You can explain, without notes, the difference between server state, URL state and UI state
- [ ] You know what you are building next
