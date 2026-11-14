# practice: Model a company

### meta
minutes: 7
language: ts

### prompt
Define and export an interface `Company` with:

- `id`: string, **read-only**
- `name`: string
- `employees`: number
- `website`: string, **optional**
- `industry`: one of `'software'`, `'retail'` or `'finance'` (a literal union; export it as the type `Industry`)

Then type and implement `companyLabel(company)`, returning `"Name · N people"`, plus `" · website"` when there is a website:

```text
Acme · 120 people · acme.test
Globex · 8 people
```

### starter
```ts
// 1. Define Industry and Company here


// 2. Type the parameter and finish the function
export function companyLabel(company) {
  return company.name;
}

console.log(companyLabel({ id: 'co1', name: 'Acme', employees: 120, website: 'acme.test', industry: 'software' }));
```

### solution
```ts
export type Industry = 'software' | 'retail' | 'finance';

export interface Company {
  readonly id: string;
  name: string;
  employees: number;
  website?: string;
  industry: Industry;
}

export function companyLabel(company: Company): string {
  const base = `${company.name} · ${company.employees} people`;
  return company.website ? `${base} · ${company.website}` : base;
}

console.log(companyLabel({ id: 'co1', name: 'Acme', employees: 120, website: 'acme.test', industry: 'software' }));
```

### tests
```ts
test('label with a website', () => {
  expect(user.companyLabel({ id: 'co1', name: 'Acme', employees: 120, website: 'acme.test', industry: 'software' })).toBe('Acme · 120 people · acme.test');
});

test('label without a website', () => {
  expect(user.companyLabel({ id: 'co2', name: 'Globex', employees: 8, industry: 'retail' })).toBe('Globex · 8 people');
});
```

### typetests
```ts
const ok: Company = { id: 'x', name: 'Initech', employees: 50, industry: 'finance' };
const _label: string = companyLabel(ok);
const _industry: Industry = 'retail';
// @ts-expect-error employees is required
const _missing: Company = { id: 'x', name: 'A', industry: 'retail' };
// @ts-expect-error industry must be one of the three options
const _wrongIndustry: Company = { id: 'x', name: 'A', employees: 1, industry: 'farming' };
// @ts-expect-error employees must be a number
const _wrongType: Company = { id: 'x', name: 'A', employees: '10', industry: 'retail' };
// @ts-expect-error id is read-only
ok.id = 'y';
```

### explanation
The interface is the single source of truth for what a company is. `website?: string` makes the property optional, and inside `companyLabel` its type is `string | undefined`, so the truthiness check is both the logic and the narrowing. `industry: Industry` restricts the field to three exact strings: a typo like `'Software'` or an unknown value like `'farming'` is a compile error, and the editor autocompletes the valid ones. `readonly id` stops accidental reassignment of an identifier, which is the kind of mutation that causes subtle bugs in React state.

### hints
- Literal union: `export type Industry = 'software' | 'retail' | 'finance';`
- Optional property: `website?: string;` Read-only: `readonly id: string;`
- Build the base string first, then append the website only if it exists.

# practice: Deal stages as a literal union

### meta
minutes: 7
language: ts

### prompt
Deals move through four stages. Replace the loose `string` types with a literal union:

- Export `type DealStage = 'lead' | 'qualified' | 'won' | 'lost'`.
- `stageLabel(stage)` returns `'New lead'`, `'Qualified'`, `'Won'` or `'Lost'`. Use a `Record<DealStage, string>` so TypeScript checks every stage has a label.
- `isClosed(stage)` returns `true` for `'won'` and `'lost'`.
- `nextStage(stage)` returns the next stage in the pipeline (`lead → qualified → won`), or `null` for `'won'` and `'lost'`. Its return type is `DealStage | null`.

### starter
```ts
export function stageLabel(stage: string): string {
  if (stage === 'lead') return 'New lead';
  return stage;
}

export function isClosed(stage: string): boolean {
  return stage === 'won';
}

export function nextStage(stage: string): string {
  return 'won';
}

console.log(stageLabel('lead'), isClosed('lost'), nextStage('lead'));
```

### solution
```ts
export type DealStage = 'lead' | 'qualified' | 'won' | 'lost';

const LABELS: Record<DealStage, string> = {
  lead: 'New lead',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

export function stageLabel(stage: DealStage): string {
  return LABELS[stage];
}

export function isClosed(stage: DealStage): boolean {
  return stage === 'won' || stage === 'lost';
}

export function nextStage(stage: DealStage): DealStage | null {
  if (stage === 'lead') return 'qualified';
  if (stage === 'qualified') return 'won';
  return null;
}

console.log(stageLabel('lead'), isClosed('lost'), nextStage('lead'));
```

### tests
```ts
test('labels for every stage', () => {
  expect(['lead', 'qualified', 'won', 'lost'].map(user.stageLabel)).toEqual(['New lead', 'Qualified', 'Won', 'Lost']);
});

test('isClosed is true only for won and lost', () => {
  expect(['lead', 'qualified', 'won', 'lost'].map(user.isClosed)).toEqual([false, false, true, true]);
});

test('nextStage walks the pipeline and stops at closed stages', () => {
  expect(user.nextStage('lead')).toBe('qualified');
  expect(user.nextStage('qualified')).toBe('won');
  expect(user.nextStage('won')).toBe(null);
  expect(user.nextStage('lost')).toBe(null);
});
```

