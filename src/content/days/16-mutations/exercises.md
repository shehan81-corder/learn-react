# practice: Send JSON and map server errors

### meta
minutes: 8
language: ts

### prompt
Write and export `createContact(fetchFn, data)`, a typed API function.

- `POST` to `/api/contacts` with header `Content-Type: application/json` and the JSON body.
- On success (status `201`) return the created contact (the parsed JSON).
- If the server answers `400` with a JSON body containing a `fields` object, throw a `ValidationError` carrying those `fields` (message `Validation failed`).
- Any other non-2xx status throws a plain `Error` with message `Request failed (<status>)`.

Also export the `ValidationError` class (extends `Error`, with a `fields` property).

### starter
```ts
export interface NewContact {
  firstName: string;
  lastName: string;
  email: string;
}
export interface Contact extends NewContact {
  id: string;
}

export class ValidationError extends Error {
  // TODO: fields
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function createContact(fetchFn: FetchLike, data: NewContact): Promise<Contact> {
  // TODO
  return undefined as unknown as Contact;
}
```

### solution
```ts
export interface NewContact {
  firstName: string;
  lastName: string;
  email: string;
}
export interface Contact extends NewContact {
  id: string;
}

export class ValidationError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function createContact(fetchFn: FetchLike, data: NewContact): Promise<Contact> {
  const res = await fetchFn('/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (res.ok) return (await res.json()) as Contact;

  if (res.status === 400) {
    try {
      const body = await res.json();
      if (body && typeof body.fields === 'object' && body.fields !== null) throw new ValidationError(body.fields);
    } catch (err) {
      if (err instanceof ValidationError) throw err;
    }
  }
  throw new Error(`Request failed (${res.status})`);
}
```

### tests
```ts
const reply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status });
const data = { firstName: 'Ava', lastName: 'Nguyen', email: 'ava@example.com' };

test('sends a JSON POST request', async () => {
  const f = fn(async () => reply(201, { id: 'ct_1', ...data }));
  await user.createContact(f, data);
  const [url, init] = f.calls[0];
  expect(url).toBe('/api/contacts');
  expect(init.method).toBe('POST');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(init.body)).toEqual(data);
});

test('returns the created contact', async () => {
  const f = async () => reply(201, { id: 'ct_1', ...data });
  expect(await user.createContact(f, data)).toEqual({ id: 'ct_1', ...data });
});

test('maps a 400 with fields to a ValidationError', async () => {
  const f = async () => reply(400, { error: 'Validation failed', fields: { email: 'Email is not valid' } });
  let caught;
  try {
    await user.createContact(f, data);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(user.ValidationError);
  expect(caught).toBeInstanceOf(Error);
  expect(caught.fields).toEqual({ email: 'Email is not valid' });
  expect(caught.message).toBe('Validation failed');
});

test('a 400 without fields is a plain error', async () => {
  const f = async () => reply(400, { error: 'Bad request' });
  let caught;
  try {
    await user.createContact(f, data);
  } catch (e) {
    caught = e;
  }
  expect(caught).not.toBeInstanceOf(user.ValidationError);
  expect(caught.message).toBe('Request failed (400)');
});

test('other failures are plain errors', async () => {
  const f = async () => reply(500, { error: 'boom' });
  let caught;
  try {
    await user.createContact(f, data);
  } catch (e) {
    caught = e;
  }
  expect(caught.message).toBe('Request failed (500)');
});

test('a 400 with a non-JSON body does not crash', async () => {
  const f = async () => new Response('<html>nope</html>', { status: 400 });
  let caught;
  try {
    await user.createContact(f, data);
  } catch (e) {
    caught = e;
  }
  expect(caught.message).toBe('Request failed (400)');
});
```

### typetests
```ts
async function check() {
  const c = await createContact(async () => new Response('{}'), { firstName: 'a', lastName: 'b', email: 'c' });
  const id: string = c.id;
  // @ts-expect-error the body needs an email
  await createContact(async () => new Response('{}'), { firstName: 'a', lastName: 'b' });
}
const v = new ValidationError({ email: 'bad' });
const f: Record<string, string> = v.fields;
```

