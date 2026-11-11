# practice: Destructure and spread

### meta
minutes: 7

### prompt
Implement and export three functions. None of them may mutate its input.

1. `summary({ firstName, lastName, company })` returns `"First Last (Company)"`. If `company` is missing, return `"First Last (no company)"`. Destructure in the parameter list.
2. `withStatus(contact, status)` returns a **new** contact with `status` replaced.
3. `omit(obj, key)` returns a new object with one key removed. Use rest syntax.

### starter
```js
export function summary(contact) {
  // TODO: destructure in the parameter list and use a default
}

export function withStatus(contact, status) {
  // TODO: spread
}

export function omit(obj, key) {
  // TODO: rest syntax with a computed key is tricky, see the hints
}
```

### solution
```js
export function summary({ firstName, lastName, company = 'no company' }) {
  return `${firstName} ${lastName} (${company})`;
}

export function withStatus(contact, status) {
  return { ...contact, status };
}

export function omit(obj, key) {
  const { [key]: _removed, ...rest } = obj;
  return rest;
}
```

### tests
```js
test('summary formats the name and company', () => {
  expect(user.summary({ firstName: 'Ava', lastName: 'Nguyen', company: 'Acme' })).toBe('Ava Nguyen (Acme)');
});

test('summary falls back when there is no company', () => {
  expect(user.summary({ firstName: 'Liam', lastName: 'Smith' })).toBe('Liam Smith (no company)');
});

test('withStatus returns a new object with the new status', () => {
  const original = { id: 1, name: 'Ava', status: 'lead' };
  const next = user.withStatus(original, 'customer');
  expect(next).toEqual({ id: 1, name: 'Ava', status: 'customer' });
  expect(next).not.toBe(original);
  expect(original.status).toBe('lead');
});

test('omit removes one key without mutating', () => {
  const original = { a: 1, b: 2, c: 3 };
  expect(user.omit(original, 'b')).toEqual({ a: 1, c: 3 });
  expect(original).toEqual({ a: 1, b: 2, c: 3 });
});
```

### explanation
Default values in a destructuring pattern (`company = 'no company'`) apply only when the property is `undefined`. `{ ...contact, status }` copies every property and then overrides `status`; order matters, later keys win. For `omit`, a computed key in a destructuring pattern (`{ [key]: _removed, ...rest }`) pulls out the dynamic key and leaves everything else in `rest`.

### hints
- `function summary({ firstName, lastName, company = 'no company' })`
- `{ ...contact, status }` is shorthand for `{ ...contact, status: status }`.
- `const { [key]: removed, ...rest } = obj;` then return `rest`.

# practice: Immutable list updates

### meta
minutes: 7

### prompt
Write the three list helpers every React app needs. Each returns a **new** array and leaves the input untouched.

- `addItem(list, item)` appends an item.
- `removeItem(list, id)` removes the item whose `id` matches.
- `updateItem(list, id, patch)` merges `patch` into the item whose `id` matches; other items are returned unchanged.

Also write `sortByName(list)` which returns a new array sorted by `name` using `localeCompare`.

### starter
```js
export function addItem(list, item) {
  // TODO
}

export function removeItem(list, id) {
  // TODO
}

export function updateItem(list, id, patch) {
  // TODO
}

export function sortByName(list) {
  // TODO
}
```

### solution
```js
export function addItem(list, item) {
  return [...list, item];
}

export function removeItem(list, id) {
  return list.filter((item) => item.id !== id);
}

export function updateItem(list, id, patch) {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function sortByName(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}
```

