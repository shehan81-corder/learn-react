# practice: memoizeOne

### meta
minutes: 7
language: ts

### prompt
Write and export `memoizeOne(fn, isEqual = shallowEqualArgs)`. It returns a function that remembers the **last** call:

- If it is called again with arguments equal to the previous call's (compared position by position with `Object.is` by default), it returns the cached result **without calling `fn`**.
- Otherwise it calls `fn`, remembers the arguments and result, and returns the result.
- It must pass the right `this` and arguments through, and a different number of arguments counts as different.
- If `fn` throws, nothing is cached.
- An optional `isEqual(newArgs, lastArgs)` lets callers customise the comparison.

### starter
```ts
export function shallowEqualArgs(a: readonly unknown[], b: readonly unknown[]): boolean {
  // TODO
  return false;
}

export function memoizeOne<A extends unknown[], R>(fn: (...args: A) => R, isEqual: (a: A, b: A) => boolean = shallowEqualArgs as never): (...args: A) => R {
  // TODO
  return fn;
}
```

### solution
```ts
export function shallowEqualArgs(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

export function memoizeOne<A extends unknown[], R>(fn: (...args: A) => R, isEqual: (a: A, b: A) => boolean = shallowEqualArgs as never): (...args: A) => R {
  let lastArgs: A | undefined;
  let lastResult: R;
  let hasCache = false;

  return function (this: unknown, ...args: A): R {
    if (hasCache && lastArgs && isEqual(args, lastArgs)) return lastResult;
    const result = fn.apply(this, args);
    lastArgs = args;
    lastResult = result;
    hasCache = true;
    return result;
  };
}
```

### tests
```ts
test('returns the cached result for the same arguments', () => {
  const f = fn((a, b) => a + b);
  const m = user.memoizeOne(f);
  expect(m(1, 2)).toBe(3);
  expect(m(1, 2)).toBe(3);
  expect(m(1, 2)).toBe(3);
  expect(f).toHaveBeenCalledTimes(1);
});

test('recomputes when an argument changes', () => {
  const f = fn((a, b) => a + b);
  const m = user.memoizeOne(f);
  m(1, 2);
  expect(m(1, 3)).toBe(4);
  expect(f).toHaveBeenCalledTimes(2);
});

test('only remembers the last call', () => {
  const f = fn((a) => a * 2);
  const m = user.memoizeOne(f);
  m(1);
  m(2);
  m(1);
  expect(f).toHaveBeenCalledTimes(3);
});

test('compares objects by reference by default', () => {
  const f = fn((o) => o.n);
  const m = user.memoizeOne(f);
  const a = { n: 1 };
  m(a);
  m(a);
  expect(f).toHaveBeenCalledTimes(1);
  m({ n: 1 });
  expect(f).toHaveBeenCalledTimes(2);
});

test('a different number of arguments is a different call', () => {
  const f = fn((...xs) => xs.length);
  const m = user.memoizeOne(f);
  expect(m(1)).toBe(1);
  expect(m(1, undefined)).toBe(2);
  expect(f).toHaveBeenCalledTimes(2);
});

test('treats NaN as equal to NaN (Object.is)', () => {
  const f = fn((n) => 'x');
  const m = user.memoizeOne(f);
  m(NaN);
  m(NaN);
  expect(f).toHaveBeenCalledTimes(1);
});

test('does not cache when the function throws', () => {
  let shouldThrow = true;
  const f = fn(() => {
    if (shouldThrow) throw new Error('boom');
    return 'ok';
  });
  const m = user.memoizeOne(f);
  expect(() => m(1)).toThrow('boom');
  shouldThrow = false;
  expect(m(1)).toBe('ok');
  expect(f).toHaveBeenCalledTimes(2);
});

test('supports a custom equality function', () => {
  const f = fn((o) => o.id);
  const m = user.memoizeOne(f, (a, b) => a[0].id === b[0].id);
  m({ id: 1, extra: 'a' });
  m({ id: 1, extra: 'b' });
  expect(f).toHaveBeenCalledTimes(1);
  m({ id: 2 });
  expect(f).toHaveBeenCalledTimes(2);
});

test('passes this through', () => {
  const obj = {
    n: 5,
    get: user.memoizeOne(function () {
      return this.n;
    }),
  };
  expect(obj.get()).toBe(5);
});

test('shallowEqualArgs is exported and works', () => {
  expect(user.shallowEqualArgs([1, 'a'], [1, 'a'])).toBe(true);
  expect(user.shallowEqualArgs([1], [1, 2])).toBe(false);
  expect(user.shallowEqualArgs([{}], [{}])).toBe(false);
});
```

