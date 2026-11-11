## Components that remember

So far your components are pure functions of their props: same props in, same JSX out. Real apps respond to the user: a counter goes up, a search box filters, a form fills in. That needs **state**: data a component *remembers between renders* and that, when it changes, makes React render the component again.

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

Read `useState(0)` as: "give me a variable that starts at `0`, plus a function to change it". It returns a pair, which you destructure: the **current value** and a **setter**. Calling the setter does two things: it stores the new value *and* tells React to re-render.

> **The thinking pattern:** state is a snapshot. Each render sees one fixed value of `count`. Clicking does not "change the number on screen"; it asks React for a *new render* with a new snapshot, and the JSX for that render says what the screen shows.

## Why not a normal variable?

```tsx
function Broken() {
  let count = 0;                       // reset to 0 on every render
  return <button onClick={() => { count++; }}>Clicked {count}</button>;  // never re-renders
}
```

Two problems: a local variable is recreated on every render, so it forgets; and changing it does not tell React to re-render, so the screen never updates. State fixes both.

## Events

Attach handlers with camelCase props that receive a **function**, not a call:

```tsx
<button onClick={handleClick}>OK</button>        // correct: pass the function
<button onClick={handleClick()}>OK</button>      // bug: calls it during render
<button onClick={() => handleClick(id)}>OK</button>   // arrow wrapper when you need arguments
```

Handlers receive a React event object. TypeScript needs to know which element it came from:

```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log(e.target.value);
}
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();               // stop the browser from reloading the page
}
function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') { /* ... */ }
}
```

Tip: when you write the handler inline (`onChange={(e) => ...}`), TypeScript infers the event type for you. You only need the long names when you extract the function.

## Controlled inputs: React owns the value

A **controlled** input gets its value from state and reports every change back:

```tsx
function SearchBox() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <p>You typed: {query}</p>
    </div>
  );
}
```

The loop is: user types → `onChange` fires → state updates → re-render → input shows the new state. The input can never disagree with your data, which makes validation, clearing and resetting trivial: `setQuery('')` clears the field.

Checkboxes use `checked` and `e.target.checked`; selects use `value` like text inputs.

## Updating state correctly

**Rule 1: never mutate state, always replace it.** React skips re-rendering if the new value is `Object.is`-equal to the old one, and mutated objects are equal to themselves.

```tsx
const [contacts, setContacts] = useState<Contact[]>([]);

// WRONG: mutates the existing array, same reference, no re-render
contacts.push(newContact);
setContacts(contacts);

// RIGHT: new arrays and objects (Day 2 helpers!)
setContacts([...contacts, newContact]);                                    // add
setContacts(contacts.filter((c) => c.id !== id));                          // remove
setContacts(contacts.map((c) => (c.id === id ? { ...c, vip: !c.vip } : c))); // update one
```

**Rule 2: use the functional form when the new value depends on the old one.** State updates are *batched*: several calls in one event handler are applied together, and each sees the same snapshot.

```tsx
function addThree() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);          // count only goes up by 1 total!
}

function addThreeCorrectly() {
  setCount((c) => c + 1);       // "take the latest value and add one"
  setCount((c) => c + 1);
  setCount((c) => c + 1);       // goes up by 3
}
```

Rule of thumb: if you write `setX(x + ...)`, write `setX((x) => ... )` instead.

**Rule 3: type your state when TypeScript cannot infer it.**

```tsx
const [name, setName] = useState('');                 // string, inferred
const [selected, setSelected] = useState<Contact | null>(null);   // explicit: starts as null
const [contacts, setContacts] = useState<Contact[]>([]);          // empty array needs a type
```

## Multi-field forms: one state object

```tsx
function ContactForm({ onAdd }: { onAdd: (c: { name: string; email: string }) => void }) {
  const [form, setForm] = useState({ name: '', email: '' });

  const update = (field: 'name' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(form);
    setForm({ name: '', email: '' });      // reset
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.name} onChange={update('name')} placeholder="Name" />
      <input value={form.email} onChange={update('email')} placeholder="Email" />
      <button type="submit" disabled={!form.name || !form.email}>Add</button>
    </form>
  );
}
```

Note `[field]: e.target.value`, a *computed property name* from Day 2, and that `disabled` is **derived** from state during render rather than stored as more state. Look for that pattern: *if you can compute it from existing state, don't store it.* Day 7 digs into this.

## Walkthrough: a contact manager

Requirement: *show contacts, add one with a name, remove one, toggle VIP.* Plan the state before the JSX.

1. **What changes over time?** The list of contacts, and the text in the "new name" field. That is two pieces of state.
2. **What are the events?** Typing, submitting, clicking remove, clicking the VIP star.
3. **Each event becomes one state update**, written with the immutable patterns above.

```tsx
interface Contact { id: number; name: string; vip: boolean }

function ContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([{ id: 1, name: 'Ava', vip: false }]);
  const [name, setName] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setContacts((list) => [...list, { id: Date.now(), name: name.trim(), vip: false }]);
    setName('');
  };
  const remove = (id: number) => setContacts((list) => list.filter((c) => c.id !== id));
  const toggleVip = (id: number) =>
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, vip: !c.vip } : c)));

  return (
    <div>
      <form onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New contact" />
        <button>Add</button>
      </form>
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            {c.name} {c.vip && '⭐'}
            <button onClick={() => toggleVip(c.id)}>{c.vip ? 'Unstar' : 'Star'}</button>
            <button onClick={() => remove(c.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Run it in the first practice and notice that no handler touches the DOM. Each one only describes the *next state*.

## CRM step: search and add

Make Nimbus CRM interactive:

1. In `App.tsx` hold the contact list in state: `useState<Contact[]>(sampleContacts)`.
2. Add a search `<input>` above the list (controlled) that filters rows by name or email as you type. Compute the filtered list during render; do not store it in state.
3. Add a small "Add contact" form (first name, last name, email) that appends a contact with `status: 'lead'`.
4. Add a "Remove" button to each row.

- [ ] Contact list lives in `useState`
- [ ] Search input is controlled and filters live
- [ ] Add form appends a contact and clears itself
- [ ] Remove button works, and no array is mutated in place
