# practice: Build a tiny store

### meta
minutes: 9
language: ts

### prompt
Write and export `createStore<T extends object>(initial)`, the core of Zustand.

It returns:

- `getState()`: the current state.
- `setState(partial | (state) => partial)`: shallow-merges the patch into the state **immutably** (a new state object each time).
- `subscribe(listener)`: registers `listener(state, prevState)` and returns an **unsubscribe** function.

Rules:

- Listeners are called **after** the state has been replaced, in the order they subscribed.
- If the patch changes nothing (every patched key is already `Object.is`-equal), do **not** create a new state and do **not** notify listeners.
- Unsubscribing during notification must not break the remaining listeners.

### starter
```ts
export type Listener<T> = (state: T, prevState: T) => void;

export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  // TODO
  return {
    getState: () => initial,
    setState() {},
    subscribe: () => () => {},
  };
}
```

### solution
```ts
export type Listener<T> = (state: T, prevState: T) => void;

export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();

  return {
    getState: () => state,

    setState(partial) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      const keys = Object.keys(patch) as (keyof T)[];
      const changed = keys.some((key) => !Object.is(state[key], patch[key]));
      if (!changed) return;

      const prev = state;
      state = { ...state, ...patch };
      for (const listener of Array.from(listeners)) listener(state, prev);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
```

### tests
```ts
test('getState returns the initial state', () => {
  const initial = { count: 0 };
  const store = user.createStore(initial);
  expect(store.getState()).toBe(initial);
});

test('setState merges a partial object without mutating', () => {
  const initial = { a: 1, b: 2 };
  const store = user.createStore(initial);
  store.setState({ b: 3 });
  expect(store.getState()).toEqual({ a: 1, b: 3 });
  expect(initial).toEqual({ a: 1, b: 2 });
  expect(store.getState()).not.toBe(initial);
});

test('setState accepts an updater function', () => {
  const store = user.createStore({ count: 1 });
  store.setState((s) => ({ count: s.count + 1 }));
  store.setState((s) => ({ count: s.count * 10 }));
  expect(store.getState().count).toBe(20);
});

test('listeners receive the new and previous state', () => {
  const store = user.createStore({ n: 0 });
  const listener = fn();
  store.subscribe(listener);
  store.setState({ n: 1 });
  expect(listener).toHaveBeenCalledTimes(1);
  const [next, prev] = listener.calls[0];
  expect(next).toEqual({ n: 1 });
  expect(prev).toEqual({ n: 0 });
  expect(listener.calls[0][0]).toBe(store.getState());
});

test('listeners run after the state has been replaced', () => {
  const store = user.createStore({ n: 0 });
  let seen;
  store.subscribe(() => (seen = store.getState().n));
  store.setState({ n: 5 });
  expect(seen).toBe(5);
});

test('a patch that changes nothing does not notify or replace the state', () => {
  const store = user.createStore({ n: 1, s: 'x' });
  const before = store.getState();
  const listener = fn();
  store.subscribe(listener);
  store.setState({ n: 1 });
  store.setState({});
  store.setState((s) => ({ s: s.s }));
  expect(listener).not.toHaveBeenCalled();
  expect(store.getState()).toBe(before);
});

test('compares values with Object.is (NaN is equal to NaN)', () => {
  const store = user.createStore({ n: NaN });
  const listener = fn();
  store.subscribe(listener);
  store.setState({ n: NaN });
  expect(listener).not.toHaveBeenCalled();
});

test('unsubscribe stops notifications', () => {
  const store = user.createStore({ n: 0 });
  const listener = fn();
  const unsubscribe = store.subscribe(listener);
  store.setState({ n: 1 });
  unsubscribe();
  store.setState({ n: 2 });
  expect(listener).toHaveBeenCalledTimes(1);
});

test('listeners run in subscription order, even if one unsubscribes during notification', () => {
  const store = user.createStore({ n: 0 });
  const order = [];
  const unsubscribeFirst = store.subscribe(() => {
    order.push('first');
    unsubscribeFirst();
  });
  store.subscribe(() => order.push('second'));
  store.subscribe(() => order.push('third'));
  store.setState({ n: 1 });
  expect(order).toEqual(['first', 'second', 'third']);
  order.length = 0;
  store.setState({ n: 2 });
  expect(order).toEqual(['second', 'third']);
});
```