### explanation
A mutation function translates three outcomes: success returns the created record, a validation problem becomes a *typed* error carrying `fields` (so the form can show messages next to inputs), and everything else becomes a generic error. Because `ValidationError` is its own class, callers can use `instanceof` to decide how to react, and since it extends `Error` it still works with any general error handling. Parsing the error body is wrapped in `try/catch` because proxies and servers sometimes return HTML.

### hints
- `fetchFn('/api/contacts', { method: 'POST', headers: {...}, body: JSON.stringify(data) })`
- Check `res.ok` first, then `res.status === 400`.
- Re-throw your own `ValidationError` from inside the `try` so the `catch` does not swallow it.

# practice: A useMutation hook

### meta
minutes: 8
language: tsx

### prompt
Write `useMutation(fn)`. It returns `{ status, data, error, mutate, reset }` where `status` is `'idle' | 'pending' | 'success' | 'error'`.

- `mutate(args)` calls `fn(args)`, sets `pending`, then `success` (with `data`) or `error` (with `error`). It returns the promise's result and **rethrows** on failure so callers can react too.
- While `pending`, calling `mutate` again does **nothing** and resolves to `undefined` (no double submit).
- `reset()` returns to `idle` and clears `data` and `error`.

Then complete `SaveButton({ save })`: a button reading `Save` (idle), `Saving…` (pending, disabled), with `<p role="status">Saved</p>` on success and `<p role="alert">Failed: <message></p>` on error.

### starter
```tsx
import { useCallback, useRef, useState } from 'react';

export function useMutation<TArgs, TData>(fn: (args: TArgs) => Promise<TData>) {
  // TODO
  return {
    status: 'idle' as 'idle' | 'pending' | 'success' | 'error',
    data: undefined as TData | undefined,
    error: undefined as Error | undefined,
    mutate: async (_args: TArgs): Promise<TData | undefined> => undefined,
    reset: () => {},
  };
}

export function SaveButton({ save }: { save: () => Promise<string> }) {
  const m = useMutation(save);
  // TODO
  return <button>Save</button>;
}

export default SaveButton;
```

### solution
```tsx
import { useCallback, useRef, useState } from 'react';

type State<TData> = { status: 'idle' | 'pending' | 'success' | 'error'; data?: TData; error?: Error };

export function useMutation<TArgs, TData>(fn: (args: TArgs) => Promise<TData>) {
  const [state, setState] = useState<State<TData>>({ status: 'idle' });
  const pending = useRef(false);

  const mutate = useCallback(
    async (args: TArgs): Promise<TData | undefined> => {
      if (pending.current) return undefined;
      pending.current = true;
      setState({ status: 'pending' });
      try {
        const data = await fn(args);
        setState({ status: 'success', data });
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ status: 'error', error });
        throw error;
      } finally {
        pending.current = false;
      }
    },
    [fn],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { status: state.status, data: state.data, error: state.error, mutate, reset };
}

export function SaveButton({ save }: { save: () => Promise<string> }) {
  const m = useMutation(save);
  return (
    <div>
      <button
        disabled={m.status === 'pending'}
        onClick={() => {
          m.mutate(undefined as never).catch(() => {});
        }}
      >
        {m.status === 'pending' ? 'Saving…' : 'Save'}
      </button>
      {m.status === 'success' && <p role="status">Saved</p>}
      {m.status === 'error' && <p role="alert">Failed: {m.error?.message}</p>}
    </div>
  );
}

export default SaveButton;
```