### typetests
```ts
const m = memoizeOne((a: number, b: string) => a + b);
const r: string = m(1, 'x');
// @ts-expect-error argument types are preserved
m('x', 'y');
// @ts-expect-error the return type is preserved
const n: number = m(1, 'x');
```

### explanation
Memoisation trades memory for time: remember the last inputs and output, and skip the work when inputs repeat. `memoizeOne` is exactly the idea behind `useMemo` (React keeps *one* previous result per hook call) and it is the right default because it uses constant memory. The equality check matters: `Object.is` on each argument means two different-but-identical objects are *different*, which is why React tells you to keep object props stable with `useMemo`. Caching only after `fn` returns (not before) is what keeps a throwing call from poisoning the cache.

### hints
- Keep `lastArgs`, `lastResult` and a `hasCache` flag in the closure.
- Compare lengths first, then each position with `Object.is`.
- Use `fn.apply(this, args)` so `this` works, and store results only after `fn` returns normally.

# practice: Stop wasted re-renders

### meta
minutes: 9
language: tsx

### prompt
`Panel` shows a list of contacts. Clicking **Tick** changes unrelated state; clicking a row selects it. Every `Row` calls `onRender(id)` while rendering (so the tests can count renders).

Make it efficient:

- Clicking **Tick** must **not** re-render any row.
- Selecting a row must re-render **only** the previously selected row and the newly selected one.
- Selected rows have the class `selected`, and clicking a row selects it.

You will need `memo`, a stable callback (`useCallback`), and to pass each row a boolean `selected` instead of the shared selected id.

### starter
```tsx
import { memo, useCallback, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
}

export function Row({ contact, selectedId, onSelect, onRender }: { contact: Contact; selectedId: string | null; onSelect: (id: string) => void; onRender: (id: string) => void }) {
  onRender(contact.id);
  return (
    <li className={selectedId === contact.id ? 'selected' : ''} onClick={() => onSelect(contact.id)}>
      {contact.name}
    </li>
  );
}

export function Panel({ contacts, onRender }: { contacts: Contact[]; onRender: (id: string) => void }) {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>Tick {tick}</button>
      <ul>
        {contacts.map((c) => (
          <Row key={c.id} contact={c} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} onRender={onRender} />
        ))}
      </ul>
    </div>
  );
}

export default Panel;
```

### solution
```tsx
import { memo, useCallback, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
}

export const Row = memo(function Row({ contact, selected, onSelect, onRender }: { contact: Contact; selected: boolean; onSelect: (id: string) => void; onRender: (id: string) => void }) {
  onRender(contact.id);
  return (
    <li className={selected ? 'selected' : ''} onClick={() => onSelect(contact.id)}>
      {contact.name}
    </li>
  );
});

export function Panel({ contacts, onRender }: { contacts: Contact[]; onRender: (id: string) => void }) {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>Tick {tick}</button>
      <ul>
        {contacts.map((c) => (
          <Row key={c.id} contact={c} selected={selectedId === c.id} onSelect={handleSelect} onRender={onRender} />
        ))}
      </ul>
    </div>
  );
}

export default Panel;
```

### tests
```tsx
const contacts = [
  { id: 'a', name: 'Ava' },
  { id: 'b', name: 'Liam' },
  { id: 'c', name: 'Mia' },
  { id: 'd', name: 'Noah' },
];
const mount = async () => {
  const counts = {};
  const onRender = (id) => (counts[id] = (counts[id] ?? 0) + 1);
  const view = await render(<user.Panel contacts={contacts} onRender={onRender} />);
  return { view, counts, reset: () => Object.keys(counts).forEach((k) => delete counts[k]) };
};

test('renders every row once at first', async () => {
  const { counts } = await mount();
  expect(counts).toEqual({ a: 1, b: 1, c: 1, d: 1 });
});

test('the Tick button does not re-render any row', async () => {
  const { view, counts, reset } = await mount();
  reset();
  await click(view.$('button'));
  await click(view.$('button'));
  expect(view.$('button').textContent).toBe('Tick 2');
  expect(counts).toEqual({});
});

test('selecting a row marks it as selected', async () => {
  const { view } = await mount();
  await click(view.$$('li')[1]);
  expect(view.$$('li').map((li) => li.className)).toEqual(['', 'selected', '', '']);
});

test('selecting re-renders only the old and new rows', async () => {
  const { view, counts, reset } = await mount();
  await click(view.$$('li')[0]);
  reset();
  await click(view.$$('li')[2]);
  expect(counts).toEqual({ a: 1, c: 1 });
  expect(view.$$('li').map((li) => li.className)).toEqual(['', '', 'selected', '']);
});

test('clicking the selected row again re-renders nothing', async () => {
  const { view, counts, reset } = await mount();
  await click(view.$$('li')[0]);
  reset();
  await click(view.$$('li')[0]);
  expect(counts).toEqual({});
});
```