### typetests
```ts
const store = createStore({ count: 0, name: 'x' });
store.setState({ count: 1 });
store.setState((s) => ({ count: s.count + 1 }));
const n: number = store.getState().count;
// @ts-expect-error unknown key
store.setState({ nope: 1 });
// @ts-expect-error wrong value type
store.setState({ count: 'one' });
const off: () => void = store.subscribe((state, prev) => state.count - prev.count);
```

### explanation
A store is three things: a variable, a set of listeners, and the discipline to replace (never mutate) the variable. Replacing it means any component holding the *old* state object can compare it with the new one by reference, which is what React's change detection relies on. The "did anything actually change?" check prevents needless notifications: without it, `setState({ n: 1 })` on an unchanged value would wake every subscriber. Copying the listener set before iterating (`Array.from`) makes it safe for a listener to unsubscribe while being notified. This is the heart of Zustand; the rest of the library is conveniences on top.

### hints
- Keep `let state = initial` and a `Set` of listeners in the closure.
- Resolve the patch: `typeof partial === 'function' ? partial(state) : partial`.
- A change exists if any patched key differs: `Object.keys(patch).some((k) => !Object.is(state[k], patch[k]))`.
- `subscribe` returns `() => listeners.delete(listener)`.

# practice: A selector hook

### meta
minutes: 9
language: tsx

### prompt
Connect the store to React. `createStore` is provided. Write `useStore(store, selector, isEqual = Object.is)` using `useSyncExternalStore`:

- Returns `selector(store.getState())`.
- The component re-renders **only** when the selected value changes (according to `isEqual`).
- When the selector returns an *equal but new* value (for example a new array with the same items and a custom `isEqual`), the **previous reference** is returned, so nothing re-renders.

Then complete the demo components: `Count` shows the count, `Label` shows the label, `Controls` has buttons that update each. Updating the count must not re-render `Label`, and vice versa.

### starter
```tsx
import { useRef, useSyncExternalStore } from 'react';

type Listener<T> = (state: T, prev: T) => void;
export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    getState: () => state,
    setState(partial) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      if (!(Object.keys(patch) as (keyof T)[]).some((k) => !Object.is(state[k], patch[k]))) return;
      const prev = state;
      state = { ...state, ...patch };
      Array.from(listeners).forEach((l) => l(state, prev));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export function useStore<T extends object, S>(store: Store<T>, selector: (state: T) => S, isEqual: (a: S, b: S) => boolean = Object.is): S {
  // TODO: useSyncExternalStore, keeping the previous selection when it is equal
  return selector(store.getState());
}

export const appStore = createStore({ count: 0, label: 'Hello' });

export function Count({ onRender }: { onRender: (name: string) => void }) {
  onRender('Count');
  // TODO
  return <p>Count: 0</p>;
}

export function Label({ onRender }: { onRender: (name: string) => void }) {
  onRender('Label');
  // TODO
  return <p>Label: Hello</p>;
}

export function Controls() {
  return (
    <div>
      <button onClick={() => appStore.setState((s) => ({ count: s.count + 1 }))}>Increment</button>
      <button onClick={() => appStore.setState({ label: 'Changed' })}>Rename</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Count onRender={() => {}} />
      <Label onRender={() => {}} />
      <Controls />
    </div>
  );
}
```

