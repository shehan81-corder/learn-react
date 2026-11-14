# practice: Type a component's props

### meta
minutes: 7
language: tsx

### prompt
Replace the `any` props with proper interfaces:

- **`Badge`** takes a required `label` (string) and an optional `tone` that is `'neutral'`, `'success'` or `'danger'`, defaulting to `'neutral'`. It renders `<span className="badge badge-{tone}">{label}</span>`.
- **`Card`** takes a required `title` (string), required `children`, and an optional `footer`. Both `children` and `footer` can be anything React can render. It renders the title in an `<h3>`, then the children, then the footer inside a `<footer>` **only when one is given**.

The hidden type checks make sure wrong usages are rejected.

### starter
```tsx
export function Badge({ label, tone }: any) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function Card({ title, children, footer }: any) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <Card title="Ava Lee" footer={<Badge label="VIP" tone="success" />}>
      <p>ava@acme.test</p>
      <Badge label="Lead" />
    </Card>
  );
}
```

### solution
```tsx
import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'success' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export interface CardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, children, footer }: CardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

export default function App() {
  return (
    <Card title="Ava Lee" footer={<Badge label="VIP" tone="success" />}>
      <p>ava@acme.test</p>
      <Badge label="Lead" />
    </Card>
  );
}
```

### tests
```tsx
test('Badge defaults to the neutral tone', async () => {
  const view = await render(<user.Badge label="Lead" />);
  expect(view.$('span').className).toBe('badge badge-neutral');
  expect(view.text).toBe('Lead');
});

test('Badge uses the given tone', async () => {
  const view = await render(<user.Badge label="VIP" tone="success" />);
  expect(view.$('span').className).toBe('badge badge-success');
});

test('Card renders the title and children', async () => {
  const view = await render(
    <user.Card title="Deals">
      <p>3 open</p>
    </user.Card>,
  );
  expect(view.$('h3').textContent).toBe('Deals');
  expect(view.$('p').textContent).toBe('3 open');
});

test('Card renders a footer only when one is given', async () => {
  const without = await render(<user.Card title="A">x</user.Card>);
  expect(without.$('footer')).toBeNull();
  const withFooter = await render(
    <user.Card title="A" footer={<a href="/all">All</a>}>
      x
    </user.Card>,
  );
  expect(withFooter.$('footer a').textContent).toBe('All');
});
```

### typetests
```tsx
const _ok = (
  <Card title="x" footer="plain text works too">
    <Badge label="a" tone="danger" />
  </Card>
);
// @ts-expect-error label is required
const _b1 = <Badge />;
// @ts-expect-error tone must be neutral, success or danger
const _b2 = <Badge label="a" tone="pink" />;
// @ts-expect-error title is required
const _c1 = <Card><p /></Card>;
// @ts-expect-error children are required
const _c2 = <Card title="x" />;
```

### explanation
The props interface is the component's contract. `tone?: Tone` makes the prop optional *and* restricts it to three values, and the default in the destructuring (`tone = 'neutral'`) means the code inside never sees `undefined`. `ReactNode` is the type for "anything renderable", which is why both `<Badge />` and a plain string are accepted as a footer. `children` is an ordinary prop: declaring it as required makes `<Card title="x" />` a compile error. `import type` brings in a type without adding anything to the bundle. Without these types (the `any` starter), every wrong usage in the type checks would compile, and the missing default would render `badge-undefined`.

### hints
- `import type { ReactNode } from 'react';` at the top.
- `interface BadgeProps { label: string; tone?: 'neutral' | 'success' | 'danger' }` and destructure with `tone = 'neutral'`.
- Render the footer conditionally: `{footer && <footer>{footer}</footer>}`.

# practice: Type events and callback props

### meta
minutes: 8
language: tsx

### prompt
`SearchBox` reports searches to its parent through an `onSearch` callback prop. Type it and finish it:

