# practice: useToggle with stable callbacks

### meta
minutes: 6
language: tsx

### prompt
Write `useToggle(initial = false)` returning a tuple `[value, toggle, setValue]`.

- `toggle()` flips the value.
- `setValue` is the plain state setter (so `setValue(true)` works).
- `toggle` must have a **stable identity**: the same function on every render, so it is safe to use as an effect dependency.

### starter
```tsx
import { useCallback, useState } from 'react';

export function useToggle(initial = false) {
  // TODO
  return [initial, () => {}, (_: boolean) => {}] as const;
}

export function Switch() {
  const [on, toggle] = useToggle();
  return <button onClick={toggle}>{on ? 'On' : 'Off'}</button>;
}

export default Switch;
```

### solution
```tsx
import { useCallback, useState } from 'react';

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue] as const;
}

export function Switch() {
  const [on, toggle] = useToggle();
  return <button onClick={toggle}>{on ? 'On' : 'Off'}</button>;
}

export default Switch;
```

### tests
```tsx
test('starts off by default and toggles', async () => {
  const view = await render(<user.Switch />);
  const b = view.$('button');
  expect(b.textContent).toBe('Off');
  await click(b);
  expect(b.textContent).toBe('On');
  await click(b);
  expect(b.textContent).toBe('Off');
});

test('accepts an initial value and exposes a setter', async () => {
  let api;
  function Probe() {
    api = user.useToggle(true);
    return <p>{String(api[0])}</p>;
  }
  const view = await render(<Probe />);
  expect(view.$('p').textContent).toBe('true');
  api[2](false);
  await flush();
  expect(view.$('p').textContent).toBe('false');
  api[1]();
  await flush();
  expect(view.$('p').textContent).toBe('true');
});

test('toggle keeps the same identity across renders', async () => {
  const seen = [];
  function Probe() {
    const [v, toggle] = user.useToggle();
    seen.push(toggle);
    return <button onClick={toggle}>{String(v)}</button>;
  }
  const view = await render(<Probe />);
  await click(view.$('button'));
  await click(view.$('button'));
  expect(seen.length).toBeGreaterThanOrEqual(3);
  expect(seen.every((f) => f === seen[0])).toBe(true);
});

test('each hook call has its own state', async () => {
  const view = await render(
    <div>
      <user.Switch />
      <user.Switch />
    </div>,
  );
  const [a, b] = view.$$('button');
  await click(a);
  expect(a.textContent).toBe('On');
  expect(b.textContent).toBe('Off');
});

test('returns a tuple', async () => {
  let api;
  function Probe() {
    api = user.useToggle();
    return null;
  }
  await render(<Probe />);
  expect(Array.isArray(api)).toBe(true);
  expect(api).toHaveLength(3);
});
```

### typetests
```tsx
function Check() {
  const [on, toggle, setOn] = useToggle();
  const b: boolean = on;
  toggle();
  setOn(true);
  // @ts-expect-error the setter takes a boolean
  setOn('yes');
  return null;
}
```

### explanation
`useCallback(fn, [])` returns the same function every render, which is possible here because `toggle` uses the *functional* form of `setValue` and therefore does not close over `value`. Stable identity matters when the function goes into a dependency array or to a memoised child: otherwise they would update on every render. `as const` makes TypeScript treat the return value as a fixed-length tuple, so `const [on, toggle] = useToggle()` is typed correctly. Calling the hook twice shows that hooks share logic, not state.

### hints
- `const [value, setValue] = useState(initial);`
- `useCallback(() => setValue((v) => !v), [])`
- End with `as const` so the return type is a tuple.

# practice: usePrevious

### meta
minutes: 6
language: tsx

### prompt
Write `usePrevious(value)`, which returns the value from the **previous render** (`undefined` on the first render). It must not cause extra renders.

Then complete `PriceTag({ price })` showing `<p>Price: <price></p>` and, once the price has changed, `<small>was <previous></small>` (only when the previous value exists and differs).