### tests
```tsx
const controlled = () => {
  const calls = [];
  const save = fn(
    (args) =>
      new Promise((resolve, reject) => {
        calls.push({ args, resolve, reject });
      }),
  );
  return { save, calls };
};

test('the hook starts idle', async () => {
  let m;
  function Probe() {
    m = user.useMutation(async (x) => x);
    return null;
  }
  await render(<Probe />);
  expect(m.status).toBe('idle');
  expect(m.data).toBeUndefined();
  expect(m.error).toBeUndefined();
});

test('mutate goes pending then success and returns the data', async () => {
  const { save, calls } = controlled();
  let m;
  function Probe() {
    m = user.useMutation(save);
    return null;
  }
  await render(<Probe />);
  const promise = m.mutate({ a: 1 });
  await flush();
  expect(m.status).toBe('pending');
  expect(calls[0].args).toEqual({ a: 1 });
  calls[0].resolve('done');
  expect(await promise).toBe('done');
  await flush();
  expect(m.status).toBe('success');
  expect(m.data).toBe('done');
});

test('mutate rethrows and records the error', async () => {
  const { save, calls } = controlled();
  let m;
  function Probe() {
    m = user.useMutation(save);
    return null;
  }
  await render(<Probe />);
  const promise = m.mutate(1);
  calls[0].reject(new Error('nope'));
  let caught;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  expect(caught.message).toBe('nope');
  await flush();
  expect(m.status).toBe('error');
  expect(m.error.message).toBe('nope');
});

test('ignores a second call while pending', async () => {
  const { save, calls } = controlled();
  let m;
  function Probe() {
    m = user.useMutation(save);
    return null;
  }
  await render(<Probe />);
  const first = m.mutate(1);
  const second = await m.mutate(2);
  expect(second).toBeUndefined();
  expect(save).toHaveBeenCalledTimes(1);
  calls[0].resolve('ok');
  await first;
  await flush();
  m.mutate(3);
  expect(save).toHaveBeenCalledTimes(2);
});

test('reset returns to idle', async () => {
  const { save, calls } = controlled();
  let m;
  function Probe() {
    m = user.useMutation(save);
    return null;
  }
  await render(<Probe />);
  const p = m.mutate(1);
  calls[0].resolve('x');
  await p;
  await flush();
  expect(m.status).toBe('success');
  m.reset();
  await flush();
  expect(m.status).toBe('idle');
  expect(m.data).toBeUndefined();
});

test('SaveButton shows pending, success and error states', async () => {
  const { save, calls } = controlled();
  const view = await render(<user.SaveButton save={save} />);
  const button = () => view.$('button');
  expect(button().textContent).toBe('Save');
  await click(button());
  expect(button().textContent).toBe('Saving…');
  expect(button().disabled).toBe(true);
  calls[0].resolve('ok');
  await flush();
  expect(view.$('[role=status]').textContent).toBe('Saved');
  expect(button().disabled).toBe(false);
  await click(button());
  calls[1].reject(new Error('Server down'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Failed: Server down');
});
```

### typetests
```tsx
function Check() {
  const m = useMutation(async (n: number) => String(n));
  m.mutate(1);
  // @ts-expect-error the argument must be a number
  m.mutate('x');
  const s: 'idle' | 'pending' | 'success' | 'error' = m.status;
  return null;
}
```

### explanation
A mutation is triggered by the user, so it is an event-handler function (`mutate`), not an effect. The state machine gives the UI everything it needs. The double-submit guard uses a **ref** rather than state: a ref updates synchronously, so a second call in the same tick sees `pending.current === true` even before React re-renders, which state alone could not guarantee. `finally` resets the guard whether the call succeeded or failed. Rethrowing lets the caller do its own follow-up (close a dialog, navigate) while the hook still records the error for display.

### hints
- State: `{ status, data, error }`; plus `const pending = useRef(false)` for the synchronous guard.
- Use `try { ... } catch { ...; throw error } finally { pending.current = false }`.
- `useCallback` for `mutate` with `[fn]` and for `reset` with `[]`.

# practice: A safe delete button

### meta
minutes: 8
language: tsx

### prompt
Build `DeleteButton({ name, onDelete })` where `onDelete()` returns a promise.

1. Initially shows a **Delete** button.
2. Clicking it asks for confirmation: shows `<p>Delete <name>?</p>` with **Confirm** and **Cancel** buttons (the Delete button is gone).
3. **Cancel** returns to step 1 without calling `onDelete`.
4. **Confirm** calls `onDelete()` **once**; while pending shows `<p>Deleting…</p>` and both buttons are disabled.
5. If it resolves, show `<p role="status">Deleted</p>` (and no buttons).
6. If it rejects, return to the **Delete** button and show `<p role="alert">Could not delete <name>: <message></p>`.

