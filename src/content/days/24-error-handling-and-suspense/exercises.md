# practice: An error boundary

### meta
minutes: 9
language: tsx

### prompt
Write the class component `ErrorBoundary`.

Props:

- `fallback`: either a `ReactNode`, or a function `(error, reset) => ReactNode`.
- `onError?(error, info)`: called once per caught error (use `componentDidCatch`).
- `children`.

Behaviour:

- Renders `children` normally.
- When a descendant throws while rendering, renders the fallback instead (calling it with the error and a `reset` function if it is a function).
- Calling `reset()` clears the error and tries rendering the children again.
- Components **outside** the boundary are not affected.

### starter
```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  children?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null };

  // TODO: getDerivedStateFromError, componentDidCatch, reset, render
  render() {
    return this.props.children;
  }
}

function Bomb(): never {
  throw new Error('Boom');
}

export default function App() {
  return (
    <div>
      <p>Outside the boundary</p>
      <ErrorBoundary fallback={<p>Something went wrong</p>}>
        <Bomb />
      </ErrorBoundary>
    </div>
  );
}
```

### solution
```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  children?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function' ? fallback(error, this.reset) : fallback;
  }
}

function Bomb(): never {
  throw new Error('Boom');
}

export default function App() {
  return (
    <div>
      <p>Outside the boundary</p>
      <ErrorBoundary fallback={<p>Something went wrong</p>}>
        <Bomb />
      </ErrorBoundary>
    </div>
  );
}
```

### tests
```tsx
const quiet = (fnToRun) => async () => {
  // React logs caught errors with console.error; keep the output tidy for these tests.
  const original = console.error;
  console.error = () => {};
  try {
    await fnToRun();
  } finally {
    console.error = original;
  }
};

function Bomb({ explode }) {
  if (explode.current) throw new Error('Boom');
  return <p>All good</p>;
}

test('renders children when nothing throws', quiet(async () => {
  const view = await render(
    <user.ErrorBoundary fallback={<p>Fallback</p>}>
      <p>Child</p>
    </user.ErrorBoundary>,
  );
  expect(view.$('p').textContent).toBe('Child');
}));

test('shows the fallback when a child throws while rendering', quiet(async () => {
  const explode = { current: true };
  const view = await render(
    <user.ErrorBoundary fallback={<p>Fallback</p>}>
      <Bomb explode={explode} />
    </user.ErrorBoundary>,
  );
  expect(view.$('p').textContent).toBe('Fallback');
}));

test('does not affect siblings outside the boundary', quiet(async () => {
  const explode = { current: true };
  const view = await render(
    <div>
      <p>Outside</p>
      <user.ErrorBoundary fallback={<p>Fallback</p>}>
        <Bomb explode={explode} />
      </user.ErrorBoundary>
    </div>,
  );
  expect(view.$$('p').map((p) => p.textContent)).toEqual(['Outside', 'Fallback']);
}));

test('onError receives the error once', quiet(async () => {
  const onError = fn();
  const explode = { current: true };
  await render(
    <user.ErrorBoundary fallback={<p>x</p>} onError={onError}>
      <Bomb explode={explode} />
    </user.ErrorBoundary>,
  );
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.calls[0][0].message).toBe('Boom');
  expect(typeof onError.calls[0][1].componentStack).toBe('string');
}));

test('a function fallback receives the error and a working reset', quiet(async () => {
  const explode = { current: true };
  const view = await render(
    <user.ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <p>Failed: {error.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    >
      <Bomb explode={explode} />
    </user.ErrorBoundary>,
  );
  expect(view.$('p').textContent).toBe('Failed: Boom');
  explode.current = false;
  await click(view.getByRole('button', { name: 'Try again' }));
  expect(view.$('p').textContent).toBe('All good');
}));

test('reset that still throws shows the fallback again', quiet(async () => {
  const explode = { current: true };
  const view = await render(
    <user.ErrorBoundary fallback={(error, reset) => <button onClick={reset}>Retry</button>}>
      <Bomb explode={explode} />
    </user.ErrorBoundary>,
  );
  await click(view.getByRole('button', { name: 'Retry' }));
  expect(view.getByRole('button', { name: 'Retry' })).toBeTruthy();
}));
```

