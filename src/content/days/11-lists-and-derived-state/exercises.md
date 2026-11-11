# practice: A generic sort

### meta
minutes: 7
language: ts

### prompt
Write and export `sortBy<T>(items, key, dir = 'asc')`.

- Returns a **new** sorted array; never mutates the input.
- Numbers compare numerically. Everything else compares as strings with `localeCompare`, ignoring case (`sensitivity: 'base'`).
- `dir` is `'asc'` or `'desc'`.
- `null` and `undefined` values always sort **last**, in both directions.
- Equal values keep their original relative order (stable).

### starter
```ts
export function sortBy<T>(items: T[], key: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  // TODO
  return items;
}
```

### solution
```ts
export function sortBy<T>(items: T[], key: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * sign;
  });
}
```

### tests
```ts
const people = [
  { id: 1, name: 'zoe', age: 30, team: 'b' },
  { id: 2, name: 'Ava', age: 25, team: 'a' },
  { id: 3, name: 'mia', age: 41, team: 'b' },
  { id: 4, name: 'Noah', age: null, team: 'a' },
];

test('sorts strings ignoring case', () => {
  expect(user.sortBy(people, 'name').map((p) => p.name)).toEqual(['Ava', 'mia', 'Noah', 'zoe']);
});

test('sorts descending', () => {
  expect(user.sortBy(people, 'name', 'desc').map((p) => p.name)).toEqual(['zoe', 'Noah', 'mia', 'Ava']);
});

test('sorts numbers numerically, not as text', () => {
  const nums = [{ n: 10 }, { n: 9 }, { n: 100 }];
  expect(user.sortBy(nums, 'n').map((x) => x.n)).toEqual([9, 10, 100]);
  expect(user.sortBy(nums, 'n', 'desc').map((x) => x.n)).toEqual([100, 10, 9]);
});

test('null values are always last', () => {
  expect(user.sortBy(people, 'age').map((p) => p.id)).toEqual([2, 1, 3, 4]);
  expect(user.sortBy(people, 'age', 'desc').map((p) => p.id)).toEqual([3, 1, 2, 4]);
});

test('is stable for equal values', () => {
  expect(user.sortBy(people, 'team').map((p) => p.id)).toEqual([2, 4, 1, 3]);
});

test('does not mutate the input', () => {
  const copy = people.map((p) => ({ ...p }));
  user.sortBy(people, 'name');
  expect(people).toEqual(copy);
});
```

### typetests
```ts
const sorted: { id: number; name: string }[] = sortBy([{ id: 1, name: 'a' }], 'name');
// @ts-expect-error not a key of the item type
sortBy([{ id: 1, name: 'a' }], 'age');
```

### explanation
`keyof T` restricts the column to real property names, so a typo is a compile error. Copying with `[...items]` before `sort` keeps the original array intact. The multiplier `sign` flips the comparison for descending order, but `null` handling happens *before* it is applied, which is why empty values stay last in both directions. Modern `Array.prototype.sort` is stable, so ties keep their original order.

### hints
- `const sign = dir === 'asc' ? 1 : -1;`
- Handle `null`/`undefined` first with early returns, before applying `sign`.
- `String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })`

# practice: Pagination

### meta
minutes: 7
language: ts

### prompt
Write and export `paginate<T>(items, page, pageSize)` returning:

```ts
{ items: T[]; page: number; pageSize: number; total: number; totalPages: number; from: number; to: number }
```

- `items`: the slice for that page.
- `totalPages` is at least `1`, even for an empty list.
- `page` is **clamped** into `1..totalPages` (so page 99 becomes the last page, and 0 or negative becomes 1).
- `from`/`to`: 1-based positions of the first and last visible item (`0` and `0` for an empty list).

### starter
```ts
export function paginate<T>(items: T[], page: number, pageSize: number) {
  // TODO
  return { items: [] as T[], page: 1, pageSize, total: 0, totalPages: 1, from: 0, to: 0 };
}
```

### solution
```ts
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page: current,
    pageSize,
    total,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: total === 0 ? 0 : start + slice.length,
  };
}
```

