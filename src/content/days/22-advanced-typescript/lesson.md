## Types as a design tool

By now TypeScript catches your typos. At the advanced level it does something more valuable: it **shapes APIs so that wrong usage is impossible to write.** Libraries like TanStack Query, React Router and Zustand feel magical mostly because of their types, and today you learn the techniques behind them.

> **The thinking pattern:** *make illegal states unrepresentable.* Don't write runtime checks for combinations your types can forbid. If a `Button` with an `href` can never be `type="submit"`, say so in the type and the compiler will refuse the mistake before it exists.

## Generic components

Yesterday's `VirtualList<T>` was one. A generic component takes a type parameter that flows from props to callbacks:

```tsx
interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
}

function DataTable<T>({ rows, columns, getKey }: DataTableProps<T>) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c.header}>{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getKey(row)}>
            {columns.map((c) => <td key={c.header}>{c.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

<DataTable
  rows={contacts}                                   // T inferred as Contact
  getKey={(c) => c.id}                              // c: Contact
  columns={[{ header: 'Name', render: (c) => c.firstName }]}   // c: Contact, autocompletes
/>
```

TypeScript *infers* `T` from `rows` and then checks everything else against it. `render: (c) => c.firstNme` is a compile error. One component, any data shape, full safety.

A common refinement is **constraining** the type parameter (`T extends { id: string }`) so the component can rely on something (`row.id`) without a `getKey` prop. And to pair a column with a real property:

```ts
type Column<T> = { [K in keyof T]: { key: K; header: string; render?: (value: T[K], row: T) => ReactNode } }[keyof T];
```

That mapped-type-then-index trick generates a union where `value` has the *exact type of that property*. It is advanced; recognise it when you see it.

## Discriminated unions for props

Some component APIs have mutually exclusive shapes:

```tsx
type ButtonProps =
  | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)     // a link
  | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>);              // a real button

function Button(props: ButtonProps) {
  if (props.href !== undefined) return <a {...props} />;     // narrowed to the link variant
  return <button {...props} />;                              // narrowed to the button variant
}

<Button href="/contacts">Go</Button>             // ok → <a>
<Button type="submit">Save</Button>              // ok → <button>
<Button href="/x" type="submit">Oops</Button>    // Error: 'type' does not exist on an anchor
```

The compiler now rejects the impossible combination. This pattern (a shared **discriminant** field that decides which other fields are allowed) is the same one you used for `LoadState` on Day 4, applied to props.

## `ComponentProps`: borrow props from elsewhere

```tsx
type InputProps = React.ComponentProps<'input'>;                   // every native <input> prop
type ButtonProps = React.ComponentProps<typeof Button>;            // props of your own component

function TextField({ label, ...inputProps }: { label: string } & React.ComponentProps<'input'>) {
  return <label>{label}<input {...inputProps} /></label>;
}
```

You inherit `value`, `onChange`, `disabled`, `aria-*` and everything else with full typing, and nothing needs redeclaring.

## `as const` and `satisfies`

`as const` freezes a literal's type to its exact values; **`satisfies`** (TypeScript 4.9+) validates a value against a type **without changing the value's own type**. They combine well:

```ts
const STATUSES = ['lead', 'customer', 'churned'] as const;
type Status = (typeof STATUSES)[number];             // 'lead' | 'customer' | 'churned'

const STATUS_LABEL = {
  lead: 'Lead',
  customer: 'Customer',
  churned: 'Churned',
} as const satisfies Record<Status, string>;
// Forgetting a status is an error, a misspelt key is an error,
// and STATUS_LABEL.lead has the exact type 'Lead' (not just string).
```

Why not just annotate (`const x: Record<Status, string> = ...`)? For that example an annotation works. `satisfies` earns its keep when an annotation would **throw information away**:

```ts
const ROUTES = { home: '/', contacts: '/contacts' } satisfies Record<string, string>;
ROUTES.home;     // ok: the real keys are still known, and autocomplete works
ROUTES.nope;     // Error with satisfies

const ROUTES2: Record<string, string> = { home: '/', contacts: '/contacts' };
ROUTES2.nope;    // no error: the annotation widened the keys to "any string"
```

Use `satisfies` for config objects, route tables and lookup maps: you get validation against a contract *and* the precise shape of the actual value.

## Template literal types

Types can compute strings:

```ts
type EventName = 'created' | 'updated' | 'deleted';
type Handler = `on${Capitalize<EventName>}`;                 // 'onCreated' | 'onUpdated' | 'onDeleted'
type ApiPath = `/api/${'contacts' | 'deals'}/${string}`;     // '/api/contacts/…' | '/api/deals/…'

type Handlers = { [E in EventName as `on${Capitalize<E>}`]: (id: string) => void };
// { onCreated: (id: string) => void; onUpdated: ...; onDeleted: ... }
```

`keyof`, `typeof`, indexed access (`T[K]`), mapped types (`{ [K in keyof T]: ... }`) and conditional types (`T extends U ? A : B`) combine into a small type language. You rarely write exotic ones, but reading them is a daily skill.

## Narrowing helpers and `unknown`

- Prefer **`unknown`** over `any` for data you do not control, and narrow with guards.
- Write **type predicates** (`function isStatus(x: string): x is Status`) to turn runtime checks into compile-time knowledge.
- **Assertion functions** (`asserts x is T`) throw instead of returning a boolean.
- Avoid casting (`as Foo`) except at boundaries where you genuinely know more than the compiler, and prefer validating with a schema library (Zod) so the type and the check cannot drift apart.

## Walkthrough: a typed `SelectField<T>`

The DOM gives a `<select>` value as a *string*. For a numeric or enum-like option you would like `onChange` to give back the original value:

```tsx
interface Option<T> { value: T; label: string }

function SelectField<T extends string | number>({ options, value, onChange }: {
  options: Option<T>[]; value: T; onChange: (value: T) => void;
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const chosen = options.find((o) => String(o.value) === e.target.value);
        if (chosen) onChange(chosen.value);              // back to the original type, no cast
      }}
    >
      {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
    </select>
  );
}

<SelectField options={[{ value: 10, label: '10' }, { value: 25, label: '25' }]} value={pageSize} onChange={setPageSize} />
// onChange receives a number, because T is inferred as number
```

The trick is mapping back through the options list rather than casting `e.target.value as T`, so the runtime value is always one you provided. This is the style of defensive typing used in design systems.

## CRM step: typed building blocks

1. Build a generic `DataTable<T>` in `src/components/DataTable.tsx` (columns with `header` and `render`, `getKey`, optional `onRowClick`), and migrate the contacts table to it. Reuse it for deals and companies later.
2. Make `Button` a discriminated union so it renders `<a>`/`<Link>` when given `href`/`to`, otherwise `<button>`.
3. Replace repeated status arrays with `STATUSES as const` and `STATUS_LABEL as const satisfies Record<Status, string>`; use them in the filter select and the badge.
4. Add a generic `SelectField<T>` and use it for the status filter and page size.
5. Remove every `as` cast you can; for the ones that remain, write a comment explaining why.

- [ ] `DataTable<T>` is used for at least two entity types
- [ ] `Button` rejects `href` + `type="submit"` at compile time
- [ ] Status labels use `satisfies Record<Status, string>`
- [ ] `SelectField<T>` returns real numbers for numeric options
