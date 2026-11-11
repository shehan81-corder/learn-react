# practice: Sync the document title

### meta
minutes: 6
language: tsx

### prompt
Build `TitleSync({ name, count })`. It renders `<p>{name}: {count}</p>` and keeps `document.title` in sync with the props using the format `Nimbus · <name> (<count>)`.

- Use a single `useEffect` with the correct dependency array.
- When the component unmounts it must restore the title that was there **before** it mounted.

### starter
```tsx
import { useEffect } from 'react';

export function TitleSync({ name, count }: { name: string; count: number }) {
  // TODO: useEffect that sets document.title and restores it on cleanup
  return (
    <p>
      {name}: {count}
    </p>
  );
}

export default function App() {
  return <TitleSync name="Contacts" count={3} />;
}
```

### solution
```tsx
import { useEffect } from 'react';

export function TitleSync({ name, count }: { name: string; count: number }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `Nimbus · ${name} (${count})`;
    return () => {
      document.title = previous;
    };
  }, [name, count]);

  return (
    <p>
      {name}: {count}
    </p>
  );
}

export default function App() {
  return <TitleSync name="Contacts" count={3} />;
}
```

### tests
```tsx
test('sets the title after render', async () => {
  document.title = 'original';
  const view = await render(<user.TitleSync name="Contacts" count={3} />);
  expect(view.$('p').textContent).toBe('Contacts: 3');
  expect(document.title).toBe('Nimbus · Contacts (3)');
  view.unmount();
});

test('updates the title when props change', async () => {
  document.title = 'original';
  const view = await render(<user.TitleSync name="Contacts" count={3} />);
  await view.rerender(<user.TitleSync name="Deals" count={7} />);
  expect(document.title).toBe('Nimbus · Deals (7)');
  view.unmount();
});

test('restores the original title on unmount', async () => {
  document.title = 'original';
  const view = await render(<user.TitleSync name="Contacts" count={3} />);
  expect(document.title).not.toBe('original');
  view.unmount();
  await flush();
  expect(document.title).toBe('original');
});
```

### explanation
Setting `document.title` is a side effect: it touches something outside React. The effect lists `name` and `count` because it reads both. The cleanup function runs before each re-run and on unmount. Capturing `previous` *inside* the effect means each run restores whatever it replaced, so the final cleanup returns the title to its very first value.

### hints
- `useEffect(() => { ... }, [name, count])`
- Store `const previous = document.title;` before overwriting it.
- Return a cleanup function that puts `previous` back.

# practice: Timer with cleanup

### meta
minutes: 7
language: tsx

### prompt
Build `Ticker({ intervalMs, onTick })`. It renders `<p>Ticks: N</p>` and, using `setInterval` inside an effect:

- Increments its own tick count and calls `onTick(count)` once per interval.
- Stops the timer when it unmounts.
- Restarts with the new delay when `intervalMs` changes.

Keep the latest `onTick` without restarting the timer every time the parent passes a new function (see the hints).

The tests use a **fake clock** (`useFakeTimers`), so they run instantly and do not depend on real time.

### starter
```tsx
import { useEffect, useRef, useState } from 'react';

export function Ticker({ intervalMs, onTick }: { intervalMs: number; onTick: (count: number) => void }) {
  const [count, setCount] = useState(0);

  // TODO: effect with setInterval and cleanup

  return <p>Ticks: {count}</p>;
}

export default function App() {
  return <Ticker intervalMs={1000} onTick={(n) => console.log('tick', n)} />;
}
```

### solution
```tsx
import { useEffect, useRef, useState } from 'react';

export function Ticker({ intervalMs, onTick }: { intervalMs: number; onTick: (count: number) => void }) {
  const [count, setCount] = useState(0);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setCount(n);
      onTickRef.current(n);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return <p>Ticks: {count}</p>;
}

export default function App() {
  return <Ticker intervalMs={1000} onTick={(n) => console.log('tick', n)} />;
}
```