### typetests
```tsx
const a = <ErrorBoundary fallback={<p>x</p>}><div /></ErrorBoundary>;
const b = <ErrorBoundary fallback={(e, reset) => <button onClick={reset}>{e.message}</button>}><div /></ErrorBoundary>;
// @ts-expect-error fallback is required
const c = <ErrorBoundary><div /></ErrorBoundary>;
```

### explanation
An error boundary is a **class** with two special lifecycle methods. `getDerivedStateFromError` is called during rendering when a descendant throws; it is pure and returns the new state, so the next render shows the fallback. `componentDidCatch` runs afterwards, in the commit phase, which is the right place for side effects such as logging. `reset` clears the stored error so React tries the children again; supporting a *function* fallback lets the caller build a **Try again** button without the boundary knowing anything about the UI. Boundaries only catch errors from *rendering* below them, which is why `<p>Outside</p>` is untouched.

### hints
- `static getDerivedStateFromError(error) { return { error }; }`
- `componentDidCatch(error, info) { this.props.onError?.(error, info); }`
- `reset = () => this.setState({ error: null });`
- In `render`: no error means children; otherwise call the fallback if it is a function.

# practice: Lazy loading with Suspense

### meta
minutes: 7
language: tsx

### prompt
Build `LazyWidget({ loader })`, where `loader()` returns a promise of a module `{ default: Component }` (what `import('./Widget')` returns).

- Create the lazy component with `lazy(loader)`. Because creating a new lazy component on every render would restart loading, create it **once per `loader`** (`useMemo`).
- Render it inside `<Suspense fallback={<p>Loading widget…</p>}>`.
- Pass a `name` prop through to the loaded component.

### starter
```tsx
import { lazy, Suspense, useMemo, type ComponentType } from 'react';

export function LazyWidget({ loader, name }: { loader: () => Promise<{ default: ComponentType<{ name: string }> }>; name: string }) {
  // TODO
  return <p>Loading widget…</p>;
}

export default function App() {
  const loader = () => Promise.resolve({ default: ({ name }: { name: string }) => <p>Hello {name}</p> });
  return <LazyWidget loader={loader} name="Ava" />;
}
```

### solution
```tsx
import { lazy, Suspense, useMemo, type ComponentType } from 'react';

export function LazyWidget({ loader, name }: { loader: () => Promise<{ default: ComponentType<{ name: string }> }>; name: string }) {
  const Widget = useMemo(() => lazy(loader), [loader]);
  return (
    <Suspense fallback={<p>Loading widget…</p>}>
      <Widget name={name} />
    </Suspense>
  );
}

export default function App() {
  const loader = () => Promise.resolve({ default: ({ name }: { name: string }) => <p>Hello {name}</p> });
  return <LazyWidget loader={loader} name="Ava" />;
}
```

### tests
```tsx
const controlled = () => {
  const calls = [];
  const loader = fn(() => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  return { loader, calls };
};
const Widget = ({ name }) => <p>Hello {name}</p>;
// React waits up to 300ms before revealing content that just resolved (to avoid flicker),
// so these tests wait for a little longer than that window.
const settle = async () => {
  await sleep(350);
  await flush();
};

test('shows the fallback while the chunk loads', async () => {
  const { loader } = controlled();
  const view = await render(<user.LazyWidget loader={loader} name="Ava" />);
  expect(view.$('p').textContent).toBe('Loading widget…');
  expect(loader).toHaveBeenCalledTimes(1);
});

test('renders the loaded component with its props', async () => {
  const { loader, calls } = controlled();
  const view = await render(<user.LazyWidget loader={loader} name="Ava" />);
  calls[0].resolve({ default: Widget });
  await settle();
  expect(view.$('p').textContent).toBe('Hello Ava');
});

test('prop changes re-render without loading the chunk again', async () => {
  const { loader, calls } = controlled();
  const view = await render(<user.LazyWidget loader={loader} name="Ava" />);
  calls[0].resolve({ default: Widget });
  await settle();
  await view.rerender(<user.LazyWidget loader={loader} name="Liam" />);
  expect(view.$('p').textContent).toBe('Hello Liam');
  expect(loader).toHaveBeenCalledTimes(1);
});

test('the chunk is requested only once even across re-renders while loading', async () => {
  const { loader } = controlled();
  const view = await render(<user.LazyWidget loader={loader} name="Ava" />);
  await view.rerender(<user.LazyWidget loader={loader} name="Liam" />);
  await view.rerender(<user.LazyWidget loader={loader} name="Mia" />);
  expect(loader).toHaveBeenCalledTimes(1);
});
```

