# practice: Catch the bugs in slugify

### meta
minutes: 8
language: ts

### prompt
`slugify(text)` turns a title into a URL slug: `'Hello World'` becomes `'hello-world'`. Several buggy versions exist.

Write and export `checkSlugify(slugify)`. It receives the implementation to test and must use `expect(...)` assertions so that:

- it **passes** (does not throw) for the correct implementation, and
- it **throws** for each buggy implementation.

Think about the ways an implementation could be wrong, and write one assertion aimed at each. The platform runs your checks against the real one and four buggy ones.

### starter
```ts
export function checkSlugify(slugify: (text: string) => string): void {
  // Write expect(...) assertions here.
  // Example: expect(slugify('Hello World')).toBe('hello-world');
}
```

### solution
```ts
export function checkSlugify(slugify: (text: string) => string): void {
  // Lower-cases and joins words with a hyphen.
  expect(slugify('Hello World')).toBe('hello-world');
  // Trims leading/trailing separators.
  expect(slugify('  Hi!  ')).toBe('hi');
  // Collapses runs of separators into one hyphen.
  expect(slugify('a   b')).toBe('a-b');
  // Removes punctuation.
  expect(slugify('Hello, World!')).toBe('hello-world');
}
```

### tests
```ts
const good = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const bugs = {
  'forgets to lower-case': (s) => s.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  'leaves a leading or trailing hyphen': (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  'does not collapse repeated separators': (s) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, ''),
  'keeps punctuation': (s) => s.trim().toLowerCase().replace(/\s+/g, '-'),
};

test('your checks accept the correct implementation', () => {
  user.checkSlugify(good);
});

for (const [description, impl] of Object.entries(bugs)) {
  test(`your checks catch a bug: ${description}`, () => {
    let caught = false;
    try {
      user.checkSlugify(impl);
    } catch {
      caught = true;
    }
    if (!caught) throw new Error('Your checks did not notice this bug: the implementation ' + description + '.');
  });
}
```

### explanation
Instead of copying the implementation's logic, think about **how it could fail**: forgetting a step, handling edges badly, doing too little or too much. Each of the four assertions targets one such failure with an input that *distinguishes* a right implementation from a wrong one (`'Hello World'` exposes missing lower-casing; `'  Hi!  '` exposes untrimmed hyphens; three spaces expose uncollapsed separators; a comma and exclamation mark expose kept punctuation). A test suite is only as good as the bugs it would catch, which is the idea behind mutation testing.

### hints
- Pick inputs with capital letters, leading/trailing spaces or punctuation, repeated spaces, and punctuation in the middle.
- Each assertion should be a different input aimed at a different kind of mistake.
- `expect(slugify('...')).toBe('...')`

# practice: Test a component like a user

### meta
minutes: 9
language: tsx

### prompt
`Counter` is a component with **+**, **-** and **Reset** buttons and a `<p>Count: N</p>` display. The count starts at `0`, cannot go below `0`, `+` adds one and **Reset** returns to `0`.

Write and export `async function checkCounter(Counter)`. Use `render`, `click` and `expect` (as a user would: find buttons by their accessible name and read the text).

Your checks must pass for the correct `Counter` and fail for each of four buggy versions.

### starter
```tsx
import type { ComponentType } from 'react';

export async function checkCounter(Counter: ComponentType): Promise<void> {
  // const view = await render(<Counter />);
  // await click(view.getByRole('button', { name: '+' }));
  // expect(view.$('p').textContent).toBe('Count: 1');
}
```

### solution
```tsx
import type { ComponentType } from 'react';

export async function checkCounter(Counter: ComponentType): Promise<void> {
  const view = await render(<Counter />);
  const text = () => view.$('p').textContent;
  const plus = () => view.getByRole('button', { name: '+' });
  const minus = () => view.getByRole('button', { name: '-' });
  const reset = () => view.getByRole('button', { name: 'Reset' });

  // starts at zero
  expect(text()).toBe('Count: 0');

  // increments by exactly one
  await click(plus());
  expect(text()).toBe('Count: 1');
  await click(plus());
  expect(text()).toBe('Count: 2');

  // decrements
  await click(minus());
  expect(text()).toBe('Count: 1');

  // reset returns to zero
  await click(reset());
  expect(text()).toBe('Count: 0');

  // never goes below zero
  await click(minus());
  expect(text()).toBe('Count: 0');
}
```