### solution
```tsx
import { useCallback, useRef, useSyncExternalStore } from 'react';

type Listener<T> = (state: T, prev: T) => void;
export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    getState: () => state,
    setState(partial) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      if (!(Object.keys(patch) as (keyof T)[]).some((k) => !Object.is(state[k], patch[k]))) return;
      const prev = state;
      state = { ...state, ...patch };
      Array.from(listeners).forEach((l) => l(state, prev));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export function useStore<T extends object, S>(store: Store<T>, selector: (state: T) => S, isEqual: (a: S, b: S) => boolean = Object.is): S {
  const last = useRef<{ value: S } | null>(null);
  // A stable subscribe function: React resubscribes whenever its identity changes.
  const subscribe = useCallback((onChange: () => void) => store.subscribe(() => onChange()), [store]);

  const getSnapshot = () => {
    const next = selector(store.getState());
    if (last.current !== null && isEqual(last.current.value, next)) return last.current.value;
    last.current = { value: next };
    return next;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const appStore = createStore({ count: 0, label: 'Hello' });

export function Count({ onRender }: { onRender: (name: string) => void }) {
  onRender('Count');
  const count = useStore(appStore, (s) => s.count);
  return <p>Count: {count}</p>;
}

export function Label({ onRender }: { onRender: (name: string) => void }) {
  onRender('Label');
  const label = useStore(appStore, (s) => s.label);
  return <p>Label: {label}</p>;
}

export function Controls() {
  return (
    <div>
      <button onClick={() => appStore.setState((s) => ({ count: s.count + 1 }))}>Increment</button>
      <button onClick={() => appStore.setState({ label: 'Changed' })}>Rename</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Count onRender={() => {}} />
      <Label onRender={() => {}} />
      <Controls />
    </div>
  );
}
```

### tests
```tsx
const reset = () => user.appStore.setState({ count: 0, label: 'Hello' });
const counter = () => {
  const renders = {};
  return { renders, onRender: (name) => (renders[name] = (renders[name] ?? 0) + 1) };
};

test('components read their slice of the store', async () => {
  reset();
  const { onRender } = counter();
  const view = await render(
    <div>
      <user.Count onRender={onRender} />
      <user.Label onRender={onRender} />
    </div>,
  );
  expect(view.$$('p').map((p) => p.textContent)).toEqual(['Count: 0', 'Label: Hello']);
});

test('updating the store updates subscribed components', async () => {
  reset();
  const { onRender } = counter();
  const view = await render(
    <div>
      <user.Count onRender={onRender} />
      <user.Controls />
    </div>,
  );
  await click(view.getByRole('button', { name: 'Increment' }));
  await click(view.getByRole('button', { name: 'Increment' }));
  expect(view.$('p').textContent).toBe('Count: 2');
});

test('a component does not re-render when an unrelated slice changes', async () => {
  reset();
  const { renders, onRender } = counter();
  const view = await render(
    <div>
      <user.Count onRender={onRender} />
      <user.Label onRender={onRender} />
      <user.Controls />
    </div>,
  );
  expect(renders).toEqual({ Count: 1, Label: 1 });
  await click(view.getByRole('button', { name: 'Increment' }));
  expect(renders).toEqual({ Count: 2, Label: 1 });
  await click(view.getByRole('button', { name: 'Rename' }));
  expect(renders).toEqual({ Count: 2, Label: 2 });
  expect(view.$$('p')[1].textContent).toBe('Label: Changed');
});

test('works from outside React: store updates reach mounted components', async () => {
  reset();
  const { onRender } = counter();
  const view = await render(<user.Count onRender={onRender} />);
  user.appStore.setState({ count: 41 });
  await flush();
  expect(view.$('p').textContent).toBe('Count: 41');
});

test('a custom isEqual keeps the previous reference and avoids re-renders', async () => {
  const store = user.createStore({ items: ['a', 'b'], other: 0 });
  let renders = 0;
  const seen = [];
  const sameItems = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  function List() {
    renders++;
    const items = user.useStore(store, (s) => s.items.map((i) => i.toUpperCase()), sameItems);
    seen.push(items);
    return <p>{items.join(',')}</p>;
  }
  const view = await render(<List />);
  expect(view.$('p').textContent).toBe('A,B');
  store.setState({ other: 1 });
  await flush();
  expect(renders).toBe(1);
  store.setState({ items: ['a', 'b'] });
  await flush();
  expect(renders).toBe(1);
  store.setState({ items: ['a', 'c'] });
  await flush();
  expect(renders).toBe(2);
  expect(view.$('p').textContent).toBe('A,C');
  expect(seen[0]).toEqual(['A', 'B']);
  expect(seen[1]).toEqual(['A', 'C']);
});

test('unsubscribes on unmount', async () => {
  reset();
  const { onRender } = counter();
  const view = await render(<user.Count onRender={onRender} />);
  view.unmount();
  await flush();
  let notified = 0;
  const off = user.appStore.subscribe(() => notified++);
  user.appStore.setState({ count: 9 });
  off();
  expect(notified).toBe(1);
});
```

