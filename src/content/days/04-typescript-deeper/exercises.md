# practice: Narrow with checks

### meta
minutes: 6
language: ts

### prompt
Write three functions. The signatures are given; use narrowing so the bodies type-check without casts (`as`) or `any`.

- `display(value)`: for `string | number | null | undefined` returns the string for strings, `value.toFixed(1)` for numbers and `'-'` for `null`/`undefined`.
- `lengthOf(value)`: for `string | string[]` returns the length of a string, or the number of items of an array.
- `hasStatus(item)`: for `{ status: string } | { type: string }` returns `true` only when the object has a `status` property (use the `in` operator).

### starter
```ts
export function display(value: string | number | null | undefined): string {
  // TODO
}

export function lengthOf(value: string | string[]): number {
  // TODO
}

export function hasStatus(item: { status: string } | { type: string }): boolean {
  // TODO
}
```

### solution
```ts
export function display(value: string | number | null | undefined): string {
  if (value == null) return '-';
  if (typeof value === 'number') return value.toFixed(1);
  return value;
}

export function lengthOf(value: string | string[]): number {
  return Array.isArray(value) ? value.length : value.length;
}

export function hasStatus(item: { status: string } | { type: string }): boolean {
  return 'status' in item;
}
```

### tests
```ts
test('display', () => {
  expect(user.display('Ava')).toBe('Ava');
  expect(user.display(3)).toBe('3.0');
  expect(user.display(2.25)).toBe('2.3');
  expect(user.display(null)).toBe('-');
  expect(user.display(undefined)).toBe('-');
});

test('lengthOf', () => {
  expect(user.lengthOf('hello')).toBe(5);
  expect(user.lengthOf(['a', 'b'])).toBe(2);
});

test('hasStatus', () => {
  expect(user.hasStatus({ status: 'ok' })).toBe(true);
  expect(user.hasStatus({ type: 'call' })).toBe(false);
});
```

### explanation
`value == null` is the one place a loose comparison is idiomatic: it is true for both `null` and `undefined`. After that check TypeScript removes both from the union; after the `typeof` check only `string` remains, so `return value` type-checks. For `lengthOf`, both branches happen to be identical because strings and arrays both have `.length`; the narrowing exercise is that the code compiles either way, which shows that TypeScript only requires the *property* you use to exist on every member. `'status' in item` narrows the union to the member that has that property.

### hints
- `value == null` covers null and undefined at once.
- After `typeof value === 'number'` returns, the remaining type is `string`.
- Use the `in` operator: `'status' in item`.

# practice: Discriminated unions

### meta
minutes: 8
language: ts

### prompt
Model the result of loading a contact list as a discriminated union and write functions over it.

Export the type `LoadState`:

```ts
{ status: 'idle' } | { status: 'loading' } | { status: 'success'; data: string[] } | { status: 'error'; message: string }
```

Then implement:

- `label(state)`: `'Press load'`, `'Loading…'`, `'<n> items'` (e.g. `'3 items'`), or `'Failed: <message>'`.
- `isBusy(state)`: `true` only while loading.
- `dataOr(state, fallback)`: returns `state.data` when successful, otherwise `fallback`.

`label` must use a `switch` with a `default` branch that calls `assertNever` (provided) so adding a new variant later is a compile error.

### starter
```ts
export type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };

function assertNever(x: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(x)}`);
}

export function label(state: LoadState): string {
  // TODO: switch on state.status
}

export function isBusy(state: LoadState): boolean {
  // TODO
}

export function dataOr(state: LoadState, fallback: string[]): string[] {
  // TODO
}
```

### solution
```ts
export type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };

function assertNever(x: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(x)}`);
}

export function label(state: LoadState): string {
  switch (state.status) {
    case 'idle':
      return 'Press load';
    case 'loading':
      return 'Loading…';
    case 'success':
      return `${state.data.length} items`;
    case 'error':
      return `Failed: ${state.message}`;
    default:
      return assertNever(state);
  }
}

export function isBusy(state: LoadState): boolean {
  return state.status === 'loading';
}

export function dataOr(state: LoadState, fallback: string[]): string[] {
  return state.status === 'success' ? state.data : fallback;
}
```

### tests
```ts
test('label covers every state', () => {
  expect(user.label({ status: 'idle' })).toBe('Press load');
  expect(user.label({ status: 'loading' })).toBe('Loading…');
  expect(user.label({ status: 'success', data: ['a', 'b', 'c'] })).toBe('3 items');
  expect(user.label({ status: 'error', message: 'timeout' })).toBe('Failed: timeout');
});

test('isBusy', () => {
  expect(user.isBusy({ status: 'loading' })).toBe(true);
  expect(user.isBusy({ status: 'idle' })).toBe(false);
  expect(user.isBusy({ status: 'success', data: [] })).toBe(false);
});

test('dataOr', () => {
  expect(user.dataOr({ status: 'success', data: ['x'] }, ['fallback'])).toEqual(['x']);
  expect(user.dataOr({ status: 'error', message: 'e' }, ['fallback'])).toEqual(['fallback']);
});
```