### starter
```tsx
import { useState } from 'react';

type Step = 'idle' | 'confirming' | 'deleting' | 'deleted';

export function DeleteButton({ name, onDelete }: { name: string; onDelete: () => Promise<void> }) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  // TODO
  return <button>Delete</button>;
}

export default function App() {
  return <DeleteButton name="Ava" onDelete={() => new Promise((r) => setTimeout(r, 600))} />;
}
```

### solution
```tsx
import { useState } from 'react';

type Step = 'idle' | 'confirming' | 'deleting' | 'deleted';

export function DeleteButton({ name, onDelete }: { name: string; onDelete: () => Promise<void> }) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (step === 'deleting') return;
    setStep('deleting');
    setError(null);
    try {
      await onDelete();
      setStep('deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('idle');
    }
  };

  if (step === 'deleted') return <p role="status">Deleted</p>;

  return (
    <div>
      {error && <p role="alert">Could not delete {name}: {error}</p>}
      {step === 'idle' && <button onClick={() => setStep('confirming')}>Delete</button>}
      {(step === 'confirming' || step === 'deleting') && (
        <div>
          {step === 'deleting' ? <p>Deleting…</p> : <p>Delete {name}?</p>}
          <button onClick={confirm} disabled={step === 'deleting'}>
            Confirm
          </button>
          <button onClick={() => setStep('idle')} disabled={step === 'deleting'}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <DeleteButton name="Ava" onDelete={() => new Promise((r) => setTimeout(r, 600))} />;
}
```

### tests
```tsx
const controlled = () => {
  const calls = [];
  const onDelete = fn(() => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  return { onDelete, calls };
};
const btn = (view, name) => view.getByRole('button', { name });
const texts = (view) => view.$$('p').map((p) => p.textContent);

test('starts with just a Delete button', async () => {
  const { onDelete } = controlled();
  const view = await render(<user.DeleteButton name="Ava" onDelete={onDelete} />);
  expect(btn(view, 'Delete')).toBeTruthy();
  expect(texts(view)).toEqual([]);
});

test('asks for confirmation before doing anything', async () => {
  const { onDelete } = controlled();
  const view = await render(<user.DeleteButton name="Ava" onDelete={onDelete} />);
  await click(btn(view, 'Delete'));
  expect(texts(view)).toEqual(['Delete Ava?']);
  expect(view.$$('button').map((b) => b.textContent)).toEqual(['Confirm', 'Cancel']);
  expect(onDelete).not.toHaveBeenCalled();
});

test('Cancel goes back without deleting', async () => {
  const { onDelete } = controlled();
  const view = await render(<user.DeleteButton name="Ava" onDelete={onDelete} />);
  await click(btn(view, 'Delete'));
  await click(btn(view, 'Cancel'));
  expect(view.$$('button').map((b) => b.textContent)).toEqual(['Delete']);
  expect(onDelete).not.toHaveBeenCalled();
});

test('Confirm calls onDelete once and shows a pending state', async () => {
  const { onDelete } = controlled();
  const view = await render(<user.DeleteButton name="Ava" onDelete={onDelete} />);
  await click(btn(view, 'Delete'));
  await click(btn(view, 'Confirm'));
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(texts(view)).toEqual(['Deleting…']);
  expect(btn(view, 'Confirm').disabled).toBe(true);
  expect(btn(view, 'Cancel').disabled).toBe(true);
  await click(btn(view, 'Confirm'));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('shows Deleted on success', async () => {
  const { onDelete, calls } = controlled();
  const view = await render(<user.DeleteButton name="Ava" onDelete={onDelete} />);
  await click(btn(view, 'Delete'));
  await click(btn(view, 'Confirm'));
  calls[0].resolve();
  await flush();
  expect(view.$('[role=status]').textContent).toBe('Deleted');
  expect(view.$$('button')).toHaveLength(0);
});

test('returns to Delete with an error message on failure', async () => {
  const { onDelete, calls } = controlled();
  const view = await render(<user.DeleteButton name="Ava" onDelete={onDelete} />);
  await click(btn(view, 'Delete'));
  await click(btn(view, 'Confirm'));
  calls[0].reject(new Error('Server down'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Could not delete Ava: Server down');
  expect(view.$$('button').map((b) => b.textContent)).toEqual(['Delete']);
});
```