### typetests
```tsx
const store = createStore({ n: 1, s: 'x' });
function Check() {
  const n: number = useStore(store, (st) => st.n);
  const s: string = useStore(store, (st) => st.s);
  // @ts-expect-error the selector result is a number, not a string
  const wrong: string = useStore(store, (st) => st.n);
  return null;
}
```

### explanation
`useSyncExternalStore(subscribe, getSnapshot)` is React's official bridge to external stores: it re-renders when the value returned by `getSnapshot` changes (compared with `Object.is`) and prevents *tearing*, where different parts of the screen show different versions of the state. The selector is what makes the subscription **narrow**: `Count` only sees `s.count`, so a `Rename` leaves it alone. The `last` ref solves the classic gotcha: a selector that builds a new array every call would look "changed" every time; when `isEqual` says the new value matches the previous one we return the *old reference*, so React sees no change.

### hints
- `useSyncExternalStore(subscribe, getSnapshot)` where `subscribe = (onChange) => store.subscribe(() => onChange())`; wrap it in `useCallback` so its identity is stable.
- `getSnapshot` computes `selector(store.getState())`, but returns the remembered value when `isEqual` says it is the same.
- In the components: `useStore(appStore, (s) => s.count)` and `useStore(appStore, (s) => s.label)`.

# practice: Actions and selectors

### meta
minutes: 8
language: ts

### prompt
Build the pipeline store. A minimal `createStore` is provided; add the domain on top.

Export:

- `createPipelineStore(initialDeals = [])` returning the store, whose state is `{ deals: Deal[] }`, plus three **actions** as methods on the returned object (not inside the state): `addDeal(deal)`, `moveDeal(id, stage)`, `removeDeal(id)`. All must update immutably. `moveDeal` for an unknown id or the same stage changes nothing (no notification). `addDeal` with an existing id is ignored.
- Selector functions (plain functions of the state): `selectByStage(state, stage)` returns that stage's deals; `selectOpenValue(state)` returns the total value of deals not `won` or `lost`; `selectCounts(state)` returns `Record<Stage, number>` with **every** stage present.

### starter
```ts
export type Stage = 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
export const STAGES: Stage[] = ['new', 'qualified', 'proposal', 'won', 'lost'];

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: Stage;
}
export interface PipelineState {
  deals: Deal[];
}

function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<(s: T, p: T) => void>();
  return {
    getState: () => state,
    setState(partial: Partial<T> | ((s: T) => Partial<T>)) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      if (!(Object.keys(patch) as (keyof T)[]).some((k) => !Object.is(state[k], patch[k]))) return;
      const prev = state;
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state, prev));
    },
    subscribe(l: (s: T, p: T) => void) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

export function createPipelineStore(initialDeals: Deal[] = []) {
  const store = createStore<PipelineState>({ deals: initialDeals });
  // TODO: add actions
  return Object.assign(store, {
    addDeal(deal: Deal) {},
    moveDeal(id: string, stage: Stage) {},
    removeDeal(id: string) {},
  });
}

export const selectByStage = (state: PipelineState, stage: Stage): Deal[] => [];
export const selectOpenValue = (state: PipelineState): number => 0;
export const selectCounts = (state: PipelineState): Record<Stage, number> => ({ new: 0, qualified: 0, proposal: 0, won: 0, lost: 0 });
```

