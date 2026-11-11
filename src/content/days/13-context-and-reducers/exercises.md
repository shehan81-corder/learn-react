# practice: A pure reducer

### meta
minutes: 7
language: ts

### prompt
Write and export a `dealsReducer(state, action)` for a list of deals.

```ts
type Deal = { id: string; title: string; stage: 'new' | 'won' | 'lost'; value: number };
type Action =
  | { type: 'added'; deal: Deal }
  | { type: 'stage_changed'; id: string; stage: Deal['stage'] }
  | { type: 'removed'; id: string }
  | { type: 'cleared_closed' };   // remove every deal that is won or lost
```

Rules: never mutate the state; return the **same state array** (identical reference) when an action changes nothing (for example `stage_changed` for an unknown id, or `added` with an id that already exists).

### starter
```ts
export type Deal = { id: string; title: string; stage: 'new' | 'won' | 'lost'; value: number };

export type Action =
  | { type: 'added'; deal: Deal }
  | { type: 'stage_changed'; id: string; stage: Deal['stage'] }
  | { type: 'removed'; id: string }
  | { type: 'cleared_closed' };

export function dealsReducer(state: Deal[], action: Action): Deal[] {
  // TODO: switch on action.type
  return state;
}
```

### solution
```ts
export type Deal = { id: string; title: string; stage: 'new' | 'won' | 'lost'; value: number };

export type Action =
  | { type: 'added'; deal: Deal }
  | { type: 'stage_changed'; id: string; stage: Deal['stage'] }
  | { type: 'removed'; id: string }
  | { type: 'cleared_closed' };

export function dealsReducer(state: Deal[], action: Action): Deal[] {
  switch (action.type) {
    case 'added':
      if (state.some((d) => d.id === action.deal.id)) return state;
      return [...state, action.deal];
    case 'stage_changed': {
      const target = state.find((d) => d.id === action.id);
      if (!target || target.stage === action.stage) return state;
      return state.map((d) => (d.id === action.id ? { ...d, stage: action.stage } : d));
    }
    case 'removed':
      return state.some((d) => d.id === action.id) ? state.filter((d) => d.id !== action.id) : state;
    case 'cleared_closed': {
      const open = state.filter((d) => d.stage === 'new');
      return open.length === state.length ? state : open;
    }
    default: {
      const unreachable: never = action;
      return state;
    }
  }
}
```

### tests
```ts
const a = { id: 'a', title: 'A', stage: 'new', value: 100 };
const b = { id: 'b', title: 'B', stage: 'won', value: 200 };
const c = { id: 'c', title: 'C', stage: 'lost', value: 50 };

test('added appends a deal', () => {
  expect(user.dealsReducer([a], { type: 'added', deal: b })).toEqual([a, b]);
});

test('added ignores a duplicate id and returns the same state', () => {
  const state = [a];
  expect(user.dealsReducer(state, { type: 'added', deal: { ...a, title: 'dup' } })).toBe(state);
});

test('stage_changed updates one deal only', () => {
  const state = [a, b];
  const next = user.dealsReducer(state, { type: 'stage_changed', id: 'a', stage: 'won' });
  expect(next).toEqual([{ ...a, stage: 'won' }, b]);
  expect(next[1]).toBe(b);
  expect(state[0].stage).toBe('new');
});

test('stage_changed with no effect returns the same state', () => {
  const state = [a, b];
  expect(user.dealsReducer(state, { type: 'stage_changed', id: 'zzz', stage: 'won' })).toBe(state);
  expect(user.dealsReducer(state, { type: 'stage_changed', id: 'a', stage: 'new' })).toBe(state);
});

test('removed deletes by id, or returns the same state if missing', () => {
  const state = [a, b];
  expect(user.dealsReducer(state, { type: 'removed', id: 'a' })).toEqual([b]);
  expect(user.dealsReducer(state, { type: 'removed', id: 'x' })).toBe(state);
});

test('cleared_closed removes won and lost deals', () => {
  const state = [a, b, c];
  expect(user.dealsReducer(state, { type: 'cleared_closed' })).toEqual([a]);
  const open = [a];
  expect(user.dealsReducer(open, { type: 'cleared_closed' })).toBe(open);
});

test('never mutates its input', () => {
  const state = [a, b, c];
  const snapshot = JSON.stringify(state);
  user.dealsReducer(state, { type: 'stage_changed', id: 'a', stage: 'lost' });
  user.dealsReducer(state, { type: 'removed', id: 'b' });
  user.dealsReducer(state, { type: 'cleared_closed' });
  expect(JSON.stringify(state)).toBe(snapshot);
});
```