- Props: `onSearch`, a function that receives the query `string` and returns nothing, and an optional `placeholder` (default `'Search contacts'`).
- The named handlers `handleChange`, `handleSubmit` and `handleKeyDown` need event types (`ChangeEvent`, `FormEvent`, `KeyboardEvent` from `react`).
- **Submit** (button or Enter): prevent the page reload, then call `onSearch` with the trimmed query, but only if it is not empty.
- **Clear** button, or pressing **Escape** in the input: empty the input and call `onSearch('')`.

### starter
```tsx
import { useState } from 'react';

export function SearchBox({ onSearch, placeholder = 'Search contacts' }) {
  const [query, setQuery] = useState('');

  function handleChange(e) {
    setQuery(e.target.value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(query);
  }

  function handleKeyDown(e) {
    // TODO: Escape clears
  }

  return (
    <form onSubmit={handleSubmit}>
      <input aria-label="Search" placeholder={placeholder} value={query} onChange={handleChange} onKeyDown={handleKeyDown} />
      <button type="submit">Search</button>
      <button type="button">Clear</button>
    </form>
  );
}

export default function App() {
  const [last, setLast] = useState('(nothing yet)');
  return (
    <div>
      <SearchBox onSearch={(q) => setLast(q === '' ? '(cleared)' : q)} />
      <p>Last search: {last}</p>
    </div>
  );
}
```

### solution
```tsx
import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';

export interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBox({ onSearch, placeholder = 'Search contacts' }: SearchBoxProps) {
  const [query, setQuery] = useState('');

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  }

  function clear() {
    setQuery('');
    onSearch('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') clear();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input aria-label="Search" placeholder={placeholder} value={query} onChange={handleChange} onKeyDown={handleKeyDown} />
      <button type="submit">Search</button>
      <button type="button" onClick={clear}>
        Clear
      </button>
    </form>
  );
}

export default function App() {
  const [last, setLast] = useState('(nothing yet)');
  return (
    <div>
      <SearchBox onSearch={(q) => setLast(q === '' ? '(cleared)' : q)} />
      <p>Last search: {last}</p>
    </div>
  );
}
```

### tests
```tsx
test('submitting calls onSearch with the trimmed query', async () => {
  const onSearch = fn();
  const view = await render(<user.SearchBox onSearch={onSearch} />);
  await type(view.getByRole('textbox', { name: 'Search' }), '  ava ');
  await submit(view.$('form'));
  expect(onSearch).toHaveBeenCalledWith('ava');
});

test('an empty or blank query is not submitted', async () => {
  const onSearch = fn();
  const view = await render(<user.SearchBox onSearch={onSearch} />);
  await type(view.getByRole('textbox', { name: 'Search' }), '   ');
  await submit(view.$('form'));
  expect(onSearch).toHaveBeenCalledTimes(0);
});

test('Clear empties the input and reports an empty search', async () => {
  const onSearch = fn();
  const view = await render(<user.SearchBox onSearch={onSearch} />);
  const input = view.getByRole('textbox', { name: 'Search' });
  await type(input, 'ben');
  await click(view.getByRole('button', { name: 'Clear' }));
  expect(input.value).toBe('');
  expect(onSearch).toHaveBeenCalledWith('');
});

test('Escape in the input clears too', async () => {
  const onSearch = fn();
  const view = await render(<user.SearchBox onSearch={onSearch} />);
  const input = view.getByRole('textbox', { name: 'Search' });
  await type(input, 'cy');
  await keyDown(input, 'Escape');
  expect(input.value).toBe('');
  expect(onSearch).toHaveBeenCalledWith('');
});

test('placeholder has a default and can be overridden', async () => {
  const a = await render(<user.SearchBox onSearch={() => {}} />);
  expect(a.$('input').placeholder).toBe('Search contacts');
  const b = await render(<user.SearchBox onSearch={() => {}} placeholder="Find a deal" />);
  expect(b.$('input').placeholder).toBe('Find a deal');
});
```

### typetests
```tsx
const _s = <SearchBox onSearch={(q) => console.log(q.toUpperCase())} />;
// @ts-expect-error onSearch is required
const _s2 = <SearchBox />;
// @ts-expect-error onSearch receives a string
const _s3 = <SearchBox onSearch={(q: number) => q} />;
```