### typetests
```tsx
const ok = <LazyWidget loader={async () => ({ default: ({ name }: { name: string }) => <p>{name}</p> })} name="x" />;
// @ts-expect-error the module must have a default component
const bad = <LazyWidget loader={async () => ({ other: () => null })} name="x" />;
```

### explanation
`lazy(loader)` returns a component that, the first time it renders, calls `loader()` and **suspends** until the promise resolves; the nearest `<Suspense>` above it shows its `fallback` in the meantime. The subtle bug this exercise guards against is creating the lazy component *inside render without memoising it*: a new `lazy(...)` each render is a brand-new component type, so React would discard the loaded component and start loading again, causing an endless loading state. `useMemo` keyed on `loader` creates it once. In a real app you declare `const Page = lazy(() => import('./Page'))` at module level, which achieves the same thing.

### hints
- `const Widget = useMemo(() => lazy(loader), [loader]);`
- Wrap `<Widget name={name} />` in `<Suspense fallback={...}>`.

# practice: Reset boundaries automatically

### meta
minutes: 8
language: tsx

### prompt
Extend the boundary idea with **`resetKeys`**. Write `ResettableBoundary` (a class) with props `fallback` (a node) and `resetKeys?: unknown[]`.

- Behaves like a normal error boundary.
- While showing the fallback, if `resetKeys` changes (compared item by item with `Object.is`, and a different length counts as changed), it clears the error and renders its children again.
- Changing `resetKeys` while there is **no** error does nothing special.

(Use `componentDidUpdate(prevProps)`.)

### starter
```tsx
import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  resetKeys?: unknown[];
  children?: ReactNode;
}
interface State {
  error: Error | null;
}

const changed = (a: unknown[] = [], b: unknown[] = []) => a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]));

export class ResettableBoundary extends Component<Props, State> {
  state: State = { error: null };

  // TODO
  render() {
    return this.props.children;
  }
}

export default function App() {
  return null;
}
```

### solution
```tsx
import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  resetKeys?: unknown[];
  children?: ReactNode;
}
interface State {
  error: Error | null;
}

const changed = (a: unknown[] = [], b: unknown[] = []) => a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]));

export class ResettableBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error !== null && changed(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  render() {
    return this.state.error !== null ? this.props.fallback : this.props.children;
  }
}

export default function App() {
  return null;
}
```

### tests
```tsx
const quiet = (fnToRun) => async () => {
  const original = console.error;
  console.error = () => {};
  try {
    await fnToRun();
  } finally {
    console.error = original;
  }
};

function Page({ id }) {
  if (id === 'bad') throw new Error('bad page');
  return <p>Page {id}</p>;
}
const mount = (id, keys = [id]) => (
  <user.ResettableBoundary fallback={<p>Error</p>} resetKeys={keys}>
    <Page id={id} />
  </user.ResettableBoundary>
);

test('shows children normally and the fallback on error', quiet(async () => {
  const ok = await render(mount('a'));
  expect(ok.$('p').textContent).toBe('Page a');
  const bad = await render(mount('bad'));
  expect(bad.$('p').textContent).toBe('Error');
}));

test('stays in the error state when the keys do not change', quiet(async () => {
  const view = await render(mount('bad'));
  await view.rerender(mount('bad'));
  expect(view.$('p').textContent).toBe('Error');
}));

test('resets when a key changes', quiet(async () => {
  const view = await render(mount('bad'));
  expect(view.$('p').textContent).toBe('Error');
  await view.rerender(mount('good'));
  expect(view.$('p').textContent).toBe('Page good');
}));

test('a reset to another failing page shows the fallback again', quiet(async () => {
  const view = await render(mount('bad'));
  await view.rerender(mount('bad', ['other']));
  expect(view.$('p').textContent).toBe('Error');
}));

test('a different number of keys counts as a change', quiet(async () => {
  const view = await render(mount('bad', ['bad']));
  await view.rerender(mount('fine', ['fine', 1]));
  expect(view.$('p').textContent).toBe('Page fine');
}));

test('changing keys without an error does nothing special', quiet(async () => {
  const view = await render(mount('a'));
  await view.rerender(mount('b'));
  expect(view.$('p').textContent).toBe('Page b');
}));
```

