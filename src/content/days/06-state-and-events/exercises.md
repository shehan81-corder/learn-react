# practice: A counter with state

### meta
minutes: 6
language: tsx

### prompt
Build `Counter`. It renders `<p>Count: 0</p>` and three buttons: **+1**, **-1** and **Reset**.

- `+1` increases the count and `-1` decreases it.
- The count must never go below `0`.
- `Reset` sets it back to `0`.

Use `useState` and the functional update form for the +/- buttons.

### starter
```tsx
import { useState } from 'react';

export function Counter() {
  // TODO: const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: 0</p>
      <button>+1</button>
      <button>-1</button>
      <button>Reset</button>
    </div>
  );
}

export default Counter;
```

### solution
```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount((c) => Math.max(0, c - 1))}>-1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}

export default Counter;
```

### tests
```tsx
test('starts at zero', async () => {
  const view = await render(<user.Counter />);
  expect(view.$('p').textContent).toBe('Count: 0');
});

test('+1 increments', async () => {
  const view = await render(<user.Counter />);
  const plus = view.getByRole('button', { name: '+1' });
  await click(plus);
  await click(plus);
  expect(view.$('p').textContent).toBe('Count: 2');
});

test('-1 decrements but never goes below zero', async () => {
  const view = await render(<user.Counter />);
  await click(view.getByRole('button', { name: '+1' }));
  await click(view.getByRole('button', { name: '-1' }));
  await click(view.getByRole('button', { name: '-1' }));
  expect(view.$('p').textContent).toBe('Count: 0');
});

test('Reset returns to zero', async () => {
  const view = await render(<user.Counter />);
  for (let i = 0; i < 3; i++) await click(view.getByRole('button', { name: '+1' }));
  expect(view.$('p').textContent).toBe('Count: 3');
  await click(view.getByRole('button', { name: 'Reset' }));
  expect(view.$('p').textContent).toBe('Count: 0');
});
```

### explanation
`useState(0)` returns the current value and a setter. Each click handler describes the *next* value: `c + 1`, `Math.max(0, c - 1)`, `0`. The functional form `(c) => c + 1` always starts from the latest value, which is the habit that avoids stale-state bugs. The floor at zero lives in the update itself, so the UI can never reach an invalid state.

### hints
- `const [count, setCount] = useState(0);`
- Pass functions to `onClick`: `onClick={() => setCount((c) => c + 1)}`
- `Math.max(0, c - 1)` keeps the value from going negative.

# practice: Controlled input

### meta
minutes: 6
language: tsx

### prompt
Build a `SearchBox`:

- A text input with placeholder `Search contacts` (controlled by state).
- A paragraph below it: `You typed: <text>`; when the input is empty show `Start typing…`.
- A paragraph showing the number of characters: `<n> characters` (use `1 character` for exactly one).
- A **Clear** button that empties the input. It is `disabled` while the input is empty.

The character count and the paragraph text are *derived* from the state; don't store them separately.

### starter
```tsx
import { useState } from 'react';

export function SearchBox() {
  // TODO
  return (
    <div>
      <input placeholder="Search contacts" />
      <p>Start typing…</p>
      <p>0 characters</p>
      <button>Clear</button>
    </div>
  );
}

export default SearchBox;
```

### solution
```tsx
import { useState } from 'react';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const count = query.length;

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" />
      <p>{query ? `You typed: ${query}` : 'Start typing…'}</p>
      <p>
        {count} {count === 1 ? 'character' : 'characters'}
      </p>
      <button onClick={() => setQuery('')} disabled={query === ''}>
        Clear
      </button>
    </div>
  );
}

export default SearchBox;
```

### tests
```tsx
test('shows the empty state initially', async () => {
  const view = await render(<user.SearchBox />);
  expect(view.getByText('Start typing…')).toBeTruthy();
  expect(view.getByText('0 characters')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Clear' }).disabled).toBe(true);
});

test('typing updates the text and the count', async () => {
  const view = await render(<user.SearchBox />);
  const input = view.getByRole('textbox');
  await type(input, 'Ava');
  expect(view.getByText('You typed: Ava')).toBeTruthy();
  expect(view.getByText('3 characters')).toBeTruthy();
  expect(input.value).toBe('Ava');
});

test('singular wording for one character', async () => {
  const view = await render(<user.SearchBox />);
  await type(view.getByRole('textbox'), 'A');
  expect(view.getByText('1 character')).toBeTruthy();
});

test('Clear empties the input and disables itself', async () => {
  const view = await render(<user.SearchBox />);
  const input = view.getByRole('textbox');
  await type(input, 'hello');
  const clear = view.getByRole('button', { name: 'Clear' });
  expect(clear.disabled).toBe(false);
  await click(clear);
  expect(input.value).toBe('');
  expect(view.getByText('Start typing…')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Clear' }).disabled).toBe(true);
});
```

### explanation
Only one piece of state, `query`, is stored. The count, the message and the disabled flag are all computed from it on every render, so they can never go out of sync. The input is *controlled*: its `value` comes from state and `onChange` writes back, which is why `setQuery('')` in the Clear handler empties the field.

