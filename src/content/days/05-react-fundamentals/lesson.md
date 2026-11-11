## The big idea: UI is a function of data

In plain JavaScript you build a page by *giving the browser instructions*: find this element, change its text, append that row. As the app grows you spend your life keeping the instructions in sync with the data.

React flips it around. You write a function that takes **data** and returns a description of what the page should look like. When the data changes, React calls the function again and updates only what differs.

```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}
```

That function is a **component**. A React app is a tree of them: `App` renders `ContactList`, which renders many `ContactCard`s, which render `Badge`s.

> **The thinking pattern:** don't ask "how do I change the page?" Ask "for this data, what should the page be?" Then write that. Every lesson from here repeats this.

## JSX: markup inside JavaScript

JSX looks like HTML but it is JavaScript. `<h1>Hello</h1>` is compiled into a function call. The rules differ slightly from HTML:

1. **Return one root element.** Wrap siblings in a parent element or a Fragment `<>…</>`.
2. **Close every tag.** `<img />`, `<input />`, `<br />`.
3. **`className`, not `class`** and `htmlFor`, not `for`. Attributes are camelCase: `onClick`, `tabIndex`.
4. **Curly braces embed JavaScript expressions**, in text and in attribute values.
5. **Styles are objects:** `style={{ color: 'red', marginTop: 8 }}`.

```tsx
const contact = { name: 'Ava Nguyen', email: 'ava@example.com', vip: true };

const card = (
  <article className="card" style={{ padding: 12 }}>
    <h3>{contact.name}</h3>
    <a href={`mailto:${contact.email}`}>{contact.email}</a>
    {contact.vip && <span>⭐ VIP</span>}
  </article>
);
```

Inside `{}` you can put any *expression* (a value): a variable, `a + b`, a function call, a ternary. You cannot put a *statement* (`if`, `for`). That restriction shapes everything in the next sections.

## Components and props

A component is a function whose name **starts with a capital letter** and which returns JSX. Props are its inputs, an object passed as the single argument. Destructure them in the parameter list, as you practised on Day 2:

```tsx
interface ContactCardProps {
  name: string;
  email: string;
  status: 'lead' | 'customer' | 'churned';
  vip?: boolean;            // optional
}

function ContactCard({ name, email, status, vip = false }: ContactCardProps) {
  return (
    <article>
      <h3>{name} {vip && '⭐'}</h3>
      <p>{email}</p>
      <small>{status}</small>
    </article>
  );
}

// usage
<ContactCard name="Ava Nguyen" email="ava@example.com" status="lead" vip />
```

Notes:

- String props use quotes; everything else uses braces: `count={3}`, `active={true}` (or just `active`).
- Props are **read-only**. A component must never modify its props. Data flows *down* the tree; you will see how it goes back up on Day 6.
- TypeScript checks every usage: forget `email` or misspell `status` and you get an error at the call site.

### `children`

Anything between a component's opening and closing tags arrives as `children`:

```tsx
import type { ReactNode } from 'react';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Panel title="Contacts">
  <ContactCard name="Ava" email="a@x.com" status="lead" />
</Panel>
```

`ReactNode` is the type for "anything React can render": strings, numbers, elements, arrays, `null`.

## Rendering lists

Turn an array of data into an array of elements with `map`. Each item needs a **`key`**: a stable, unique id that lets React match old and new items between renders.

```tsx
function ContactList({ contacts }: { contacts: Contact[] }) {
  return (
    <ul>
      {contacts.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}
```

Key rules:

- Use the record's **id**. Never use `Math.random()` (changes every render, so nothing is ever reused).
- Avoid the array index as a key if the list can be reordered, filtered or inserted into. State will end up attached to the wrong row.
- The `key` goes on the element *returned from the map callback*, and it is not passed as a prop.

## Conditional rendering

There is no special syntax. You use normal JavaScript expressions:

```tsx
function Status({ contacts }: { contacts: Contact[] }) {
  // 1. Early return for a whole different output
  if (contacts.length === 0) return <p>No contacts yet.</p>;

  return (
    <div>
      {/* 2. Ternary: choose between two things */}
      <p>{contacts.length > 10 ? 'Busy pipeline' : 'Quiet pipeline'}</p>

      {/* 3. && : show something or nothing */}
      {contacts.some((c) => c.status === 'lead') && <p>You have leads to follow up.</p>}
    </div>
  );
}
```

**Gotcha:** `{count && <Badge />}` renders the number `0` when `count` is `0`, because `0` is falsy but still a valid thing to render. Write `{count > 0 && <Badge />}` instead.

## Walkthrough: build a contact list from the data up

The requirement: *a list of contacts showing name, email and a coloured status badge; say "No contacts yet" when empty.* Here is the thought process, bottom-up.

**1. Smallest piece first, the badge.** It needs a status and returns a labelled `span`:

```tsx
type Status = 'lead' | 'customer' | 'churned';

function StatusBadge({ status }: { status: Status }) {
  const colours: Record<Status, string> = { lead: '#2563eb', customer: '#15803d', churned: '#6b7280' };
  return <span style={{ color: colours[status] }}>● {status}</span>;
}
```

**2. A row built from the badge.**

```tsx
function ContactRow({ contact }: { contact: Contact }) {
  return (
    <li>
      <strong>{contact.name}</strong> <span>{contact.email}</span> <StatusBadge status={contact.status} />
    </li>
  );
}
```

**3. The list, handling the empty case first.**

```tsx
function ContactList({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) return <p>No contacts yet.</p>;
  return (
    <ul>
      {contacts.map((c) => (
        <ContactRow key={c.id} contact={c} />
      ))}
    </ul>
  );
}
```

Notice each component does one thing and the data flows down through props. You can read the tree top to bottom and know what the screen shows. Press **Run** in the first exercise to see components render live in the Preview tab.

## CRM step: your first components

In Nimbus CRM, delete the remaining Vite starter markup and build three components in `src/components/`:

1. `StatusBadge.tsx`: takes a `ContactStatus` and renders a coloured label.
2. `ContactRow.tsx`: shows name, email, company and the badge.
3. `ContactList.tsx`: renders `sampleContacts` from Day 2 with a heading "Contacts (n)" and an empty state.

Render `<ContactList contacts={sampleContacts} />` from `App.tsx`. Use the `Contact` type for props. Check that you see eight rows, then temporarily pass `[]` to see the empty state.

- [ ] `StatusBadge`, `ContactRow`, `ContactList` exist in `src/components/`
- [ ] Every component has a typed props interface
- [ ] The list uses `key={contact.id}`
- [ ] Empty state works