### typetests
```tsx
const ok = <DeleteButton name="A" onDelete={async () => {}} />;
// @ts-expect-error onDelete must return a promise
const bad = <DeleteButton name="A" onDelete={() => 1} />;
```

### explanation
The flow is a small state machine (`idle → confirming → deleting → deleted`) with a single error side-channel. Making the steps explicit means every combination of buttons and messages is one `step` value, instead of a tangle of booleans. Confirmation protects against accidents for a destructive action; the pending step blocks double submits (the buttons are disabled *and* the handler guards). On failure the component returns to a safe starting point and explains what happened, so the user can try again.

### hints
- State: `step` (union of strings) and `error`.
- The `confirm` handler: `setStep('deleting')`, `await onDelete()`, then `'deleted'`, or back to `'idle'` with an error in `catch`.
- Render different content for each `step`.

# challenge: Optimistic delete with rollback

### meta
minutes: 10
language: tsx

### prompt
Build `ContactManager({ initial, deleteContact })`. `deleteContact(id)` returns a promise.

- Renders a `<li>` for each contact with its name and a **Remove** button (accessible name `Remove <name>`).
- Clicking Remove removes the row **immediately** (optimistic) and calls `deleteContact(id)`.
- If the request **fails**, put that contact **back at its original position** and show `<p role="alert">Could not remove <name></p>`. Other contacts must not be affected by the rollback, even if several removals are in flight at once.
- Alerts accumulate (one per failed removal) and a **Dismiss** button next to each alert removes only that alert.
- A success needs no extra work (the row is already gone).

### starter
```tsx
import { useState } from 'react';

export interface Contact {
  id: string;
  name: string;
}

export function ContactManager({ initial, deleteContact }: { initial: Contact[]; deleteContact: (id: string) => Promise<void> }) {
  const [contacts, setContacts] = useState(initial);
  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
  // TODO
  return <ul />;
}

export default ContactManager;
```

