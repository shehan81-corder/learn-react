## Tests are how you change code without fear

By now your CRM has dozens of components, hooks and helpers. Without tests, every change is a gamble: fix the contacts table and quietly break the deal board. **Tests are a safety net that lets you refactor, upgrade libraries and add features confidently.** They are also executable documentation of what the code is supposed to do.

> **The thinking pattern:** *test behaviour, not implementation.* Ask "what would a user (or a caller) see and do?" and assert that. If a test breaks when you rename an internal variable or restructure components without changing behaviour, it is testing the wrong thing. Good tests survive refactors and fail only when something users care about breaks.

## What to test, and how much

The "testing trophy" for front-end apps, from cheapest to most expensive:

| Level | What | Tool | Notes |
| --- | --- | --- | --- |
| Static | typos, type errors, lint | TypeScript, ESLint | free, always on |
| **Unit** | pure functions, reducers, validators | Vitest | fast, precise; you have written dozens |
| **Integration / component** | a component with its children and (fake) network | Vitest + Testing Library | **the best value for React**: most of your tests |
| End-to-end | the deployed app in a real browser | Playwright / Cypress | few, for critical journeys (login, create contact) |

Focus component tests on **what users do**: type, click, read text. Don't aim for 100% coverage; aim for confidence in the paths that matter. Coverage numbers tell you what is *not* tested, not what is tested *well*.

## Setup with Vitest

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';    // adds matchers like toBeInTheDocument()
```

Vitest is built on Vite, so it understands your TypeScript, JSX, path aliases and CSS with no extra config, and its API mirrors Jest: `describe`, `it`/`test`, `expect`, `vi.fn()`.

## Unit tests

```ts
import { describe, it, expect } from 'vitest';
import { validateContact } from './validation';

describe('validateContact', () => {
  it('accepts a complete contact', () => {
    expect(validateContact({ firstName: 'Ava', lastName: 'Nguyen', email: 'ava@example.com', phone: '' })).toEqual({});
  });

  it('requires an email', () => {
    expect(validateContact({ firstName: 'A', lastName: 'B', email: '', phone: '' }).email).toBe('Email is required');
  });
});
```

Structure each test as **Arrange, Act, Assert**: set up, do the thing, check the result. One *behaviour* per test, with a name that reads like a sentence.

## Component tests with Testing Library

Testing Library gives you queries that mirror how users find things, **by accessible role and text**, not by CSS class or component name:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('adds a contact', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<AddContactForm onAdd={onAdd} />);

  await user.type(screen.getByRole('textbox', { name: /first name/i }), 'Ava');
  await user.type(screen.getByRole('textbox', { name: /email/i }), 'ava@example.com');
  await user.click(screen.getByRole('button', { name: /add contact/i }));

  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Ava' }));
});
```

**Query priority** (from the Testing Library docs), most to least preferred:

1. `getByRole` (with `name`): how assistive technology sees the page. Using it also *forces* you to build accessible UI (Day 28).
2. `getByLabelText`: form fields.
3. `getByText`, `getByPlaceholderText`
4. `getByTestId`: last resort, when nothing user-visible identifies the element.

Variants: `getBy…` (throws if missing), `queryBy…` (returns `null`, for asserting absence), `findBy…` (async: waits for it to appear).

## Async code

Anything that updates after a promise needs waiting:

```tsx
expect(await screen.findByText('Ava Nguyen')).toBeInTheDocument();      // waits up to 1s
await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
```

Don't `sleep(500)` in tests; wait for the **thing you expect**. Fixed sleeps make tests slow and flaky.

## Mocking the network

Test your real fetching code against a **fake server** rather than mocking `fetch` function by function. **MSW** (Mock Service Worker) intercepts requests at the network level:

```ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/contacts', () => HttpResponse.json({ data: [{ id: '1', firstName: 'Ava' }], total: 1 })),
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('shows an error when the API fails', async () => {
  server.use(http.get('/api/contacts', () => new HttpResponse(null, { status: 500 })));
  render(<ContactsPage />, { wrapper: Providers });
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
});
```

