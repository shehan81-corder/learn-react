## "Which state tool?" is really "what kind of state is this?"

Beginners ask "should I use Redux, Context or Zustand?" Experienced developers ask a different question first: **what kind of state is it?** Most apps contain four very different kinds, and each has a best tool.

| Kind | Examples | Best tool |
| --- | --- | --- |
| **Server state** | contacts, deals (data that lives on a server) | TanStack Query (Day 17) |
| **URL state** | current page, filters, selected tab, which contact is open | the router: path and search params (Day 12) |
| **Local component state** | a form field, whether a menu is open | `useState` / `useReducer` |
| **Shared client state** | the selected rows, the open dialog, a drag in progress, user preferences, an unsaved draft | context, or a **store** (today) |

> **The thinking pattern:** *put each piece of state in the most specific, least global place that works.* Server state belongs to the cache, URL state to the URL, and only genuinely shared, UI-only state needs a global store. If you notice you are copying API responses into a store, stop: that is the cache's job.

After you have moved server and URL state out, the "global" state that remains is surprisingly small, and a tiny library is plenty.

## When `useState` + context stops being enough

Context works, but has costs when used as a store: every consumer re-renders whenever *any part* of the value changes, you need a provider per context, and updating from outside React (a WebSocket message, a timer) is awkward. A **store** fixes these:

- State lives **outside** React, in a plain object with `getState`, `setState` and `subscribe`.
- Components subscribe with a **selector** and re-render **only** when *their slice* changes.
- Anything, including non-React code, can read and update it.

## The core of every store: subscribe + getState

```ts
function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<(state: T, prev: T) => void>();

  return {
    getState: () => state,
    setState(partial: Partial<T> | ((s: T) => Partial<T>)) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      const next = { ...state, ...patch };
      if (shallowEqual(next, state)) return;           // nothing changed: don't notify
      const prev = state;
      state = next;
      listeners.forEach((l) => l(state, prev));
    },
    subscribe(listener: (state: T, prev: T) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);          // unsubscribe
    },
  };
}
```

Twenty lines, and it is essentially what **Zustand** is at its core. Today you will build it and the hook to use it.

## Connecting a store to React: `useSyncExternalStore`

React ships a hook designed for exactly this, avoiding "tearing" (different components showing different versions of the state during a render):

```tsx
function useStore<T extends object, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,                     // how to listen for changes
    () => selector(store.getState()),    // how to read the current slice
  );
}

const count = useStore(counterStore, (s) => s.count);     // re-renders only when count changes
```

React calls the snapshot function and compares results with `Object.is`: if the selected value is unchanged, the component does not re-render.

**The selector gotcha:** a selector that builds a *new array or object every time* (`(s) => s.deals.filter(...)`) returns a different reference on every call, so React thinks the value changed on every store update (and can loop forever). Fix it by selecting primitives, by selecting stable references (`(s) => s.deals`) and deriving outside, or by supplying an **equality function** (`shallowEqual`) so equal-by-content results count as unchanged. You will meet this directly in the challenge.

## Zustand in real projects

```bash
npm install zustand
```

```ts
import { create } from 'zustand';

interface UiState {
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedIds: [],
  toggleSelected: (id) =>
    set((s) => ({ selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id] })),
  clearSelection: () => set({ selectedIds: [] }),
}));

// in a component: select only what you need
const selectedIds = useUiStore((s) => s.selectedIds);
const toggle = useUiStore((s) => s.toggleSelected);
```

Things to know:

- `create` returns a **hook** that also works outside React: `useUiStore.getState()`, `useUiStore.setState(...)`, `useUiStore.subscribe(...)`.
- **Actions live in the store**, next to the data they change. Components just call them.
- **Always select a slice.** `const state = useUiStore()` subscribes to everything.
- **Middleware**: `persist` (save to localStorage with a version and migration, just like Day 19), `devtools` (Redux DevTools), `immer` (write "mutating" updates that stay immutable underneath).
- Use `useShallow` (or `shallow`) when a selector returns a new object or array of the same content.
- Keep stores **small and focused** (a `selection` store, a `preferences` store) rather than one giant one.

## Alternatives, briefly

- **Redux Toolkit:** the structured, battle-tested option for large teams: slices, actions, reducers and great devtools. More ceremony, strong conventions.
- **Jotai / Recoil:** *atoms*, many small pieces of state composed bottom-up.
- **Context + `useReducer`:** fine for small, slow-changing shared state (Day 13).
- **XState:** explicit state machines for complex flows.

The concepts you learned today transfer to all of them: a store is state + subscribers, components subscribe to slices, and selectors must return stable values.

## Selectors and derived state

Keep the store minimal (the *facts*) and compute everything else with **selector functions**:

```ts
const selectByStage = (state: PipelineState, stage: Stage) => state.deals.filter((d) => d.stage === stage);
const selectOpenValue = (state: PipelineState) =>
  state.deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((sum, d) => sum + d.value, 0);
```

Selectors are plain functions, trivially testable without React, and reusable between components and non-React code. Never store derived values like `totalValue` in the store: they go stale.

## Walkthrough: a drag-free Kanban board

Requirement: *a pipeline board with a column per stage; each card has a "Move →" button; moving a card should only re-render the two affected columns.*

1. **Facts only:** `deals: { id, title, stage, value }[]`.
2. **Actions in the store:** `addDeal`, `moveDeal(id, stage)`, `removeDeal(id)`. Each makes a new array (immutable).
3. **Selectors:** `selectByStage` and `selectOpenValue`.
4. **Subscribe narrowly:** each `Column` selects *only the ids of its own deals*: `useStore(store, (s) => ids(s.deals, stage), shallowArrayEqual)`. When a deal moves from `new` to `qualified`, only those two columns see a different list of ids.
5. **Prove it:** count renders per column (the Profiler, or a counter prop in a test). The `won` column does not re-render.

Note how the performance story from Day 21 returns: the structure of subscriptions *is* the optimisation.

## CRM step: a selection store

1. `npm install zustand`.
2. Create `src/stores/selection.ts` with `selectedIds`, `toggle(id)`, `selectAll(ids)`, `clear()`.
3. Add checkboxes to the contacts table; a "bulk bar" appears when `selectedIds.length > 0` with **Delete selected** and **Tag selected** (calling your mutation hooks).
4. Create `src/stores/preferences.ts` with `persist` middleware (versioned): `pageSize`, `density`, `sidebarCollapsed`. Replace the earlier `useLocalStorage` calls.
5. Select slices everywhere (no whole-store subscriptions) and verify with the React Profiler that ticking one checkbox re-renders only that row (combine with Day 21's `memo`).
6. Add the **Deals board**: columns per stage using the pattern above, with **Move →** buttons that call a `moveDeal` mutation (optimistic) on the Query cache. Server state stays in Query; only the *drag in progress* or *selected card* belongs in a store.

- [ ] State classified: server (Query), URL (router), local, shared UI (store)
- [ ] Stores are small and expose actions, not setters for everything
- [ ] Every `useStore` call selects a slice
- [ ] Preferences persist with a version
