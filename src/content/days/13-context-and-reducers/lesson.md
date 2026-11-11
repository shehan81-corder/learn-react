## Two problems, two tools

As an app grows you hit two problems that `useState` alone handles clumsily:

1. **Complex state logic.** A list of contacts that can be added to, removed from, toggled, filtered and reset has many ways to change. Scattering `setContacts(...)` calls across components makes the rules hard to find and easy to break.
2. **Prop drilling.** The current user, the theme and the contact list are needed by components at many depths. Passing them through every layer in between is noisy and brittle.

React gives you **`useReducer`** for the first and **Context** for the second. Together they form a small, built-in state-management system.

> **The thinking pattern:** *describe what happened, not how to change state.* A component says "contact 7 was starred" (an **action**). One central function (the **reducer**) decides what the new state is. All the rules live in one place and can be tested without React.

## Reducers

A reducer is a **pure function** `(state, action) => newState`. You already wrote this shape on Day 1 with `reduce`.

```ts
interface Contact { id: string; name: string; vip: boolean }

type Action =
  | { type: 'added'; contact: Contact }
  | { type: 'removed'; id: string }
  | { type: 'vip_toggled'; id: string }
  | { type: 'reset' };

function contactsReducer(state: Contact[], action: Action): Contact[] {
  switch (action.type) {
    case 'added':
      return [...state, action.contact];
    case 'removed':
      return state.filter((c) => c.id !== action.id);
    case 'vip_toggled':
      return state.map((c) => (c.id === action.id ? { ...c, vip: !c.vip } : c));
    case 'reset':
      return [];
    default: {
      const unreachable: never = action;       // exhaustiveness check (Day 4)
      return state;
    }
  }
}
```

Rules for reducers: **no side effects** (no `fetch`, no `Date.now()`, no random ids, because they make the function impure), **never mutate** `state`, and **return the same `state` object** when nothing changed, so React can skip a render. The action type is a discriminated union, so each `case` knows exactly which fields the action has.

Name actions after **what happened** (`'vip_toggled'`), not the setter you wish to call (`'SET_VIP'`). It keeps components free of state logic.

## `useReducer`

```tsx
import { useReducer } from 'react';

function ContactsPage() {
  const [contacts, dispatch] = useReducer(contactsReducer, []);

  return (
    <>
      <button onClick={() => dispatch({ type: 'added', contact: { id: crypto.randomUUID(), name: 'New', vip: false } })}>Add</button>
      {contacts.map((c) => (
        <button key={c.id} onClick={() => dispatch({ type: 'vip_toggled', id: c.id })}>
          {c.name} {c.vip ? '⭐' : ''}
        </button>
      ))}
    </>
  );
}
```

`dispatch` is stable (the same function every render), which makes it safe to pass down or use in effect dependency arrays. Notice that **the random id is created in the event handler**, not in the reducer; the reducer stays pure.

**`useState` or `useReducer`?** Use `useState` for independent, simple values. Switch to `useReducer` when state is an object or list with several kinds of updates, when the next state depends on the previous in non-trivial ways, or when you want to unit-test the logic in isolation.

## Context: skip the middle layers

Context lets a parent make a value available to **any descendant** without passing props. Three steps:

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

// 1. Create it
interface ThemeValue { theme: 'light' | 'dark'; toggle: () => void }
const ThemeContext = createContext<ThemeValue | null>(null);

// 2. Provide it
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const value = { theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// 3. Consume it, through a custom hook
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

The **custom hook wrapper** is the pattern to memorise. It hides the `useContext` call, narrows the type (no `null` checks in every consumer) and gives a clear error when someone forgets the provider. Components then just write `const { theme, toggle } = useTheme();`.

## Reducer + context = a mini store

Combine both: the provider holds the reducer, and exposes state and `dispatch` (or friendlier action functions) through context.

```tsx
const ContactsContext = createContext<{ contacts: Contact[]; dispatch: React.Dispatch<Action> } | null>(null);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, dispatch] = useReducer(contactsReducer, []);
  return <ContactsContext.Provider value={{ contacts, dispatch }}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used inside <ContactsProvider>');
  return ctx;
}
```

Now any component anywhere under the provider can read the list or dispatch an action. Two components in different parts of the tree stay in sync because they share one source of truth.

## Context performance and when *not* to use it

Every consumer re-renders whenever the context **value** changes, and `value={{ contacts, dispatch }}` creates a new object on every render of the provider. Two mitigations:

- **Split contexts:** one for rarely-changing things (theme, current user), one for fast-changing state. Or split state and dispatch into separate contexts, since `dispatch` never changes.
- **Memoise the value:** `useMemo(() => ({ contacts, dispatch }), [contacts])`.

Context is **not** a general replacement for props. If only a parent and child need a value, props are clearer. Context shines for *app-wide, slowly changing* values: theme, locale, auth user, feature flags. For high-frequency or large shared state, or server data, there are better tools (TanStack Query on Day 17, a store on Day 25).

## Walkthrough: design the auth context

*"Many components need the signed-in user, and a few need to sign in or out."*

1. **What is the state?** `user: User | null`. Perhaps also `status: 'loading' | 'ready'` while a saved session is restored.
2. **What can happen?** `login(credentials)`, `logout()`.
3. **Who needs it?** The header (name and logout), route guards, any page showing "my" data. Too many places for props, so use context.
4. **API shape:** `const { user, login, logout } = useAuth();`, plus an error if used outside `AuthProvider`.
5. **Testing:** the provider takes its dependencies (the login function, storage) as props so tests can inject fakes. You will build exactly this on Day 20.

## CRM step: contacts in a reducer, user prefs in context

1. Create `src/state/contactsReducer.ts` with the `Action` union and the pure reducer for add, update, remove, toggle VIP and `loaded` (replace all). Write 4+ unit tests as plain function calls in a scratch file or Vitest later.
2. Create `ContactsProvider` + `useContacts()` and wrap the routes in `App`.
3. Replace the local `useState` in `ContactsPage` and the detail page with `useContacts()` so they share state: adding a contact on one page appears on the other.
4. Create `PreferencesProvider` (`pageSize`, `compactRows`) with `usePreferences()`; the table reads `pageSize` from it.
5. Keep the reducer pure: generate ids in the form's submit handler.

- [ ] Reducer is pure, exhaustive and has no ids or dates generated inside
- [ ] `useContacts()` throws a helpful error outside the provider
- [ ] List page and detail page share the same state
- [ ] Preferences context drives the table's page size