### tests
```tsx
// These tests use a fake clock, so they are instant and deterministic.
test('ticks and reports each count', async () => {
  const timers = useFakeTimers();
  const onTick = fn();
  const view = await render(<user.Ticker intervalMs={20} onTick={onTick} />);
  await timers.advance(110);
  expect(onTick.calls.map((c) => c[0])).toEqual([1, 2, 3, 4, 5]);
  expect(view.$('p').textContent).toBe('Ticks: 5');
});

test('stops ticking after unmount', async () => {
  const timers = useFakeTimers();
  const onTick = fn();
  const view = await render(<user.Ticker intervalMs={15} onTick={onTick} />);
  await timers.advance(50);
  expect(onTick.calls.length).toBe(3);
  view.unmount();
  await flush();
  expect(timers.pending()).toBe(0);
  await timers.advance(200);
  expect(onTick.calls.length).toBe(3);
});

test('a new onTick function does not restart the timer', async () => {
  const timers = useFakeTimers();
  const first = fn();
  const second = fn();
  const view = await render(<user.Ticker intervalMs={40} onTick={first} />);
  await timers.advance(90);
  expect(first.calls.length).toBe(2);
  await view.rerender(<user.Ticker intervalMs={40} onTick={second} />);
  await timers.advance(100);
  // If the interval had restarted, the first count reported to `second` would be 1.
  expect(second.calls[0][0]).toBe(3);
  expect(first.calls.length).toBe(2);
});

test('changing intervalMs restarts with the new delay', async () => {
  const timers = useFakeTimers();
  const onTick = fn();
  const view = await render(<user.Ticker intervalMs={1000} onTick={onTick} />);
  await view.rerender(<user.Ticker intervalMs={15} onTick={onTick} />);
  expect(timers.pending()).toBe(1);
  await timers.advance(80);
  expect(onTick.calls.length).toBe(5);
});
```

### explanation
The interval is created in an effect and destroyed in its cleanup, so it is stopped on unmount and replaced when `intervalMs` changes. The tricky part is `onTick`: if it were a dependency, a parent that passes a fresh arrow function on every render would restart the timer constantly. Storing the latest callback in a ref (updated on each render) lets the long-lived interval always call the *current* function without being a dependency. This "latest ref" pattern is common; you will meet it again in custom hooks.

### hints
- `const id = setInterval(..., intervalMs); return () => clearInterval(id);`
- Dependencies: `[intervalMs]`.
- Store the callback in a ref: `const onTickRef = useRef(onTick);` and update `onTickRef.current` in a separate effect with no dependency array.

# practice: Persistent state hook

### meta
minutes: 8
language: tsx

### prompt
Write the custom hook `useStoredState(key, initial, storage)` and a `NoteBox` component that uses it.

- `storage` has the shape `{ getItem(key): string | null; setItem(key, value): void }` (like `localStorage`).
- The hook initialises state **lazily** from `storage.getItem(key)` (parsed as JSON); if there is no entry or the JSON is invalid, it uses `initial`.
- Whenever the value changes it writes `JSON.stringify(value)` back to storage.
- It returns `[value, setValue]` like `useState`.
- `NoteBox({ storage })` renders a `<textarea aria-label="Note">` bound to `useStoredState('note', '', storage)` and shows `<small>Saved</small>` below it.

### starter
```tsx
import { useEffect, useState } from 'react';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function useStoredState<T>(key: string, initial: T, storage: StorageLike) {
  // TODO
  const [value, setValue] = useState<T>(initial);
  return [value, setValue] as const;
}

export function NoteBox({ storage }: { storage: StorageLike }) {
  // TODO: use the hook
  return (
    <div>
      <textarea aria-label="Note" />
      <small>Saved</small>
    </div>
  );
}

export default function App() {
  const memory: Record<string, string> = {};
  const fake: StorageLike = { getItem: (k) => memory[k] ?? null, setItem: (k, v) => void (memory[k] = v) };
  return <NoteBox storage={fake} />;
}
```

### solution
```tsx
import { useEffect, useState } from 'react';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function useStoredState<T>(key: string, initial: T, storage: StorageLike) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = storage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    storage.setItem(key, JSON.stringify(value));
  }, [key, value, storage]);

  return [value, setValue] as const;
}

export function NoteBox({ storage }: { storage: StorageLike }) {
  const [note, setNote] = useStoredState('note', '', storage);
  return (
    <div>
      <textarea aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <small>Saved</small>
    </div>
  );
}

export default function App() {
  const memory: Record<string, string> = {};
  const fake: StorageLike = { getItem: (k) => memory[k] ?? null, setItem: (k, v) => void (memory[k] = v) };
  return <NoteBox storage={fake} />;
}
```