With TanStack Query, create a **fresh `QueryClient` per test** with `retry: false`, and wrap components in your providers through a custom `render` helper. For quick, focused tests of a function that takes a dependency (as in this course's exercises), pass a fake: `vi.fn()`.

## Testing hooks

A hook needs a component to run in. `renderHook` provides a throw-away one:

```tsx
import { renderHook, act } from '@testing-library/react';

it('debounces', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } });
  rerender({ v: 'ab' });
  expect(result.current).toBe('a');
  act(() => vi.advanceTimersByTime(300));
  expect(result.current).toBe('ab');
});
```

## Mocks, spies and fake timers

- `vi.fn()`: a function that records calls (like the `fn()` in this course's sandbox).
- `vi.spyOn(obj, 'method')`: watch a real method and optionally replace it.
- `vi.useFakeTimers()`: control `setTimeout`/`Date`.
- Mock **at the boundary** (network, storage, time), not your own components. Over-mocking produces tests that pass while the real thing is broken.

## Smells to avoid

- **Snapshot tests of big trees:** they fail on every harmless change and people blindly update them. Use small, intentional assertions instead.
- **Testing implementation details:** reading `component.state`, checking which hook was called, selecting by class names.
- **Order-dependent tests:** each test must set up its own world and clean up after itself.
- **Flaky tests:** real timers, real network, shared state. A flaky test is worse than none because people stop trusting the suite.
- **Asserting too much** in one test: when it fails you cannot tell why.

## Test-driven development, briefly

Write a failing test that describes the next behaviour, make it pass with the simplest code, then refactor. You do not need to be dogmatic, but writing the test *first* for bugs ("reproduce, then fix") is a superb habit: the test proves the bug existed and that it can never return.

## How to practise testing in this sandbox

You cannot install Vitest in the browser sandbox, so today's exercises teach the same skill from the other side: **you write the tests, and the platform checks how good they are.** Each exercise gives you a function (or component or hook) under test. The platform runs your checks against the **correct implementation** (they must pass) and against several **deliberately buggy versions** (your checks must *fail* for each of them). This is called *mutation testing*, and it measures what coverage cannot: whether your tests would actually notice a bug.

The sandbox provides the globals `expect`, `fn()`, `render`, `click`, `type` and `useFakeTimers()`, which behave like their Vitest and Testing Library counterparts.

## Walkthrough: test a validator by thinking like a bug

Take `slugify('Hello World') → 'hello-world'`. List the ways an implementation could be wrong, and write one assertion that would catch each:

1. Forgets to lower-case → assert on an input with capitals.
2. Leaves a leading/trailing hyphen → assert on input with surrounding punctuation or spaces.
3. Doesn't collapse repeated separators → assert on input with several spaces.
4. Keeps punctuation → assert on input with punctuation.

Four assertions, each aimed at a real mistake. That "what could go wrong?" mindset is the core skill; it produces better tests than copying the implementation's logic.

## CRM step: your first test suite

1. Install Vitest, jsdom and Testing Library; add the `test` config and the `setup.ts` file; add an npm script `"test": "vitest"`.
2. Write unit tests for `validateContact`, `sortBy`, `paginate` and your reducer (aim for the edge cases: empty, one item, duplicates, bad input).
3. Write a component test for `ContactForm`: fill it in, submit, assert `onSubmit` was called with the right data; also the validation messages.
4. Test a query-driven component with MSW: the success list, the empty state, a `500` error with a Retry button.
5. Add a custom `renderWithProviders` helper (router, `QueryClientProvider` with `retry: false`).
6. Run `npm test -- --coverage` and look at the *uncovered* lines in the files that matter most.

- [ ] `npm test` runs a green suite
- [ ] Tests query by role and text, not class names
- [ ] The network is faked with MSW; no real requests in tests
- [ ] At least one test per bug you fixed so far ("reproduce, then fix")
