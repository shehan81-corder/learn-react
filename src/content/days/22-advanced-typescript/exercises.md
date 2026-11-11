# practice: A generic DataTable

### meta
minutes: 8
language: tsx

### prompt
Build `DataTable<T>({ rows, columns, getKey })`.

- `columns` is an array of `{ header: string; render: (row: T) => ReactNode }`.
- Render a `<table>`: a header row with one `<th>` per column, then one `<tr>` per row (keyed by `getKey(row)`) with one `<td>` per column showing `render(row)`.
- `T` must be **inferred** from `rows`, so `render` and `getKey` receive correctly typed rows.
- With no rows render a single `<td colSpan>` cell reading `No data` that spans all columns.

### starter
```tsx
import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
}

export function DataTable<T>(props: DataTableProps<T>) {
  // TODO
  return <table />;
}

export default function App() {
  const contacts = [
    { id: 'a', name: 'Ava', age: 30 },
    { id: 'b', name: 'Liam', age: 41 },
  ];
  return (
    <DataTable
      rows={contacts}
      getKey={(c) => c.id}
      columns={[
        { header: 'Name', render: (c) => c.name },
        { header: 'Age', render: (c) => c.age },
      ]}
    />
  );
}
```

### solution
```tsx
import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
}

export function DataTable<T>({ rows, columns, getKey }: DataTableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.header}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>No data</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={getKey(row)}>
              {columns.map((c) => (
                <td key={c.header}>{c.render(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default function App() {
  const contacts = [
    { id: 'a', name: 'Ava', age: 30 },
    { id: 'b', name: 'Liam', age: 41 },
  ];
  return (
    <DataTable
      rows={contacts}
      getKey={(c) => c.id}
      columns={[
        { header: 'Name', render: (c) => c.name },
        { header: 'Age', render: (c) => c.age },
      ]}
    />
  );
}
```

### tests
```tsx
const people = [
  { id: 'a', name: 'Ava', age: 30 },
  { id: 'b', name: 'Liam', age: 41 },
];
const columns = [
  { header: 'Name', render: (p) => p.name },
  { header: 'Age', render: (p) => <b>{p.age}</b> },
];

test('renders the header and one row per item', async () => {
  const view = await render(<user.DataTable rows={people} columns={columns} getKey={(p) => p.id} />);
  expect(view.$$('thead th').map((th) => th.textContent)).toEqual(['Name', 'Age']);
  expect(view.$$('tbody tr')).toHaveLength(2);
  expect(view.$$('tbody tr')[1].textContent).toBe('Liam41');
});

test('cells use render, which may return elements', async () => {
  const view = await render(<user.DataTable rows={people} columns={columns} getKey={(p) => p.id} />);
  expect(view.$$('tbody tr')[0].querySelectorAll('td')[1].querySelector('b').textContent).toBe('30');
});

test('shows an empty row spanning every column', async () => {
  const view = await render(<user.DataTable rows={[]} columns={columns} getKey={(p) => p.id} />);
  const cells = view.$$('tbody td');
  expect(cells).toHaveLength(1);
  expect(cells[0].textContent).toBe('No data');
  expect(cells[0].getAttribute('colspan')).toBe('2');
});

test('works with any data shape', async () => {
  const deals = [{ key: 1, title: 'Annual', value: 1200 }];
  const view = await render(
    <user.DataTable
      rows={deals}
      getKey={(d) => String(d.key)}
      columns={[{ header: 'Deal', render: (d) => d.title }, { header: 'Value', render: (d) => '$' + d.value }]}
    />,
  );
  expect(view.$$('tbody td').map((td) => td.textContent)).toEqual(['Annual', '$1200']);
});
```

### typetests
```tsx
interface Person { id: string; name: string; age: number }
const rows: Person[] = [{ id: 'a', name: 'A', age: 1 }];

const ok = (
  <DataTable
    rows={rows}
    getKey={(p) => p.id}
    columns={[{ header: 'Name', render: (p) => p.name.toUpperCase() }]}
  />
);
const bad1 = (
  <DataTable
    rows={rows}
    getKey={(p) => p.id}
    // @ts-expect-error 'nme' is not a property of Person (T was inferred from rows)
    columns={[{ header: 'Name', render: (p) => p.nme }]}
  />
);
const bad2 = (
  // @ts-expect-error getKey must return a string
  <DataTable rows={rows} getKey={(p) => p.age} columns={[]} />
);
```

