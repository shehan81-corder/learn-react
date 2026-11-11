# practice: Annotate functions

### meta
minutes: 6
language: ts

### prompt
The code below works but has no types, so the editor shows errors under strict mode. Add type annotations so the file compiles with **no type errors**:

- `fullName` takes a contact with `firstName` and `lastName` strings and returns a string.
- `isAdult` takes a number and returns a boolean.
- `repeat` takes a string and an optional count (default `2`) and returns a string.

Do not use `any`. The hidden type checks also verify that wrong calls are rejected.

### starter
```ts
export function fullName(contact) {
  return `${contact.firstName} ${contact.lastName}`;
}

export function isAdult(age) {
  return age >= 18;
}

export function repeat(text, count = 2) {
  return text.repeat(count);
}
```

### solution
```ts
export function fullName(contact: { firstName: string; lastName: string }): string {
  return `${contact.firstName} ${contact.lastName}`;
}

export function isAdult(age: number): boolean {
  return age >= 18;
}

export function repeat(text: string, count = 2): string {
  return text.repeat(count);
}
```

### tests
```ts
test('functions still behave the same', () => {
  expect(user.fullName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
  expect(user.isAdult(18)).toBe(true);
  expect(user.isAdult(17)).toBe(false);
  expect(user.repeat('ab')).toBe('abab');
  expect(user.repeat('ab', 3)).toBe('ababab');
});
```

### typetests
```ts
const _a: string = fullName({ firstName: 'A', lastName: 'B' });
const _b: boolean = isAdult(20);
const _c: string = repeat('x');
// @ts-expect-error fullName must require lastName
fullName({ firstName: 'A' });
// @ts-expect-error isAdult must take a number
isAdult('20');
```

### explanation
With `strict` on, parameters without annotations are implicitly `any`, which is an error. The type checker needs types at function boundaries; the *inside* of each function is then checked automatically. `count = 2` already infers `number`, so no annotation is needed, but the parameter stays optional because it has a default. The hidden type checks use `@ts-expect-error`: that comment *requires* the next line to be an error, so they fail if your types are too loose.

### hints
- Inline object types look like `{ firstName: string; lastName: string }`.
- A return type goes after the parameter list: `(age: number): boolean`.
- A parameter with a default value infers its type from the default.

# practice: Model a CRM entity

### meta
minutes: 7
language: ts

### prompt
Define and export these types, then make the helper functions compile:

- `ContactStatus`: a union of `'lead' | 'customer' | 'churned'`.
- `Contact` interface with: `id: string`, `firstName: string`, `lastName: string`, `email: string`, `phone` (optional string), `status: ContactStatus`, `tags: string[]`, and `readonly createdAt: string`.

Then implement `newContact(firstName, lastName, email)` which returns a `Contact` with id `"new"`, status `"lead"`, empty tags and `createdAt` of `"2026-01-01"`; and `describe(c)` returning `"First Last <email> [status]"`.

### starter
```ts
// 1. Define ContactStatus and Contact here


// 2. Implement the functions (add parameter and return types)
export function newContact(firstName, lastName, email) {
  // TODO
}

export function describe(c) {
  // TODO
}
```

### solution
```ts
export type ContactStatus = 'lead' | 'customer' | 'churned';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: ContactStatus;
  tags: string[];
  readonly createdAt: string;
}

export function newContact(firstName: string, lastName: string, email: string): Contact {
  return {
    id: 'new',
    firstName,
    lastName,
    email,
    status: 'lead',
    tags: [],
    createdAt: '2026-01-01',
  };
}

export function describe(c: Contact): string {
  return `${c.firstName} ${c.lastName} <${c.email}> [${c.status}]`;
}
```

### tests
```ts
test('newContact builds a lead', () => {
  expect(user.newContact('Ava', 'Nguyen', 'ava@example.com')).toEqual({
    id: 'new',
    firstName: 'Ava',
    lastName: 'Nguyen',
    email: 'ava@example.com',
    status: 'lead',
    tags: [],
    createdAt: '2026-01-01',
  });
});

test('describe formats a contact', () => {
  const c = user.newContact('Liam', 'Smith', 'liam@example.com');
  expect(user.describe(c)).toBe('Liam Smith <liam@example.com> [lead]');
  expect(user.describe({ ...c, status: 'customer' })).toBe('Liam Smith <liam@example.com> [customer]');
});
```