### starter
```tsx
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  // TODO: a ref updated after render
  return undefined;
}

export function PriceTag({ price }: { price: number }) {
  const previous = usePrevious(price);
  // TODO
  return <p>Price: {price}</p>;
}

export default function App() {
  return <PriceTag price={10} />;
}
```

### solution
```tsx
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function PriceTag({ price }: { price: number }) {
  const previous = usePrevious(price);
  return (
    <div>
      <p>Price: {price}</p>
      {previous !== undefined && previous !== price && <small>was {previous}</small>}
    </div>
  );
}

export default function App() {
  return <PriceTag price={10} />;
}
```

### tests
```tsx
test('returns undefined on the first render', async () => {
  const seen = [];
  function Probe({ v }) {
    seen.push(user.usePrevious(v));
    return null;
  }
  await render(<Probe v={1} />);
  expect(seen[0]).toBeUndefined();
});

test('returns the value from the previous render', async () => {
  const seen = [];
  function Probe({ v }) {
    seen.push(user.usePrevious(v));
    return <p>{v}</p>;
  }
  const view = await render(<Probe v={1} />);
  await view.rerender(<Probe v={2} />);
  await view.rerender(<Probe v={3} />);
  expect(seen.slice(0, 3)).toEqual([undefined, 1, 2]);
});

test('does not cause extra renders by itself', async () => {
  let renders = 0;
  function Probe({ v }) {
    renders++;
    user.usePrevious(v);
    return null;
  }
  const view = await render(<Probe v={1} />);
  await view.rerender(<Probe v={2} />);
  expect(renders).toBe(2);
});

test('PriceTag shows the old price only after a change', async () => {
  const view = await render(<user.PriceTag price={10} />);
  expect(view.$('p').textContent).toBe('Price: 10');
  expect(view.$('small')).toBeNull();
  await view.rerender(<user.PriceTag price={12} />);
  expect(view.$('p').textContent).toBe('Price: 12');
  expect(view.$('small').textContent).toBe('was 10');
});

test('PriceTag hides the old price when it did not change', async () => {
  const view = await render(<user.PriceTag price={10} />);
  await view.rerender(<user.PriceTag price={10} />);
  expect(view.$('small')).toBeNull();
});
```

### typetests
```tsx
function Check() {
  const p: number | undefined = usePrevious(1);
  const s: string | undefined = usePrevious('a');
  // @ts-expect-error previous of a number is not a string
  const bad: string | undefined = usePrevious(1);
  return null;
}
```

### explanation
Refs hold values that should persist between renders *without* triggering one. The trick is timing: the effect that writes `ref.current = value` runs **after** the render, so during the render that reads `ref.current` it still contains what the *previous* render stored. Updating a ref does not re-render, so the hook adds no cost. This is a good example of the "latest ref" family of patterns.

### hints
- `const ref = useRef<T | undefined>(undefined);`
- Update it in an effect with **no dependency array**: `useEffect(() => { ref.current = value; });`
- Return `ref.current` from the render body.

# practice: useMediaQuery

### meta
minutes: 8
language: tsx

### prompt
Write `useMediaQuery(query, matchMedia)`. `matchMedia(query)` returns a `MediaQueryList`-like object: `{ matches: boolean, addEventListener(type, handler), removeEventListener(type, handler) }` (in the browser you pass `window.matchMedia`).

- Returns the current `matches` value.
- Updates when the list fires a `'change'` event.
- Removes its listener on unmount and when `query` changes.

Then complete `Responsive({ matchMedia })` which renders `<p>Mobile layout</p>` when `(max-width: 600px)` matches and `<p>Desktop layout</p>` otherwise.

### starter
```tsx
import { useEffect, useState } from 'react';

export interface MediaQueryListLike {
  matches: boolean;
  addEventListener(type: 'change', handler: () => void): void;
  removeEventListener(type: 'change', handler: () => void): void;
}
export type MatchMedia = (query: string) => MediaQueryListLike;

export function useMediaQuery(query: string, matchMedia: MatchMedia): boolean {
  // TODO
  return false;
}

export function Responsive({ matchMedia }: { matchMedia: MatchMedia }) {
  // TODO
  return <p>Desktop layout</p>;
}

export default function App() {
  return <Responsive matchMedia={window.matchMedia.bind(window)} />;
}
```