### explanation
Three changes work together. `memo(Row)` skips a row when its props are shallowly equal. `useCallback` gives every row the **same** `onSelect` function, because a new arrow function each render would make the props different and defeat `memo`. And passing `selected` (a boolean) instead of the shared `selectedId` means a row's props only change when *its own* selection state changes: when the selection moves from `a` to `c`, only those two rows get new `selected` values. This last trick, *pass derived primitives, not the whole shared state*, is what makes memoisation effective in lists.

### hints
- `const Row = memo(function Row(...) {...})`
- `const handleSelect = useCallback((id) => setSelectedId(id), [])`
- Pass `selected={selectedId === c.id}` rather than `selectedId`.

# practice: A virtual window

### meta
minutes: 8
language: ts

### prompt
Write and export `getVisibleRange({ scrollTop, viewportHeight, itemHeight, total, overscan = 3 })` for a fixed-row-height virtual list. It returns:

```ts
{ start: number; end: number; offsetTop: number; totalHeight: number }
```

- `start` (inclusive) and `end` (exclusive) are item indexes to render. Include `overscan` extra items before and after the visible rows.
- Clamp `start` to `0` and `end` to `total`.
- `offsetTop` is the pixel offset of the first rendered item: `start * itemHeight`.
- `totalHeight` is `total * itemHeight`.
- Handle `total = 0` (`start` and `end` both `0`) and negative or fractional `scrollTop` sensibly (treat negative as `0`).

### starter
```ts
export interface RangeInput {
  scrollTop: number;
  viewportHeight: number;
  itemHeight: number;
  total: number;
  overscan?: number;
}

export function getVisibleRange({ scrollTop, viewportHeight, itemHeight, total, overscan = 3 }: RangeInput) {
  // TODO
  return { start: 0, end: 0, offsetTop: 0, totalHeight: 0 };
}
```

### solution
```ts
export interface RangeInput {
  scrollTop: number;
  viewportHeight: number;
  itemHeight: number;
  total: number;
  overscan?: number;
}

export function getVisibleRange({ scrollTop, viewportHeight, itemHeight, total, overscan = 3 }: RangeInput) {
  const top = Math.max(0, scrollTop);
  const firstVisible = Math.floor(top / itemHeight);
  const lastVisible = Math.ceil((top + viewportHeight) / itemHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(total, lastVisible + overscan);

  return {
    start: Math.min(start, end),
    end,
    offsetTop: Math.min(start, end) * itemHeight,
    totalHeight: total * itemHeight,
  };
}
```

### tests
```ts
const base = { viewportHeight: 300, itemHeight: 30, total: 1000 };

test('at the top, renders the visible rows plus overscan below', () => {
  const r = user.getVisibleRange({ ...base, scrollTop: 0 });
  expect(r.start).toBe(0);
  expect(r.end).toBe(13);
  expect(r.offsetTop).toBe(0);
});

test('totalHeight keeps the scrollbar correct', () => {
  expect(user.getVisibleRange({ ...base, scrollTop: 0 }).totalHeight).toBe(30000);
});

test('scrolled into the middle', () => {
  const r = user.getVisibleRange({ ...base, scrollTop: 3000 });
  expect(r.start).toBe(97);
  expect(r.end).toBe(113);
  expect(r.offsetTop).toBe(97 * 30);
});

test('a partially visible first row is included', () => {
  const r = user.getVisibleRange({ ...base, scrollTop: 45, overscan: 0 });
  expect(r.start).toBe(1);
  expect(r.end).toBe(Math.ceil(345 / 30));
});

test('clamps at the end of the list', () => {
  const r = user.getVisibleRange({ ...base, scrollTop: 30000 - 300 });
  expect(r.end).toBe(1000);
  expect(r.start).toBe(990 - 3);
});

test('custom overscan', () => {
  const r = user.getVisibleRange({ ...base, scrollTop: 600, overscan: 10 });
  expect(r.start).toBe(10);
  expect(r.end).toBe(40);
});

test('an empty list', () => {
  const r = user.getVisibleRange({ ...base, total: 0, scrollTop: 0 });
  expect(r).toEqual({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
});

test('a short list renders everything', () => {
  const r = user.getVisibleRange({ ...base, total: 5, scrollTop: 0 });
  expect(r.start).toBe(0);
  expect(r.end).toBe(5);
});

test('negative scrollTop (overscroll) is treated as zero', () => {
  const r = user.getVisibleRange({ ...base, scrollTop: -80 });
  expect(r.start).toBe(0);
  expect(r.end).toBe(13);
});

test('renders far fewer items than the list holds', () => {
  const r = user.getVisibleRange({ viewportHeight: 600, itemHeight: 40, total: 100000, scrollTop: 123456 });
  expect(r.end - r.start).toBeLessThan(30);
});
```