### tests
```tsx
const makeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
};

test('uses the initial value when storage is empty', async () => {
  const view = await render(<user.NoteBox storage={makeStorage()} />);
  expect(view.getByRole('textbox', { name: 'Note' }).value).toBe('');
});

test('reads an existing value from storage', async () => {
  const storage = makeStorage({ note: JSON.stringify('hello again') });
  const view = await render(<user.NoteBox storage={storage} />);
  expect(view.getByRole('textbox', { name: 'Note' }).value).toBe('hello again');
});

test('falls back to the initial value on corrupt JSON', async () => {
  const storage = makeStorage({ note: '{not json' });
  const view = await render(<user.NoteBox storage={storage} />);
  expect(view.getByRole('textbox', { name: 'Note' }).value).toBe('');
});

test('writes changes back as JSON', async () => {
  const storage = makeStorage();
  const view = await render(<user.NoteBox storage={storage} />);
  await type(view.getByRole('textbox', { name: 'Note' }), 'buy milk');
  expect(JSON.parse(storage.data.note)).toBe('buy milk');
});

test('the hook is generic: it stores objects too', async () => {
  const storage = makeStorage();
  let setter;
  function Probe() {
    const [v, setV] = user.useStoredState('prefs', { dark: false }, storage);
    setter = setV;
    return <p>{String(v.dark)}</p>;
  }
  const view = await render(<Probe />);
  expect(view.$('p').textContent).toBe('false');
  setter({ dark: true });
  await flush();
  expect(view.$('p').textContent).toBe('true');
  expect(JSON.parse(storage.data.prefs)).toEqual({ dark: true });
});

test('reads storage only once (lazy initialiser)', async () => {
  const storage = makeStorage({ note: JSON.stringify('x') });
  const original = storage.getItem;
  let reads = 0;
  storage.getItem = (k) => {
    reads++;
    return original(k);
  };
  const view = await render(<user.NoteBox storage={storage} />);
  await type(view.getByRole('textbox', { name: 'Note' }), 'abc');
  await type(view.getByRole('textbox', { name: 'Note' }), 'abcd');
  expect(reads).toBe(1);
});
```

### explanation
`useState(() => ...)` accepts a function so the storage read happens only on the first render; without it `getItem` would be called on every render. The `try/catch` handles corrupt data, a real-world necessity because users and old versions of your app can leave anything in storage. The effect writes on every change; its dependency list contains everything it reads (`key`, `value`, `storage`). Passing `storage` in as a parameter is *dependency injection*, which is why the tests can supply a fake.

### hints
- Lazy initialiser: `useState<T>(() => { ... })`.
- Wrap `JSON.parse` in `try/catch` and fall back to `initial`.
- The effect: `storage.setItem(key, JSON.stringify(value))` with `[key, value, storage]` as dependencies.

# challenge: Race-free data loader

### meta
minutes: 10
language: tsx

### prompt
Build `ContactName({ id, fetchContact })`. `fetchContact(id)` returns a promise of `{ name: string }`.

- While loading render `<p>Loading…</p>`.
- On success render `<h2>{name}</h2>`.
- On failure render `<p role="alert">Could not load: {message}</p>`.
- When `id` changes, show the loading state again and fetch the new contact.
- **Stale responses must be ignored.** If the id changes while a request is in flight, the old response must not overwrite the new one, and nothing may update state after unmount.

### starter
```tsx
import { useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'success'; name: string }
  | { status: 'error'; message: string };

export function ContactName({ id, fetchContact }: { id: string; fetchContact: (id: string) => Promise<{ name: string }> }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  // TODO: effect that fetches and ignores stale results

  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'error') return <p role="alert">Could not load: {state.message}</p>;
  return <h2>{state.name}</h2>;
}

export default function App() {
  const fake = (id: string) => new Promise<{ name: string }>((r) => setTimeout(() => r({ name: `Contact ${id}` }), 500));
  return <ContactName id="1" fetchContact={fake} />;
}
```