### solution
```tsx
import { useEffect, useState } from 'react';

export interface MediaQueryListLike {
  matches: boolean;
  addEventListener(type: 'change', handler: () => void): void;
  removeEventListener(type: 'change', handler: () => void): void;
}
export type MatchMedia = (query: string) => MediaQueryListLike;

export function useMediaQuery(query: string, matchMedia: MatchMedia): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);

  useEffect(() => {
    const list = matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    onChange();
    return () => list.removeEventListener('change', onChange);
  }, [query, matchMedia]);

  return matches;
}

export function Responsive({ matchMedia }: { matchMedia: MatchMedia }) {
  const isMobile = useMediaQuery('(max-width: 600px)', matchMedia);
  return <p>{isMobile ? 'Mobile layout' : 'Desktop layout'}</p>;
}

export default function App() {
  return <Responsive matchMedia={window.matchMedia.bind(window)} />;
}
```

### tests
```tsx
// A fake MediaQueryList we can control.
const makeMatchMedia = (initial) => {
  const lists = [];
  const matchMedia = fn((query) => {
    const handlers = new Set();
    const list = {
      query,
      matches: initial[query] ?? false,
      handlers,
      addEventListener: (type, h) => type === 'change' && handlers.add(h),
      removeEventListener: (type, h) => type === 'change' && handlers.delete(h),
      set(value) {
        list.matches = value;
        handlers.forEach((h) => h());
      },
    };
    lists.push(list);
    return list;
  });
  return { matchMedia, lists };
};
const live = (lists) => lists.filter((l) => l.handlers.size > 0);

test('returns the current match', async () => {
  const { matchMedia } = makeMatchMedia({ '(max-width: 600px)': true });
  const view = await render(<user.Responsive matchMedia={matchMedia} />);
  expect(view.$('p').textContent).toBe('Mobile layout');
});

test('returns false when the query does not match', async () => {
  const { matchMedia } = makeMatchMedia({});
  const view = await render(<user.Responsive matchMedia={matchMedia} />);
  expect(view.$('p').textContent).toBe('Desktop layout');
});

test('updates when the media query changes', async () => {
  const { matchMedia, lists } = makeMatchMedia({});
  const view = await render(<user.Responsive matchMedia={matchMedia} />);
  live(lists)[0].set(true);
  await flush();
  expect(view.$('p').textContent).toBe('Mobile layout');
  live(lists)[0].set(false);
  await flush();
  expect(view.$('p').textContent).toBe('Desktop layout');
});

test('removes its listener on unmount', async () => {
  const { matchMedia, lists } = makeMatchMedia({});
  const view = await render(<user.Responsive matchMedia={matchMedia} />);
  expect(live(lists)).toHaveLength(1);
  view.unmount();
  await flush();
  expect(live(lists)).toHaveLength(0);
});

test('re-subscribes when the query changes and cleans up the old one', async () => {
  const { matchMedia, lists } = makeMatchMedia({ '(min-width: 1000px)': true });
  function Probe({ q }) {
    return <p>{String(user.useMediaQuery(q, matchMedia))}</p>;
  }
  const view = await render(<Probe q="(max-width: 600px)" />);
  expect(view.$('p').textContent).toBe('false');
  await view.rerender(<Probe q="(min-width: 1000px)" />);
  expect(view.$('p').textContent).toBe('true');
  expect(live(lists)).toHaveLength(1);
  expect(live(lists)[0].query).toBe('(min-width: 1000px)');
});
```

### typetests
```tsx
const mm: MatchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
const el = <Responsive matchMedia={mm} />;
// @ts-expect-error matchMedia must return a MediaQueryListLike
const bad = <Responsive matchMedia={() => 5} />;
```

### explanation
A subscription belongs in an effect and must be undone in its cleanup, which is what keeps this hook from leaking listeners. The state is initialised lazily from the current match so the first render is already correct, and the effect also calls `onChange()` once to catch any change that happened between render and subscription. Passing `matchMedia` in as a parameter is dependency injection: production code passes `window.matchMedia`, tests pass a controllable fake, which is how you test code that depends on the browser environment.