### explanation
Inline handlers get their event type from the prop they are passed to, but a **named** function is declared before TypeScript knows where it will be used, so its parameter needs a type. `ChangeEvent<HTMLInputElement>` makes `e.target.value` a `string`; `FormEvent<HTMLFormElement>` gives you `preventDefault()`; `KeyboardEvent<HTMLInputElement>` gives you `e.key`. Importing them with `type` in the same import line as `useState` keeps them out of the bundle. The callback prop `onSearch: (query: string) => void` is how a child talks to its parent, and its type also checks the parent's code: `(q) => ...` knows `q` is a string, and a callback expecting a number is rejected. Sharing one `clear` function between the button and the Escape key keeps the behaviour identical.

### hints
- `import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';`
- Props interface: `{ onSearch: (query: string) => void; placeholder?: string }`.
- Write a `clear()` helper that sets `''` and calls `onSearch('')`; call it from the Clear button and when `e.key === 'Escape'`.

# challenge: A typed contact picker

### meta
minutes: 12
language: tsx

### prompt
Build `ContactPicker({ contacts, onSelect })` with full types:

- Export `interface Contact { id: string; name: string; email: string }` and type the props (`onSelect` receives the chosen `Contact`).
- A **filter** input (`aria-label="Filter"`) shows only contacts whose name contains the text (case-insensitive). If nothing matches, show `No matches`.
- Each visible contact is a `<button>` with the contact's name. Clicking it selects the contact and calls `onSelect(contact)`.
- Below the list show `Selected: Name <email>` or `Nothing selected`. The selection stays even if the filter hides that contact.
- A **Focus filter** button moves keyboard focus to the filter input, using a ref.

Hint for the state: the selection starts as `null` and later holds an id, so `useState` needs a type argument.

### starter
```tsx
import { useState } from 'react';

export function ContactPicker({ contacts, onSelect }) {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <input aria-label="Filter" />
      <button type="button">Focus filter</button>
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                setSelected(c);
                onSelect(c);
              }}
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
      <p>{selected ? `Selected: ${selected.name}` : 'Nothing selected'}</p>
    </div>
  );
}

const PEOPLE = [
  { id: 'c1', name: 'Ava Lee', email: 'ava@acme.test' },
  { id: 'c2', name: 'Ben Okafor', email: 'ben@globex.test' },
  { id: 'c3', name: 'Cy Tran', email: 'cy@initech.test' },
];

export default function App() {
  return <ContactPicker contacts={PEOPLE} onSelect={(c) => console.log('picked', c.email)} />;
}
```

### solution
```tsx
import { useRef, useState, type ChangeEvent } from 'react';

export interface Contact {
  id: string;
  name: string;
  email: string;
}

export interface ContactPickerProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
}

export function ContactPicker({ contacts, onSelect }: ContactPickerProps) {
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const needle = filter.trim().toLowerCase();
  const visible = contacts.filter((c) => c.name.toLowerCase().includes(needle));
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  function handleFilter(e: ChangeEvent<HTMLInputElement>) {
    setFilter(e.target.value);
  }

  function choose(contact: Contact) {
    setSelectedId(contact.id);
    onSelect(contact);
  }

  return (
    <div>
      <input ref={filterRef} aria-label="Filter" value={filter} onChange={handleFilter} />
      <button type="button" onClick={() => filterRef.current?.focus()}>
        Focus filter
      </button>
      <ul>
        {visible.map((c) => (
          <li key={c.id}>
            <button type="button" aria-pressed={c.id === selectedId} onClick={() => choose(c)}>
              {c.name}
            </button>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p>No matches</p>}
      <p>{selected ? `Selected: ${selected.name} <${selected.email}>` : 'Nothing selected'}</p>
    </div>
  );
}

const PEOPLE: Contact[] = [
  { id: 'c1', name: 'Ava Lee', email: 'ava@acme.test' },
  { id: 'c2', name: 'Ben Okafor', email: 'ben@globex.test' },
  { id: 'c3', name: 'Cy Tran', email: 'cy@initech.test' },
];

export default function App() {
  return <ContactPicker contacts={PEOPLE} onSelect={(c) => console.log('picked', c.email)} />;
}
```