### typetests
```ts
const r = getVisibleRange({ scrollTop: 0, viewportHeight: 100, itemHeight: 10, total: 5 });
const s: number = r.start;
const h: number = r.totalHeight;
// @ts-expect-error itemHeight is required
getVisibleRange({ scrollTop: 0, viewportHeight: 100, total: 5 });
```

### explanation
With fixed-height rows, which rows are visible is simple arithmetic: divide the scroll position by the row height to find the first visible row, and add the viewport height to find the last. Overscan (a few extra rows above and below) hides the blank flash that would otherwise show while scrolling fast. Keeping this a **pure function** means you can test every edge case (empty list, end of list, negative scroll) without a browser, and the component on top becomes trivial. Real libraries such as TanStack Virtual do the same thing and also support rows of varying height.

### hints
- `firstVisible = Math.floor(scrollTop / itemHeight)`; `lastVisible = Math.ceil((scrollTop + viewportHeight) / itemHeight)`.
- Subtract/add `overscan`, then clamp with `Math.max(0, ...)` and `Math.min(total, ...)`.
- `offsetTop = start * itemHeight`, `totalHeight = total * itemHeight`.

# challenge: A virtual list component

### meta
minutes: 10
language: tsx

### prompt
Build `VirtualList({ items, itemHeight, height, renderItem, overscan = 3 })`.

- Outer `<div role="list">` with `style={{ height, overflow: 'auto' }}` and an `onScroll` handler that stores `scrollTop` in state.
- Inside, a spacer `<div>` whose height is `items.length * itemHeight` (use `position: 'relative'`).
- Render **only** the visible window (use the `getVisibleRange` function provided below), each item wrapped in `<div role="listitem" style={{ position: 'absolute', top: index * itemHeight, height: itemHeight, left: 0, right: 0 }}>` and keyed by index.
- `renderItem(item, index)` returns the content.
- Changing the scroll position updates the window.

### starter
```tsx
import { useState, type ReactNode } from 'react';

function getVisibleRange({ scrollTop, viewportHeight, itemHeight, total, overscan = 3 }: { scrollTop: number; viewportHeight: number; itemHeight: number; total: number; overscan?: number }) {
  const top = Math.max(0, scrollTop);
  const start = Math.max(0, Math.floor(top / itemHeight) - overscan);
  const end = Math.min(total, Math.ceil((top + viewportHeight) / itemHeight) + overscan);
  return { start: Math.min(start, end), end };
}

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

export function VirtualList<T>({ items, itemHeight, height, renderItem, overscan = 3 }: VirtualListProps<T>) {
  // TODO
  return <div role="list" />;
}

export default function App() {
  const items = Array.from({ length: 10000 }, (_, i) => `Contact ${i + 1}`);
  return <VirtualList items={items} itemHeight={30} height={300} renderItem={(name) => <span>{name}</span>} />;
}
```

### solution
```tsx
import { useState, type ReactNode } from 'react';

function getVisibleRange({ scrollTop, viewportHeight, itemHeight, total, overscan = 3 }: { scrollTop: number; viewportHeight: number; itemHeight: number; total: number; overscan?: number }) {
  const top = Math.max(0, scrollTop);
  const start = Math.max(0, Math.floor(top / itemHeight) - overscan);
  const end = Math.min(total, Math.ceil((top + viewportHeight) / itemHeight) + overscan);
  return { start: Math.min(start, end), end };
}

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

export function VirtualList<T>({ items, itemHeight, height, renderItem, overscan = 3 }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const { start, end } = getVisibleRange({ scrollTop, viewportHeight: height, itemHeight, total: items.length, overscan });

  const rows = [];
  for (let index = start; index < end; index++) {
    rows.push(
      <div key={index} role="listitem" style={{ position: 'absolute', top: index * itemHeight, height: itemHeight, left: 0, right: 0 }}>
        {renderItem(items[index], index)}
      </div>,
    );
  }

  return (
    <div role="list" style={{ height, overflow: 'auto' }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>{rows}</div>
    </div>
  );
}

export default function App() {
  const items = Array.from({ length: 10000 }, (_, i) => `Contact ${i + 1}`);
  return <VirtualList items={items} itemHeight={30} height={300} renderItem={(name) => <span>{name}</span>} />;
}
```