### hints
- One state variable is enough: `const [query, setQuery] = useState('');`
- `<input value={query} onChange={(e) => setQuery(e.target.value)} />`
- `disabled={query === ''}`

# practice: Immutable list state

### meta
minutes: 8
language: tsx

### prompt
Build `ContactManager`. It starts with two contacts (`Ava`, `Liam`) and renders:

- A form with a text input (placeholder `New contact`) and an **Add** button. Submitting adds a contact with the typed name (trimmed). Blank names are ignored. The input clears after adding.
- A `<ul>` where each `<li>` shows the name and, for VIP contacts, a `⭐`, plus two buttons: **Star** / **Unstar** and **Remove**.

All updates must be immutable. IDs for new contacts can come from a counter or `Date.now()`.

### starter
```tsx
import { useState } from 'react';

interface Contact {
  id: number;
  name: string;
  vip: boolean;
}

export function ContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, name: 'Ava', vip: false },
    { id: 2, name: 'Liam', vip: false },
  ]);
  const [name, setName] = useState('');

  // TODO: add, remove, toggleVip handlers

  return (
    <div>
      <form>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New contact" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            <span>{c.name}</span>
            <button>Star</button>
            <button>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ContactManager;
```

### solution
```tsx
import { useState } from 'react';

interface Contact {
  id: number;
  name: string;
  vip: boolean;
}

export function ContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, name: 'Ava', vip: false },
    { id: 2, name: 'Liam', vip: false },
  ]);
  const [name, setName] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setContacts((list) => [...list, { id: Date.now() + list.length, name: trimmed, vip: false }]);
    setName('');
  };

  const remove = (id: number) => setContacts((list) => list.filter((c) => c.id !== id));

  const toggleVip = (id: number) =>
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, vip: !c.vip } : c)));

  return (
    <div>
      <form onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New contact" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            <span>
              {c.name}
              {c.vip && ' ⭐'}
            </span>
            <button onClick={() => toggleVip(c.id)}>{c.vip ? 'Unstar' : 'Star'}</button>
            <button onClick={() => remove(c.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ContactManager;
```

### tests
```tsx
const names = (view) => view.$$('li').map((li) => li.querySelector('span').textContent.replace(' ⭐', ''));

test('starts with two contacts', async () => {
  const view = await render(<user.ContactManager />);
  expect(names(view)).toEqual(['Ava', 'Liam']);
});

test('adds a contact through the form and clears the input', async () => {
  const view = await render(<user.ContactManager />);
  const input = view.getByRole('textbox');
  await type(input, '  Mia  ');
  await submit(view.$('form'));
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia']);
  expect(input.value).toBe('');
});

test('ignores blank names', async () => {
  const view = await render(<user.ContactManager />);
  await type(view.getByRole('textbox'), '   ');
  await submit(view.$('form'));
  expect(view.$$('li')).toHaveLength(2);
});

test('removes only the clicked contact', async () => {
  const view = await render(<user.ContactManager />);
  await click(view.$$('li')[0].querySelectorAll('button')[1]);
  expect(names(view)).toEqual(['Liam']);
});

test('stars and unstars one contact', async () => {
  const view = await render(<user.ContactManager />);
  const first = () => view.$$('li')[0];
  await click(first().querySelectorAll('button')[0]);
  expect(first().querySelector('span').textContent).toContain('⭐');
  expect(first().querySelectorAll('button')[0].textContent).toBe('Unstar');
  expect(view.$$('li')[1].querySelector('span').textContent).not.toContain('⭐');
  await click(first().querySelectorAll('button')[0]);
  expect(first().querySelector('span').textContent).not.toContain('⭐');
});
```

### explanation
Each handler computes the next array from the previous one with the Day 2 patterns: spread to add, `filter` to remove, `map` plus spread to update one item. They use the functional update form (`setContacts((list) => ...)`), which is safe even if several updates happen in the same event. Notice `e.preventDefault()` in the submit handler: without it the browser would try to submit the form and reload the page.

### hints
- `<form onSubmit={add}>` with `e.preventDefault()` in `add`.
- Add: `setContacts((list) => [...list, newContact])`.
- Toggle VIP: `list.map((c) => (c.id === id ? { ...c, vip: !c.vip } : c))`.
- Trim the name and ignore it when it is empty.

# challenge: A validated contact form

### meta
minutes: 10
language: tsx

### prompt
Build `NewContactForm({ onAdd })`.

- Three controlled inputs with labels **First name**, **Last name** and **Email** (use `<label>` elements wrapping or pointing to the inputs), held in **one** state object.
- An **Add contact** submit button that is `disabled` unless all three fields have text (after trimming) **and** the email contains an `@`.
- On submit: prevent the default action, call `onAdd` once with `{ firstName, lastName, email }` (trimmed values), then reset all fields to empty.
- Under the email field show `<small role="alert">Enter a valid email</small>` only when the email has text but no `@`.