### tests
```tsx
import { useState } from 'react';

const make = ({ start = 0, step = 1, floor = true, resets = true } = {}) =>
  function Counter() {
    const [n, setN] = useState(start);
    return (
      <div>
        <p>Count: {n}</p>
        <button onClick={() => setN(n + step)}>+</button>
        <button onClick={() => setN(floor ? Math.max(0, n - 1) : n - 1)}>-</button>
        <button onClick={() => setN(resets ? 0 : n)}>Reset</button>
      </div>
    );
  };

const good = make();
const bugs = {
  'starts at 1 instead of 0': make({ start: 1 }),
  '+ adds two instead of one': make({ step: 2 }),
  'can go below zero': make({ floor: false }),
  'Reset does nothing': make({ resets: false }),
};

test('your checks accept the correct Counter', async () => {
  await user.checkCounter(good);
});

for (const [description, Counter] of Object.entries(bugs)) {
  test(`your checks catch a bug: ${description}`, async () => {
    let caught = false;
    try {
      await user.checkCounter(Counter);
    } catch {
      caught = true;
    }
    if (!caught) throw new Error('Your checks did not notice this bug: the Counter ' + description + '.');
  });
}
```

### explanation
A good component test behaves like a user: find controls by **role and accessible name** (`getByRole('button', { name: '+' })`), perform actions (`click`), and read what is on screen. Walk through the *whole behaviour* rather than a single click: the starting value, a few increments (two clicks distinguish "adds one" from "adds two" and catch an off-by-one start), decrement, reset, and the boundary (decrementing at zero). Each of the four bugs is caught by a different step. Notice the test never touches component state or internals, so it would survive a rewrite of the component.

### hints
- `const view = await render(<Counter />);` then `view.getByRole('button', { name: '+' })`.
- Click twice before asserting, so an off-by-one or a "+2" bug shows up.
- Test the boundary: press **-** when the count is already `0`.
- Read the display with `view.$('p').textContent`.

# practice: Test code that calls an API

### meta
minutes: 9
language: ts

### prompt
`loadContacts(fetchFn)` fetches `/api/contacts?pageSize=100`, returns the `data` array from the JSON page, and throws `Error('HTTP <status>')` when the response is not `ok`.

Write and export `async function checkLoadContacts(loadContacts)`. Build **fake fetch functions** with `fn()` that return a `Response`. Your checks must pass for the correct implementation and fail for each of four buggy ones.

### starter
```ts
type FetchLike = (url: string) => Promise<Response>;

export async function checkLoadContacts(loadContacts: (fetchFn: FetchLike) => Promise<unknown[]>): Promise<void> {
  // const ok = fn(async () => new Response(JSON.stringify({ data: [{ id: '1' }] })));
  // expect(await loadContacts(ok)).toEqual([{ id: '1' }]);
}
```

### solution
```ts
type FetchLike = (url: string) => Promise<Response>;

export async function checkLoadContacts(loadContacts: (fetchFn: FetchLike) => Promise<unknown[]>): Promise<void> {
  // Success: returns the data array and calls the right endpoint.
  const ok = fn(async () => new Response(JSON.stringify({ data: [{ id: '1' }, { id: '2' }], total: 2 }), { status: 200 }));
  expect(await loadContacts(ok)).toEqual([{ id: '1' }, { id: '2' }]);
  expect(ok).toHaveBeenCalledTimes(1);
  expect(String(ok.calls[0][0])).toContain('/api/contacts');

  // Failure: a non-ok response becomes an error with the status.
  const failing = fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));
  let message = '';
  try {
    await loadContacts(failing);
  } catch (error) {
    message = (error as Error).message;
  }
  expect(message).toBe('HTTP 500');
}
```

### tests
```ts
const good = async (fetchFn) => {
  const res = await fetchFn('/api/contacts?pageSize=100');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const page = await res.json();
  return page.data;
};

const bugs = {
  'calls the wrong URL': async (fetchFn) => {
    const res = await fetchFn('/api/contact?pageSize=100');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return (await res.json()).data;
  },
  'ignores error responses': async (fetchFn) => {
    const res = await fetchFn('/api/contacts?pageSize=100');
    return (await res.json()).data;
  },
  'returns the whole page instead of the data array': async (fetchFn) => {
    const res = await fetchFn('/api/contacts?pageSize=100');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  },
  'reports the wrong message for errors': async (fetchFn) => {
    const res = await fetchFn('/api/contacts?pageSize=100');
    if (!res.ok) throw new Error('Failed');
    return (await res.json()).data;
  },
};

test('your checks accept the correct implementation', async () => {
  await user.checkLoadContacts(good);
});

for (const [description, impl] of Object.entries(bugs)) {
  test(`your checks catch a bug: ${description}`, async () => {
    let caught = false;
    try {
      await user.checkLoadContacts(impl);
    } catch {
      caught = true;
    }
    if (!caught) throw new Error('Your checks did not notice this bug: the implementation ' + description + '.');
  });
}
```

