# practice: Your first component

### meta
minutes: 6
language: tsx

### prompt
Build a `ContactCard` component. It receives `name`, `email` and an optional `vip` flag and renders:

```html
<article>
  <h3>Ava Nguyen</h3>
  <p>ava@example.com</p>
</article>
```

When `vip` is true, append a star to the heading text: `Ava Nguyen ⭐`. Export the component as a **named export** and also as the default export so it renders in the preview.

### starter
```tsx
interface ContactCardProps {
  name: string;
  email: string;
  vip?: boolean;
}

export function ContactCard(props: ContactCardProps) {
  // TODO: return JSX
  return null;
}

export default function App() {
  return (
    <div>
      <ContactCard name="Ava Nguyen" email="ava@example.com" vip />
      <ContactCard name="Liam Smith" email="liam@example.com" />
    </div>
  );
}
```

### solution
```tsx
interface ContactCardProps {
  name: string;
  email: string;
  vip?: boolean;
}

export function ContactCard({ name, email, vip = false }: ContactCardProps) {
  return (
    <article>
      <h3>
        {name}
        {vip && ' ⭐'}
      </h3>
      <p>{email}</p>
    </article>
  );
}

export default function App() {
  return (
    <div>
      <ContactCard name="Ava Nguyen" email="ava@example.com" vip />
      <ContactCard name="Liam Smith" email="liam@example.com" />
    </div>
  );
}
```

### tests
```tsx
test('renders the name in an h3 and the email in a p', async () => {
  const view = await render(<user.ContactCard name="Ava Nguyen" email="ava@example.com" />);
  expect(view.$('article h3').textContent).toBe('Ava Nguyen');
  expect(view.$('article p').textContent).toBe('ava@example.com');
});

test('shows a star only for VIP contacts', async () => {
  const vip = await render(<user.ContactCard name="Ava" email="a@x.com" vip />);
  expect(vip.$('h3').textContent).toContain('⭐');
  const normal = await render(<user.ContactCard name="Liam" email="l@x.com" />);
  expect(normal.$('h3').textContent).not.toContain('⭐');
});

test('does not print "false" for non-VIP contacts', async () => {
  const view = await render(<user.ContactCard name="Liam" email="l@x.com" vip={false} />);
  expect(view.text).not.toContain('false');
});
```

### typetests
```tsx
const el = <ContactCard name="A" email="a@b.c" />;
const el2 = <ContactCard name="A" email="a@b.c" vip />;
// @ts-expect-error email is required
const bad = <ContactCard name="A" />;
```

### explanation
A component is a function that returns JSX, and props arrive as its argument; destructuring them in the parameter list keeps the body clean. `{vip && ' ⭐'}` renders the star when `vip` is `true`; when it is `false`, React renders nothing for a boolean, so no stray text appears. Because `vip` has a default of `false`, `undefined` and `false` behave the same.

### hints
- Return an `<article>` containing an `<h3>` and a `<p>`.
- Embed values with braces: `<h3>{name}</h3>`.
- `{vip && ' ⭐'}` shows the star only when `vip` is true.

# practice: Render a list

### meta
minutes: 7
language: tsx

### prompt
Write `ContactList` that receives `contacts` and renders an unordered list. Each `<li>` shows `Name — email`. Use the contact's `id` as the key. When the list is empty render `<p>No contacts yet.</p>` instead of a list.

Also export a `count` helper: `ContactList` should show a heading `<h2>Contacts (n)</h2>` above the list when there are contacts.

### starter
```tsx
export interface Contact {
  id: string;
  name: string;
  email: string;
}

export function ContactList({ contacts }: { contacts: Contact[] }) {
  // TODO
  return null;
}

export default function App() {
  return (
    <ContactList
      contacts={[
        { id: '1', name: 'Ava Nguyen', email: 'ava@example.com' },
        { id: '2', name: 'Liam Smith', email: 'liam@example.com' },
      ]}
    />
  );
}
```

### solution
```tsx
export interface Contact {
  id: string;
  name: string;
  email: string;
}

export function ContactList({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) return <p>No contacts yet.</p>;

  return (
    <div>
      <h2>Contacts ({contacts.length})</h2>
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            {c.name} — {c.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <ContactList
      contacts={[
        { id: '1', name: 'Ava Nguyen', email: 'ava@example.com' },
        { id: '2', name: 'Liam Smith', email: 'liam@example.com' },
      ]}
    />
  );
}
```

