## What TypeScript actually does

TypeScript adds a **static type checker** on top of JavaScript. You describe the shape of your data; the compiler verifies, *before the code runs*, that every use matches. Then it erases all the type annotations and what runs in the browser is plain JavaScript.

```ts
function fullName(contact: { firstName: string; lastName: string }): string {
  return `${contact.firstName} ${contact.lastName}`;
}

fullName({ firstName: 'Ava' });
//       ^ Error: Property 'lastName' is missing
fullName({ firstName: 'Ava', lastName: 'Nguyen', nickname: 'A' });
//                                               ^ Error: 'nickname' does not exist in this type
```

That is the whole value proposition: typos, missing fields and wrong arguments become red squiggles in your editor instead of bugs in production. In this practice editor you also get those squiggles, and **Check** reports type errors alongside failing tests.

> **The thinking pattern:** *model the data first, then write the code.* Before building a contact list UI, write down what a `Contact` is. The types become the specification that the rest of the code is checked against.

## Primitive types and annotations

```ts
let name: string = 'Ava';
let age: number = 34;
let isVip: boolean = true;
let nothing: null = null;
let notSet: undefined = undefined;

const tags: string[] = ['vip', 'newsletter'];         // array of strings
const pair: [string, number] = ['Ava', 34];           // tuple: fixed length and order
```

You rarely need to write these out, because of **inference**:

```ts
let count = 0;            // inferred as number
const greeting = 'Hi';    // inferred as the literal type "Hi"
const ids = [1, 2, 3];    // number[]
count = 'five';           // Error: Type 'string' is not assignable to type 'number'
```

**Rule of thumb:** annotate function parameters and exported function return types; let inference handle local variables.

Two special types to know now:

- `any` turns the checker off for that value. Avoid it; it hides bugs.
- `unknown` means "could be anything, check before using". Use it for untrusted data such as parsed JSON.

## Functions

```ts
function add(a: number, b: number): number {
  return a + b;
}

const greet = (name: string, punctuation = '!'): string => `Hello, ${name}${punctuation}`;

function log(message: string, level?: 'info' | 'error'): void {   // ? = optional parameter
  console.log(level ?? 'info', message);
}
```

Return types are usually inferred, but writing them on exported functions documents intent and catches mistakes inside the function body.

## Object types: type aliases and interfaces

Both describe the shape of an object. For everyday work they are interchangeable:

```ts
type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;            // optional: string | undefined
  readonly createdAt: string; // cannot be reassigned after creation
};

interface Company {
  id: string;
  name: string;
}
```

**Convention for this course:** use `interface` for object shapes that describe entities and component props, and `type` for unions, tuples and anything computed. Pick one rule and be consistent.

```ts
const ava: Contact = {
  id: 'ct_1',
  firstName: 'Ava',
  lastName: 'Nguyen',
  email: 'ava@example.com',
  createdAt: '2026-01-01',
};
ava.createdAt = 'today';   // Error: Cannot assign to 'createdAt' because it is a read-only property
```

An interface can be extended:

```ts
interface Person { firstName: string; lastName: string }
interface Employee extends Person { employeeId: number }
```

## Union and literal types: model a fixed set of values

A **union** says "one of these". A **literal type** is a specific value as a type. Together they replace most uses of enums and "magic strings":

```ts
type ContactStatus = 'lead' | 'customer' | 'churned';

function badge(status: ContactStatus): string {
  return status === 'customer' ? 'green' : 'grey';
}

badge('customer');   // ok
badge('custmer');    // Error: Argument of type '"custmer"' is not assignable to parameter of type 'ContactStatus'
```

That second error is a bug caught at the moment you typed it. In a CRM, statuses, deal stages and activity types are all unions like this.

Unions also mix types: `string | null` means "a string, or nothing". TypeScript forces you to handle the `null` case before using the value. That check is called **narrowing**, which you will study tomorrow:

```ts
function emailDomain(email: string | null): string {
  if (email === null) return 'unknown';
  return email.split('@')[1];          // here email is a string
}
```

## Typing arrays, objects as maps and functions as values

```ts
const contacts: Contact[] = [];
const byId: Record<string, Contact> = {};            // object used as a dictionary
const onSelect: (id: string) => void = (id) => console.log(id);   // function type

type Formatter = (contact: Contact) => string;
const toLabel: Formatter = (c) => `${c.firstName} ${c.lastName}`;
```

## Walkthrough: model a deal

Say the product owner describes a deal: "A deal has a title, belongs to a contact, has a value in dollars, sits in one of six pipeline stages, and may have an expected close date."

Translate it sentence by sentence:

```ts
type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Deal {
  id: string;
  title: string;
  contactId: string;          // a reference to a Contact by id
  value: number;
  stage: DealStage;
  expectedCloseDate?: string; // optional
}

function isOpen(deal: Deal): boolean {
  return deal.stage !== 'won' && deal.stage !== 'lost';
}

function totalOpenValue(deals: Deal[]): number {
  return deals.filter(isOpen).reduce((sum, d) => sum + d.value, 0);
}
```

Now try to break it in the editor: pass a deal with `stage: 'closed'`, or read `deal.valu`. The checker rejects both instantly. Notice that you never wrote an annotation inside `totalOpenValue`: `filter` and `reduce` inferred everything from `Deal[]`.

## CRM step: type your data

Open Nimbus CRM and add the domain model. Create `src/types.ts`:

```ts
export type ContactStatus = 'lead' | 'customer' | 'churned';
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Company { id: string; name: string; industry: string; city: string }
export interface Contact { /* id, firstName, lastName, email, phone?, status, companyId: string | null, tags: string[] */ }
export interface Deal { /* id, title, contactId, value, stage, expectedCloseDate? */ }
```

Fill in the rest, then import the types into yesterday's `sampleContacts.ts` and `contactUtils.ts` and annotate them. Fix whatever errors appear. Each one is a spot where you were relying on luck.

- [ ] `src/types.ts` exports `ContactStatus`, `DealStage`, `Company`, `Contact`, `Deal`
- [ ] `sampleContacts.ts` is typed `Contact[]` and compiles
- [ ] `contactUtils.ts` functions have typed parameters and return types
- [ ] `npm run build` passes with no type errors