### tests
```ts
const list = Array.from({ length: 23 }, (_, i) => i + 1);

test('returns the requested page', () => {
  const p = user.paginate(list, 2, 10);
  expect(p.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  expect(p.page).toBe(2);
  expect(p.totalPages).toBe(3);
  expect(p.total).toBe(23);
});

test('the last page can be partial', () => {
  const p = user.paginate(list, 3, 10);
  expect(p.items).toEqual([21, 22, 23]);
  expect(p.from).toBe(21);
  expect(p.to).toBe(23);
});

test('from/to for a full page', () => {
  const p = user.paginate(list, 1, 10);
  expect(p.from).toBe(1);
  expect(p.to).toBe(10);
});

test('clamps an out-of-range page', () => {
  expect(user.paginate(list, 99, 10).page).toBe(3);
  expect(user.paginate(list, 0, 10).page).toBe(1);
  expect(user.paginate(list, -4, 10).page).toBe(1);
  expect(user.paginate(list, 99, 10).items).toEqual([21, 22, 23]);
});

test('an empty list still has one page', () => {
  const p = user.paginate([], 3, 10);
  expect(p).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 1, from: 0, to: 0 });
});

test('exact multiples do not create an extra page', () => {
  expect(user.paginate(list.slice(0, 20), 1, 10).totalPages).toBe(2);
});

test('does not mutate the input', () => {
  const copy = [...list];
  user.paginate(list, 2, 10);
  expect(list).toEqual(copy);
});
```

### typetests
```ts
const p = paginate(['a', 'b'], 1, 1);
const first: string = p.items[0];
const pages: number = p.totalPages;
```

### explanation
The clamp is the heart of it: whatever page number the UI holds, the function turns it into a valid one, so a filter that shrinks the list can never leave you on page 5 of 2. `Math.max(1, Math.ceil(total / pageSize))` guarantees at least one page, which avoids the awkward "Page 1 of 0". Returning the clamped `page` lets the caller display the *real* page number.

### hints
- `Math.ceil(total / pageSize)` gives the page count; wrap in `Math.max(1, ...)`.
- Clamp with `Math.min(Math.max(1, page), totalPages)`.
- `items.slice(start, start + pageSize)` where `start = (page - 1) * pageSize`.

# practice: A debounced value hook

### meta
minutes: 7
language: tsx

### prompt
Write the hook `useDebouncedValue(value, delayMs)`. It returns the *latest* `value`, but only after `value` has stopped changing for `delayMs` milliseconds. Until then it keeps returning the previous settled value. On the first render it returns `value` immediately.

Pending timers must be cancelled when the value changes again, when `delayMs` changes, and on unmount.

(The tests use a fake clock, so you do not have to wait.)

### starter
```tsx
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  // TODO
  return value;
}

export function SearchPreview({ query }: { query: string }) {
  const debounced = useDebouncedValue(query, 300);
  return (
    <p>
      typed: {query} · searching: {debounced}
    </p>
  );
}

export default function App() {
  return <SearchPreview query="ava" />;
}
```

### solution
```tsx
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

export function SearchPreview({ query }: { query: string }) {
  const debounced = useDebouncedValue(query, 300);
  return (
    <p>
      typed: {query} · searching: {debounced}
    </p>
  );
}

export default function App() {
  return <SearchPreview query="ava" />;
}
```

