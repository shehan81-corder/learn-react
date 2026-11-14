# practice: Type the callbacks

### meta
minutes: 7
language: ts

### prompt
Each function below takes a **callback**. Declare and export these function types, and use them so the file has no type errors:

- `Predicate`: takes a `Contact`, returns a `boolean`.
- `KeyOf`: takes a `Contact`, returns a `string`.
- `Listener`: takes a message `string`, returns nothing (`void`).

Then annotate the functions: `filterBy(contacts, predicate)`, `sortBy(contacts, getKey)` (returns a **new** sorted array, A to Z by key, using `localeCompare`) and `notifyAll(listeners, message)`.

### starter
```ts
export interface Contact {
  id: string;
  name: string;
  city: string;
}

// TODO: export type Predicate = ...
// TODO: export type KeyOf = ...
// TODO: export type Listener = ...

export function filterBy(contacts: Contact[], predicate) {
  return contacts.filter(predicate);
}

export function sortBy(contacts: Contact[], getKey) {
  return contacts.sort((a, b) => getKey(a) - getKey(b));
}

export function notifyAll(listeners, message: string) {
  listeners.forEach((listener) => listener(message));
}

const people: Contact[] = [
  { id: '1', name: 'Ben', city: 'Perth' },
  { id: '2', name: 'Ava', city: 'Sydney' },
];
console.log(sortBy(people, (c) => c.name).map((c) => c.name));
```

### solution
```ts
export interface Contact {
  id: string;
  name: string;
  city: string;
}

export type Predicate = (contact: Contact) => boolean;
export type KeyOf = (contact: Contact) => string;
export type Listener = (message: string) => void;

export function filterBy(contacts: Contact[], predicate: Predicate): Contact[] {
  return contacts.filter(predicate);
}

export function sortBy(contacts: Contact[], getKey: KeyOf): Contact[] {
  return [...contacts].sort((a, b) => getKey(a).localeCompare(getKey(b)));
}

export function notifyAll(listeners: Listener[], message: string): void {
  listeners.forEach((listener) => listener(message));
}

const people: Contact[] = [
  { id: '1', name: 'Ben', city: 'Perth' },
  { id: '2', name: 'Ava', city: 'Sydney' },
];
console.log(sortBy(people, (c) => c.name).map((c) => c.name));
```

### tests
```ts
const people = [
  { id: '1', name: 'Ben', city: 'Perth' },
  { id: '2', name: 'Ava', city: 'Sydney' },
  { id: '3', name: 'Cy', city: 'Perth' },
];

test('filterBy keeps matching contacts', () => {
  expect(user.filterBy(people, (c) => c.city === 'Perth').map((c) => c.name)).toEqual(['Ben', 'Cy']);
});

test('sortBy sorts A to Z by the key', () => {
  expect(user.sortBy(people, (c) => c.name).map((c) => c.name)).toEqual(['Ava', 'Ben', 'Cy']);
  expect(user.sortBy(people, (c) => c.city).map((c) => c.city)).toEqual(['Perth', 'Perth', 'Sydney']);
});

test('sortBy does not mutate the input', () => {
  const copy = people.slice();
  user.sortBy(copy, (c) => c.name);
  expect(copy.map((c) => c.name)).toEqual(['Ben', 'Ava', 'Cy']);
});

test('notifyAll calls every listener with the message', () => {
  const a = fn();
  const b = fn();
  user.notifyAll([a, b], 'saved');
  expect(a).toHaveBeenCalledWith('saved');
  expect(b).toHaveBeenCalledWith('saved');
});
```

### typetests
```ts
const list: Contact[] = [];
const _f: Contact[] = filterBy(list, (c) => c.city === 'Perth');
const _s: Contact[] = sortBy(list, (c) => c.name);
notifyAll([(m) => console.log(m.toUpperCase())], 'hi');
// @ts-expect-error a predicate must return a boolean
filterBy(list, (c) => c.name);
// @ts-expect-error getKey must return a string
sortBy(list, (c) => c.id.length);
// @ts-expect-error listeners receive a string message
notifyAll([(m: number) => m], 'hi');
```