### typetests
```tsx
const a = <ResettableBoundary fallback={<p>x</p>} resetKeys={['id', 1]}><div /></ResettableBoundary>;
// @ts-expect-error fallback is required
const b = <ResettableBoundary resetKeys={[]}><div /></ResettableBoundary>;
```

### explanation
Without `resetKeys` an error state is permanent: after navigating from a broken contact to a healthy one, the boundary would still show the fallback. `componentDidUpdate` is the class-component equivalent of an effect that reacts to prop changes; comparing `resetKeys` item by item (and checking the length) with `Object.is` mirrors how React compares dependency arrays. Only reset when there *is* an error, otherwise you would needlessly re-render a healthy subtree. This is exactly the contract of the `resetKeys` prop in the popular `react-error-boundary` package.

### hints
- Add `getDerivedStateFromError` as in the previous exercise.
- `componentDidUpdate(prevProps)`: if `this.state.error` is set and the keys changed, `this.setState({ error: null })`.
- The `changed` helper is provided.

# challenge: Async errors and recovery

### meta
minutes: 10
language: tsx

### prompt
Boundaries cannot see rejected promises, so build the bridge.

1. `useAsyncError()` returns a function `throwError(error)`. Calling it makes the **next render throw** that error (so a boundary above can catch it).
2. `AsyncBoundary({ children })` is a self-contained error boundary class that shows
   `<div role="alert"><p>Something went wrong: <message></p><button>Try again</button></div>` when a descendant throws, and re-renders the children (fresh, with new state) when **Try again** is clicked.

Build `SaveButton({ save })` as the demo: a **Save** button whose click calls `await save()`; if `save` rejects it passes the error to `throwError`. While saving, the button reads `Saving…`.

### starter
```tsx
import { Component, useCallback, useState, type ReactNode } from 'react';

export function useAsyncError() {
  // TODO
  return (_error: unknown) => {};
}

interface State {
  error: Error | null;
  attempt: number;
}

export class AsyncBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { error: null, attempt: 0 };

  // TODO
  render() {
    return this.props.children;
  }
}

export function SaveButton({ save }: { save: () => Promise<void> }) {
  const throwError = useAsyncError();
  // TODO
  return <button>Save</button>;
}

export default function App() {
  return (
    <AsyncBoundary>
      <SaveButton save={() => Promise.reject(new Error('Network down'))} />
    </AsyncBoundary>
  );
}
```

### solution
```tsx
import { Component, useCallback, useState, type ReactNode } from 'react';

export function useAsyncError() {
  const [, setState] = useState<unknown>();
  return useCallback((error: unknown) => {
    setState(() => {
      throw error;
    });
  }, []);
}

interface State {
  error: Error | null;
  attempt: number;
}

export class AsyncBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));

  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>Something went wrong: {this.state.error.message}</p>
          <button onClick={this.retry}>Try again</button>
        </div>
      );
    }
    // Changing the key remounts the children, so they start from fresh state.
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

export function SaveButton({ save }: { save: () => Promise<void> }) {
  const throwError = useAsyncError();
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    setSaving(true);
    try {
      await save();
    } catch (error) {
      throwError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </button>
  );
}

export default function App() {
  return (
    <AsyncBoundary>
      <SaveButton save={() => Promise.reject(new Error('Network down'))} />
    </AsyncBoundary>
  );
}
```