### typetests
```ts
const _s: DealStage = 'won';
const _n: DealStage | null = nextStage('lead');
// @ts-expect-error 'pending' is not a stage
stageLabel('pending');
// @ts-expect-error isClosed only accepts stages
isClosed('closed');
// @ts-expect-error nextStage can return null
const _bad: DealStage = nextStage('lead');
```

### explanation
With `stage: string`, any typo compiles and silently falls through every `if`. The literal union turns the set of valid stages into something the checker knows about: callers can only pass real stages, and the editor autocompletes them. `Record<DealStage, string>` goes one step further: if you add a fifth stage to the union later, the labels object stops compiling until you add its label, so the compiler finds every place that needs updating. Returning `DealStage | null` from `nextStage` makes "there is no next stage" explicit and forces callers to handle it.

### hints
- Declare the union first, then change every `string` parameter to `DealStage`.
- `const LABELS: Record<DealStage, string> = { lead: 'New lead', ... }` and return `LABELS[stage]`.
- `nextStage` returns `null` for both closed stages; its return type is `DealStage | null`.

# challenge: Model loading state with a discriminated union

### meta
minutes: 10
language: ts

### prompt
The starter models a request with one loose object, which allows nonsense like `{ status: 'error', contacts: [...] }`. Replace it with a **discriminated union** and export it as `LoadState`:

- `{ status: 'idle' }`
- `{ status: 'loading' }`
- `{ status: 'success'; contacts: string[] }`
- `{ status: 'error'; message: string }`

Then implement `describe(state)`:

| state | result |
| --- | --- |
| idle | `'Not loaded yet'` |
| loading | `'Loading…'` |
| success, 0 contacts | `'No contacts'` |
| success, 1 contact | `'1 contact'` |
| success, n contacts | `'n contacts'` |
| error | `'Error: <message>'` |

Use a `switch` on `state.status`.

### starter
```ts
export interface LoadState {
  status: string;
  contacts?: string[];
  message?: string;
}

export function describe(state: LoadState): string {
  if (state.status === 'loading') return 'Loading…';
  if (state.status === 'error') return 'Error';
  return `${state.contacts?.length} contacts`;
}

console.log(describe({ status: 'success', contacts: ['Ava'] }));
```

### solution
```ts
export type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; contacts: string[] }
  | { status: 'error'; message: string };

export function describe(state: LoadState): string {
  switch (state.status) {
    case 'idle':
      return 'Not loaded yet';
    case 'loading':
      return 'Loading…';
    case 'success': {
      const n = state.contacts.length;
      if (n === 0) return 'No contacts';
      return n === 1 ? '1 contact' : `${n} contacts`;
    }
    case 'error':
      return `Error: ${state.message}`;
  }
}

console.log(describe({ status: 'success', contacts: ['Ava'] }));
```

### tests
```ts
test('idle and loading', () => {
  expect(user.describe({ status: 'idle' })).toBe('Not loaded yet');
  expect(user.describe({ status: 'loading' })).toBe('Loading…');
});

test('success with 0, 1 and many contacts', () => {
  expect(user.describe({ status: 'success', contacts: [] })).toBe('No contacts');
  expect(user.describe({ status: 'success', contacts: ['Ava'] })).toBe('1 contact');
  expect(user.describe({ status: 'success', contacts: ['Ava', 'Ben', 'Cy'] })).toBe('3 contacts');
});

test('error includes the message', () => {
  expect(user.describe({ status: 'error', message: 'Network down' })).toBe('Error: Network down');
});
```

### typetests
```ts
const _a: LoadState = { status: 'idle' };
const _b: LoadState = { status: 'success', contacts: ['Ava'] };
// @ts-expect-error success needs contacts
const _c: LoadState = { status: 'success' };
// @ts-expect-error error needs a message
const _d: LoadState = { status: 'error' };
// @ts-expect-error an error state has no contacts
const _e: LoadState = { status: 'error', message: 'x', contacts: [] };
// @ts-expect-error unknown status
const _f: LoadState = { status: 'done' };
```

### explanation
Each member of the union describes one real situation, and the shared `status` literal tells TypeScript which one you have. Inside `case 'success'` the type is narrowed to `{ status: 'success'; contacts: string[] }`, so `state.contacts` is known to exist (no `?.` needed), while `state.message` would be an error. Invalid combinations simply cannot be written. Because every case returns, TypeScript also knows the `switch` is exhaustive: add a fifth status to the union and `describe` stops compiling until you handle it. You will use exactly this shape for request state in React, and TanStack Query uses it for the objects it returns.

### hints
- Write the union with a leading `|` on each line: `export type LoadState = | { status: 'idle' } | ...`.
- Use `switch (state.status)` with one `case` per status; each case returns.
- Wrap the `success` case body in `{ }` if you declare a `const` inside it.