### explanation
A function type like `(contact: Contact) => boolean` is a contract for a callback: what it receives and what it must return. Once `predicate` has that type, the inline callbacks callers write get their parameter types for free (`c` is a `Contact`), and a callback returning the wrong thing is rejected. The type also caught a real bug in the starter: subtracting strings (`getKey(a) - getKey(b)`) gives `NaN`, so `localeCompare` is the right way to compare them. Copying with `[...contacts]` before sorting matters because `sort` mutates in place, and in React you must never mutate state arrays.

### hints
- Function type syntax: `export type Predicate = (contact: Contact) => boolean;`
- An array of listener functions is `Listener[]`.
- Compare strings with `getKey(a).localeCompare(getKey(b))` and sort a copy: `[...contacts].sort(...)`.

# practice: Your first generic functions

### meta
minutes: 8
language: ts

### prompt
Replace `any` with **generics** so the output type follows the input type:

- `first(items)`: the first item or `undefined`. `first([1, 2])` should be typed `number | undefined`.
- `toggle(items, item)`: returns a **new** array with `item` removed if present, or added at the end if not. `item` must be the same type as the array's items.
- `toArray(value)`: accepts one value **or** an array of values and always returns an array: `toArray(5)` → `[5]`, `toArray([5, 6])` → `[5, 6]`.

### starter
```ts
export function first(items: any[]): any {
  return items[0];
}

export function toggle(items: any[], item: any): any[] {
  return items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
}

export function toArray(value: any): any[] {
  return Array.isArray(value) ? value : [value];
}

const tags = toggle(['vip', 'lead'], 'vip');
console.log(first(tags), tags, toArray('solo'));
```

### solution
```ts
export function first<T>(items: T[]): T | undefined {
  return items[0];
}

export function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
}

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

const tags = toggle(['vip', 'lead'], 'vip');
console.log(first(tags), tags, toArray('solo'));
```

### tests
```ts
test('first returns the first item or undefined', () => {
  expect(user.first([3, 4])).toBe(3);
  expect(user.first([])).toBe(undefined);
});

test('toggle removes an existing item without mutating', () => {
  const tags = ['vip', 'lead'];
  expect(user.toggle(tags, 'vip')).toEqual(['lead']);
  expect(tags).toEqual(['vip', 'lead']);
});

test('toggle adds a missing item at the end', () => {
  expect(user.toggle([1, 2], 3)).toEqual([1, 2, 3]);
});

test('toArray wraps single values and keeps arrays', () => {
  expect(user.toArray(5)).toEqual([5]);
  expect(user.toArray([5, 6])).toEqual([5, 6]);
});
```

### typetests
```ts
const _n: number | undefined = first([1, 2]);
const _s: string | undefined = first(['a']);
// @ts-expect-error first([1]) is a number, not a string
const _wrong: string | undefined = first([1]);
const _t: string[] = toggle(['vip'], 'lead');
// @ts-expect-error the item must match the array type
toggle(['vip'], 42);
const _arr: number[] = toArray(5);
const _arr2: string[] = toArray(['a', 'b']);
// @ts-expect-error toArray(5) is number[], not string[]
const _arr3: string[] = toArray(5);
```

### explanation
`any` makes these functions accept everything but also *return* `any`, so every caller loses type information and mistakes pass silently. A type parameter `<T>` links the input to the output: whatever type the caller passes in, TypeScript infers `T` and carries it through to the result. In `toggle`, using `T` for both parameters means the item must match the array, which rejects `toggle(['vip'], 42)`. `T | T[]` in `toArray` is a union that `Array.isArray` narrows, just like `typeof` did for primitives. You use exactly this mechanism every time you call `useState<Contact[]>([])`.

### hints
- Put the type parameter after the function name: `function first<T>(items: T[]): T | undefined`.
- In `toggle`, use the same `T` for the array items and the single item.
- `toArray<T>(value: T | T[]): T[]`: `Array.isArray(value)` narrows to `T[]`.