### tests
```js
const list = () => [
  { id: 1, name: 'Zoe' },
  { id: 2, name: 'Ava' },
  { id: 3, name: 'Mia' },
];

test('addItem appends without mutating', () => {
  const l = list();
  const next = user.addItem(l, { id: 4, name: 'Noah' });
  expect(next).toHaveLength(4);
  expect(next[3]).toEqual({ id: 4, name: 'Noah' });
  expect(l).toHaveLength(3);
});

test('removeItem removes by id without mutating', () => {
  const l = list();
  const next = user.removeItem(l, 2);
  expect(next.map((i) => i.id)).toEqual([1, 3]);
  expect(l).toHaveLength(3);
});

test('updateItem merges a patch into one item only', () => {
  const l = list();
  const next = user.updateItem(l, 3, { name: 'Mia B.', vip: true });
  expect(next[2]).toEqual({ id: 3, name: 'Mia B.', vip: true });
  expect(next[0]).toBe(l[0]);
  expect(l[2]).toEqual({ id: 3, name: 'Mia' });
});

test('sortByName sorts a copy', () => {
  const l = list();
  const sorted = user.sortByName(l);
  expect(sorted.map((i) => i.name)).toEqual(['Ava', 'Mia', 'Zoe']);
  expect(l.map((i) => i.name)).toEqual(['Zoe', 'Ava', 'Mia']);
});
```

### explanation
Each helper maps to one of the non-mutating tools: spread to append, `filter` to remove, `map` to update. `updateItem` returns the *same object* for items it did not touch, which is why `next[0]` is identical (`toBe`) to `l[0]`. React relies on that to skip re-rendering unchanged rows. `sort` mutates, so copy first with `[...list]`.

### hints
- `[...list, item]`
- `filter` keeps items where the callback returns true, so keep the ones whose id does NOT match.
- `map` with a ternary: return `{ ...item, ...patch }` for the match, `item` otherwise.
- `sort` changes the array it is called on. Copy it first.

# practice: Async and error handling

### meta
minutes: 8

### prompt
You are given a `fetcher(id)` function that returns a promise. Export:

1. `safeLoad(fetcher, id)`: an async function that returns `{ data }` on success or `{ error }` (the error message string) if the fetcher rejects. It must never throw.
2. `loadMany(fetcher, ids)`: loads all ids **in parallel** and returns an array of the results in the same order. If any fails, it rejects.
3. `loadSettled(fetcher, ids)`: loads in parallel and returns `{ ok: [...values], failed: [...ids] }`, so one failure does not lose the others. Use `Promise.allSettled`.

### starter
```js
export async function safeLoad(fetcher, id) {
  // TODO: try/catch around await
}

export function loadMany(fetcher, ids) {
  // TODO: Promise.all
}

export async function loadSettled(fetcher, ids) {
  // TODO: Promise.allSettled
}
```

### solution
```js
export async function safeLoad(fetcher, id) {
  try {
    const data = await fetcher(id);
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export function loadMany(fetcher, ids) {
  return Promise.all(ids.map((id) => fetcher(id)));
}

export async function loadSettled(fetcher, ids) {
  const results = await Promise.allSettled(ids.map((id) => fetcher(id)));
  const ok = [];
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok.push(r.value);
    else failed.push(ids[i]);
  });
  return { ok, failed };
}
```

### tests
```js
const good = async (id) => ({ id, name: `User ${id}` });
const flaky = async (id) => {
  if (id === 2) throw new Error('boom');
  return { id };
};

test('safeLoad returns data on success', async () => {
  expect(await user.safeLoad(good, 1)).toEqual({ data: { id: 1, name: 'User 1' } });
});

test('safeLoad returns the error message and does not throw', async () => {
  expect(await user.safeLoad(flaky, 2)).toEqual({ error: 'boom' });
});

test('loadMany keeps order', async () => {
  expect(await user.loadMany(good, [3, 1, 2])).toEqual([
    { id: 3, name: 'User 3' },
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' },
  ]);
});

test('loadMany runs requests in parallel', async () => {
  let active = 0;
  let maxActive = 0;
  const slow = async (id) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await sleep(20);
    active--;
    return id;
  };
  await user.loadMany(slow, [1, 2, 3, 4]);
  expect(maxActive).toBeGreaterThan(1);
});

test('loadMany rejects if any request fails', async () => {
  let rejected = false;
  try {
    await user.loadMany(flaky, [1, 2, 3]);
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
});

test('loadSettled separates successes and failures', async () => {
  expect(await user.loadSettled(flaky, [1, 2, 3])).toEqual({ ok: [{ id: 1 }, { id: 3 }], failed: [2] });
});
```