### typetests
```ts
const s: LoadState = { status: 'success', data: ['a'] };
// @ts-expect-error success requires data
const noData: LoadState = { status: 'success' };
// @ts-expect-error an error state has no data property
const mixed: LoadState = { status: 'error', message: 'x', data: [] };
```

### explanation
Inside `case 'success'` the compiler knows `state` is the success variant, so `state.data` is legal; in the other branches it is not. In the `default` branch every variant has been handled, so `state` has type `never`, which is what `assertNever` accepts. Delete one `case` and the compiler errors at `assertNever(state)`, pointing out the unhandled variant. The ternary in `dataOr` narrows the same way.

### hints
- `switch (state.status) { case 'idle': ... }`
- In `default`, `return assertNever(state)` compiles only if all cases are handled.
- `state.status === 'success' ? state.data : fallback`

# practice: Generics and utility types

### meta
minutes: 8
language: ts

### prompt
Implement generic helpers (typed with `<T>`), and derive two types with utility types:

- `findById<T extends { id: string }>(items: T[], id: string): T | undefined`
- `pluck<T, K extends keyof T>(items: T[], key: K): T[K][]` returns the values of one property.
- `groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]>` buckets by `String(item[key])`.
- Export `type Contact` (given) and derive `NewContact = Omit<Contact, 'id'>` and `ContactPatch = Partial<NewContact>`.
- `applyPatch(contact, patch)` returns a new `Contact` with the patch merged in.

### starter
```ts
export interface Contact {
  id: string;
  name: string;
  status: 'lead' | 'customer';
}

// Derive these two with utility types:
export type NewContact = unknown;
export type ContactPatch = unknown;

export function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  // TODO
}

export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  // TODO
}

export function groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  // TODO
}

export function applyPatch(contact: Contact, patch: ContactPatch): Contact {
  // TODO
}
```

### solution
```ts
export interface Contact {
  id: string;
  name: string;
  status: 'lead' | 'customer';
}

export type NewContact = Omit<Contact, 'id'>;
export type ContactPatch = Partial<NewContact>;

export function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

export function groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const bucket = String(item[key]);
    (out[bucket] ??= []).push(item);
  }
  return out;
}

export function applyPatch(contact: Contact, patch: ContactPatch): Contact {
  return { ...contact, ...patch };
}
```

### tests
```ts
const contacts = [
  { id: 'a', name: 'Ava', status: 'lead' },
  { id: 'b', name: 'Liam', status: 'customer' },
  { id: 'c', name: 'Mia', status: 'lead' },
];

test('findById', () => {
  expect(user.findById(contacts, 'b')).toEqual(contacts[1]);
  expect(user.findById(contacts, 'zzz')).toBeUndefined();
});

test('pluck', () => {
  expect(user.pluck(contacts, 'name')).toEqual(['Ava', 'Liam', 'Mia']);
});

test('groupBy', () => {
  const g = user.groupBy(contacts, 'status');
  expect(g.lead.map((c) => c.id)).toEqual(['a', 'c']);
  expect(g.customer.map((c) => c.id)).toEqual(['b']);
});

test('applyPatch merges without mutating', () => {
  const c = { id: 'a', name: 'Ava', status: 'lead' };
  const next = user.applyPatch(c, { status: 'customer' });
  expect(next).toEqual({ id: 'a', name: 'Ava', status: 'customer' });
  expect(c.status).toBe('lead');
});
```

### typetests
```ts
const nc: NewContact = { name: 'x', status: 'lead' };
// @ts-expect-error NewContact must not have an id
const withId: NewContact = { id: '1', name: 'x', status: 'lead' };
const p1: ContactPatch = {};
const p2: ContactPatch = { name: 'only the name' };
// @ts-expect-error patch values still have to be valid
const p3: ContactPatch = { status: 'prospect' };

const people = [{ id: '1', name: 'A', age: 1 }];
const names: string[] = pluck(people, 'name');
const ages: number[] = pluck(people, 'age');
// @ts-expect-error not a key of the item type
pluck(people, 'height');
const found: { id: string; name: string; age: number } | undefined = findById(people, '1');
// @ts-expect-error items need an id
findById([{ name: 'no id' }], '1');
```

### explanation
`Omit<Contact, 'id'>` removes keys; `Partial<...>` makes the rest optional. Because both are *derived*, adding `email` to `Contact` automatically updates the form and patch types, which is the point of utility types. In `pluck`, the return type `T[K][]` is an *indexed access type*: "the type of property K on T, as an array", so plucking `'age'` yields `number[]`, not `(string | number)[]`. The constraint `T extends { id: string }` on `findById` documents and enforces that items must have an id.

### hints
- `Omit<Contact, 'id'>` and `Partial<NewContact>`.
- `items.find(...)`, `items.map((item) => item[key])`.
- `(out[bucket] ??= []).push(item)` creates the bucket if needed.
- `{ ...contact, ...patch }`

# challenge: A typed, generic data store

### meta
minutes: 10
language: ts