### typetests
```ts
const s = dealsReducer([], { type: 'added', deal: { id: '1', title: 't', stage: 'new', value: 1 } });
// @ts-expect-error unknown action type
dealsReducer([], { type: 'exploded' });
// @ts-expect-error stage_changed needs a valid stage
dealsReducer([], { type: 'stage_changed', id: '1', stage: 'maybe' });
// @ts-expect-error removed needs an id
dealsReducer([], { type: 'removed' });
```

### explanation
A reducer is a plain function, so it is tested with plain calls: no components, no rendering. Returning the **same reference** when nothing changed matters because React bails out of re-rendering when a reducer returns `Object.is`-equal state. The `never` assignment in `default` makes TypeScript complain if you add a new action to the union and forget to handle it here. The cases use the immutable patterns from Day 2: spread to add, `map` to update, `filter` to remove.

### hints
- `switch (action.type)` narrows `action` in each `case`.
- Before changing, check whether the change is a no-op and `return state`.
- `removed`: use `state.some(...)` to see if the id exists.
- `cleared_closed`: keep deals with `stage === 'new'`.

# practice: useReducer in a component

### meta
minutes: 8
language: tsx

### prompt
Build `UndoCounter` with `useReducer`. State is `{ count: number; history: number[] }`.

Actions: `increment`, `decrement` (not below 0), `undo` (restore the previous count) and `reset` (count 0 and clear history).

Render: `<p>Count: N</p>` and buttons **+**, **-**, **Undo**, **Reset**. **Undo** is `disabled` when the history is empty. Every `increment`/`decrement` that changes the count pushes the previous count onto the history. Export the pure `reducer` too.

### starter
```tsx
import { useReducer } from 'react';

export interface State {
  count: number;
  history: number[];
}
export type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'undo' } | { type: 'reset' };

export const initialState: State = { count: 0, history: [] };

export function reducer(state: State, action: Action): State {
  // TODO
  return state;
}

export function UndoCounter() {
  // TODO: useReducer(reducer, initialState)
  return (
    <div>
      <p>Count: 0</p>
      <button>+</button>
      <button>-</button>
      <button>Undo</button>
      <button>Reset</button>
    </div>
  );
}

export default UndoCounter;
```

### solution
```tsx
import { useReducer } from 'react';

export interface State {
  count: number;
  history: number[];
}
export type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'undo' } | { type: 'reset' };

export const initialState: State = { count: 0, history: [] };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1, history: [...state.history, state.count] };
    case 'decrement':
      if (state.count === 0) return state;
      return { count: state.count - 1, history: [...state.history, state.count] };
    case 'undo': {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return { count: previous, history: state.history.slice(0, -1) };
    }
    case 'reset':
      return initialState;
  }
}

export function UndoCounter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'undo' })} disabled={state.history.length === 0}>
        Undo
      </button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}

export default UndoCounter;
```