### explanation
`DataTable<T>` declares one type parameter and uses it in three places: `rows`, `render` and `getKey`. When a caller passes `rows`, TypeScript **infers** `T` from it, then checks that every callback agrees. That is what gives callers autocomplete on `p.` inside `render` and a compile error for `p.nme`, with **no type annotations written at the call site**. The generic is also why one component serves contacts, deals and companies.

### hints
- `export function DataTable<T>({ rows, columns, getKey }: DataTableProps<T>)`
- Map over `columns` for the header; map over `rows` for the body, and over `columns` again for the cells.
- Header cells can be keyed by `c.header`.

# practice: Props that cannot contradict

### meta
minutes: 8
language: tsx

### prompt
Build `Button` as a **discriminated union** of two shapes:

- With an `href`: renders `<a href=...>` and accepts anchor props (`target`, `rel`, ...), but **not** button-only props such as `disabled` or `formAction`.
- Without `href`: renders `<button>` and accepts button props, but **not** link-only props such as `target` or `rel` (forbid them with `?: never`).

Both render their `children`. A button defaults to `type="button"` (so it does not submit forms by accident) unless the caller passes a `type`.

The hidden type checks verify that mixing the two shapes is a compile error.

### starter
```tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type AnchorProps = { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
type NativeButtonProps = { href?: undefined; target?: never; rel?: never } & ButtonHTMLAttributes<HTMLButtonElement>;

// TODO: make ButtonProps a union of the two shapes above
export type ButtonProps = NativeButtonProps;

export function Button(props: ButtonProps) {
  // TODO: render <a> when href is present, otherwise <button>
  return <button {...props} />;
}

export default function App() {
  return (
    <div>
      <Button href="/contacts">Contacts</Button>
      <Button onClick={() => {}}>Save</Button>
    </div>
  );
}
```

### solution
```tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type AnchorProps = { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
type NativeButtonProps = { href?: undefined; target?: never; rel?: never } & ButtonHTMLAttributes<HTMLButtonElement>;

export type ButtonProps = AnchorProps | NativeButtonProps;

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    return <a {...props} />;
  }
  const { type = 'button', ...rest } = props;
  return <button type={type} {...rest} />;
}

export default function App() {
  return (
    <div>
      <Button href="/contacts">Contacts</Button>
      <Button onClick={() => {}}>Save</Button>
    </div>
  );
}
```

### tests
```tsx
test('renders an anchor when given an href', async () => {
  const view = await render(
    <user.Button href="/contacts" target="_blank">
      Go
    </user.Button>,
  );
  const a = view.$('a');
  expect(a.getAttribute('href')).toBe('/contacts');
  expect(a.getAttribute('target')).toBe('_blank');
  expect(a.textContent).toBe('Go');
  expect(view.$('button')).toBeNull();
});

test('renders a button otherwise, defaulting to type="button"', async () => {
  const view = await render(<user.Button>Save</user.Button>);
  const b = view.$('button');
  expect(b.textContent).toBe('Save');
  expect(b.getAttribute('type')).toBe('button');
  expect(view.$('a')).toBeNull();
});

test('an explicit type is respected', async () => {
  const view = await render(<user.Button type="submit">Send</user.Button>);
  expect(view.$('button').getAttribute('type')).toBe('submit');
});

test('forwards native props and handlers', async () => {
  const onClick = fn();
  const view = await render(
    <user.Button disabled={false} onClick={onClick} aria-label="Save contact">
      S
    </user.Button>,
  );
  await click(view.$('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(view.$('button').getAttribute('aria-label')).toBe('Save contact');
});
```

### typetests
```tsx
const link = <Button href="/x" target="_blank" rel="noreferrer">link</Button>;
const button = <Button type="submit" disabled onClick={() => {}}>button</Button>;
// @ts-expect-error an anchor cannot have a button-only prop
const bad1 = <Button href="/x" formAction="/y">oops</Button>;
// @ts-expect-error an anchor cannot be 'disabled'
const bad2 = <Button href="/x" disabled>oops</Button>;
// @ts-expect-error a button cannot have a 'target'
const bad3 = <Button target="_blank">oops</Button>;
```

### explanation
The two prop shapes are made **mutually exclusive** by the `href` field: it is a required `string` in one variant and `undefined` in the other, which makes it a *discriminant*. After `if (props.href !== undefined)` TypeScript narrows `props` to the anchor variant, so spreading it onto `<a>` is allowed; in the rest of the function it is the button variant. The `?: never` properties in the button variant forbid link-only props such as `target`, which TypeScript would otherwise happily accept because they exist in *some* member of the union. The payoff is at the call site: `<Button href="/x" disabled>` is a compile error, because no variant allows both. Making illegal prop combinations impossible to write is better than documenting that they are wrong.