### solution
```ts
export type Stage = 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
export const STAGES: Stage[] = ['new', 'qualified', 'proposal', 'won', 'lost'];

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: Stage;
}
export interface PipelineState {
  deals: Deal[];
}

function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<(s: T, p: T) => void>();
  return {
    getState: () => state,
    setState(partial: Partial<T> | ((s: T) => Partial<T>)) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      if (!(Object.keys(patch) as (keyof T)[]).some((k) => !Object.is(state[k], patch[k]))) return;
      const prev = state;
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state, prev));
    },
    subscribe(l: (s: T, p: T) => void) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

export function createPipelineStore(initialDeals: Deal[] = []) {
  const store = createStore<PipelineState>({ deals: initialDeals });

  return Object.assign(store, {
    addDeal(deal: Deal) {
      store.setState((s) => (s.deals.some((d) => d.id === deal.id) ? {} : { deals: [...s.deals, deal] }));
    },
    moveDeal(id: string, stage: Stage) {
      store.setState((s) => {
        const target = s.deals.find((d) => d.id === id);
        if (!target || target.stage === stage) return {};
        return { deals: s.deals.map((d) => (d.id === id ? { ...d, stage } : d)) };
      });
    },
    removeDeal(id: string) {
      store.setState((s) => (s.deals.some((d) => d.id === id) ? { deals: s.deals.filter((d) => d.id !== id) } : {}));
    },
  });
}

export const selectByStage = (state: PipelineState, stage: Stage): Deal[] => state.deals.filter((d) => d.stage === stage);

export const selectOpenValue = (state: PipelineState): number =>
  state.deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((sum, d) => sum + d.value, 0);

export const selectCounts = (state: PipelineState): Record<Stage, number> => {
  const counts: Record<Stage, number> = { new: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
  for (const deal of state.deals) counts[deal.stage] += 1;
  return counts;
};
```

### tests
```ts
const seed = () => [
  { id: 'a', title: 'A', value: 100, stage: 'new' },
  { id: 'b', title: 'B', value: 250, stage: 'proposal' },
  { id: 'c', title: 'C', value: 900, stage: 'won' },
  { id: 'd', title: 'D', value: 50, stage: 'lost' },
];

test('starts with the initial deals', () => {
  const store = user.createPipelineStore(seed());
  expect(store.getState().deals).toHaveLength(4);
  expect(user.createPipelineStore().getState().deals).toEqual([]);
});

test('addDeal appends immutably and ignores duplicate ids', () => {
  const store = user.createPipelineStore(seed());
  const before = store.getState();
  store.addDeal({ id: 'e', title: 'E', value: 10, stage: 'new' });
  expect(store.getState().deals).toHaveLength(5);
  expect(before.deals).toHaveLength(4);
  const listener = fn();
  store.subscribe(listener);
  store.addDeal({ id: 'a', title: 'dup', value: 1, stage: 'new' });
  expect(listener).not.toHaveBeenCalled();
  expect(store.getState().deals).toHaveLength(5);
});

test('moveDeal changes one deal and notifies', () => {
  const store = user.createPipelineStore(seed());
  const listener = fn();
  store.subscribe(listener);
  store.moveDeal('a', 'qualified');
  expect(store.getState().deals.find((d) => d.id === 'a').stage).toBe('qualified');
  expect(store.getState().deals.find((d) => d.id === 'b').stage).toBe('proposal');
  expect(listener).toHaveBeenCalledTimes(1);
});

test('moveDeal is a no-op for an unknown id or the same stage', () => {
  const store = user.createPipelineStore(seed());
  const listener = fn();
  store.subscribe(listener);
  const before = store.getState();
  store.moveDeal('zzz', 'won');
  store.moveDeal('a', 'new');
  expect(listener).not.toHaveBeenCalled();
  expect(store.getState()).toBe(before);
});

test('removeDeal removes by id', () => {
  const store = user.createPipelineStore(seed());
  store.removeDeal('b');
  expect(store.getState().deals.map((d) => d.id)).toEqual(['a', 'c', 'd']);
  const listener = fn();
  store.subscribe(listener);
  store.removeDeal('b');
  expect(listener).not.toHaveBeenCalled();
});

test('selectByStage returns that stage only', () => {
  const store = user.createPipelineStore(seed());
  expect(user.selectByStage(store.getState(), 'proposal').map((d) => d.id)).toEqual(['b']);
  expect(user.selectByStage(store.getState(), 'qualified')).toEqual([]);
});

test('selectOpenValue ignores won and lost deals', () => {
  const store = user.createPipelineStore(seed());
  expect(user.selectOpenValue(store.getState())).toBe(350);
  store.moveDeal('b', 'won');
  expect(user.selectOpenValue(store.getState())).toBe(100);
});

test('selectCounts includes every stage', () => {
  const store = user.createPipelineStore(seed());
  expect(user.selectCounts(store.getState())).toEqual({ new: 1, qualified: 0, proposal: 1, won: 1, lost: 1 });
  expect(user.selectCounts({ deals: [] })).toEqual({ new: 0, qualified: 0, proposal: 0, won: 0, lost: 0 });
});

test('selectors are pure: they do not change the state', () => {
  const store = user.createPipelineStore(seed());
  const before = JSON.stringify(store.getState());
  user.selectByStage(store.getState(), 'new');
  user.selectOpenValue(store.getState());
  user.selectCounts(store.getState());
  expect(JSON.stringify(store.getState())).toBe(before);
});
```