### explanation
`await` inside `try` turns a rejected promise into a catchable exception, so `safeLoad` can convert failures into a value. `Promise.all` starts every request immediately (that is why `ids.map` is called before awaiting) and rejects on the first failure. `Promise.allSettled` never rejects; each entry is `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`, so you can report partial success, which is useful for dashboards that load several widgets.

### hints
- Wrap `await fetcher(id)` in `try { } catch (err) { }` and return different shapes.
- `ids.map((id) => fetcher(id))` creates the array of promises.
- `Promise.allSettled` gives objects with a `status` field: `'fulfilled'` or `'rejected'`.

# challenge: Normalise an API page

### meta
minutes: 10

### prompt
The API returns contacts in a nested, messy shape. Export `normalise(response)` that returns an array of clean rows:

```js
{ id, name, email, status, companyName, tags }
```

Rules:

- `response.data` may be missing: treat it as an empty list.
- `name` is `"First Last"`.
- `email` is lower-cased and trimmed.
- `companyName` is `company.name`, or `"No company"` when `company` is `null`/missing.
- `tags` defaults to `[]`.
- **Remove duplicates by email** (keep the first one).
- Sort the result by `name` (A to Z).
- Do not mutate `response`.

### starter
```js
export function normalise(response) {
  // TODO
}
```

### solution
```js
export function normalise(response) {
  const { data = [] } = response ?? {};

  const rows = data.map(({ id, firstName, lastName, email, status, company, tags = [] }) => ({
    id,
    name: `${firstName} ${lastName}`,
    email: email.trim().toLowerCase(),
    status,
    companyName: company?.name ?? 'No company',
    tags,
  }));

  const seen = new Set();
  const unique = rows.filter((row) => {
    if (seen.has(row.email)) return false;
    seen.add(row.email);
    return true;
  });

  return unique.sort((a, b) => a.name.localeCompare(b.name));
}
```

### tests
```js
const sample = () => ({
  data: [
    { id: 'c2', firstName: 'Liam', lastName: 'Smith', email: ' LIAM@example.com ', status: 'customer', company: null },
    { id: 'c1', firstName: 'Ava', lastName: 'Nguyen', email: 'ava@example.com', status: 'lead', company: { name: 'Acme' }, tags: ['vip'] },
    { id: 'c3', firstName: 'Liam', lastName: 'S.', email: 'liam@example.com', status: 'lead', company: { name: 'Dup Co' } },
  ],
  total: 3,
});

test('maps and cleans each record', () => {
  const rows = user.normalise(sample());
  expect(rows[0]).toEqual({ id: 'c1', name: 'Ava Nguyen', email: 'ava@example.com', status: 'lead', companyName: 'Acme', tags: ['vip'] });
});

test('defaults company and tags', () => {
  const rows = user.normalise(sample());
  const liam = rows.find((r) => r.id === 'c2');
  expect(liam.companyName).toBe('No company');
  expect(liam.tags).toEqual([]);
  expect(liam.email).toBe('liam@example.com');
});

test('removes duplicate emails, keeping the first', () => {
  const rows = user.normalise(sample());
  expect(rows).toHaveLength(2);
  expect(rows.some((r) => r.id === 'c3')).toBe(false);
});

test('sorts by name', () => {
  const rows = user.normalise(sample());
  expect(rows.map((r) => r.name)).toEqual(['Ava Nguyen', 'Liam Smith']);
});

test('handles a missing data property', () => {
  expect(user.normalise({})).toEqual([]);
  expect(user.normalise({ total: 0 })).toEqual([]);
});

test('does not mutate the response', () => {
  const input = sample();
  const before = JSON.stringify(input);
  user.normalise(input);
  expect(JSON.stringify(input)).toBe(before);
});
```

### explanation
Break the problem into the same small steps you would use on paper: pull out the list with a default, `map` to the new shape (destructuring in the callback parameter keeps it readable), de-duplicate with a `Set` of seen keys, then sort. Normalising the email *before* de-duplicating matters: `' LIAM@example.com '` and `liam@example.com` are the same person. `sort` runs last on the array `filter` already created, so the input is never mutated.

### hints
- Start with `const { data = [] } = response ?? {};`
- `company?.name ?? 'No company'`
- Use a `Set` to remember emails you have already seen inside `filter`.
- Normalise the email before checking for duplicates.
