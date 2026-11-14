## Object types

Most data in an app is objects. You describe an object's **shape**, its property names and their types:

```ts
const contact: { id: string; name: string; age: number } = { id: 'c1', name: 'Ava', age: 34 };
```

Writing that inline every time gets old, so you give the shape a name with a **type alias** or an **interface**:

```ts
type Contact = {
  id: string;
  name: string;
  email: string;
};

interface Company {
  id: string;
  name: string;
  employees: number;
}

function greet(contact: Contact): string {
  return `Hi ${contact.name}`;
}

greet({ id: 'c1', name: 'Ava', email: 'ava@acme.test' });   // ✅
greet({ id: 'c1', name: 'Ava' });                           // ❌ Property 'email' is missing
greet({ id: 'c1', name: 'Ava', email: 'a@b.c', vip: true }); // ❌ Object literal may only specify known properties
```

TypeScript is **structural**: any object with the right shape fits, whatever it is called. A `Contact` is "anything with `id`, `name` and `email` strings".

> **The thinking pattern:** model the data **before** writing the UI. Write down what a `Contact` is, which fields are optional, and which values a status can take. The types become the specification, and the checker tells you every place that needs to change when the specification does.

## type or interface?

For describing object shapes they are almost interchangeable. Practical differences:

- `type` can name **anything**: unions (`'lead' | 'customer'`), tuples, functions. `interface` only describes object shapes.
- `interface` can be **extended** with `extends` and re-opened (declaration merging), which libraries use.

```ts
interface Person { name: string }
interface Employee extends Person { company: string }   // has name and company

type Customer = Person & { plan: 'free' | 'pro' };       // the type-alias way: intersection
```

**A simple convention:** `interface` for object shapes such as props and API entities, `type` for everything else. React's own docs and this course follow it, but consistency matters more than which you pick.

## Optional and readonly properties

```ts
interface Contact {
  readonly id: string;    // cannot be reassigned after creation
  name: string;
  email: string;
  phone?: string;         // optional: may be missing; its type is `string | undefined`
  tags: string[];
}

const ava: Contact = { id: 'c1', name: 'Ava', email: 'ava@acme.test', tags: [] };  // ✅ no phone
ava.id = 'c2';                    // ❌ Cannot assign to 'id' because it is a read-only property
ava.phone.startsWith('+61');      // ❌ 'ava.phone' is possibly 'undefined'
```

`readonly` is a compile-time promise only (the object is not frozen), but it documents intent and catches accidental mutation. React state should be treated as read-only anyway: you replace objects, you do not mutate them.

## Union types and literal types

A **union** (`A | B`) is a value that can be one of several types:

```ts
let id: string | number;
id = 'c1';   // ✅
id = 42;     // ✅
id = true;   // ❌
```

A **literal type** is one exact value. Combined into a union, literals model a fixed set of options. This is one of the most useful things in TypeScript:

```ts
type DealStage = 'lead' | 'qualified' | 'won' | 'lost';

let stage: DealStage = 'lead';
stage = 'won';        // ✅
stage = 'pending';    // ❌ Type '"pending"' is not assignable to type 'DealStage'
```

Your editor now autocompletes the options, and a typo becomes a compile error instead of a bug that never matches anything. Use literal unions anywhere you would otherwise use "magic strings": statuses, sizes, variants, sort orders.

`Record<Key, Value>` builds an object type with one property per key. Combined with a literal union, TypeScript checks that you covered every option:

```ts
const stageColors: Record<DealStage, string> = {
  lead: 'gray',
  qualified: 'blue',
  won: 'green',
  // ❌ Property 'lost' is missing
};
```

## Narrowing

When a value is a union, you can only use what **all** members have in common. To use member-specific features you **narrow** the type with a check, and TypeScript follows your control flow:

```ts
function formatId(id: string | number): string {
  if (typeof id === 'number') {
    return id.toFixed(0);        // here: number
  }
  return id.toUpperCase();       // here: string (the number case already returned)
}

function stageLabel(stage: DealStage): string {
  switch (stage) {
    case 'lead': return 'New lead';
    case 'qualified': return 'Qualified';
    case 'won': return 'Closed – won';
    case 'lost': return 'Closed – lost';
  }
}
```

Checks that narrow: `typeof x === 'string'`, `x === 'won'`, `Array.isArray(x)`, `'email' in x`, `x instanceof Date`, and truthiness (`if (x)`).

## Discriminated unions: one type per situation

A common beginner model for loading data:

```ts
// ❌ Every field optional: which combinations are valid? Nothing stops { loading: true, error: 'x', data: [...] }
type State = { loading: boolean; error?: string; data?: Contact[] };
```

A **discriminated union** describes each situation as its own shape, with a shared literal field (the *discriminant*) saying which one it is:

```ts
type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; contacts: Contact[] };

function render(state: LoadState): string {
  switch (state.status) {
    case 'loading':
      return 'Loading…';
    case 'error':
      return `Failed: ${state.message}`;          // `message` exists only here
    case 'success':
      return `${state.contacts.length} contacts`; // `contacts` exists only here
  }
}
```

Impossible states become impossible to write, and TypeScript makes you handle every case. You will use this pattern for request states, form steps, reducer actions and component variants.

## null and undefined: ?. and ??

With `strict` on, `null` and `undefined` are **not** allowed unless you include them in the type. Then TypeScript makes you handle them:

```ts
function findContact(id: string): Contact | undefined {
  return contacts.find((c) => c.id === id);   // `find` may return undefined
}

const c = findContact('c9');
c.name;                       // ❌ 'c' is possibly 'undefined'
c?.name;                      // ✅ optional chaining: undefined if c is undefined
const name = c?.name ?? 'Unknown';   // ✅ ?? gives a fallback for null or undefined
if (c) console.log(c.name);   // ✅ narrowed by the check
```

- `a?.b` stops and returns `undefined` if `a` is `null` or `undefined`.
- `a ?? b` uses `b` only when `a` is `null` or `undefined`. Unlike `||` it keeps `0` and `''`.
- `value!` (the non-null assertion) tells TypeScript "trust me, this is not null". Use it rarely, only where you really know better, such as `document.getElementById('root')!` in `main.tsx`.

## How this shows up in React

- **Props are an object type**: `interface ButtonProps { label: string; variant?: 'primary' | 'ghost' }`.
- **Variants are literal unions**: `size: 'sm' | 'md' | 'lg'` beats `size: string` every time.
- **Optional props** use `?` and usually get a default when destructured: `{ variant = 'primary' }`.
- **Request and UI states** are discriminated unions. TanStack Query, which you use later in the course, returns one (`status: 'pending' | 'error' | 'success'`).
- **Rendering optional data** uses `?.` and `??`: `{contact.company?.name ?? 'No company'}`.