### typetests
```ts
const store = createPipelineStore([{ id: '1', title: 't', value: 1, stage: 'new' }]);
store.addDeal({ id: '2', title: 'u', value: 2, stage: 'won' });
store.moveDeal('1', 'qualified');
const open: number = selectOpenValue(store.getState());
const counts: Record<Stage, number> = selectCounts(store.getState());
// @ts-expect-error unknown stage
store.moveDeal('1', 'archived');
// @ts-expect-error deals need a value
store.addDeal({ id: '3', title: 'v', stage: 'new' });
```

### explanation
Keeping **actions** next to the store and **selectors** as plain functions gives a clean separation: the store is only facts, actions are the only way to change them, and selectors derive everything else on demand. Because selectors are plain functions of the state they are trivial to test (no React, no rendering) and reusable by any component. Actions use the updater form of `setState` and return `{}` for no-ops; the store's "did anything change?" check then suppresses the notification, so unrelated components never wake up. Note `selectCounts` initialises *every* stage to `0` so consumers never face a missing key.

### hints
- Actions: `store.setState((s) => ...)` returning a patch like `{ deals: nextDeals }` (or `{}` for no change).
- `moveDeal`: find the deal first; if missing or already in that stage return `{}`.
- `selectCounts`: start from an object with all five stages set to `0`.

# challenge: A Kanban board with isolated columns

### meta
minutes: 10
language: tsx

### prompt
Build a board where moving a card re-renders **only** the two affected columns.

`createStore`, `useStore` and the store with its actions are provided. Complete:

- `shallowEqualArray(a, b)`: `true` if both arrays have the same length and `Object.is`-equal items.
- `Column({ stage, onRender })`: renders `<section aria-label="<stage>">` containing `<h2>{stage}</h2>` and a `<li>` per card (**title** and a **Move →** button). It must subscribe to **only the ids of the cards in its stage** (`useStore` with `shallowEqualArray`), so it does not re-render when other stages change. Each card's title is looked up from the store *at render time*.
- The **Move →** button moves the card to the next stage in `new → qualified → won` (cards already in `won` have no button).
- `Board({ onRender })` renders one `Column` per stage.

`onRender(stage)` must be called once per **render** of a column.