# challenge: A tiny typed store

### meta
minutes: 12
language: ts

### prompt
Write a generic `createStore<T>(initial)`, a miniature version of how React state works. It returns an object with:

- `get(): T`: the current value;
- `set(next)`: `next` is either a new value **or** an updater function `(prev: T) => T` (just like `setState`). Listeners are called with the new value, but **only if it changed** (`Object.is`);
- `subscribe(listener)`: `listener` is `(value: T) => void`; returns an `unsubscribe` function.

Export the `Store<T>` interface as well. The type checks verify that `set` only accepts the store's type.

### starter
```ts
export function createStore(initial: any) {
  let value = initial;
  return {
    get: () => value,
    set: (next: any) => {
      value = next;
    },
    subscribe: (listener: any) => () => {},
  };
}

const counter = createStore(0);
counter.subscribe((v) => console.log('count is', v));
counter.set(1);
counter.set((n) => n + 1);
```

### solution
```ts
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: (value: T) => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();

  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      listeners.forEach((listener) => listener(value));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const counter = createStore(0);
counter.subscribe((v) => console.log('count is', v));
counter.set(1);
counter.set((n) => n + 1);
```

### tests
```ts
test('get returns the initial value', () => {
  expect(user.createStore(5).get()).toBe(5);
});

test('set with a value', () => {
  const s = user.createStore('a');
  s.set('b');
  expect(s.get()).toBe('b');
});

test('set with an updater function uses the previous value', () => {
  const s = user.createStore(1);
  s.set((n) => n + 1);
  s.set((n) => n * 10);
  expect(s.get()).toBe(20);
});

test('subscribers are notified with the new value', () => {
  const s = user.createStore(0);
  const listener = fn();
  s.subscribe(listener);
  s.set(3);
  expect(listener).toHaveBeenCalledWith(3);
});

test('no notification when the value does not change', () => {
  const s = user.createStore(7);
  const listener = fn();
  s.subscribe(listener);
  s.set(7);
  s.set((n) => n);
  expect(listener).toHaveBeenCalledTimes(0);
});

test('unsubscribe stops notifications', () => {
  const s = user.createStore(0);
  const listener = fn();
  const unsubscribe = s.subscribe(listener);
  s.set(1);
  unsubscribe();
  s.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
});
```

### typetests
```ts
const count = createStore(0);
const _n: number = count.get();
count.set(5);
count.set((prev) => prev + 1);
// @ts-expect-error a number store only accepts numbers
count.set('five');
const maybe = createStore<string | null>(null);
maybe.set('Ava');
maybe.set(null);
const _store: Store<{ name: string }> = createStore({ name: 'Ava' });
// @ts-expect-error listeners receive the store's type
count.subscribe((value: string) => value);
```

### explanation
`T` is captured once, from the initial value, and then flows into every method: `get` returns `T`, `set` accepts `T | ((prev: T) => T)`, and listeners receive `T`. So a store created with `0` rejects strings everywhere without any extra annotations. The union `T | ((prev: T) => T)` is exactly the signature of React's `setState`, and `typeof next === 'function'` narrows it. The cast is needed because TypeScript cannot rule out that `T` itself is a function type. When the initial value does not describe every allowed value, such as `null` for "nothing yet", you pass the type explicitly: `createStore<string | null>(null)`, just like `useState<Contact | null>(null)`. Skipping notifications when `Object.is` says nothing changed is also what React does to bail out of re-renders.

### hints
- Declare the interface first: `export interface Store<T> { get(): T; set(next: T | ((prev: T) => T)): void; subscribe(listener: (value: T) => void): () => void; }`.
- Keep listeners in a `Set<(value: T) => void>` so unsubscribing is `listeners.delete(listener)`.
- Resolve `next` with `typeof next === 'function' ? (next as (prev: T) => T)(value) : next`, then compare with `Object.is` before notifying.