### tests
```tsx
function Probe({ value, delay = 300 }) {
  const v = user.useDebouncedValue(value, delay);
  return <p>{v}</p>;
}
const text = (view) => view.$('p').textContent;

test('returns the value immediately on the first render', async () => {
  useFakeTimers();
  const view = await render(<Probe value="a" />);
  expect(text(view)).toBe('a');
});

test('waits for the delay before updating', async () => {
  const timers = useFakeTimers();
  const view = await render(<Probe value="a" />);
  await view.rerender(<Probe value="ab" />);
  expect(text(view)).toBe('a');
  await timers.advance(299);
  expect(text(view)).toBe('a');
  await timers.advance(1);
  expect(text(view)).toBe('ab');
});

test('a quick series of changes only settles on the last one', async () => {
  const timers = useFakeTimers();
  const view = await render(<Probe value="a" />);
  await view.rerender(<Probe value="ab" />);
  await timers.advance(100);
  await view.rerender(<Probe value="abc" />);
  await timers.advance(100);
  await view.rerender(<Probe value="abcd" />);
  await timers.advance(299);
  expect(text(view)).toBe('a');
  await timers.advance(1);
  expect(text(view)).toBe('abcd');
});

test('leaves no timers behind after unmount', async () => {
  const timers = useFakeTimers();
  const view = await render(<Probe value="a" />);
  await view.rerender(<Probe value="b" />);
  expect(timers.pending()).toBe(1);
  view.unmount();
  await flush();
  expect(timers.pending()).toBe(0);
});

test('works with non-string values', async () => {
  const timers = useFakeTimers();
  function NumProbe({ n }) {
    return <p>{user.useDebouncedValue(n, 50)}</p>;
  }
  const view = await render(<NumProbe n={1} />);
  await view.rerender(<NumProbe n={2} />);
  await timers.advance(50);
  expect(text(view)).toBe('2');
});
```

### typetests
```tsx
function Check() {
  const s: string = useDebouncedValue('x', 100);
  const n: number = useDebouncedValue(1, 100);
  // @ts-expect-error the return type follows the input type
  const wrong: number = useDebouncedValue('x', 100);
  return null;
}
```

### explanation
Debouncing is *synchronising a delayed copy of a value with the real one*. Each time `value` changes, the effect schedules an update, and its **cleanup cancels the previous schedule**, which is the entire algorithm: only a value that survives `delayMs` without being replaced reaches `setDebounced`. The generic `<T>` makes the hook work for strings, numbers or objects, and keeps the return type tied to the input type.

### hints
- `const [debounced, setDebounced] = useState(value);`
- In an effect: `const id = setTimeout(() => setDebounced(value), delayMs);`
- `return () => clearTimeout(id);` is what makes it a debounce.
- Dependencies: `[value, delayMs]`.

# challenge: A full data table

### meta
minutes: 10
language: tsx

### prompt
Build `ContactTable({ contacts, pageSize = 3 })` with all the pieces from today.

- **Search:** an input with `aria-label="Search"`; matches name or email, case-insensitive.
- **Filter:** a `<select aria-label="Status">` with options `all`, `lead`, `customer`, `churned`.
- **Sort:** the `Name` and `Email` headers each contain a `<button>` with that text. Clicking an inactive column sorts it ascending; clicking the active column flips the direction. The `<th>` has `aria-sort` of `ascending`, `descending` or `none`. With no sort selected the rows keep their original order.
- **Pagination:** `<p>Showing X–Y of Z</p>` (use an en dash), a `<span>Page N of M</span>`, and **Previous** / **Next** buttons that are disabled at the ends.
- Changing the search or the status filter returns to page 1.
- With no matches show `<p>No contacts match</p>` instead of the summary and no rows.

Rows are `<tr>` elements in `<tbody>` with the name in the first cell.

### starter
```tsx
import { useState } from 'react';

export interface Contact {
  id: number;
  name: string;
  email: string;
  status: 'lead' | 'customer' | 'churned';
}

export function ContactTable({ contacts, pageSize = 3 }: { contacts: Contact[]; pageSize?: number }) {
  // TODO
  return <table />;
}

export default function App() {
  return (
    <ContactTable
      contacts={[
        { id: 1, name: 'Zoe Adams', email: 'zoe@x.com', status: 'lead' },
        { id: 2, name: 'Ava Nguyen', email: 'ava@x.com', status: 'customer' },
        { id: 3, name: 'Mia Patel', email: 'mia@x.com', status: 'customer' },
        { id: 4, name: 'Liam Smith', email: 'liam@x.com', status: 'lead' },
      ]}
    />
  );
}
```