### starter
```tsx
import { useState } from 'react';

export interface NewContact {
  firstName: string;
  lastName: string;
  email: string;
}

export function NewContactForm({ onAdd }: { onAdd: (c: NewContact) => void }) {
  // TODO: one state object, derived validity, submit handler
  return (
    <form>
      <label>
        First name
        <input />
      </label>
      <label>
        Last name
        <input />
      </label>
      <label>
        Email
        <input />
      </label>
      <button type="submit">Add contact</button>
    </form>
  );
}

export default function App() {
  return <NewContactForm onAdd={(c) => console.log('added', c)} />;
}
```

### solution
```tsx
import { useState } from 'react';

export interface NewContact {
  firstName: string;
  lastName: string;
  email: string;
}

const EMPTY: NewContact = { firstName: '', lastName: '', email: '' };

export function NewContactForm({ onAdd }: { onAdd: (c: NewContact) => void }) {
  const [form, setForm] = useState<NewContact>(EMPTY);

  const set = (field: keyof NewContact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const trimmed = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
  };
  const emailLooksWrong = trimmed.email !== '' && !trimmed.email.includes('@');
  const valid = trimmed.firstName !== '' && trimmed.lastName !== '' && trimmed.email.includes('@');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onAdd(trimmed);
    setForm(EMPTY);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        First name
        <input value={form.firstName} onChange={set('firstName')} />
      </label>
      <label>
        Last name
        <input value={form.lastName} onChange={set('lastName')} />
      </label>
      <label>
        Email
        <input value={form.email} onChange={set('email')} />
      </label>
      {emailLooksWrong && <small role="alert">Enter a valid email</small>}
      <button type="submit" disabled={!valid}>
        Add contact
      </button>
    </form>
  );
}

export default function App() {
  return <NewContactForm onAdd={(c) => console.log('added', c)} />;
}
```

### tests
```tsx
const fill = async (view, first, last, email) => {
  await type(view.getByRole('textbox', { name: 'First name' }), first);
  await type(view.getByRole('textbox', { name: 'Last name' }), last);
  await type(view.getByRole('textbox', { name: 'Email' }), email);
};

test('the button is disabled until the form is valid', async () => {
  const view = await render(<user.NewContactForm onAdd={() => {}} />);
  const button = () => view.getByRole('button', { name: 'Add contact' });
  expect(button().disabled).toBe(true);
  await fill(view, 'Ava', 'Nguyen', '');
  expect(button().disabled).toBe(true);
  await type(view.getByRole('textbox', { name: 'Email' }), 'ava@example.com');
  expect(button().disabled).toBe(false);
});

test('whitespace-only values do not count', async () => {
  const view = await render(<user.NewContactForm onAdd={() => {}} />);
  await fill(view, '   ', 'Nguyen', 'a@b.c');
  expect(view.getByRole('button', { name: 'Add contact' }).disabled).toBe(true);
});

test('shows an alert for an email without @ only', async () => {
  const view = await render(<user.NewContactForm onAdd={() => {}} />);
  expect(view.$('[role=alert]')).toBeNull();
  await type(view.getByRole('textbox', { name: 'Email' }), 'nope');
  expect(view.$('[role=alert]').textContent).toBe('Enter a valid email');
  await type(view.getByRole('textbox', { name: 'Email' }), 'ok@x.com');
  expect(view.$('[role=alert]')).toBeNull();
});

test('submitting calls onAdd once with trimmed values and resets the form', async () => {
  const onAdd = fn();
  const view = await render(<user.NewContactForm onAdd={onAdd} />);
  await fill(view, ' Ava ', ' Nguyen ', ' ava@example.com ');
  await submit(view.$('form'));
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd.calls[0][0]).toEqual({ firstName: 'Ava', lastName: 'Nguyen', email: 'ava@example.com' });
  expect(view.getByRole('textbox', { name: 'First name' }).value).toBe('');
  expect(view.getByRole('textbox', { name: 'Email' }).value).toBe('');
  expect(view.getByRole('button', { name: 'Add contact' }).disabled).toBe(true);
});

test('does not call onAdd when invalid', async () => {
  const onAdd = fn();
  const view = await render(<user.NewContactForm onAdd={onAdd} />);
  await fill(view, 'Ava', '', 'ava@example.com');
  await submit(view.$('form'));
  expect(onAdd).not.toHaveBeenCalled();
});
```

### typetests
```tsx
const el = <NewContactForm onAdd={(c) => c.firstName.toUpperCase()} />;
// @ts-expect-error onAdd is required
const bad = <NewContactForm />;
```

### explanation
One state object keeps related fields together, and a curried change handler (`set('firstName')`) avoids writing three nearly identical handlers. `valid` and `emailLooksWrong` are *derived* during render rather than stored, so they always agree with the fields. The trimmed values are computed once and reused for both validation and the callback. Resetting is just `setForm(EMPTY)`, which works because every input is controlled.

### hints
- `const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })`
- A generic handler: `(field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))`
- Compute `valid` from the trimmed values during render and use it for `disabled`.
- Remember `e.preventDefault()` and to reset after calling `onAdd`.