### prompt
Build a tiny immutable in-memory collection used for CRM lists. Export a **generic** function `createCollection<T extends { id: string }>(initial: T[])` that returns an object with these methods (all must be typed, no `any`):

- `all(): T[]`: the current items (a copy; modifying the returned array must not affect the store).
- `get(id: string): T | undefined`
- `add(item: T): void`: throws `Error('Duplicate id: <id>')` if the id exists.
- `update(id: string, patch: Partial<Omit<T, 'id'>>): T`: merges the patch, stores and returns the updated item; throws `Error('Not found: <id>')` if missing.
- `remove(id: string): boolean`: `true` if something was removed.
- `count(): number`

Items must never be mutated in place; `update` stores a *new* object.

### starter
```ts
export function createCollection<T extends { id: string }>(initial: T[]) {
  // TODO: keep `items` in a closure variable and return the methods
}
```

### solution
```ts
export interface Collection<T extends { id: string }> {
  all(): T[];
  get(id: string): T | undefined;
  add(item: T): void;
  update(id: string, patch: Partial<Omit<T, 'id'>>): T;
  remove(id: string): boolean;
  count(): number;
}

export function createCollection<T extends { id: string }>(initial: T[]): Collection<T> {
  let items: T[] = [...initial];

  return {
    all: () => [...items],
    get: (id) => items.find((item) => item.id === id),
    add(item) {
      if (items.some((i) => i.id === item.id)) throw new Error(`Duplicate id: ${item.id}`);
      items = [...items, item];
    },
    update(id, patch) {
      const existing = items.find((item) => item.id === id);
      if (!existing) throw new Error(`Not found: ${id}`);
      const updated: T = { ...existing, ...patch };
      items = items.map((item) => (item.id === id ? updated : item));
      return updated;
    },
    remove(id) {
      const before = items.length;
      items = items.filter((item) => item.id !== id);
      return items.length < before;
    },
    count: () => items.length,
  };
}
```

### tests
```ts
const seed = () => [
  { id: 'a', name: 'Ava', status: 'lead' },
  { id: 'b', name: 'Liam', status: 'customer' },
];

test('all returns a copy', () => {
  const c = user.createCollection(seed());
  const list = c.all();
  list.pop();
  expect(c.count()).toBe(2);
});

test('does not share state with the initial array', () => {
  const initial = seed();
  const c = user.createCollection(initial);
  c.remove('a');
  expect(initial).toHaveLength(2);
});

test('get and add', () => {
  const c = user.createCollection(seed());
  expect(c.get('a')?.name).toBe('Ava');
  expect(c.get('zzz')).toBeUndefined();
  c.add({ id: 'c', name: 'Mia', status: 'lead' });
  expect(c.count()).toBe(3);
});

test('add rejects duplicate ids', () => {
  const c = user.createCollection(seed());
  expect(() => c.add({ id: 'a', name: 'Dup', status: 'lead' })).toThrow('Duplicate id: a');
});

test('update merges and replaces the object', () => {
  const c = user.createCollection(seed());
  const before = c.get('a');
  const updated = c.update('a', { status: 'customer' });
  expect(updated).toEqual({ id: 'a', name: 'Ava', status: 'customer' });
  expect(c.get('a')).toEqual(updated);
  expect(updated).not.toBe(before);
  expect(before.status).toBe('lead');
});

test('update throws when not found', () => {
  const c = user.createCollection(seed());
  expect(() => c.update('nope', { name: 'x' })).toThrow('Not found: nope');
});

test('remove reports whether something was removed', () => {
  const c = user.createCollection(seed());
  expect(c.remove('a')).toBe(true);
  expect(c.remove('a')).toBe(false);
  expect(c.count()).toBe(1);
});
```

### typetests
```ts
interface TestContact { id: string; name: string; status: 'lead' | 'customer' }
const col = createCollection<TestContact>([{ id: '1', name: 'A', status: 'lead' }]);
const one: TestContact | undefined = col.get('1');
const list: TestContact[] = col.all();
col.update('1', { name: 'B' });
// @ts-expect-error cannot patch the id
col.update('1', { id: '2' });
// @ts-expect-error patch values must match the field type
col.update('1', { status: 'prospect' });
// @ts-expect-error added items must match T
col.add({ id: '3', name: 'C' });
// @ts-expect-error items must have an id
createCollection([{ name: 'no id' }]);
```

### explanation
The key design decision is **never mutating**: `items` is reassigned to a new array on every change, and `update` builds a new object with spread. That is exactly how a React reducer or store behaves, and why it integrates well with React later. The generic parameter flows through everything: `Partial<Omit<T, 'id'>>` says "any subset of T's fields except the id", so the compiler rejects patches that change the id or use the wrong value types. Returning the interface type `Collection<T>` (instead of letting inference describe the object) gives callers readable signatures.

### hints
- Keep `let items = [...initial]` in the closure and reassign on every change.
- `all()` should return `[...items]`.
- `update`: find, throw if missing, build `{ ...existing, ...patch }`, replace with `map`.
- `remove`: compare lengths before and after `filter`.