### starter
```tsx
import { useRef, useSyncExternalStore } from 'react';

export type Stage = 'new' | 'qualified' | 'won';
export const STAGES: Stage[] = ['new', 'qualified', 'won'];
const NEXT: Record<Stage, Stage | null> = { new: 'qualified', qualified: 'won', won: null };

export interface Deal {
  id: string;
  title: string;
  stage: Stage;
}

type Listener = () => void;
export const store = (() => {
  let deals: Deal[] = [
    { id: '1', title: 'Annual plan', stage: 'new' },
    { id: '2', title: 'Onboarding', stage: 'new' },
    { id: '3', title: 'Support', stage: 'qualified' },
    { id: '4', title: 'Renewal', stage: 'won' },
  ];
  const listeners = new Set<Listener>();
  return {
    getDeals: () => deals,
    subscribe(l: Listener) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    moveDeal(id: string, stage: Stage) {
      deals = deals.map((d) => (d.id === id ? { ...d, stage } : d));
      Array.from(listeners).forEach((l) => l());
    },
    reset(next: Deal[]) {
      deals = next;
      Array.from(listeners).forEach((l) => l());
    },
  };
})();

export function useStore<S>(selector: (deals: Deal[]) => S, isEqual: (a: S, b: S) => boolean = Object.is): S {
  const last = useRef<{ value: S } | null>(null);
  const getSnapshot = () => {
    const next = selector(store.getDeals());
    if (last.current && isEqual(last.current.value, next)) return last.current.value;
    last.current = { value: next };
    return next;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function shallowEqualArray<T>(a: T[], b: T[]): boolean {
  // TODO
  return false;
}

export function Column({ stage, onRender }: { stage: Stage; onRender: (stage: Stage) => void }) {
  onRender(stage);
  // TODO: subscribe to the ids of this stage only
  return <section aria-label={stage} />;
}

export function Board({ onRender }: { onRender: (stage: Stage) => void }) {
  // TODO
  return <div />;
}

export default function App() {
  return <Board onRender={() => {}} />;
}
```

### solution
```tsx
import { useRef, useSyncExternalStore } from 'react';

export type Stage = 'new' | 'qualified' | 'won';
export const STAGES: Stage[] = ['new', 'qualified', 'won'];
const NEXT: Record<Stage, Stage | null> = { new: 'qualified', qualified: 'won', won: null };

export interface Deal {
  id: string;
  title: string;
  stage: Stage;
}

type Listener = () => void;
export const store = (() => {
  let deals: Deal[] = [
    { id: '1', title: 'Annual plan', stage: 'new' },
    { id: '2', title: 'Onboarding', stage: 'new' },
    { id: '3', title: 'Support', stage: 'qualified' },
    { id: '4', title: 'Renewal', stage: 'won' },
  ];
  const listeners = new Set<Listener>();
  return {
    getDeals: () => deals,
    subscribe(l: Listener) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    moveDeal(id: string, stage: Stage) {
      deals = deals.map((d) => (d.id === id ? { ...d, stage } : d));
      Array.from(listeners).forEach((l) => l());
    },
    reset(next: Deal[]) {
      deals = next;
      Array.from(listeners).forEach((l) => l());
    },
  };
})();

export function useStore<S>(selector: (deals: Deal[]) => S, isEqual: (a: S, b: S) => boolean = Object.is): S {
  const last = useRef<{ value: S } | null>(null);
  const getSnapshot = () => {
    const next = selector(store.getDeals());
    if (last.current && isEqual(last.current.value, next)) return last.current.value;
    last.current = { value: next };
    return next;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function shallowEqualArray<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
}

export function Column({ stage, onRender }: { stage: Stage; onRender: (stage: Stage) => void }) {
  onRender(stage);
  const ids = useStore((deals) => deals.filter((d) => d.stage === stage).map((d) => d.id), shallowEqualArray);
  const next = NEXT[stage];

  return (
    <section aria-label={stage}>
      <h2>{stage}</h2>
      <ul>
        {ids.map((id) => {
          const deal = store.getDeals().find((d) => d.id === id)!;
          return (
            <li key={id}>
              <span>{deal.title}</span>
              {next && <button onClick={() => store.moveDeal(id, next)}>Move →</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Board({ onRender }: { onRender: (stage: Stage) => void }) {
  return (
    <div>
      {STAGES.map((stage) => (
        <Column key={stage} stage={stage} onRender={onRender} />
      ))}
    </div>
  );
}

export default function App() {
  return <Board onRender={() => {}} />;
}
```