### tests
```tsx
const quiet = (fnToRun) => async () => {
  const original = console.error;
  console.error = () => {};
  try {
    await fnToRun();
  } finally {
    console.error = original;
  }
};
const controlled = () => {
  const calls = [];
  const save = fn(() => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  return { save, calls };
};

test('a successful save leaves the button usable', quiet(async () => {
  const { save, calls } = controlled();
  const view = await render(
    <user.AsyncBoundary>
      <user.SaveButton save={save} />
    </user.AsyncBoundary>,
  );
  await click(view.$('button'));
  expect(view.$('button').textContent).toBe('Saving…');
  calls[0].resolve();
  await flush();
  expect(view.$('button').textContent).toBe('Save');
  expect(view.$('[role=alert]')).toBeNull();
}));

test('a rejected promise reaches the error boundary', quiet(async () => {
  const { save, calls } = controlled();
  const view = await render(
    <user.AsyncBoundary>
      <user.SaveButton save={save} />
    </user.AsyncBoundary>,
  );
  await click(view.$('button'));
  calls[0].reject(new Error('Network down'));
  await flush();
  expect(view.$('[role=alert] p').textContent).toBe('Something went wrong: Network down');
  expect(view.getByRole('button', { name: 'Try again' })).toBeTruthy();
}));

test('Try again remounts the children with fresh state', quiet(async () => {
  const { save, calls } = controlled();
  const view = await render(
    <user.AsyncBoundary>
      <user.SaveButton save={save} />
    </user.AsyncBoundary>,
  );
  await click(view.$('button'));
  calls[0].reject(new Error('Network down'));
  await flush();
  await click(view.getByRole('button', { name: 'Try again' }));
  expect(view.$('[role=alert]')).toBeNull();
  expect(view.$('button').textContent).toBe('Save');
  expect(view.$('button').disabled).toBe(false);
}));

test('it can fail and recover more than once', quiet(async () => {
  const { save, calls } = controlled();
  const view = await render(
    <user.AsyncBoundary>
      <user.SaveButton save={save} />
    </user.AsyncBoundary>,
  );
  for (let i = 0; i < 2; i++) {
    await click(view.$('button'));
    calls[i].reject(new Error('fail ' + i));
    await flush();
    expect(view.$('[role=alert] p').textContent).toBe('Something went wrong: fail ' + i);
    await click(view.getByRole('button', { name: 'Try again' }));
  }
  expect(view.$('button').textContent).toBe('Save');
}));

test('useAsyncError makes the next render throw', quiet(async () => {
  let throwError;
  function Probe() {
    throwError = user.useAsyncError();
    return <p>fine</p>;
  }
  const view = await render(
    <user.AsyncBoundary>
      <Probe />
    </user.AsyncBoundary>,
  );
  expect(view.$('p').textContent).toBe('fine');
  throwError(new Error('late failure'));
  await flush();
  expect(view.$('[role=alert] p').textContent).toBe('Something went wrong: late failure');
}));
```

### typetests
```tsx
function Check() {
  const throwError = useAsyncError();
  throwError(new Error('x'));
  throwError('anything');
  return null;
}
const ok = <AsyncBoundary><div /></AsyncBoundary>;
// @ts-expect-error save is required
const bad = <SaveButton />;
```

### explanation
React only lets error boundaries catch errors thrown **during rendering**. The trick in `useAsyncError` is to *move* an async error into the render phase: calling `setState(() => { throw error; })` makes React run that updater function on the next render, where the throw is caught by the nearest boundary just like any other render error. The boundary's `Try again` increments an `attempt` counter used as a `key` on the wrapper, which **remounts** the whole subtree, so components start from fresh state rather than keeping stale state that caused the problem. Use this pattern deliberately: for ordinary failed saves an inline message is usually kinder than a full fallback.

### hints
- `const [, setState] = useState();` and `setState(() => { throw error; })` inside a `useCallback`.
- `static getDerivedStateFromError(error)` returns the error state.
- `render`: the alert when there is an error, otherwise `<div key={attempt}>{children}</div>`.
- In `SaveButton`: `try { await save() } catch (e) { throwError(e) }`.