### hints
- `export type ButtonProps = AnchorProps | NativeButtonProps;`
- Narrow with `if (props.href !== undefined) return <a {...props} />;`
- In the button branch: `const { type = 'button', ...rest } = props;`

# practice: as const and satisfies

### meta
minutes: 7
language: ts

### prompt
Define the CRM's pipeline stages once and derive everything else from that single source of truth.

Export:

- `STAGES`: `['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']`, as a **readonly tuple of literals** (`as const`).
- `type Stage`: derived from `STAGES` (not retyped).
- `STAGE_LABEL`: an object mapping every stage to a display label (`'New'`, `'Qualified'`, `'Proposal'`, `'Negotiation'`, `'Won'`, `'Lost'`) that **must be `as const satisfies Record<Stage, string>`** so a missing or misspelt key is an error and each label keeps its exact literal type.
- `isStage(value: string): value is Stage`: a type guard.
- `labelFor(value: string): string`: the label for a valid stage, or `'Unknown'`.

### starter
```ts
// Define STAGES, Stage, STAGE_LABEL, isStage and labelFor.
```

### solution
```ts
export const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
} as const satisfies Record<Stage, string>;

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function labelFor(value: string): string {
  return isStage(value) ? STAGE_LABEL[value] : 'Unknown';
}
```

### tests
```ts
test('STAGES lists the pipeline in order', () => {
  expect([...user.STAGES]).toEqual(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
});

test('STAGE_LABEL has a label for every stage', () => {
  expect(user.STAGE_LABEL).toEqual({
    new: 'New',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost',
  });
});

test('isStage accepts only real stages', () => {
  expect(user.isStage('won')).toBe(true);
  expect(user.isStage('proposal')).toBe(true);
  expect(user.isStage('Won')).toBe(false);
  expect(user.isStage('closed')).toBe(false);
  expect(user.isStage('')).toBe(false);
});

test('labelFor returns a label or Unknown', () => {
  expect(user.labelFor('negotiation')).toBe('Negotiation');
  expect(user.labelFor('nope')).toBe('Unknown');
});
```

### typetests
```ts
const stage: Stage = 'won';
// @ts-expect-error not a stage
const bad: Stage = 'closed';
const label: string = STAGE_LABEL.lost;
// @ts-expect-error not a key of STAGE_LABEL
STAGE_LABEL.closed;
// `as const` keeps the exact literal type of each label.
const exact: 'Won' = STAGE_LABEL.won;
function narrow(s: string) {
  if (isStage(s)) {
    const known: Stage = s;
    const l: string = STAGE_LABEL[s];
  }
}
// @ts-expect-error STAGES is readonly
STAGES.push('archived');
```

### explanation
Everything flows from one declaration. `as const` makes `STAGES` a **readonly tuple of literal types**, so `(typeof STAGES)[number]` is the union `'new' | 'qualified' | ...`; add a stage to the array and the `Stage` type updates by itself. `satisfies Record<Stage, string>` *checks* the label map against that union (a missing stage is an error) while `as const` keeps each label's exact literal type, so `STAGE_LABEL.won` has the type `'Won'`. The type guard `isStage` turns a runtime check into compile-time knowledge: inside the `if`, a plain `string` becomes a `Stage` and can index `STAGE_LABEL` safely, with no cast needed.

### hints
- `export const STAGES = [...] as const;`
- `export type Stage = (typeof STAGES)[number];`
- `{ ... } as const satisfies Record<Stage, string>`
- For the guard: `(STAGES as readonly string[]).includes(value)`.

# challenge: A type-safe SelectField

### meta
minutes: 10
language: tsx

### prompt
Build the generic `SelectField<T>`, where `T extends string | number`.

Props: `label: string`, `options: { value: T; label: string }[]`, `value: T`, `onChange: (value: T) => void`.

- Render `<label>{label}<select>...</select></label>` with an `<option>` per option.
- The select shows the current `value`.
- When the user picks an option, call `onChange` with the **original option value**, preserving its type: a numeric option must arrive as a `number`, not a string. **Do not use `as` casts.**
- If the DOM reports a value that matches no option, ignore the event.

The type checks verify that `T` is inferred from `options` and `value`, so `onChange` receives a `number` for numeric options.

### starter
```tsx
export interface Option<T> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string | number> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SelectField<T extends string | number>(props: SelectFieldProps<T>) {
  // TODO
  return <select />;
}

export default function App() {
  return <SelectField label="Page size" options={[{ value: 10, label: '10 rows' }, { value: 25, label: '25 rows' }]} value={10} onChange={(n) => console.log(n + 1)} />;
}
```