### tests
```tsx
const sample = [
  { id: 'a', name: 'Ava', email: 'ava@x.com' },
  { id: 'b', name: 'Liam', email: 'liam@x.com' },
  { id: 'c', name: 'Mia', email: 'mia@x.com' },
];

test('renders one li per contact', async () => {
  const view = await render(<user.ContactList contacts={sample} />);
  const items = view.$$('ul > li');
  expect(items).toHaveLength(3);
  expect(items[0].textContent).toBe('Ava — ava@x.com');
  expect(items[2].textContent).toBe('Mia — mia@x.com');
});

test('shows a heading with the count', async () => {
  const view = await render(<user.ContactList contacts={sample} />);
  expect(view.$('h2').textContent).toBe('Contacts (3)');
});

test('shows an empty state instead of an empty list', async () => {
  const view = await render(<user.ContactList contacts={[]} />);
  expect(view.$('p').textContent).toBe('No contacts yet.');
  expect(view.$('ul')).toBeNull();
  expect(view.$('h2')).toBeNull();
});

test('updates when the data changes', async () => {
  const view = await render(<user.ContactList contacts={sample} />);
  await view.rerender(<user.ContactList contacts={sample.slice(0, 1)} />);
  expect(view.$$('li')).toHaveLength(1);
  expect(view.$('h2').textContent).toBe('Contacts (1)');
});
```

### typetests
```tsx
const el = <ContactList contacts={[{ id: '1', name: 'A', email: 'a@b.c' }]} />;
// @ts-expect-error each contact needs an email
const bad = <ContactList contacts={[{ id: '1', name: 'A' }]} />;
```

### explanation
`map` turns each data item into an element, and `key={c.id}` gives React a stable identity for each row. The early return handles the empty case before the main JSX, which keeps the main path free of conditionals. Note the `rerender` test: the same component produces a different tree when given different data. That is "UI as a function of data" in action.

### hints
- Handle the empty case first with an early `return`.
- `contacts.map((c) => <li key={c.id}>...</li>)`
- Text and expressions can sit side by side: `{c.name} — {c.email}`.

# practice: Props, children and conditionals

### meta
minutes: 8
language: tsx

### prompt
Build two components:

1. `Panel({ title, children, footer? })` renders `<section>` with an `<h2>` title, the children, and, **only when `footer` is provided**, a `<footer>` element containing it.
2. `StatusBadge({ status })` renders `<span class="badge badge-<status>">` where status is `'lead' | 'customer' | 'churned'`. The visible text is the status with a capital first letter (`Lead`, `Customer`, `Churned`).

### starter
```tsx
import type { ReactNode } from 'react';

export type Status = 'lead' | 'customer' | 'churned';

export function Panel({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  // TODO
  return null;
}

export function StatusBadge({ status }: { status: Status }) {
  // TODO
  return null;
}

export default function App() {
  return (
    <Panel title="Pipeline" footer="Updated just now">
      <StatusBadge status="lead" /> <StatusBadge status="customer" />
    </Panel>
  );
}
```

### solution
```tsx
import type { ReactNode } from 'react';

export type Status = 'lead' | 'customer' | 'churned';

export function Panel({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export default function App() {
  return (
    <Panel title="Pipeline" footer="Updated just now">
      <StatusBadge status="lead" /> <StatusBadge status="customer" />
    </Panel>
  );
}
```

### tests
```tsx
test('Panel renders title and children', async () => {
  const view = await render(
    <user.Panel title="Contacts">
      <p>inside</p>
    </user.Panel>,
  );
  expect(view.$('section > h2').textContent).toBe('Contacts');
  expect(view.$('section p').textContent).toBe('inside');
});

test('Panel renders a footer only when provided', async () => {
  const withFooter = await render(
    <user.Panel title="A" footer="the footer">
      x
    </user.Panel>,
  );
  expect(withFooter.$('footer').textContent).toBe('the footer');
  const without = await render(<user.Panel title="B">x</user.Panel>);
  expect(without.$('footer')).toBeNull();
});

test('StatusBadge uses a status class and a capitalised label', async () => {
  const view = await render(<user.StatusBadge status="customer" />);
  const span = view.$('span');
  expect(span.className).toBe('badge badge-customer');
  expect(span.textContent).toBe('Customer');
});

test('StatusBadge works for every status', async () => {
  for (const [status, label] of [['lead', 'Lead'], ['churned', 'Churned']]) {
    const view = await render(<user.StatusBadge status={status} />);
    expect(view.$('span').textContent).toBe(label);
    expect(view.$('span').className).toContain(`badge-${status}`);
  }
});
```

### typetests
```tsx
const a = <Panel title="x">child</Panel>;
const b = <Panel title="x" footer={<em>f</em>}>child</Panel>;
const c = <StatusBadge status="lead" />;
// @ts-expect-error unknown status
const d = <StatusBadge status="prospect" />;
// @ts-expect-error title is required
const e = <Panel>child</Panel>;
```

### explanation
`children` lets a component wrap arbitrary content, the basis of layout components. `{footer && <footer>…</footer>}` renders nothing when `footer` is `undefined`. Template literals build the class name from the prop, and a tiny helper (`charAt(0).toUpperCase() + slice(1)`) produces the label. Because `status` is a union type, TypeScript rejects `status="prospect"` at the call site, so a typo can never reach the screen.

### hints
- `children` is just another prop: destructure it and put `{children}` where it should appear.
- Conditionally render with `{footer && <footer>{footer}</footer>}`.
- Class names: ``className={`badge badge-${status}`}``.

# challenge: A contact table

### meta
minutes: 10
language: tsx

### prompt
Build `ContactTable({ contacts })` that renders a real HTML table.

