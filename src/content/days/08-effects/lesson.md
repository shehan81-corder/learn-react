## What an effect is

Rendering must be a **pure calculation**: given props and state, produce JSX, with no side effects. But apps also need to *do things* that are not rendering: change the page title, start a timer, subscribe to events, call an API, read from `localStorage`. These are **side effects**, and `useEffect` is where they go.

```tsx
import { useEffect, useState } from 'react';

function ContactCount({ count }: { count: number }) {
  useEffect(() => {
    document.title = `Contacts (${count})`;
  }, [count]);

  return <p>{count} contacts</p>;
}
```

The idea: **an effect synchronises something outside React with the current props and state.** Here, the browser tab title is kept in sync with `count`.

> **The thinking pattern:** do not think "run this on mount" or "run this when X changes" (lifecycle thinking). Think "*this outside thing should always match these values*". Then list the values in the dependency array and React keeps them in sync.

## When effects run

1. React renders the component and updates the screen.
2. *After* the browser paints, React runs the effect.
3. On later renders, React compares the **dependency array** to last time. If any value changed, it runs the cleanup from the previous effect, then runs the effect again.

| Dependency array | Effect runs |
| --- | --- |
| `[a, b]` | after the first render, and whenever `a` or `b` changed |
| `[]` | once, after the first render |
| *(omitted)* | after **every** render (rarely what you want) |

In development, `<StrictMode>` runs every effect twice on mount (mount → unmount → mount) to help you find missing cleanup. If your effect breaks when run twice, it has a bug.

## Cleanup: undo what you started

Return a function from the effect to undo it. React calls it before re-running the effect and when the component unmounts.

```tsx
function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);        // stop the timer
  }, []);

  return <p>{now.toLocaleTimeString()}</p>;
}
```

Without cleanup you leak timers, event listeners and subscriptions, and eventually update state on components that no longer exist. Always pair: `setInterval`/`clearInterval`, `addEventListener`/`removeEventListener`, `subscribe`/`unsubscribe`.

## The dependency array is not optional advice

Every reactive value (prop, state, or a variable derived from them) that the effect reads **must** be in the array. If you leave one out, the effect keeps using a stale value from an old render.

```tsx
useEffect(() => {
  document.title = `${name} (${count})`;
}, [name, count]);          // both are read inside, so both are listed
```

Do not "fix" the linter by deleting dependencies. If listing a dependency makes the effect run too often, the *effect* is designed wrong: move code outside the effect, or restructure.

## Syncing state to `localStorage`

A classic pairing is a lazy state initialiser (read once) with an effect that writes on change:

```tsx
function usePersistentState(key: string, initial: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? initial);   // lazy init: runs once

  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
```

`useState(() => ...)` takes a function so the expensive read runs only on the first render, not on every one.

## Fetching in an effect, and the race condition

Calling an API is a side effect too. The simple version has a subtle bug:

```tsx
useEffect(() => {
  fetch(`/api/contacts/${id}`).then((r) => r.json()).then(setContact);
}, [id]);
```

If `id` changes from 1 to 2 quickly, response 1 might arrive *after* response 2 and overwrite it. The fix is an `ignore` flag set in the cleanup:

```tsx
useEffect(() => {
  let ignore = false;
  fetch(`/api/contacts/${id}`)
    .then((r) => r.json())
    .then((data) => {
      if (!ignore) setContact(data);        // only the latest effect may update
    });
  return () => {
    ignore = true;                          // cleanup marks this run as stale
  };
}, [id]);
```

You will build the complete version (loading, error, abort) on Day 14. For now the lesson is the *shape*: **cleanup runs before the next effect, so it can invalidate the previous run.**

## You might not need an effect

Effects are an escape hatch for talking to the outside world. Most beginners overuse them. If there is no external system involved, you don't need one:

| Instead of… | Do this |
| --- | --- |
| `useEffect(() => setFiltered(contacts.filter(...)), [contacts])` | Compute `const filtered = contacts.filter(...)` during render |
| `useEffect(() => { if (saved) onSaved(); }, [saved])` | Call `onSaved()` in the event handler that caused the save |
| `useEffect(() => setCount(0), [id])` to reset state | Give the component `key={id}` so React resets it |
| `useEffect(() => setTotal(a + b), [a, b])` | `const total = a + b` |

Rule: **events cause things to happen, so put that logic in event handlers. Effects are for keeping an external system in sync with what is on screen.**

## Walkthrough: debounced search input

Goal: typing in a search box should not trigger a search on every keystroke. Think in terms of synchronisation: *"the committed query should follow the typed text, but only after the user pauses"*.

```tsx
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);   // schedule
    return () => clearTimeout(id);                               // a newer keystroke cancels it
  }, [value, delayMs]);

  return debounced;
}
```

Trace the typing of "ava": `a` schedules a timer; `v` arrives before it fires, so cleanup cancels it and schedules a new one; `a` does the same; only after the pause does the last timer fire and set `debounced` to `"ava"`. The **cleanup function is the whole algorithm.** You will reuse this hook on Day 11 and Day 15.

## A note on the practice sandbox

The exercise sandbox runs your code in an isolated frame that has **no access to `localStorage`** (that is what keeps your code safe). So today's exercises take the storage object as a parameter (`storage`) and the tests pass an in-memory fake. This is also how professional developers test storage code: *inject the dependency*. In your real CRM, `window.localStorage` is the default.

## CRM step: persist and title

In Nimbus CRM:

1. Persist the contact list: initialise state lazily from `localStorage` (key `nimbus.contacts`, fall back to `sampleContacts`) and write it back in an effect whenever it changes. Wrap `JSON.parse` in `try/catch`.
2. Keep the document title in sync: `Nimbus CRM · 12 contacts`.
3. Add a small "Last saved" label showing the time of the last write. Notice it should be state updated *inside the effect*; think about why that is acceptable here.
4. Add a **Reset demo data** button that restores `sampleContacts`. Reload the page after adding a contact to prove persistence works.

- [ ] Contacts survive a page reload
- [ ] Corrupt JSON in `localStorage` does not crash the app
- [ ] The tab title shows the contact count
- [ ] Reset button restores the sample data