### solution
```tsx
import { useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'success'; name: string }
  | { status: 'error'; message: string };

export function ContactName({ id, fetchContact }: { id: string; fetchContact: (id: string) => Promise<{ name: string }> }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let ignore = false;
    setState({ status: 'loading' });
    fetchContact(id).then(
      (contact) => {
        if (!ignore) setState({ status: 'success', name: contact.name });
      },
      (err: unknown) => {
        if (!ignore) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [id, fetchContact]);

  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'error') return <p role="alert">Could not load: {state.message}</p>;
  return <h2>{state.name}</h2>;
}

export default function App() {
  const fake = (id: string) => new Promise<{ name: string }>((r) => setTimeout(() => r({ name: `Contact ${id}` }), 500));
  return <ContactName id="1" fetchContact={fake} />;
}
```

### tests
```tsx
// A controllable fake: each call returns a promise we resolve or reject by hand.
const controlled = () => {
  const pending = [];
  const fetchContact = fn((id) => new Promise((resolve, reject) => pending.push({ id, resolve, reject })));
  return { fetchContact, pending };
};

test('shows loading and then the name', async () => {
  const { fetchContact, pending } = controlled();
  const view = await render(<user.ContactName id="1" fetchContact={fetchContact} />);
  expect(view.$('p').textContent).toBe('Loading…');
  pending[0].resolve({ name: 'Ava Nguyen' });
  await flush();
  expect(view.$('h2').textContent).toBe('Ava Nguyen');
});

test('shows an alert on failure', async () => {
  const { fetchContact, pending } = controlled();
  const view = await render(<user.ContactName id="1" fetchContact={fetchContact} />);
  pending[0].reject(new Error('HTTP 500'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Could not load: HTTP 500');
});

test('changing id fetches again and shows loading', async () => {
  const { fetchContact, pending } = controlled();
  const view = await render(<user.ContactName id="1" fetchContact={fetchContact} />);
  pending[0].resolve({ name: 'First' });
  await flush();
  await view.rerender(<user.ContactName id="2" fetchContact={fetchContact} />);
  expect(view.$('p').textContent).toBe('Loading…');
  expect(fetchContact.calls.map((c) => c[0])).toEqual(['1', '2']);
  pending[1].resolve({ name: 'Second' });
  await flush();
  expect(view.$('h2').textContent).toBe('Second');
});

test('a stale response never overwrites a newer one', async () => {
  const { fetchContact, pending } = controlled();
  const view = await render(<user.ContactName id="1" fetchContact={fetchContact} />);
  await view.rerender(<user.ContactName id="2" fetchContact={fetchContact} />);
  pending[1].resolve({ name: 'Second (fast)' });
  await flush();
  pending[0].resolve({ name: 'First (slow)' });
  await flush();
  expect(view.$('h2').textContent).toBe('Second (fast)');
});

test('a stale failure is ignored too', async () => {
  const { fetchContact, pending } = controlled();
  const view = await render(<user.ContactName id="1" fetchContact={fetchContact} />);
  await view.rerender(<user.ContactName id="2" fetchContact={fetchContact} />);
  pending[1].resolve({ name: 'Second' });
  await flush();
  pending[0].reject(new Error('old failure'));
  await flush();
  expect(view.$('[role=alert]')).toBeNull();
  expect(view.$('h2').textContent).toBe('Second');
});
```

### typetests
```tsx
const ok = <ContactName id="1" fetchContact={async () => ({ name: 'x' })} />;
// @ts-expect-error fetchContact must return an object with a name
const bad = <ContactName id="1" fetchContact={async () => ({ title: 'x' })} />;
```

### explanation
This is the canonical effect-with-cleanup pattern. Each effect run owns a private `ignore` flag. When `id` changes (or the component unmounts), React runs the previous effect's cleanup, which sets *that run's* flag to `true`; its eventual response is discarded because it checks the flag before touching state. The state shape is a discriminated union from Day 4, which makes the three render branches impossible to mix up. Resetting to `loading` at the start of the effect is allowed here because we are synchronising with an external request.

### hints
- `let ignore = false;` inside the effect, `return () => { ignore = true; }`.
- Check `if (!ignore)` in both the success and failure handlers.
- Call `setState({ status: 'loading' })` at the start of the effect so a new id shows the loading state.
- Dependencies: `[id, fetchContact]`.