- Header row: `Name`, `Email`, `Company`, `Status`.
- One `<tr>` per contact in `<tbody>`, keyed by id.
- Company shows the company name, or an em dash `—` when `companyName` is `null`.
- Status shows a `<span class="badge badge-<status>">`.
- VIP contacts (`vip: true`) have a `vip` class on their `<tr>`.
- When there are no contacts render a single row whose cell spans all four columns (`colSpan={4}`) with the text `No contacts match.`.

### starter
```tsx
export interface Row {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  status: 'lead' | 'customer' | 'churned';
  vip?: boolean;
}

export function ContactTable({ contacts }: { contacts: Row[] }) {
  // TODO
  return null;
}

export default function App() {
  return (
    <ContactTable
      contacts={[
        { id: '1', name: 'Ava Nguyen', email: 'ava@example.com', companyName: 'Acme', status: 'lead', vip: true },
        { id: '2', name: 'Liam Smith', email: 'liam@example.com', companyName: null, status: 'customer' },
      ]}
    />
  );
}
```

### solution
```tsx
export interface Row {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  status: 'lead' | 'customer' | 'churned';
  vip?: boolean;
}

export function ContactTable({ contacts }: { contacts: Row[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Company</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {contacts.length === 0 ? (
          <tr>
            <td colSpan={4}>No contacts match.</td>
          </tr>
        ) : (
          contacts.map((c) => (
            <tr key={c.id} className={c.vip ? 'vip' : undefined}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.companyName ?? '—'}</td>
              <td>
                <span className={`badge badge-${c.status}`}>{c.status}</span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default function App() {
  return (
    <ContactTable
      contacts={[
        { id: '1', name: 'Ava Nguyen', email: 'ava@example.com', companyName: 'Acme', status: 'lead', vip: true },
        { id: '2', name: 'Liam Smith', email: 'liam@example.com', companyName: null, status: 'customer' },
      ]}
    />
  );
}
```

### tests
```tsx
const rows = [
  { id: '1', name: 'Ava Nguyen', email: 'ava@x.com', companyName: 'Acme', status: 'lead', vip: true },
  { id: '2', name: 'Liam Smith', email: 'liam@x.com', companyName: null, status: 'customer' },
];

test('renders the header cells', async () => {
  const view = await render(<user.ContactTable contacts={rows} />);
  expect(view.$$('thead th').map((th) => th.textContent)).toEqual(['Name', 'Email', 'Company', 'Status']);
});

test('renders one body row per contact with the right cells', async () => {
  const view = await render(<user.ContactTable contacts={rows} />);
  const trs = view.$$('tbody tr');
  expect(trs).toHaveLength(2);
  const first = Array.from(trs[0].querySelectorAll('td')).map((td) => td.textContent);
  expect(first).toEqual(['Ava Nguyen', 'ava@x.com', 'Acme', 'lead']);
});

test('uses an em dash when there is no company', async () => {
  const view = await render(<user.ContactTable contacts={rows} />);
  const cells = view.$$('tbody tr')[1].querySelectorAll('td');
  expect(cells[2].textContent).toBe('—');
});

test('status is a badge span', async () => {
  const view = await render(<user.ContactTable contacts={rows} />);
  const badge = view.$$('tbody tr')[1].querySelector('span');
  expect(badge.className).toBe('badge badge-customer');
});

test('VIP rows get the vip class, others do not', async () => {
  const view = await render(<user.ContactTable contacts={rows} />);
  const trs = view.$$('tbody tr');
  expect(trs[0].classList.contains('vip')).toBe(true);
  expect(trs[1].classList.contains('vip')).toBe(false);
});

test('shows an empty row that spans every column', async () => {
  const view = await render(<user.ContactTable contacts={[]} />);
  const cells = view.$$('tbody td');
  expect(cells).toHaveLength(1);
  expect(cells[0].textContent).toBe('No contacts match.');
  expect(cells[0].getAttribute('colspan')).toBe('4');
});
```

### typetests
```tsx
const ok = <ContactTable contacts={[{ id: '1', name: 'A', email: 'a@b.c', companyName: null, status: 'lead' }]} />;
// @ts-expect-error status must be a valid union member
const bad = <ContactTable contacts={[{ id: '1', name: 'A', email: 'a@b.c', companyName: null, status: 'x' }]} />;
```

### explanation
This challenge combines everything from today: props, a list with keys, `??` for fallbacks, a template literal for the class, and a conditional for the empty state. A ternary is used inside `<tbody>` because you want *either* the empty row *or* the mapped rows. The `className={c.vip ? 'vip' : undefined}` trick omits the attribute entirely when the contact is not a VIP, instead of rendering `class="false"`. `colSpan` is camelCase in JSX; in HTML it is `colspan`.

### hints
- Build the header first, then the body.
- Use a ternary inside `<tbody>`: empty row or `contacts.map(...)`.
- `c.companyName ?? '—'`
- `className={c.vip ? 'vip' : undefined}`
- In JSX the attribute is `colSpan={4}`.
