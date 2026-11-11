## A hook is just a function that can use other hooks

You have used `useState`, `useEffect` and `useReducer`. A **custom hook** is a function whose name starts with `use` and that calls other hooks. It lets you extract *stateful logic* (not markup) so components can share it.

Compare the two kinds of reuse:

- A **component** reuses UI: `<Button />`.
- A **custom hook** reuses behaviour: `const [open, toggle] = useToggle()`.

Each call to a hook creates its **own independent state**. Two components that both call `useToggle()` do not share the toggle; they each get a private one. (To *share* state you use context or a store.)

> **The thinking pattern:** when you see the same `useState` + `useEffect` combination twice, or a component's body is mostly plumbing, ask "what is the *name* of this behaviour?" If you can name it (`useDebouncedValue`, `useOnlineStatus`), extract it. The component then reads like a description of intent.

## The rules of hooks (and why)

1. **Call hooks only at the top level** of a component or another hook, never inside conditions, loops or nested functions.
2. **Call hooks only from React functions**: components and custom hooks.

React identifies each hook by **call order** within a component. Conditionally skipping a hook shifts every later hook's position and state gets attached to the wrong variable. The `eslint-plugin-react-hooks` rules enforce this, and Vite's React template installs them. Treat their warnings as errors.

```tsx
function Bad({ show }: { show: boolean }) {
  if (show) {
    const [x, setX] = useState(0);    // Error: hook called conditionally
  }
}
```

## Anatomy of a good hook

```tsx
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);   // stable function identity
  return [value, toggle, setValue] as const;
}
```

Design choices to think about each time:

- **Return shape.** Return a *tuple* (`[value, toggle]`) when callers will rename the pieces (`const [isOpen, toggleOpen] = useToggle()`), and an *object* (`{ data, error, refetch }`) when there are many or optional pieces. Add `as const` to a tuple so TypeScript doesn't widen it to an array.
- **Stable identities.** If your hook returns functions, wrap them in `useCallback` with the right dependencies so consumers can safely put them in dependency arrays or pass them to memoised children.
- **Generics.** A hook that stores any value is `function useThing<T>(initial: T)`, and the types flow to the caller.
- **Inputs as parameters.** Anything the hook depends on (a key, a delay, a `storage`, a `fetcher`) is a parameter. Hooks that reach for globals are hard to test and reuse.
- **Cleanup.** If the hook subscribes to anything, it must unsubscribe.

## A small gallery

```tsx
// Remember the previous value of something
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });     // runs AFTER render, so during render it still holds the old value
  return ref.current;
}

// Subscribe to a browser event
function useEventListener<K extends keyof WindowEventMap>(type: K, handler: (e: WindowEventMap[K]) => void) {
  const saved = useRef(handler);
  useEffect(() => { saved.current = handler; });            // always call the latest handler
  useEffect(() => {
    const listener = (e: WindowEventMap[K]) => saved.current(e);
    window.addEventListener(type, listener);
    return () => window.removeEventListener(type, listener);
  }, [type]);
}

// Track a media query
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    onChange();                                   // in case it changed between render and effect
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
```

Two patterns hide in there. The **latest ref** (`saved`) lets a long-lived subscription call the newest callback without re-subscribing. And `usePrevious` shows that refs are for values that should survive renders *without causing* a render.

## Composing hooks

Hooks build on hooks. A debounced search is three small, separately testable ideas combined:

```tsx
function useContactSearch(query: string) {
  const debounced = useDebouncedValue(query, 300);
  const state = useFetch(
    (signal) => (debounced ? searchContacts(debounced, signal) : Promise.resolve([])),
    [debounced],
  );
  return { debounced, ...state };
}
```

The component stays tiny: `const { status, data } = useContactSearch(query)`.

## Testing hooks

A hook can only run inside a component. Tests render a tiny **probe component** that calls the hook and exposes the result. (Libraries wrap this as `renderHook`; the exercises on this platform do it by hand so you see how it works.) Pure logic inside a hook is even better extracted into plain functions, which need no React at all.

## When *not* to extract

Don't write a hook for something used once, or one that merely wraps a single `useState`. A premature abstraction costs more than a little duplication. The rule of three is a fair guide: extract on the third use, or sooner if the logic is intricate enough to deserve a name and a test.

## Walkthrough: `useLocalStorage`

Requirements from three components: *remember the sidebar state, the table page size and the draft note*. All three do "state, but persisted".

1. **Name it:** `useLocalStorage<T>(key, initial)`.
2. **API:** returns `[value, setValue]` exactly like `useState`, including functional updates.
3. **Hidden complexity:** read with a lazy initialiser; parse safely; write in an effect; handle `QuotaExceededError`; optionally sync across tabs with the `storage` event.
4. **Design inputs:** accept `storage` so tests can inject a fake.
5. **Replace three duplicated blocks** with one line each.

You wrote the core of this on Day 8; today you will upgrade it to support functional updates and removal.

## CRM step: a hooks library

Create `src/hooks/` and build the hooks your CRM will keep using:

1. `useToggle`, `useDebouncedValue`, `usePrevious`, `useMediaQuery`.
2. `useLocalStorage<T>(key, initial)` with lazy init, functional updates and JSON error handling.
3. `useFetch` from Day 14 (with `AbortController`), refactored to return `{ status, data, error, refetch }`.
4. Use them: persist the table's `pageSize` and the sidebar collapsed state with `useLocalStorage`; collapse the sidebar automatically on narrow screens with `useMediaQuery('(max-width: 800px)')`.
5. Add a short comment above each hook describing its contract (inputs, returned shape, cleanup).

- [ ] Five or more hooks in `src/hooks/`, each in its own file
- [ ] Hooks return stable function identities where they return functions
- [ ] `useLocalStorage` survives corrupt JSON
- [ ] The sidebar state persists and responds to screen width