### hints
- `useState(() => matchMedia(query).matches)` for the first render.
- In the effect: create the list, `addEventListener('change', ...)`, and return a cleanup that removes it.
- Dependencies: `[query, matchMedia]`.

# challenge: Compose hooks into a search

### meta
minutes: 10
language: tsx

### prompt
Build `useSearch(query, search, delayMs = 300)` by composing hooks. `search(term, signal)` returns a promise of a string array.

It returns one of:

```ts
{ status: 'idle' } | { status: 'loading' } | { status: 'success'; results: string[] } | { status: 'error'; message: string }
```

- Blank queries (after trimming) are `idle` and **never call** `search`.
- Otherwise wait until the query has stopped changing for `delayMs` (debounce), then go to `loading` and call `search(trimmedTerm, signal)`.
- A new settled query aborts the previous request and ignores its result. Aborts are not errors.
- Return to `idle` when the query is cleared.

Then use it in `SearchBox`: an input (`aria-label="Search"`) plus `<p>Searching…</p>`, a `<ul>` of results, `<p>No results</p>` for an empty array, or `<p role="alert">Search failed: <message></p>`.

### starter
```tsx
import { useEffect, useState } from 'react';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: string[] }
  | { status: 'error'; message: string };

export function useSearch(query: string, search: (term: string, signal: AbortSignal) => Promise<string[]>, delayMs = 300): SearchState {
  // TODO: debounce the query, then fetch
  return { status: 'idle' };
}

export function SearchBox({ search }: { search: (term: string, signal: AbortSignal) => Promise<string[]> }) {
  const [query, setQuery] = useState('');
  const state = useSearch(query, search);
  // TODO
  return <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />;
}

export default SearchBox;
```

### solution
```tsx
import { useEffect, useState } from 'react';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: string[] }
  | { status: 'error'; message: string };

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useSearch(query: string, search: (term: string, signal: AbortSignal) => Promise<string[]>, delayMs = 300): SearchState {
  const term = useDebouncedValue(query.trim(), delayMs);
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  useEffect(() => {
    if (!term) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    search(term, controller.signal).then(
      (results) => {
        if (!controller.signal.aborted) setState({ status: 'success', results });
      },
      (err: unknown) => {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => controller.abort();
  }, [term, search]);

  // While the user is still typing, a cleared box should go idle immediately.
  if (!query.trim()) return { status: 'idle' };
  return state;
}

export function SearchBox({ search }: { search: (term: string, signal: AbortSignal) => Promise<string[]> }) {
  const [query, setQuery] = useState('');
  const state = useSearch(query, search);

  return (
    <div>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {state.status === 'loading' && <p>Searching…</p>}
      {state.status === 'error' && <p role="alert">Search failed: {state.message}</p>}
      {state.status === 'success' &&
        (state.results.length === 0 ? (
          <p>No results</p>
        ) : (
          <ul>
            {state.results.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ))}
    </div>
  );
}

export default SearchBox;
```