### explanation
Passing the dependency in (`fetchFn`) is what makes this testable without a network: your test supplies a **fake** that returns exactly the response it wants. Two fakes cover two behaviours: a *success* response to check what is returned (and which URL was requested, which `fn()` records in `calls`), and a *failure* response to check the error path. The most common testing mistake here is to test only the happy path; the "ignores error responses" bug survives unless you also drive a `500`. For the error check, catch the exception and assert on its message, rather than letting the test crash.

### hints
- `const ok = fn(async () => new Response(JSON.stringify({ data: [...] }), { status: 200 }));`
- `fn()` records arguments in `.calls`: `ok.calls[0][0]` is the URL it was called with.
- For the failing case use `status: 500`, wrap the call in `try/catch` and compare `error.message`.

# challenge: Test a hook with fake timers

### meta
minutes: 10
language: tsx

### prompt
`useDebounce(value, delayMs)` returns `value`, but only after it has stopped changing for `delayMs`. It returns the initial value straight away, and a newer value **restarts** the wait.

Write and export `async function checkUseDebounce(useDebounce)`. Use `useFakeTimers()` (it returns `{ advance(ms) }`), a small probe component that renders the hook's result, `render`, `view.rerender(...)` and `expect`.

Your checks must pass for the correct hook and fail for each of four buggy ones.

### starter
```tsx
export async function checkUseDebounce(useDebounce: <T>(value: T, delayMs: number) => T): Promise<void> {
  // const timers = useFakeTimers();
  // function Probe({ value }: { value: string }) { return <p>{useDebounce(value, 300)}</p>; }
  // const view = await render(<Probe value="a" />);
  // ...
}
```

### solution
```tsx
export async function checkUseDebounce(useDebounce: <T>(value: T, delayMs: number) => T): Promise<void> {
  const timers = useFakeTimers();

  function Probe({ value }: { value: string }) {
    return <p>{useDebounce(value, 300)}</p>;
  }
  const view = await render(<Probe value="a" />);
  const shown = () => view.$('p').textContent;

  // The initial value is available immediately.
  expect(shown()).toBe('a');

  // A change is not applied until the delay has fully passed.
  await view.rerender(<Probe value="ab" />);
  expect(shown()).toBe('a');
  await timers.advance(299);
  expect(shown()).toBe('a');
  await timers.advance(1);
  expect(shown()).toBe('ab');

  // A newer change restarts the wait: the intermediate value never appears.
  await view.rerender(<Probe value="abc" />);
  await timers.advance(200);
  await view.rerender(<Probe value="abcd" />);
  await timers.advance(200);
  expect(shown()).toBe('ab');
  await timers.advance(100);
  expect(shown()).toBe('abcd');
}
```

### tests
```tsx
import { useEffect, useState } from 'react';

const build = ({ delayFactor = 1, cancel = true, update = true, immediate = false } = {}) =>
  function useDebounce(value, delayMs) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      if (immediate) return;
      const id = setTimeout(() => update && setDebounced(value), delayMs * delayFactor);
      return cancel ? () => clearTimeout(id) : undefined;
    }, [value, delayMs]);
    return immediate ? value : debounced;
  };

const good = build();
const bugs = {
  'returns every change immediately (no debounce)': build({ immediate: true }),
  'waits only half the delay': build({ delayFactor: 0.5 }),
  'does not cancel the previous timer': build({ cancel: false }),
  'never updates': build({ update: false }),
};

test('your checks accept the correct hook', async () => {
  await user.checkUseDebounce(good);
});

for (const [description, hook] of Object.entries(bugs)) {
  test(`your checks catch a bug: ${description}`, async () => {
    let caught = false;
    try {
      await user.checkUseDebounce(hook);
    } catch {
      caught = true;
    }
    if (!caught) throw new Error('Your checks did not notice this bug: the hook ' + description + '.');
  });
}
```

### explanation
Testing time-dependent code with real `setTimeout` is slow and flaky, so tests use **fake timers**: `timers.advance(299)` moves the clock to *just before* the deadline, and `advance(1)` crosses it, which pins the delay exactly (catching "half the delay" and "returns immediately"). The second scenario is the subtle one: after a change settles you make two changes 200 ms apart. A correct hook restarts its timer on the second, so the first intermediate value (`'abc'`) never appears. A hook that does **not** cancel the previous timer lets `'abc'` leak through at 300 ms, and only a check that looks at the displayed value *between* the two deadlines can see it. A hook is exercised by rendering a tiny probe component that displays its result, the same idea as `renderHook`.

### hints
- Call `useFakeTimers()` first; define a small `Probe` component that displays `useDebounce(value, 300)`.
- `await view.rerender(<Probe value="ab" />)` to change the input, then `await timers.advance(...)`.
- Check at `299` (still old) and then `1` more (new) to pin the delay.
- For the "restart" bug, change the value twice with less than the delay between, and assert the middle value never showed.