### tests
```tsx
const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
const list = (view) => view.$('[role=list]');
const rows = (view) => view.$$('[role=listitem]');
const texts = (view) => rows(view).map((r) => r.textContent);

// Layout is not computed while the sandbox is hidden, so we set scrollTop directly on the element.
const scrollTo = async (el, top) => {
  Object.defineProperty(el, 'scrollTop', { value: top, configurable: true });
  el.dispatchEvent(new Event('scroll', { bubbles: true }));
  await flush();
};

const mount = () => render(<user.VirtualList items={items} itemHeight={30} height={300} renderItem={(item) => <span>{item}</span>} />);

test('renders only the visible window, not all 10,000 items', async () => {
  const view = await mount();
  expect(rows(view).length).toBeLessThan(30);
  expect(rows(view).length).toBeGreaterThan(9);
  expect(texts(view)[0]).toBe('Item 0');
});

test('the outer element is a scroll container with the given height', async () => {
  const view = await mount();
  expect(list(view).style.height).toBe('300px');
  expect(list(view).style.overflow).toBe('auto');
});

test('a spacer gives the scrollbar the full height', async () => {
  const view = await mount();
  expect(list(view).firstElementChild.style.height).toBe('300000px');
});

test('rows are absolutely positioned by index', async () => {
  const view = await mount();
  const second = rows(view)[1];
  expect(second.style.position).toBe('absolute');
  expect(second.style.top).toBe('30px');
  expect(second.style.height).toBe('30px');
});

test('scrolling changes which items are rendered', async () => {
  const view = await mount();
  await scrollTo(list(view), 3000);
  const t = texts(view);
  expect(t[0]).toBe('Item 97');
  expect(t).toContain('Item 100');
  expect(t).not.toContain('Item 0');
  expect(rows(view).length).toBeLessThan(30);
  expect(rows(view)[0].style.top).toBe(97 * 30 + 'px');
});

test('scrolling to the very end shows the last item', async () => {
  const view = await mount();
  await scrollTo(list(view), 300000 - 300);
  expect(texts(view)).toContain('Item 9999');
  expect(rows(view).length).toBeLessThan(30);
});

test('passes the item and index to renderItem', async () => {
  const seen = [];
  const view = await render(
    <user.VirtualList
      items={['a', 'b', 'c']}
      itemHeight={20}
      height={100}
      renderItem={(item, index) => {
        seen.push([item, index]);
        return <b>{item + index}</b>;
      }}
    />,
  );
  expect(texts(view)).toEqual(['a0', 'b1', 'c2']);
  expect(seen).toContainEqual(['b', 1]);
});

test('an empty list renders no rows', async () => {
  const view = await render(<user.VirtualList items={[]} itemHeight={20} height={100} renderItem={(x) => x} />);
  expect(rows(view)).toHaveLength(0);
  expect(list(view).firstElementChild.style.height).toBe('0px');
});
```

### typetests
```tsx
const ok = <VirtualList items={['a']} itemHeight={10} height={100} renderItem={(item) => item.toUpperCase()} />;
const nums = <VirtualList items={[1, 2]} itemHeight={10} height={100} renderItem={(n, i) => n + i} />;
// @ts-expect-error item type is inferred from items (a number has no toUpperCase)
const bad = <VirtualList items={[1]} itemHeight={10} height={100} renderItem={(n) => n.toUpperCase()} />;
```

### explanation
The component is a thin shell over the pure range calculation you wrote: it holds one piece of state (`scrollTop`), derives the window during render and renders only those rows. The inner spacer has the *full* height so the browser's scrollbar behaves as if all 10,000 items existed, and each visible row is placed with `position: absolute` at `index * itemHeight`. The generic parameter `<T>` lets `renderItem` receive correctly typed items. Using the item index as the key is acceptable here because rows are keyed by *position in the list*, which is exactly what a window scrolls over.

### hints
- `const [scrollTop, setScrollTop] = useState(0)` and `onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}`.
- Compute `{ start, end }` with the provided helper and loop from `start` to `end`.
- The spacer: `style={{ height: items.length * itemHeight, position: 'relative' }}`.