### solution
```tsx
import { useState } from 'react';

export interface Contact {
  id: string;
  name: string;
}

export function ContactManager({ initial, deleteContact }: { initial: Contact[]; deleteContact: (id: string) => Promise<void> }) {
  const [contacts, setContacts] = useState(initial);
  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
  // The original order of every contact, so a failed removal can be put back exactly where it was.
  const [order] = useState(() => initial.map((c) => c.id));

  const remove = async (contact: Contact) => {
    setContacts((list) => list.filter((c) => c.id !== contact.id));
    try {
      await deleteContact(contact.id);
    } catch {
      setContacts((list) => {
        if (list.some((c) => c.id === contact.id)) return list;
        const next = [...list, contact];
        return next.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      });
      setAlerts((a) => [...a, { id: contact.id + ':' + a.length, message: `Could not remove ${contact.name}` }]);
    }
  };

  return (
    <div>
      {alerts.map((a) => (
        <p key={a.id} role="alert">
          {a.message} <button onClick={() => setAlerts((list) => list.filter((x) => x.id !== a.id))}>Dismiss</button>
        </p>
      ))}
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            <span>{c.name}</span>
            <button aria-label={`Remove ${c.name}`} onClick={() => remove(c)}>
              Remove
            </button>
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
const seed = () => [
  { id: 'a', name: 'Ava' },
  { id: 'b', name: 'Liam' },
  { id: 'c', name: 'Mia' },
];
const controlled = () => {
  const calls = [];
  const deleteContact = fn((id) => new Promise((resolve, reject) => calls.push({ id, resolve, reject })));
  return { deleteContact, calls };
};
const names = (view) => view.$$('li').map((li) => li.querySelector('span').textContent);
const alerts = (view) => view.$$('[role=alert]').map((a) => a.firstChild.textContent.trim());

test('renders the contacts', async () => {
  const { deleteContact } = controlled();
  const view = await render(<user.ContactManager initial={seed()} deleteContact={deleteContact} />);
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia']);
});

test('removes the row immediately, before the server answers', async () => {
  const { deleteContact, calls } = controlled();
  const view = await render(<user.ContactManager initial={seed()} deleteContact={deleteContact} />);
  await click(view.getByRole('button', { name: 'Remove Liam' }));
  expect(names(view)).toEqual(['Ava', 'Mia']);
  expect(deleteContact).toHaveBeenCalledWith('b');
  calls[0].resolve();
  await flush();
  expect(names(view)).toEqual(['Ava', 'Mia']);
  expect(alerts(view)).toEqual([]);
});

test('a failure restores the contact at its original position', async () => {
  const { deleteContact, calls } = controlled();
  const view = await render(<user.ContactManager initial={seed()} deleteContact={deleteContact} />);
  await click(view.getByRole('button', { name: 'Remove Liam' }));
  calls[0].reject(new Error('500'));
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia']);
  expect(alerts(view)).toEqual(['Could not remove Liam']);
});

test('rollback affects only the failed contact when several are in flight', async () => {
  const { deleteContact, calls } = controlled();
  const view = await render(<user.ContactManager initial={seed()} deleteContact={deleteContact} />);
  await click(view.getByRole('button', { name: 'Remove Ava' }));
  await click(view.getByRole('button', { name: 'Remove Mia' }));
  expect(names(view)).toEqual(['Liam']);
  calls[1].reject(new Error('fail Mia'));
  await flush();
  expect(names(view)).toEqual(['Liam', 'Mia']);
  calls[0].resolve();
  await flush();
  expect(names(view)).toEqual(['Liam', 'Mia']);
});

test('the first removal failing does not resurrect the second', async () => {
  const { deleteContact, calls } = controlled();
  const view = await render(<user.ContactManager initial={seed()} deleteContact={deleteContact} />);
  await click(view.getByRole('button', { name: 'Remove Ava' }));
  await click(view.getByRole('button', { name: 'Remove Mia' }));
  calls[0].reject(new Error('fail Ava'));
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam']);
  calls[1].resolve();
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam']);
});

test('alerts accumulate and can be dismissed individually', async () => {
  const { deleteContact, calls } = controlled();
  const view = await render(<user.ContactManager initial={seed()} deleteContact={deleteContact} />);
  await click(view.getByRole('button', { name: 'Remove Ava' }));
  await click(view.getByRole('button', { name: 'Remove Liam' }));
  calls[0].reject(new Error('x'));
  calls[1].reject(new Error('y'));
  await flush();
  expect(alerts(view)).toEqual(['Could not remove Ava', 'Could not remove Liam']);
  await click(view.$$('[role=alert] button')[0]);
  expect(alerts(view)).toEqual(['Could not remove Liam']);
});
```

### typetests
```tsx
const ok = <ContactManager initial={[{ id: '1', name: 'A' }]} deleteContact={async () => {}} />;
// @ts-expect-error contacts need names
const bad = <ContactManager initial={[{ id: '1' }]} deleteContact={async () => {}} />;
```

### explanation
The naive rollback, `setContacts(previousSnapshot)`, is wrong as soon as two removals overlap: restoring an old snapshot would also bring back contacts whose deletion is still in flight or has succeeded. Using functional updates and re-inserting **only the failed item** avoids that. To restore the exact position, remember each contact's original order (a snapshot of the ids taken at the start) and sort by it after re-inserting. The optimistic removal makes the interface feel instant; the alert explains any rollback so the user is never left wondering why a row reappeared.

### hints
- Remove first with a functional update: `setContacts((list) => list.filter(...))`.
- On failure re-add only that contact, using a functional update that guards against duplicates.
- Keep an array of the original ids so you can sort the restored list back into its original order.
- Give each alert its own id so Dismiss can remove one.