### tests
```tsx
const initial = () => [
  { id: '1', title: 'Annual plan', stage: 'new' },
  { id: '2', title: 'Onboarding', stage: 'new' },
  { id: '3', title: 'Support', stage: 'qualified' },
  { id: '4', title: 'Renewal', stage: 'won' },
];
const mount = async () => {
  user.store.reset(initial());
  const renders = {};
  const onRender = (stage) => (renders[stage] = (renders[stage] ?? 0) + 1);
  const view = await render(<user.Board onRender={onRender} />);
  return { view, renders, resetCounts: () => Object.keys(renders).forEach((k) => delete renders[k]) };
};
const column = (view, stage) => view.$(`section[aria-label=${stage}]`);
const titles = (view, stage) => Array.from(column(view, stage).querySelectorAll('li span')).map((s) => s.textContent);

test('shallowEqualArray compares by length and item identity', () => {
  expect(user.shallowEqualArray([1, 2], [1, 2])).toBe(true);
  expect(user.shallowEqualArray([1, 2], [1, 3])).toBe(false);
  expect(user.shallowEqualArray([1], [1, 2])).toBe(false);
  expect(user.shallowEqualArray([], [])).toBe(true);
  expect(user.shallowEqualArray([{}], [{}])).toBe(false);
});

test('renders a column per stage with its cards', async () => {
  const { view } = await mount();
  expect(view.$$('section').map((s) => s.getAttribute('aria-label'))).toEqual(['new', 'qualified', 'won']);
  expect(titles(view, 'new')).toEqual(['Annual plan', 'Onboarding']);
  expect(titles(view, 'qualified')).toEqual(['Support']);
  expect(titles(view, 'won')).toEqual(['Renewal']);
});

test('each column renders once at first', async () => {
  const { renders } = await mount();
  expect(renders).toEqual({ new: 1, qualified: 1, won: 1 });
});

test('won cards have no Move button', async () => {
  const { view } = await mount();
  expect(column(view, 'won').querySelectorAll('button')).toHaveLength(0);
  expect(column(view, 'new').querySelectorAll('button')).toHaveLength(2);
});

test('moving a card moves it to the next column', async () => {
  const { view } = await mount();
  await click(column(view, 'new').querySelector('li button'));
  expect(titles(view, 'new')).toEqual(['Onboarding']);
  expect(titles(view, 'qualified')).toEqual(['Annual plan', 'Support']);
});

test('moving a card re-renders only the two affected columns', async () => {
  const { view, renders, resetCounts } = await mount();
  resetCounts();
  await click(column(view, 'new').querySelector('li button'));
  expect(renders).toEqual({ new: 1, qualified: 1 });
});

test('moving qualified to won leaves the new column alone', async () => {
  const { view, renders, resetCounts } = await mount();
  resetCounts();
  await click(column(view, 'qualified').querySelector('li button'));
  expect(renders).toEqual({ qualified: 1, won: 1 });
  expect(titles(view, 'won')).toEqual(['Support', 'Renewal']);
});

test('changes outside React reach the board', async () => {
  const { view } = await mount();
  user.store.moveDeal('2', 'won');
  await flush();
  expect(titles(view, 'won')).toEqual(['Onboarding', 'Renewal']);
});
```

### typetests
```tsx
const eq: boolean = shallowEqualArray(['a'], ['a']);
const ok = <Column stage="new" onRender={(s) => s.toUpperCase()} />;
// @ts-expect-error unknown stage
const bad = <Column stage="archived" onRender={() => {}} />;
```

### explanation
The whole optimisation is in **what each column subscribes to**. A column that selected `deals.filter(...)` (new objects every time) would re-render on every store change. A column that selects only its list of **ids**, with `shallowEqualArray` as the equality function, sees the *same* ids whenever its own cards did not change, so `useStore` hands back the previous array and React skips the render. When a deal moves from `new` to `qualified`, only those two id lists change, so exactly those two columns re-render. Titles are read at render time, so a column is correct whenever it does render. This is the same idea as Zustand's `useShallow` and Redux's `useSelector(sel, shallowEqual)`, and the structure of your subscriptions *is* your performance profile.

### hints
- `shallowEqualArray`: compare `length`, then `every` item with `Object.is`.
- `const ids = useStore((deals) => deals.filter((d) => d.stage === stage).map((d) => d.id), shallowEqualArray);`
- The next stage comes from the provided `NEXT` map; no button when it is `null`.
- Look up each card's title with `store.getDeals().find(...)` while rendering.
