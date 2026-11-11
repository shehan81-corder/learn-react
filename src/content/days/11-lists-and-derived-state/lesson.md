## A data table is a pipeline

Every serious CRM screen is a table: search it, filter it, sort it, page through it. The pattern is always the same, and it follows the rule you learned on Day 7: **store the minimum, derive the rest.**

```text
all contacts  →  filter (search + status)  →  sort  →  slice into a page  →  render rows
   (data)               (derived)           (derived)      (derived)
```

The only *state* is the user's choices: the search text, the status filter, the sort column and direction, and the current page. Everything else is calculated during render.

```tsx
const [query, setQuery] = useState('');
const [status, setStatus] = useState<'all' | ContactStatus>('all');
const [sort, setSort] = useState<{ key: keyof Contact; dir: 'asc' | 'desc' }>({ key: 'lastName', dir: 'asc' });
const [page, setPage] = useState(1);

const filtered = contacts.filter((c) => matches(c, query, status));
const sorted = sortBy(filtered, sort.key, sort.dir);
const { items: pageItems, totalPages } = paginate(sorted, page, 10);
```

> **The thinking pattern:** write each stage as a small *pure function* that takes a list and returns a list. Pure functions are easy to test and to reorder, and the component becomes a readable summary of the pipeline.

## Searching and filtering

```ts
const matches = (c: Contact, query: string, status: 'all' | ContactStatus) =>
  (status === 'all' || c.status === status) &&
  `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(query.trim().toLowerCase());
```

Normalise both sides (`toLowerCase`, `trim`) so "AVA " finds "Ava". For large datasets you would send the query to the server instead (Day 14), but the *UI state* looks identical.

## Sorting correctly

Three rules for sorting in React:

1. **Never sort state in place.** `array.sort()` mutates. Copy first: `[...items].sort(...)`.
2. **Compare the right way.** Subtracting works for numbers; strings need `localeCompare` (so "Émile" sorts sensibly and case does not matter).
3. **Decide where empty values go.** Usually last, in both directions.

A generic, type-safe sort uses `keyof` from Day 4, so a mistyped column name is a compile error:

```ts
function sortBy<T>(items: T[], key: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;                    // empty values last
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * sign;
  });
}
```

`Array.prototype.sort` is *stable* in modern JavaScript, so rows that compare equal keep their previous relative order. That is why "sort by status, then by name" works by sorting by name first.

For sortable headers, a click should: sort ascending by a new column, or flip the direction if the column is already active. Also expose it to assistive tech with `aria-sort="ascending" | "descending" | "none"` on the `<th>`.

## Pagination

```ts
function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);     // clamp!
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, totalPages, total };
}
```

The important line is the **clamp**. If you are on page 5 and a filter reduces the list to two pages, the stored `page` is now invalid. There are two bad fixes (an effect that resets the page, or forgetting and showing an empty table) and one good one: *clamp during render*, so an out-of-range page is simply treated as the last valid page. When the user types a new search you usually want page 1, so reset it in the **event handler**: `onChange={(e) => { setQuery(e.target.value); setPage(1); }}`.

## `useMemo`: only when it buys something

`useMemo(() => expensiveCalc(a, b), [a, b])` caches a result between renders. Sorting 50 rows takes microseconds, so memoising it adds complexity for nothing. Reach for `useMemo` when:

- the calculation is genuinely slow (thousands of rows, heavy maths), **measured** with the Profiler or `console.time`, or
- you need a *stable reference* (an array or object passed to a memoised child, or used as an effect dependency).

```tsx
const rows = useMemo(() => sortBy(filtered, sort.key, sort.dir), [filtered, sort]);
```

Notice the catch: `filtered` is a new array every render unless it is also memoised, so memoising only the last step does nothing. Memoisation is all-or-nothing along the chain, which is one more reason not to add it speculatively. Day 21 covers performance properly.

## Debouncing the search box

Typing "ava" should not trigger three filter-and-render passes (or three network calls once the data is on a server). A debounced value updates only after the user pauses typing. Yesterday's lesson already contained the recipe:

```tsx
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

The input shows `query` (instant, so typing feels responsive) while the *filter* uses `debouncedQuery`.

## Keys and identity in sorted lists

When the order changes, React uses `key` to decide which row moved. With `key={contact.id}` rows simply move. With `key={index}` React reuses the *same DOM element* for a different contact, which silently breaks things like focused inputs or per-row state. **Always key by a stable id, especially in sortable lists.**

## Walkthrough: from requirement to pipeline

*"Show deals in a table. Users can search by title, filter by stage, sort by value or close date, and see 10 per page."*

1. **State list:** `query`, `stage`, `sort` (`key` + `dir`), `page`. Four small pieces.
2. **Derived list:** `filter → sortBy → paginate`, each a pure function you can test alone.
3. **Event handlers reset the page** whenever the filter changes: write one `updateFilters` helper rather than repeating `setPage(1)`.
4. **Edge cases to handle explicitly:** zero results (show "No deals match" and "0 results", not "Page 1 of 0"), the last partial page, and ties in sort values.
5. **Accessible headers:** `<button>` inside `<th>`, with `aria-sort` on the `<th>`.

Do this on paper before coding and the component almost writes itself.

## CRM step: the real contacts table

Upgrade Nimbus CRM's contact list into a proper data table in `ContactsPage`:

1. Add `src/lib/tableUtils.ts` exporting generic `sortBy` and `paginate` (reuse Day 4's `keyof` ideas).
2. Add a debounced search (use your `useDebouncedValue` hook from `src/hooks/`) that matches name, email and company.
3. Add the status filter and clickable column headers (Name, Email, Status, Created) with `aria-sort`.
4. Paginate at 10 rows per page with Previous/Next buttons and "Showing 11–20 of 42".
5. Generate 60 sample contacts (a small loop in `sampleContacts.ts`) so paging is visible.

- [ ] `sortBy` and `paginate` are pure, generic functions
- [ ] Search is debounced and also matches company
- [ ] Headers sort and show `aria-sort`; the page resets when filters change
- [ ] Zero-result state shows a friendly message