### solution
```tsx
export interface Option<T> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string | number> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SelectField<T extends string | number>({ label, options, value, onChange }: SelectFieldProps<T>) {
  return (
    <label>
      {label}
      <select
        value={String(value)}
        onChange={(e) => {
          const chosen = options.find((o) => String(o.value) === e.target.value);
          if (chosen) onChange(chosen.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  return <SelectField label="Page size" options={[{ value: 10, label: '10 rows' }, { value: 25, label: '25 rows' }]} value={10} onChange={(n) => console.log(n + 1)} />;
}
```

### tests
```tsx
test('renders a labelled select with the given options', async () => {
  const view = await render(
    <user.SelectField label="Page size" options={[{ value: 10, label: '10 rows' }, { value: 25, label: '25 rows' }]} value={25} onChange={() => {}} />,
  );
  const select = view.getByRole('combobox', { name: 'Page size' });
  expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['10 rows', '25 rows']);
  expect(select.value).toBe('25');
});

test('numeric options come back as numbers', async () => {
  const onChange = fn();
  const view = await render(
    <user.SelectField label="Size" options={[{ value: 10, label: 'ten' }, { value: 25, label: 'twenty-five' }]} value={10} onChange={onChange} />,
  );
  await type(view.getByRole('combobox', { name: 'Size' }), '25');
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.calls[0][0]).toBe(25);
  expect(typeof onChange.calls[0][0]).toBe('number');
});

test('string options come back as strings', async () => {
  const onChange = fn();
  const view = await render(
    <user.SelectField label="Status" options={[{ value: 'lead', label: 'Lead' }, { value: 'customer', label: 'Customer' }]} value="lead" onChange={onChange} />,
  );
  await type(view.getByRole('combobox', { name: 'Status' }), 'customer');
  expect(onChange.calls[0][0]).toBe('customer');
});

test('numeric-looking string values stay strings', async () => {
  const onChange = fn();
  const view = await render(
    <user.SelectField label="Code" options={[{ value: '007', label: 'Bond' }, { value: '42', label: 'Answer' }]} value="42" onChange={onChange} />,
  );
  await type(view.getByRole('combobox', { name: 'Code' }), '007');
  expect(onChange.calls[0][0]).toBe('007');
});

test('is a controlled component', async () => {
  const view = await render(
    <user.SelectField label="Size" options={[{ value: 1, label: 'one' }, { value: 2, label: 'two' }]} value={1} onChange={() => {}} />,
  );
  await view.rerender(
    <user.SelectField label="Size" options={[{ value: 1, label: 'one' }, { value: 2, label: 'two' }]} value={2} onChange={() => {}} />,
  );
  expect(view.getByRole('combobox', { name: 'Size' }).value).toBe('2');
});
```

### typetests
```tsx
const numeric = (
  <SelectField
    label="Size"
    options={[{ value: 10, label: 'ten' }]}
    value={10}
    onChange={(n) => n.toFixed(1)}
  />
);
const stringy = (
  <SelectField
    label="Status"
    options={[{ value: 'lead', label: 'Lead' }]}
    value="lead"
    onChange={(s) => s.toUpperCase()}
  />
);
const bad = (
  <SelectField
    label="Size"
    options={[{ value: 10, label: 'ten' }]}
    // @ts-expect-error value must be the same type as the option values
    value="ten"
    onChange={() => {}}
  />
);
const bad2 = (
  // @ts-expect-error T must be a string or a number
  <SelectField label="x" options={[{ value: { a: 1 }, label: 'obj' }]} value={{ a: 1 }} onChange={() => {}} />
);
```

### explanation
The DOM only deals in strings, so a naive `onChange(e.target.value as T)` would *lie* to the compiler: a numeric `T` would receive `"25"`. The fix is to **map back through the options list**: find the option whose stringified value matches and pass along `option.value`, the original value with its original type. No cast is needed, and a value that matches no option is simply ignored. Generics do the rest: TypeScript infers `T` as `number` or `string` from `options` and `value`, so the callback parameter is typed correctly and `n.toFixed` or `s.toUpperCase` just work. The constraint `T extends string | number` rejects objects, which cannot round-trip through a `<select>`.

### hints
- `value={String(value)}` for the select; `value={String(o.value)}` for each option.
- In `onChange`: `options.find((o) => String(o.value) === e.target.value)`.
- Call `onChange(chosen.value)` only when a match is found.