### solution
```tsx
import { useState } from 'react';

export interface Contact {
  id: number;
  name: string;
  email: string;
  status: 'lead' | 'customer' | 'churned';
}

type SortKey = 'name' | 'email';
type Dir = 'asc' | 'desc';

export function ContactTable({ contacts, pageSize = 3 }: { contacts: Contact[]; pageSize?: number }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Contact['status']>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir } | null>(null);
  const [page, setPage] = useState(1);

  const q = query.trim().toLowerCase();
  const filtered = contacts.filter(
    (c) => (status === 'all' || c.status === status) && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
  );
  const sorted = sort
    ? [...filtered].sort((a, b) => a[sort.key].localeCompare(b[sort.key], undefined, { sensitivity: 'base' }) * (sort.dir === 'asc' ? 1 : -1))
    : filtered;

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const ariaSort = (key: SortKey) => (sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');

  return (
    <div>
      <input
        aria-label="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
      />
      <select
        aria-label="Status"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as 'all' | Contact['status']);
          setPage(1);
        }}
      >
        <option value="all">all</option>
        <option value="lead">lead</option>
        <option value="customer">customer</option>
        <option value="churned">churned</option>
      </select>
      <table>
        <thead>
          <tr>
            <th aria-sort={ariaSort('name')}>
              <button onClick={() => toggleSort('name')}>Name</button>
            </th>
            <th aria-sort={ariaSort('email')}>
              <button onClick={() => toggleSort('email')}>Email</button>
            </th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total === 0 ? (
        <p>No contacts match</p>
      ) : (
        <p>
          Showing {start + 1}–{start + rows.length} of {total}
        </p>
      )}
      <button onClick={() => setPage(current - 1)} disabled={current <= 1}>
        Previous
      </button>
      <span>
        Page {current} of {totalPages}
      </span>
      <button onClick={() => setPage(current + 1)} disabled={current >= totalPages}>
        Next
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ContactTable
      contacts={[
        { id: 1, name: 'Zoe Adams', email: 'zoe@x.com', status: 'lead' },
        { id: 2, name: 'Ava Nguyen', email: 'ava@x.com', status: 'customer' },
        { id: 3, name: 'Mia Patel', email: 'mia@x.com', status: 'customer' },
        { id: 4, name: 'Liam Smith', email: 'liam@x.com', status: 'lead' },
      ]}
    />
  );
}
```

