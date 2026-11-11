## Why this day matters

React code is ordinary JavaScript with a few conventions on top. Almost every line you will write this month uses the features below: destructuring to unpack props, spread to copy objects without mutating them, array methods to turn data into UI, modules to organise files and `async/await` to talk to servers.

> **The thinking pattern:** React compares old and new values to decide what to redraw. If you *mutate* an object in place, the old and new values are the same object and React cannot see the change. So the habit for the next 28 days is: **never change data, always make a new copy with the change applied.** Today's tools make that easy.

## Destructuring: unpack values by shape

Destructuring pulls values out of objects and arrays into variables in one statement.

```js
const contact = { name: 'Ava', email: 'ava@example.com', company: { name: 'Acme', city: 'Perth' } };

const { name, email } = contact;                 // name = 'Ava'
const { company: { city } } = contact;           // nested: city = 'Perth'
const { phone = 'n/a' } = contact;               // default when missing
const { name: contactName } = contact;           // rename: contactName = 'Ava'

const [first, second] = ['lead', 'customer'];    // arrays unpack by position
const [, , third = 'churned'] = ['lead'];        // skip items, default value
```

You can destructure in function parameters. This is exactly how React components receive props:

```js
function ContactCard({ name, email, tags = [] }) {
  return `${name} <${email}> ${tags.join(', ')}`;
}
ContactCard({ name: 'Ava', email: 'ava@example.com' });
```

**Mistake to avoid:** destructuring `null` or `undefined` throws. `const { a } = null` is a `TypeError`. Give a default (`= {}`) when the value might be missing.

## Spread and rest: copy and collect

The three dots do two opposite jobs depending on where they appear.

**Spread** (in a call, array or object literal) expands:

```js
const a = [1, 2];
const b = [...a, 3];                 // [1, 2, 3]  new array

const contact = { name: 'Ava', status: 'lead' };
const updated = { ...contact, status: 'customer' };   // new object, status replaced
// contact is unchanged
```

**Rest** (in a destructuring pattern or parameter list) collects the remainder:

```js
const { status, ...others } = { name: 'Ava', status: 'lead', email: 'a@x.com' };
// status = 'lead', others = { name: 'Ava', email: 'a@x.com' }

const sum = (...nums) => nums.reduce((s, n) => s + n, 0);
```

Spread is *shallow*. It copies the top level only; nested objects are still shared. When you update something nested you must spread each level you touch:

```js
const state = { user: { name: 'Ava', address: { city: 'Perth' } } };
const next = {
  ...state,
  user: { ...state.user, address: { ...state.user.address, city: 'Sydney' } },
};
```

## Array methods: describe the result, not the loop

| Method | Returns | Use it to |
| --- | --- | --- |
| `map(fn)` | new array, same length | transform every item |
| `filter(fn)` | new array, fewer items | keep some items |
| `find(fn)` | one item or `undefined` | look something up |
| `some(fn)` / `every(fn)` | boolean | ask a yes/no question |
| `reduce(fn, init)` | anything | fold a list into one value |
| `includes(x)` | boolean | membership test |
| `slice(a, b)` | new array | take a section |
| `[...arr].sort(cmp)` | new sorted array | sort without touching the original |

`sort`, `push`, `pop`, `splice`, `reverse` **mutate**. In React code reach for the non-mutating versions: `[...arr, item]` instead of `push`, `filter` instead of `splice`, `[...arr].sort()` instead of `sort()`.

```js
const contacts = [
  { id: 1, name: 'Zoe', status: 'lead' },
  { id: 2, name: 'Ava', status: 'customer' },
];

const add = (list, c) => [...list, c];
const remove = (list, id) => list.filter((c) => c.id !== id);
const update = (list, id, patch) => list.map((c) => (c.id === id ? { ...c, ...patch } : c));
const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
```

These three one-liners (add, remove, update) are the backbone of every list in React.

## Modules: one file, one job

```js
// lib/format.js
export const fullName = (c) => `${c.firstName} ${c.lastName}`;   // named export
export default function initials(c) { return c.firstName[0] + c.lastName[0]; }

// elsewhere
import initials, { fullName } from './lib/format.js';
import * as format from './lib/format.js';
```

Use named exports by default. They give better autocomplete and make renaming safe. In the exercises on this site, `export` is how your code hands functions to the tests.

## Async: promises and async/await

Network calls take time, so they return a **promise**: an object that will later hold a value or an error.

```js
function fetchContact(id) {
  return fetch(`/api/contacts/${id}`).then((res) => res.json());
}

async function loadContact(id) {
  try {
    const res = await fetch(`/api/contacts/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);   // fetch only rejects on network failure!
    return await res.json();
  } catch (err) {
    console.error('Could not load contact', err);
    throw err;                                            // let the caller decide
  }
}
```

Key rules:

- `await` pauses *that function* until the promise settles. It can only be used inside an `async` function (or at the top level of a module).
- An `async` function **always returns a promise**.
- `fetch` does not reject on a 404 or 500. Check `res.ok` yourself.
- Run independent requests in parallel with `Promise.all`:

```js
const [contact, deals] = await Promise.all([getContact(id), getDeals(id)]);
```

Use `Promise.allSettled` when you want every result even if some fail.

## Walkthrough: shaping API data

The CRM API returns pages like `{ data: [...], page: 1, total: 42 }`. The UI wants a simple list of display-ready contacts. Here is how a developer thinks through it, in small steps, each a pure function you can test:

```js
const response = {
  data: [
    { id: 'ct_1', firstName: 'Ava', lastName: 'Nguyen', email: 'AVA@Example.com', status: 'lead', company: { name: 'Acme' } },
    { id: 'ct_2', firstName: 'Liam', lastName: 'Smith', email: 'liam@example.com', status: 'customer', company: null },
  ],
  total: 2,
};

// 1. Pull out the list (destructuring with a default for safety)
const { data = [] } = response;

// 2. Reshape each record (map + destructuring + optional chaining)
const rows = data.map(({ id, firstName, lastName, email, status, company }) => ({
  id,
  name: `${firstName} ${lastName}`,
  email: email.toLowerCase(),
  status,
  companyName: company?.name ?? 'No company',
}));

// 3. Count by status (reduce)
const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
console.log(rows, counts);
```

Two operators worth memorising: **optional chaining** `a?.b` stops and returns `undefined` if `a` is `null`/`undefined`, and **nullish coalescing** `x ?? y` uses `y` only when `x` is `null`/`undefined` (unlike `||`, which also replaces `0` and `''`).

## CRM step: sample data and helpers

Give Nimbus CRM some data to display, and write your first pure helper functions. In `nimbus-crm/src`:

1. Create `data/sampleContacts.ts` exporting an array of 8 contacts. Each has `id`, `firstName`, `lastName`, `email`, `status` (`'lead' | 'customer' | 'churned'`) and `company` (a string).
2. Create `lib/contactUtils.ts` exporting `fullName(contact)`, `groupByStatus(contacts)` and `addContact(list, contact)` (returns a new array).
3. In `App.tsx`, `console.log` the result of `groupByStatus(sampleContacts)` and check it in the browser console.

Write plain JavaScript-style code for now. Tomorrow you will add types, and TypeScript will point out every place it was guessing.

- [ ] `sampleContacts.ts` has 8 contacts across all three statuses
- [ ] `contactUtils.ts` exports `fullName`, `groupByStatus`, `addContact`
- [ ] No function mutates its arguments
- [ ] Console shows contacts grouped by status