### tests
```tsx
test('the reducer is pure and correct', () => {
  const s0 = user.initialState;
  const s1 = user.reducer(s0, { type: 'increment' });
  expect(s1).toEqual({ count: 1, history: [0] });
  const s2 = user.reducer(s1, { type: 'increment' });
  expect(s2).toEqual({ count: 2, history: [0, 1] });
  expect(user.reducer(s2, { type: 'undo' })).toEqual({ count: 1, history: [0] });
  expect(user.reducer(s2, { type: 'decrement' })).toEqual({ count: 1, history: [0, 1, 2] });
  expect(user.reducer(s2, { type: 'reset' })).toEqual({ count: 0, history: [] });
  expect(s0).toEqual({ count: 0, history: [] });
});

test('decrement does nothing at zero and returns the same state', () => {
  const s = user.initialState;
  expect(user.reducer(s, { type: 'decrement' })).toBe(s);
});

test('undo with no history returns the same state', () => {
  const s = user.initialState;
  expect(user.reducer(s, { type: 'undo' })).toBe(s);
});

test('the component renders the count and disables Undo at first', async () => {
  const view = await render(<user.UndoCounter />);
  expect(view.$('p').textContent).toBe('Count: 0');
  expect(view.getByRole('button', { name: 'Undo' }).disabled).toBe(true);
});

test('the buttons dispatch actions', async () => {
  const view = await render(<user.UndoCounter />);
  const plus = view.getByRole('button', { name: '+' });
  await click(plus);
  await click(plus);
  await click(plus);
  expect(view.$('p').textContent).toBe('Count: 3');
  await click(view.getByRole('button', { name: '-' }));
  expect(view.$('p').textContent).toBe('Count: 2');
  await click(view.getByRole('button', { name: 'Undo' }));
  expect(view.$('p').textContent).toBe('Count: 3');
  await click(view.getByRole('button', { name: 'Reset' }));
  expect(view.$('p').textContent).toBe('Count: 0');
  expect(view.getByRole('button', { name: 'Undo' }).disabled).toBe(true);
});
```

