## Failing well is a feature

Things break: a malformed API response, a `null` where you expected an object, a chunk of JavaScript that fails to download. Without a plan, one bad component takes down the whole app and the user sees a **white screen**. A resilient app contains failures, tells users what happened and offers a way forward.

> **The thinking pattern:** decide the *blast radius* of a failure. A broken "recent activity" widget should not take down the contact page; a broken contact page should not take down the navigation. Wrap parts of the UI in **boundaries** so errors stay local.

## Three places an error can happen

| Where | Caught by an error boundary? | How to handle |
| --- | --- | --- |
| While **rendering** (a component throws) | **Yes** | error boundary |
| In an **event handler** (`onClick`) | No | `try/catch` in the handler |
| In **async code** (a rejected promise in an effect or handler) | No | `try/catch`, or rethrow into render (below) |

Boundaries only catch errors thrown **during rendering, lifecycle methods and constructors of the tree below them**. They do not catch event handlers or promises. This is the most common misunderstanding, and today you will fix it.

## Error boundaries

An error boundary is a component that catches rendering errors in its children and renders a **fallback** instead. It must be a **class component**, as there is still no hook equivalent:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { fallback: ReactNode; onError?: (error: Error, info: ErrorInfo) => void; children: ReactNode }
interface State { error: Error | null }

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {     // 1. render phase: switch to fallback UI
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {          // 2. commit phase: side effects (logging)
    this.props.onError?.(error, info);
  }
  reset = () => this.setState({ error: null });                // try rendering the children again

  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
```

Two lifecycle methods, two jobs: `getDerivedStateFromError` is *pure* and chooses what to show; `componentDidCatch` is where side effects like **logging to Sentry** belong. In real projects most people use the small `react-error-boundary` package, which wraps exactly this and adds a hook and `resetKeys`.

### Where to put boundaries

- **Top level:** a last-resort "Something went wrong. Reload" page.
- **Per route/page:** a broken page keeps the navigation working.
- **Around risky widgets:** third-party charts, user-generated content, anything fed by uncertain data.

Smaller boundaries mean smaller blast radius, but don't wrap everything. A handful of well-placed ones is plenty.

### Recovery

A fallback with **no way out** is a dead end. Offer **Try again**, which calls `reset`. Also **reset automatically** when the situation changes: if the boundary wraps a contact page and the user navigates to a different contact, the old error is irrelevant. A `resetKeys` array does this: when any key changes, the boundary clears its error.

```tsx
<ErrorBoundary resetKeys={[contactId]} fallback={...}>
  <ContactPage id={contactId} />
</ErrorBoundary>
```

## Getting async errors into the boundary

A boundary can't see a rejected promise, but it *can* see an error thrown during **render**. So a tiny hook converts an async error into a render-time one by throwing from inside a state updater:

```tsx
function useAsyncError() {
  const [, setState] = useState();
  return useCallback((error: unknown) => {
    setState(() => { throw error; });       // thrown during the next render, so the boundary catches it
  }, []);
}

// usage
const throwError = useAsyncError();
async function save() {
  try { await api.save(); } catch (e) { throwError(e); }   // only for errors you *want* to reach the boundary
}
```

Use judgement: a failed save usually deserves an inline message (Day 10/16), not a full-screen fallback. Reserve boundaries for "this part of the page cannot work".

## Suspense: waiting declaratively

`<Suspense>` lets a part of the tree **wait** for something and show a fallback meanwhile. Today it works with:

- **`lazy()`** components (code splitting), and
- data via libraries that support it (TanStack Query's `useSuspenseQuery`, frameworks) or React 19's `use(promise)`.

```tsx
const Chart = lazy(() => import('./Chart'));      // the chart's code is downloaded only when first rendered

<Suspense fallback={<ChartSkeleton />}>
  <Chart data={data} />
</Suspense>
```

Suspense and error boundaries are two halves of the same idea: **loading** and **failure** become wrappers, so components can be written for the happy path:

```tsx
<ErrorBoundary fallback={<ErrorPanel />}>
  <Suspense fallback={<Skeleton />}>
    <ContactDetails id={id} />     // just renders data; no isLoading / isError branches
  </Suspense>
</ErrorBoundary>
```

Order matters: the boundary goes **outside** the Suspense so a failure to load is caught.

## Code splitting with `lazy` and the router

By default Vite bundles your whole app into one file, so users download the Settings page code just to see the login screen. Split by route:

```tsx
const ContactsPage = lazy(() => import('./pages/ContactsPage'));   // default export required
const DealsPage    = lazy(() => import('./pages/DealsPage'));

<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/contacts" element={<ContactsPage />} />
    <Route path="/deals" element={<DealsPage />} />
  </Routes>
</Suspense>
```

Tips: split on **route** boundaries first (largest wins), then on heavy, rarely used widgets (charts, editors, PDF export). Analyse your bundle (Day 29) before guessing. Preload the next route on hover (`onMouseEnter={() => import('./pages/DealsPage')}`) so navigation feels instant.

## Loading states that don't jump

- Fallbacks should **reserve space** (skeletons of the right height) so the layout doesn't shift when content arrives (this affects the CLS web vital).
- Avoid flashing a spinner for fast loads: wrap non-urgent updates in `startTransition` so React keeps showing the old UI until the new one is ready, instead of replacing it with a fallback.
- For chunk-load failures (the user is offline when navigating), the boundary's fallback can offer **Reload**.

## Reporting errors

Showing a friendly message is half the job. The other half is *finding out it happened*. Send errors to a service (Sentry, LogRocket, your own endpoint) from `componentDidCatch` / the `onError` prop, including the component stack (`info.componentStack`), the route and the user id (if you have one). Never include sensitive data such as passwords or tokens in reports.

## Walkthrough: make the contact page resilient

1. **Identify risk:** the activity timeline renders server-provided text and sometimes crashes on odd data.
2. **Wrap it:** `<ErrorBoundary resetKeys={[contactId]} fallback={...}>` around `<ActivityTimeline />` only, so the rest of the contact page survives.
3. **Offer recovery:** the fallback says "Couldn't show activity" with a **Try again** button; navigating to another contact resets it automatically.
4. **Split the code:** `lazy`-load the timeline and the chart widget behind `Suspense` with fixed-height skeletons.
5. **Report:** `onError` posts `{ message, stack, route }` to your logging endpoint.
6. **Test it:** temporarily `throw new Error('test')` inside the timeline and watch the fallback and the rest of the page.

## CRM step: resilience

1. Write `ErrorBoundary` (class, with `fallback` as a node or function, `onError`, `resetKeys`) in `src/components/`.
2. Wrap the app in a top-level boundary and each route element in its own boundary, with a **Try again** button.
3. `lazy`-load every page and wrap the `Routes` in `Suspense` with a page skeleton. Check the build output: you should see multiple JS chunks.
4. Add a `useAsyncError` hook and use it where a failure should hit the boundary.
5. Add a global `window.addEventListener('error' | 'unhandledrejection')` that logs to the console for now.
6. Test by throwing deliberately in a component and by going offline while navigating to a lazy route.

- [ ] A top-level and per-route error boundary with recovery
- [ ] Pages are lazy-loaded behind Suspense skeletons
- [ ] A broken widget does not take down its page
- [ ] The build output shows separate chunks per route