### typetests
```ts
const ok: Contact = { id: '1', firstName: 'A', lastName: 'B', email: 'a@b.c', status: 'customer', tags: [], createdAt: 'x' };
const withPhone: Contact = { ...ok, phone: '123' };
const status: ContactStatus = 'churned';
// @ts-expect-error status must be one of the three literals
const badStatus: Contact = { ...ok, status: 'prospect' };
// @ts-expect-error email is required
const noEmail: Contact = { id: '1', firstName: 'A', lastName: 'B', status: 'lead', tags: [], createdAt: 'x' };
// @ts-expect-error createdAt is readonly
ok.createdAt = 'y';
```

### explanation
A union of string literals makes the compiler reject typos like `'prospect'`. `phone?: string` means the property may be absent, so the object returned by `newContact` can omit it. `readonly` is enforced only at compile time but it catches accidental reassignment. Notice that `newContact` does not annotate the object literal: because the return type is `Contact`, TypeScript checks the literal against it, including that `'lead'` is a valid status.

### hints
- `type ContactStatus = 'lead' | 'customer' | 'churned';`
- Optional property: `phone?: string;` and read-only: `readonly createdAt: string;`
- Annotate the return type `: Contact` and the literal is checked automatically.

# practice: Unions and optional data

### meta
minutes: 7
language: ts

### prompt
Implement three functions so that they compile under strict mode:

- `badgeColour(status)` where `status` is `'lead' | 'customer' | 'churned'` returns `'blue'`, `'green'` or `'grey'` respectively.
- `emailDomain(email)` where `email` is `string | null | undefined` returns the part after `@`, or `'unknown'` when there is no email.
- `total(values)` takes `(number | undefined)[]` and returns the sum, treating `undefined` as 0.

### starter
```ts
export type Status = 'lead' | 'customer' | 'churned';

export function badgeColour(status: Status): 'blue' | 'green' | 'grey' {
  // TODO
}

export function emailDomain(email: string | null | undefined): string {
  // TODO
}

export function total(values: (number | undefined)[]): number {
  // TODO
}
```

### solution
```ts
export type Status = 'lead' | 'customer' | 'churned';

export function badgeColour(status: Status): 'blue' | 'green' | 'grey' {
  if (status === 'lead') return 'blue';
  if (status === 'customer') return 'green';
  return 'grey';
}

export function emailDomain(email: string | null | undefined): string {
  if (!email) return 'unknown';
  return email.split('@')[1] ?? 'unknown';
}

export function total(values: (number | undefined)[]): number {
  return values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}
```

### tests
```ts
test('badgeColour maps statuses', () => {
  expect(user.badgeColour('lead')).toBe('blue');
  expect(user.badgeColour('customer')).toBe('green');
  expect(user.badgeColour('churned')).toBe('grey');
});

test('emailDomain handles missing emails', () => {
  expect(user.emailDomain('ava@example.com')).toBe('example.com');
  expect(user.emailDomain(null)).toBe('unknown');
  expect(user.emailDomain(undefined)).toBe('unknown');
  expect(user.emailDomain('')).toBe('unknown');
});

test('total treats undefined as zero', () => {
  expect(user.total([1, undefined, 2])).toBe(3);
  expect(user.total([])).toBe(0);
});
```

### explanation
The starter signatures are already typed; your job is to make the bodies satisfy them. In `emailDomain`, the check `if (!email)` *narrows* the type: after it, TypeScript knows `email` is a non-empty `string`, so calling `.split` is allowed. Without the check the compiler would refuse, because `null.split` would crash. `v ?? 0` handles `undefined` without turning a legitimate `0` into something else, which `||` would not guarantee in other contexts.

### hints
- Compare against each literal: `if (status === 'lead') return 'blue';`
- Check for a missing email first: `if (!email) return 'unknown';`
- `v ?? 0` gives a number from `number | undefined`.

# challenge: Type a deal pipeline

### meta
minutes: 10
language: ts