### explanation
All the rules live in `reducer`, a pure function you can test with plain calls (the first three tests don't render anything). The component is thin: it displays state and describes events with `dispatch`. History is kept by pushing the *previous* count onto an array and popping it on undo. Because TypeScript knows every `case` returns, the `switch` over the union needs no `default`.

### hints
- `const [state, dispatch] = useReducer(reducer, initialState);`
- `increment`: `{ count: state.count + 1, history: [...state.history, state.count] }`.
- `undo`: take the last history item as the new count and drop it with `slice(0, -1)`.

# practice: A context with a custom hook

### meta
minutes: 8
language: tsx

### prompt
Build a small user context.

- `UserProvider({ initialUser, children })` holds `user: { name: string } | null` in state and provides `{ user, login(name), logout() }`.
- `useUser()` returns that value and **throws** `Error('useUser must be used inside <UserProvider>')` when called outside the provider.
- `Greeting` uses `useUser()` and shows `Hello, <name>` or `Not signed in`.
- `AuthButton` uses `useUser()` and renders a **Log out** button when signed in, or a **Log in as Ava** button (calls `login('Ava')`) when not.

### starter
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface User {
  name: string;
}
interface UserValue {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserValue | null>(null);

export function UserProvider({ initialUser = null, children }: { initialUser?: User | null; children: ReactNode }) {
  // TODO
  return <>{children}</>;
}

export function useUser(): UserValue {
  // TODO
  return {} as UserValue;
}

export function Greeting() {
  // TODO
  return <p />;
}

export function AuthButton() {
  // TODO
  return <button />;
}

export default function App() {
  return (
    <UserProvider>
      <Greeting />
      <AuthButton />
    </UserProvider>
  );
}
```

### solution
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface User {
  name: string;
}
interface UserValue {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserValue | null>(null);

export function UserProvider({ initialUser = null, children }: { initialUser?: User | null; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const value: UserValue = {
    user,
    login: (name) => setUser({ name }),
    logout: () => setUser(null),
  };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}

export function Greeting() {
  const { user } = useUser();
  return <p>{user ? `Hello, ${user.name}` : 'Not signed in'}</p>;
}

export function AuthButton() {
  const { user, login, logout } = useUser();
  return user ? <button onClick={logout}>Log out</button> : <button onClick={() => login('Ava')}>Log in as Ava</button>;
}

export default function App() {
  return (
    <UserProvider>
      <Greeting />
      <AuthButton />
    </UserProvider>
  );
}
```

### tests
```tsx
test('siblings share state through the provider', async () => {
  const view = await render(
    <user.UserProvider>
      <user.Greeting />
      <user.AuthButton />
    </user.UserProvider>,
  );
  expect(view.$('p').textContent).toBe('Not signed in');
  await click(view.getByRole('button', { name: 'Log in as Ava' }));
  expect(view.$('p').textContent).toBe('Hello, Ava');
  await click(view.getByRole('button', { name: 'Log out' }));
  expect(view.$('p').textContent).toBe('Not signed in');
});

test('initialUser seeds the state', async () => {
  const view = await render(
    <user.UserProvider initialUser={{ name: 'Liam' }}>
      <user.Greeting />
    </user.UserProvider>,
  );
  expect(view.$('p').textContent).toBe('Hello, Liam');
});

test('consumers can be deeply nested', async () => {
  const Deep = () => (
    <div>
      <div>
        <div>
          <user.Greeting />
        </div>
      </div>
    </div>
  );
  const view = await render(
    <user.UserProvider initialUser={{ name: 'Mia' }}>
      <Deep />
    </user.UserProvider>,
  );
  expect(view.$('p').textContent).toBe('Hello, Mia');
});

test('useUser throws a helpful error outside the provider', async () => {
  let message = '';
  function Probe() {
    try {
      user.useUser();
    } catch (e) {
      message = e.message;
    }
    return null;
  }
  await render(<Probe />);
  expect(message).toBe('useUser must be used inside <UserProvider>');
});

test('the context value has the right shape', async () => {
  let value;
  function Probe() {
    value = user.useUser();
    return null;
  }
  await render(
    <user.UserProvider>
      <Probe />
    </user.UserProvider>,
  );
  expect(value.user).toBeNull();
  expect(typeof value.login).toBe('function');
  expect(typeof value.logout).toBe('function');
});
```

### typetests
```tsx
function Check() {
  const { user, login, logout } = useUser();
  const name: string | undefined = user?.name;
  login('x');
  // @ts-expect-error login needs a string
  login(42);
  return null;
}
const a = <UserProvider><div /></UserProvider>;
// @ts-expect-error children are required
const b = <UserProvider />;
```

### explanation
The three-part pattern: `createContext` (with `null` as the "no provider" default), a **Provider** component that owns the state, and a **custom hook** that reads the context. The hook's guard clause gives a clear error instead of a confusing `Cannot read properties of null`, and it narrows the type so consumers never deal with `null`. `Greeting` and `AuthButton` are siblings that never talk to each other directly; they stay in sync only because they read the same context.

### hints
- `createContext<UserValue | null>(null)`.
- In the provider: `const [user, setUser] = useState(initialUser);` and build a `value` object.
- `const ctx = useContext(UserContext); if (!ctx) throw new Error(...); return ctx;`

# challenge: Reducer + context store

### meta
minutes: 10
language: tsx

### prompt
Build a shared contacts store.

- `contactsReducer` (export it): actions `added` (`contact`), `removed` (`id`), `vip_toggled` (`id`). State is `Contact[]`. No-ops return the same state.
- `ContactsProvider({ initial = [], children })` uses `useReducer` and provides `{ contacts, dispatch }`.
- `useContacts()` throws `Error('useContacts must be used inside <ContactsProvider>')` outside the provider.
- `ContactList` renders `<li>` per contact: name, a `⭐` when VIP, a **Star** / **Unstar** button and a **Remove** button.
- `ContactCount` renders `<p>Total: N · VIP: M</p>`.
- `AddContact` has an input (`aria-label="Name"`) and **Add** button. It dispatches `added` with an id generated in the **handler** (a counter or `Date.now()`), then clears the input. Blank names are ignored.

All three components are siblings and must stay in sync.

### starter
```tsx
import { createContext, useContext, useReducer, useState, type Dispatch, type ReactNode } from 'react';

export interface Contact {
  id: string;
  name: string;
  vip: boolean;
}
export type Action = { type: 'added'; contact: Contact } | { type: 'removed'; id: string } | { type: 'vip_toggled'; id: string };

export function contactsReducer(state: Contact[], action: Action): Contact[] {
  // TODO
  return state;
}

const ContactsContext = createContext<{ contacts: Contact[]; dispatch: Dispatch<Action> } | null>(null);

export function ContactsProvider({ initial = [], children }: { initial?: Contact[]; children: ReactNode }) {
  // TODO
  return <>{children}</>;
}

export function useContacts() {
  // TODO
  return {} as { contacts: Contact[]; dispatch: Dispatch<Action> };
}

export function ContactList() {
  // TODO
  return <ul />;
}

export function ContactCount() {
  // TODO
  return <p />;
}

export function AddContact() {
  // TODO
  return <form />;
}

export default function App() {
  return (
    <ContactsProvider initial={[{ id: '1', name: 'Ava', vip: false }]}>
      <AddContact />
      <ContactCount />
      <ContactList />
    </ContactsProvider>
  );
}
```

### solution
```tsx
import { createContext, useContext, useReducer, useState, type Dispatch, type ReactNode } from 'react';

export interface Contact {
  id: string;
  name: string;
  vip: boolean;
}
export type Action = { type: 'added'; contact: Contact } | { type: 'removed'; id: string } | { type: 'vip_toggled'; id: string };

export function contactsReducer(state: Contact[], action: Action): Contact[] {
  switch (action.type) {
    case 'added':
      return state.some((c) => c.id === action.contact.id) ? state : [...state, action.contact];
    case 'removed':
      return state.some((c) => c.id === action.id) ? state.filter((c) => c.id !== action.id) : state;
    case 'vip_toggled':
      return state.some((c) => c.id === action.id) ? state.map((c) => (c.id === action.id ? { ...c, vip: !c.vip } : c)) : state;
  }
}

const ContactsContext = createContext<{ contacts: Contact[]; dispatch: Dispatch<Action> } | null>(null);

export function ContactsProvider({ initial = [], children }: { initial?: Contact[]; children: ReactNode }) {
  const [contacts, dispatch] = useReducer(contactsReducer, initial);
  return <ContactsContext.Provider value={{ contacts, dispatch }}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used inside <ContactsProvider>');
  return ctx;
}

export function ContactList() {
  const { contacts, dispatch } = useContacts();
  return (
    <ul>
      {contacts.map((c) => (
        <li key={c.id}>
          <span>
            {c.name}
            {c.vip && ' ⭐'}
          </span>
          <button onClick={() => dispatch({ type: 'vip_toggled', id: c.id })}>{c.vip ? 'Unstar' : 'Star'}</button>
          <button onClick={() => dispatch({ type: 'removed', id: c.id })}>Remove</button>
        </li>
      ))}
    </ul>
  );
}

export function ContactCount() {
  const { contacts } = useContacts();
  return (
    <p>
      Total: {contacts.length} · VIP: {contacts.filter((c) => c.vip).length}
    </p>
  );
}

let nextId = 1;

export function AddContact() {
  const { dispatch } = useContacts();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: 'added', contact: { id: `new-${nextId++}`, name: trimmed, vip: false } });
    setName('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  );
}

export default function App() {
  return (
    <ContactsProvider initial={[{ id: '1', name: 'Ava', vip: false }]}>
      <AddContact />
      <ContactCount />
      <ContactList />
    </ContactsProvider>
  );
}
```

### tests
```tsx
const seed = () => [
  { id: 'a', name: 'Ava', vip: false },
  { id: 'b', name: 'Liam', vip: true },
];
const app = (initial = seed()) => (
  <user.ContactsProvider initial={initial}>
    <user.AddContact />
    <user.ContactCount />
    <user.ContactList />
  </user.ContactsProvider>
);
const count = (view) => view.$('p').textContent;
const rows = (view) => view.$$('li').map((li) => li.querySelector('span').textContent);

test('reducer: added / removed / vip_toggled', () => {
  const s = seed();
  expect(user.contactsReducer(s, { type: 'added', contact: { id: 'c', name: 'Mia', vip: false } })).toHaveLength(3);
  expect(user.contactsReducer(s, { type: 'removed', id: 'a' }).map((c) => c.id)).toEqual(['b']);
  expect(user.contactsReducer(s, { type: 'vip_toggled', id: 'a' })[0].vip).toBe(true);
  expect(s[0].vip).toBe(false);
});

test('reducer: no-ops keep the same reference', () => {
  const s = seed();
  expect(user.contactsReducer(s, { type: 'removed', id: 'zzz' })).toBe(s);
  expect(user.contactsReducer(s, { type: 'vip_toggled', id: 'zzz' })).toBe(s);
  expect(user.contactsReducer(s, { type: 'added', contact: s[0] })).toBe(s);
});

test('components read the shared state', async () => {
  const view = await render(app());
  expect(count(view)).toBe('Total: 2 · VIP: 1');
  expect(rows(view)).toEqual(['Ava', 'Liam ⭐']);
});

test('adding through AddContact updates the list and the count', async () => {
  const view = await render(app());
  const input = view.getByRole('textbox', { name: 'Name' });
  await type(input, '  Mia ');
  await submit(view.$('form'));
  expect(rows(view)).toEqual(['Ava', 'Liam ⭐', 'Mia']);
  expect(count(view)).toBe('Total: 3 · VIP: 1');
  expect(input.value).toBe('');
});

test('blank names are ignored', async () => {
  const view = await render(app());
  await type(view.getByRole('textbox', { name: 'Name' }), '   ');
  await submit(view.$('form'));
  expect(rows(view)).toHaveLength(2);
});

test('star and remove buttons dispatch actions', async () => {
  const view = await render(app());
  await click(view.$$('li')[0].querySelectorAll('button')[0]);
  expect(rows(view)).toEqual(['Ava ⭐', 'Liam ⭐']);
  expect(count(view)).toBe('Total: 2 · VIP: 2');
  expect(view.$$('li')[0].querySelectorAll('button')[0].textContent).toBe('Unstar');
  await click(view.$$('li')[1].querySelectorAll('button')[1]);
  expect(rows(view)).toEqual(['Ava ⭐']);
  expect(count(view)).toBe('Total: 1 · VIP: 1');
});

test('useContacts throws outside the provider', async () => {
  let message = '';
  function Probe() {
    try {
      user.useContacts();
    } catch (e) {
      message = e.message;
    }
    return null;
  }
  await render(<Probe />);
  expect(message).toBe('useContacts must be used inside <ContactsProvider>');
});
```

### typetests
```tsx
const reduced: Contact[] = contactsReducer([], { type: 'removed', id: 'x' });
// @ts-expect-error unknown action
contactsReducer([], { type: 'nope' });
// @ts-expect-error added needs a full contact
contactsReducer([], { type: 'added', contact: { id: '1' } });
```

### explanation
This is the full pattern in miniature. The reducer owns every rule and is testable without React. The provider wires `useReducer` into context. Three sibling components, with no props between them, stay consistent because they read and write one shared store. The id for a new contact is created in the **event handler** (`AddContact`), keeping the reducer pure. In a larger app you would split state and dispatch into two contexts or memoise the value, so consumers that only dispatch do not re-render on every state change.

### hints
- Reducer no-ops: check with `state.some(...)` first and `return state`.
- `useReducer(contactsReducer, initial)` inside the provider.
- Consumers: `const { contacts, dispatch } = useContacts();`.
- Create the id in `AddContact`'s submit handler, not in the reducer.