### tests
```tsx
const controlled = () => {
  const calls = [];
  const search = fn(
    (term, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ term, signal, resolve, reject });
      }),
  );
  return { search, calls };
};
const box = (view) => view.getByRole('textbox', { name: 'Search' });

test('does nothing for a blank query', async () => {
  const timers = useFakeTimers();
  const { search } = controlled();
  const view = await render(<user.SearchBox search={search} />);
  await type(box(view), '   ');
  await timers.advance(1000);
  expect(search).not.toHaveBeenCalled();
  expect(view.$('p')).toBeNull();
});

test('debounces: only the settled term is searched', async () => {
  const timers = useFakeTimers();
  const { search } = controlled();
  const view = await render(<user.SearchBox search={search} />);
  await type(box(view), 'a');
  await timers.advance(100);
  await type(box(view), 'av');
  await timers.advance(100);
  await type(box(view), 'ava');
  await timers.advance(299);
  expect(search).not.toHaveBeenCalled();
  await timers.advance(1);
  expect(search).toHaveBeenCalledTimes(1);
  expect(search.calls[0][0]).toBe('ava');
  expect(view.$('p').textContent).toBe('Searching…');
});

test('shows results, or an empty message', async () => {
  const timers = useFakeTimers();
  const { search, calls } = controlled();
  const view = await render(<user.SearchBox search={search} />);
  await type(box(view), 'ava');
  await timers.advance(300);
  calls[0].resolve(['Ava Nguyen', 'Avery']);
  await flush();
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['Ava Nguyen', 'Avery']);
  await type(box(view), 'zzz');
  await timers.advance(300);
  calls[1].resolve([]);
  await flush();
  expect(view.$('p').textContent).toBe('No results');
});

test('a new term aborts the previous request and ignores its result', async () => {
  const timers = useFakeTimers();
  const { search, calls } = controlled();
  const view = await render(<user.SearchBox search={search} />);
  await type(box(view), 'a');
  await timers.advance(300);
  await type(box(view), 'ab');
  await timers.advance(300);
  expect(calls[0].signal.aborted).toBe(true);
  expect(calls[1].signal.aborted).toBe(false);
  calls[1].resolve(['fresh']);
  await flush();
  calls[0].resolve(['stale']);
  await flush();
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['fresh']);
});

test('reports failures but not aborts', async () => {
  const timers = useFakeTimers();
  const { search, calls } = controlled();
  const view = await render(<user.SearchBox search={search} />);
  await type(box(view), 'a');
  await timers.advance(300);
  calls[0].reject(new Error('HTTP 500'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Search failed: HTTP 500');
  await type(box(view), 'ab');
  await timers.advance(300);
  const abort = new Error('aborted');
  abort.name = 'AbortError';
  await type(box(view), 'abc');
  await timers.advance(300);
  calls[1].reject(abort);
  await flush();
  expect(view.$('[role=alert]')).toBeNull();
});

test('clearing the box goes back to idle', async () => {
  const timers = useFakeTimers();
  const { search, calls } = controlled();
  const view = await render(<user.SearchBox search={search} />);
  await type(box(view), 'ava');
  await timers.advance(300);
  calls[0].resolve(['Ava']);
  await flush();
  expect(view.$$('li')).toHaveLength(1);
  await type(box(view), '');
  await timers.advance(300);
  expect(view.$('ul')).toBeNull();
  expect(view.$('p')).toBeNull();
});

test('the hook exposes the state union', async () => {
  const timers = useFakeTimers();
  const { search, calls } = controlled();
  let state;
  function Probe({ q }) {
    state = user.useSearch(q, search, 50);
    return null;
  }
  const view = await render(<Probe q="" />);
  expect(state).toEqual({ status: 'idle' });
  await view.rerender(<Probe q="x" />);
  await timers.advance(50);
  expect(state).toEqual({ status: 'loading' });
  calls[0].resolve(['r']);
  await flush();
  expect(state).toEqual({ status: 'success', results: ['r'] });
});
```

### typetests
```tsx
function Check() {
  const s = useSearch('a', async () => ['x']);
  if (s.status === 'success') {
    const r: string[] = s.results;
  }
  // @ts-expect-error results only exist on success
  s.results;
  return null;
}
```

### explanation
Each concern is a small, separate hook: a debounce (`useDebouncedValue`, reused from Day 11) and an abortable fetch effect. The composed `useSearch` hides all of that behind one call. Two design details matter: the fetch effect depends on the **debounced** term, so typing does not start requests, and returning `idle` directly when the live query is blank gives instant feedback when the box is cleared (without waiting for the debounce). Every request owns an `AbortController`, so a newer term cancels an older one and the `signal.aborted` checks keep stale results out of state.

### hints
- Debounce `query.trim()` with the hook shown in the lesson.
- An effect on `[term, search]`: if `term` is empty set `idle`; otherwise `loading`, fetch with a new `AbortController`, and abort in the cleanup.
- Ignore results when `controller.signal.aborted`, and do not report `AbortError`.
- For instant clearing, return `{ status: 'idle' }` when `query.trim()` is empty.
