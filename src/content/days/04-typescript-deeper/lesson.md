## Yesterday gave you vocabulary. Today you get leverage.

Types become powerful when the compiler can *follow your logic*. Today covers four ideas that you will use in nearly every React component:

1. **Narrowing:** the compiler tracks what you have checked.
2. **Discriminated unions:** model "one of several shapes" safely.
3. **Generics:** write one function that works for many types.
4. **Utility types:** derive new types from existing ones instead of retyping them.

> **The thinking pattern:** *let the compiler do the remembering.* Every time you write a check (`if (x === null)`, `switch (state.status)`), TypeScript records what you now know. Design your types so that those checks are the *only* thing standing between you and the data you need. If you find yourself writing `as`, the types are probably telling you that a check is missing.

## Narrowing: the compiler follows your `if`s

A value of type `string | number` could be either. Until you check, you can only do what both allow. Checks *narrow* the type inside the branch:

```ts
function format(value: string | number | null): string {
  if (value === null) return '-';                    // null handled
  if (typeof value === 'number') return value.toFixed(2);   // number here
  return value.toUpperCase();                        // only string left
}
```

The tools that narrow:

| Check | Narrows |
| --- | --- |
| `typeof x === 'string'` | primitives |
| `x === null`, `x == null`, `if (!x)` | null / undefined / falsy |
| `'email' in obj` | which object shape has this property |
| `x instanceof Date` | class instances |
| `Array.isArray(x)` | arrays |
| `x.kind === 'a'` | discriminated unions (below) |

You can also write your own check, a **type guard**, using a type predicate:

```ts
interface Contact { email: string }
function hasEmail(value: Contact | null): value is Contact {
  return value !== null && value.email.length > 0;
}
const withEmail = [c1, null, c2].filter(hasEmail);   // Contact[] (nulls removed AND typed)
```

## Discriminated unions: the most useful pattern in TypeScript

When data comes in several shapes, give every shape a shared literal property, the **discriminant**, and let the compiler narrow on it.

```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function render(state: LoadState<string[]>): string {
  switch (state.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Loading…';
    case 'success': return `${state.data.length} items`;   // data exists only here
    case 'error':   return `Failed: ${state.message}`;     // message exists only here
  }
}
```

Why this beats a loose object like `{ loading: boolean; data?: T; error?: string }`: with the loose version nothing stops `loading: true` and `error: 'x'` at once, and every read of `data` needs a check. With the union, impossible states are unrepresentable.

**Exhaustiveness checking:** add a `never` check so adding a new variant later produces a compile error where you forgot to handle it:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}
// in the switch:  default: return assertNever(state);
```

You will use exactly this `LoadState` shape for data fetching on Day 14.

## Generics: types as parameters

A generic is a function (or type) that is parameterised over a type, written `<T>`:

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

first([1, 2, 3]);          // T inferred as number → number | undefined
first(['a', 'b']);         // T inferred as string
```

Read `<T>` as "for some type T, to be figured out at the call site". Without generics you would use `any` and lose all checking, or copy the function once per type.

Generic constraints limit what T can be:

```ts
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

const contact = findById(contacts, 'ct_1');   // Contact | undefined
const deal = findById(deals, 'dl_9');         // Deal | undefined
findById([1, 2, 3], '1');                     // Error: number has no 'id'
```

Generic types and interfaces work the same way. You have already seen one:

```ts
interface Page<T> {
  data: T[];
  page: number;
  total: number;
}
type ContactPage = Page<Contact>;
```

## Utility types: derive, don't duplicate

TypeScript ships helpers that transform existing types. These five cover most needs:

```ts
interface Contact {
  id: string; firstName: string; lastName: string; email: string; status: 'lead' | 'customer';
}

type ContactPatch   = Partial<Contact>;                         // every field optional
type ContactSummary = Pick<Contact, 'id' | 'firstName'>;        // keep only these keys
type NewContact     = Omit<Contact, 'id'>;                      // drop these keys
type ById           = Record<string, Contact>;                  // dictionary
type AllRequired    = Required<Contact>;                        // every field required (the opposite of Partial)
```

Two more are handy with functions: `ReturnType<typeof fn>` and `Parameters<typeof fn>`.

Think of `NewContact = Omit<Contact, 'id'>` as the type of a *form submission*: the server assigns the `id`, so the form never has one. When `Contact` gains a field, `NewContact` updates by itself.

## `keyof`, `typeof` and `as const`

```ts
type ContactKey = keyof Contact;      // 'id' | 'firstName' | 'lastName' | 'email' | 'status'

function sortBy<T>(items: T[], key: keyof T): T[] {
  return [...items].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
}
sortBy(contacts, 'lastName');   // ok
sortBy(contacts, 'lastNam');    // Error, caught at compile time

const STATUSES = ['lead', 'customer', 'churned'] as const;   // readonly tuple of literals
type Status = (typeof STATUSES)[number];                      // 'lead' | 'customer' | 'churned'
```

The `as const` trick gives you a runtime array (for a `<select>` dropdown) *and* a union type from a single source of truth.

**Enums?** TypeScript has `enum`, but union types plus `as const` are lighter, work better with JSON and are the modern default. You will see enums in older code; you do not need to write them.

## Walkthrough: a typed lookup helper

Goal: a function that groups any list by any key, correctly typed.

```ts
function groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const bucket = String(item[key]);
    (out[bucket] ??= []).push(item);
  }
  return out;
}

const byStatus = groupBy(contacts, 'status');   // Record<string, Contact[]>
groupBy(contacts, 'statuss');                   // Error: not a key of Contact
```

Walk through the reasoning: `T` is whatever the items are; `K extends keyof T` means `K` must be one of `T`'s property names, so `item[key]` is always valid. `(out[bucket] ??= [])` creates the bucket the first time and `push` adds to it.

## CRM step: generic helpers and derived types

Extend Nimbus CRM's `src/types.ts` and utilities:

1. Add `export type NewContact = Omit<Contact, 'id' | 'createdAt'>` and `export type ContactPatch = Partial<NewContact>`.
2. Add `export const CONTACT_STATUSES = ['lead', 'customer', 'churned'] as const` and derive `ContactStatus` from it, so one list feeds both the type and (soon) the filter dropdown.
3. Create `src/lib/collection.ts` with generic `findById`, `groupBy` and `sortBy`. Use them in `contactUtils.ts`.
4. Add a `LoadState<T>` discriminated union to `types.ts`. You will use it on Day 14.

- [ ] `NewContact`, `ContactPatch` derived with `Omit`/`Partial`
- [ ] `ContactStatus` derived from `CONTACT_STATUSES`
- [ ] Generic `findById`, `groupBy`, `sortBy` in `collection.ts`
- [ ] `LoadState<T>` union added and `npm run build` passes