### tests
```tsx
const PEOPLE = [
  { id: 'c1', name: 'Ava Lee', email: 'ava@acme.test' },
  { id: 'c2', name: 'Ben Okafor', email: 'ben@globex.test' },
  { id: 'c3', name: 'Cy Tran', email: 'cy@initech.test' },
];
const names = (view) => view.$$('li button').map((b) => b.textContent);

test('lists every contact and starts with nothing selected', async () => {
  const view = await render(<user.ContactPicker contacts={PEOPLE} onSelect={() => {}} />);
  expect(names(view)).toEqual(['Ava Lee', 'Ben Okafor', 'Cy Tran']);
  expect(view.text).toContain('Nothing selected');
});

test('clicking a contact selects it and calls onSelect with the contact', async () => {
  const onSelect = fn();
  const view = await render(<user.ContactPicker contacts={PEOPLE} onSelect={onSelect} />);
  await click(view.getByRole('button', { name: 'Ben Okafor' }));
  expect(onSelect).toHaveBeenCalledWith(PEOPLE[1]);
  expect(view.text).toContain('Selected: Ben Okafor <ben@globex.test>');
});

test('the filter is case-insensitive', async () => {
  const view = await render(<user.ContactPicker contacts={PEOPLE} onSelect={() => {}} />);
  await type(view.getByRole('textbox', { name: 'Filter' }), 'AV');
  expect(names(view)).toEqual(['Ava Lee']);
});

test('shows "No matches" when the filter hides everything', async () => {
  const view = await render(<user.ContactPicker contacts={PEOPLE} onSelect={() => {}} />);
  await type(view.getByRole('textbox', { name: 'Filter' }), 'zzz');
  expect(names(view)).toEqual([]);
  expect(view.text).toContain('No matches');
});

test('the selection survives filtering', async () => {
  const view = await render(<user.ContactPicker contacts={PEOPLE} onSelect={() => {}} />);
  await click(view.getByRole('button', { name: 'Cy Tran' }));
  await type(view.getByRole('textbox', { name: 'Filter' }), 'ava');
  expect(view.text).toContain('Selected: Cy Tran <cy@initech.test>');
});

test('Focus filter moves focus to the input', async () => {
  const view = await render(<user.ContactPicker contacts={PEOPLE} onSelect={() => {}} />);
  const input = view.getByRole('textbox', { name: 'Filter' });
  await click(view.getByRole('button', { name: 'Focus filter' }));
  expect(document.activeElement).toBe(input);
});
```

### typetests
```tsx
const people: Contact[] = [];
const _p = <ContactPicker contacts={people} onSelect={(c) => console.log(c.email)} />;
// @ts-expect-error onSelect is required
const _p2 = <ContactPicker contacts={people} />;
// @ts-expect-error each contact needs an email
const _p3 = <ContactPicker contacts={[{ id: '1', name: 'A' }]} onSelect={() => {}} />;
// @ts-expect-error onSelect receives a Contact, not a string
const _p4 = <ContactPicker contacts={people} onSelect={(c: string) => c} />;
```

### explanation
This component uses every pattern from the unit. The props interface makes `onSelect`'s argument a `Contact`, so the parent's callback is checked. `useState<string | null>(null)` is needed because `useState(null)` alone infers the type `null`, and then `setSelected(c)` in the starter is an error. Storing the selected **id** rather than the object, then deriving `selected` with `find`, keeps one source of truth: if the contact list updates, the selection shows the fresh data. `useRef<HTMLInputElement>(null)` types `.current` as `HTMLInputElement | null`, so `?.focus()` is required and safe. The visible list and the "No matches" message are **derived** from props and state during render, not stored separately, which is the habit Day 11 builds on.

### hints
- `const [selectedId, setSelectedId] = useState<string | null>(null);` then `const selected = contacts.find((c) => c.id === selectedId) ?? null;`.
- `const filterRef = useRef<HTMLInputElement>(null);`, `<input ref={filterRef} ...>`, and `filterRef.current?.focus()`.
- Filter with `c.name.toLowerCase().includes(filter.trim().toLowerCase())`.