### tests
```tsx
const data = [
  { id: 1, name: 'Zoe Adams', email: 'zoe@x.com', status: 'lead' },
  { id: 2, name: 'Ava Nguyen', email: 'ava@x.com', status: 'customer' },
  { id: 3, name: 'Mia Patel', email: 'mia@x.com', status: 'customer' },
  { id: 4, name: 'Liam Smith', email: 'liam@x.com', status: 'lead' },
  { id: 5, name: 'Noah Chen', email: 'noah@x.com', status: 'churned' },
  { id: 6, name: 'Isla Young', email: 'isla@x.com', status: 'customer' },
  { id: 7, name: 'Jack King', email: 'jack@x.com', status: 'lead' },
];
const names = (view) => view.$$('tbody tr').map((tr) => tr.querySelector('td').textContent);
const summary = (view) => view.$$('p').map((p) => p.textContent)[0];
const page = (view) => view.$('span').textContent;
const btn = (view, name) => view.getByRole('button', { name });
const th = (view, label) => view.$$('th').find((h) => h.textContent === label);

test('shows the first page in the original order', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  expect(names(view)).toEqual(['Zoe Adams', 'Ava Nguyen', 'Mia Patel']);
  expect(summary(view)).toBe('Showing 1–3 of 7');
  expect(page(view)).toBe('Page 1 of 3');
  expect(btn(view, 'Previous').disabled).toBe(true);
  expect(btn(view, 'Next').disabled).toBe(false);
});

test('Next and Previous move between pages and disable at the ends', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  await click(btn(view, 'Next'));
  expect(names(view)).toEqual(['Liam Smith', 'Noah Chen', 'Isla Young']);
  await click(btn(view, 'Next'));
  expect(names(view)).toEqual(['Jack King']);
  expect(summary(view)).toBe('Showing 7–7 of 7');
  expect(btn(view, 'Next').disabled).toBe(true);
  await click(btn(view, 'Previous'));
  expect(page(view)).toBe('Page 2 of 3');
});

test('sorts by name, flips direction and reports aria-sort', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  expect(th(view, 'Name').getAttribute('aria-sort')).toBe('none');
  await click(btn(view, 'Name'));
  expect(names(view)).toEqual(['Ava Nguyen', 'Isla Young', 'Jack King']);
  expect(th(view, 'Name').getAttribute('aria-sort')).toBe('ascending');
  await click(btn(view, 'Name'));
  expect(names(view)).toEqual(['Zoe Adams', 'Noah Chen', 'Mia Patel']);
  expect(th(view, 'Name').getAttribute('aria-sort')).toBe('descending');
  await click(btn(view, 'Email'));
  expect(th(view, 'Name').getAttribute('aria-sort')).toBe('none');
  expect(th(view, 'Email').getAttribute('aria-sort')).toBe('ascending');
});

test('search matches name or email, ignoring case', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  await type(view.getByRole('textbox', { name: 'Search' }), 'SMITH');
  expect(names(view)).toEqual(['Liam Smith']);
  expect(summary(view)).toBe('Showing 1–1 of 1');
  expect(page(view)).toBe('Page 1 of 1');
  await type(view.getByRole('textbox', { name: 'Search' }), 'jack@');
  expect(names(view)).toEqual(['Jack King']);
});

test('status filter', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  await type(view.getByRole('combobox', { name: 'Status' }), 'customer');
  expect(names(view)).toEqual(['Ava Nguyen', 'Mia Patel', 'Isla Young']);
  expect(summary(view)).toBe('Showing 1–3 of 3');
});

test('changing a filter returns to page 1', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  await click(btn(view, 'Next'));
  await click(btn(view, 'Next'));
  expect(page(view)).toBe('Page 3 of 3');
  await type(view.getByRole('textbox', { name: 'Search' }), 'a');
  expect(page(view).startsWith('Page 1 of')).toBe(true);
  await click(btn(view, 'Next'));
  await type(view.getByRole('combobox', { name: 'Status' }), 'lead');
  expect(page(view)).toBe('Page 1 of 1');
});

test('no matches', async () => {
  const view = await render(<user.ContactTable contacts={data} />);
  await type(view.getByRole('textbox', { name: 'Search' }), 'zzz');
  expect(names(view)).toEqual([]);
  expect(summary(view)).toBe('No contacts match');
  expect(page(view)).toBe('Page 1 of 1');
});

test('respects a custom pageSize', async () => {
  const view = await render(<user.ContactTable contacts={data} pageSize={5} />);
  expect(names(view)).toHaveLength(5);
  expect(page(view)).toBe('Page 1 of 2');
});
```

### typetests
```tsx
const ok = <ContactTable contacts={[{ id: 1, name: 'A', email: 'a@b.c', status: 'lead' }]} pageSize={2} />;
// @ts-expect-error status must be a known status
const bad = <ContactTable contacts={[{ id: 1, name: 'A', email: 'a@b.c', status: 'x' }]} />;
```

### explanation
Notice how little state there is: `query`, `status`, `sort` and `page`. Every other value (`filtered`, `sorted`, `rows`, `total`, `totalPages`, even the "Showing" text) is derived in the component body, so it can never go stale. The page is *clamped during render* (`current`), which prevents an out-of-range page after filtering, and handlers also reset it to 1 so users get the behaviour they expect. The `toggleSort` updater shows the three-way rule: same column flips direction, a new column starts ascending. `aria-sort` on `<th>` exposes the state to assistive technology.

### hints
- State: `query`, `status`, `sort` (`{ key, dir } | null`), `page`.
- Pipeline: filter, then sort (copy first), then slice.
- Clamp the page: `Math.min(Math.max(1, page), totalPages)`.
- In `onChange` of the search and status controls also call `setPage(1)`.