### prompt
Create the types and functions for a small pipeline module.

Types to export:

- `DealStage`: `'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'`.
- `Deal`: `id: string`, `title: string`, `value: number`, `stage: DealStage`, `expectedCloseDate?: string`.

Functions to export (with full type annotations):

- `isOpen(deal)`: `true` unless the stage is `won` or `lost`.
- `openValue(deals)`: total value of open deals.
- `byStage(deals)`: returns `Record<DealStage, number>`, the **count** of deals in each stage (every stage must be present, with `0` if empty).
- `nextStage(stage)`: the following stage in the order above for the first four stages; `'won'` and `'lost'` return `null`. Return type is `DealStage | null`.

### starter
```ts
// Define DealStage and Deal, then write the functions.
```

### solution
```ts
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  expectedCloseDate?: string;
}

const ORDER: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation'];

export function isOpen(deal: Deal): boolean {
  return deal.stage !== 'won' && deal.stage !== 'lost';
}

export function openValue(deals: Deal[]): number {
  return deals.filter(isOpen).reduce((sum, d) => sum + d.value, 0);
}

export function byStage(deals: Deal[]): Record<DealStage, number> {
  const counts: Record<DealStage, number> = { new: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 };
  for (const deal of deals) counts[deal.stage] += 1;
  return counts;
}

export function nextStage(stage: DealStage): DealStage | null {
  const index = ORDER.indexOf(stage);
  if (index === -1) return null;
  return index === ORDER.length - 1 ? 'won' : ORDER[index + 1];
}
```

### tests
```ts
const deals = [
  { id: '1', title: 'A', value: 100, stage: 'new' },
  { id: '2', title: 'B', value: 250, stage: 'proposal' },
  { id: '3', title: 'C', value: 900, stage: 'won' },
  { id: '4', title: 'D', value: 50, stage: 'lost' },
  { id: '5', title: 'E', value: 25, stage: 'proposal' },
];

test('isOpen', () => {
  expect(user.isOpen(deals[0])).toBe(true);
  expect(user.isOpen(deals[2])).toBe(false);
  expect(user.isOpen(deals[3])).toBe(false);
});

test('openValue sums open deals only', () => {
  expect(user.openValue(deals)).toBe(375);
  expect(user.openValue([])).toBe(0);
});

test('byStage counts every stage', () => {
  expect(user.byStage(deals)).toEqual({ new: 1, qualified: 0, proposal: 2, negotiation: 0, won: 1, lost: 1 });
  expect(user.byStage([])).toEqual({ new: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 });
});

test('nextStage walks the pipeline', () => {
  expect(user.nextStage('new')).toBe('qualified');
  expect(user.nextStage('qualified')).toBe('proposal');
  expect(user.nextStage('proposal')).toBe('negotiation');
  expect(user.nextStage('negotiation')).toBe('won');
  expect(user.nextStage('won')).toBeNull();
  expect(user.nextStage('lost')).toBeNull();
});
```

### typetests
```ts
const d: Deal = { id: '1', title: 'x', value: 1, stage: 'new' };
const open: boolean = isOpen(d);
const counts: Record<DealStage, number> = byStage([d]);
const n: DealStage | null = nextStage('new');
// @ts-expect-error stage must be a DealStage
const bad: Deal = { id: '1', title: 'x', value: 1, stage: 'closed' };
// @ts-expect-error value is required
const noValue: Deal = { id: '1', title: 'x', stage: 'new' };
// @ts-expect-error nextStage only takes a DealStage
nextStage('closed');
```

### explanation
`Record<DealStage, number>` forces an entry for *every* stage, so the compiler complains if you forget one when building the initial object. That is a major benefit of unions: adding a new stage later makes every incomplete `Record` a compile error, pointing to the code you must update. `nextStage` returns `DealStage | null` rather than `undefined` or a made-up string, so callers are forced to handle the "no next stage" case.

### hints
- Start with the two types, then `isOpen`: it is two comparisons.
- `openValue` reuses `isOpen`: `deals.filter(isOpen).reduce(...)`.
- For `byStage`, create an object with all six keys set to `0` and increment.
- Keep the first four stages in an ordered array and use `indexOf`.
