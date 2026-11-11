# practice: A safe fetch wrapper

### meta
minutes: 7
language: ts

### prompt
Write and export `fetchJson(fetchFn, url, init?)`, a wrapper around a fetch-like function (injected so it can be tested).

- Call `fetchFn(url, init)`.
- If `res.ok` is false, throw an `HttpError` whose `status` is the response status and whose `message` is the `error` field of the JSON body when it has one, otherwise `Request failed (<status>)`. A body that is not JSON must not hide the real problem.
- A `204` response resolves to `undefined` without reading the body.
- Otherwise resolve to the parsed JSON.

Also export the `HttpError` class (extends `Error`, with a numeric `status`).

### starter
```ts
export class HttpError extends Error {
  // TODO: status property
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchJson<T>(fetchFn: FetchLike, url: string, init?: RequestInit): Promise<T> {
  // TODO
  return undefined as T;
}
```

### solution
```ts
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchJson<T>(fetchFn: FetchLike, url: string, init?: RequestInit): Promise<T> {
  const res = await fetchFn(url, init);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // the body was not JSON; keep the generic message
    }
    throw new HttpError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

### tests
```ts
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status });

test('returns parsed JSON on success', async () => {
  const f = fn(async () => json(200, { id: 1, name: 'Ava' }));
  expect(await user.fetchJson(f, '/api/contacts/1')).toEqual({ id: 1, name: 'Ava' });
  expect(f).toHaveBeenCalledWith('/api/contacts/1', undefined);
});

test('passes the init options through', async () => {
  const f = fn(async () => json(201, { ok: true }));
  const init = { method: 'POST', body: '{}' };
  await user.fetchJson(f, '/x', init);
  expect(f.calls[0][1]).toBe(init);
});

test('throws an HttpError with the server message for non-2xx responses', async () => {
  const f = async () => json(400, { error: 'Validation failed', fields: { email: 'bad' } });
  let caught;
  try {
    await user.fetchJson(f, '/x');
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(user.HttpError);
  expect(caught).toBeInstanceOf(Error);
  expect(caught.status).toBe(400);
  expect(caught.message).toBe('Validation failed');
});

test('falls back to a generic message when the error body is not JSON', async () => {
  const f = async () => new Response('<html>Bad gateway</html>', { status: 502 });
  let caught;
  try {
    await user.fetchJson(f, '/x');
  } catch (e) {
    caught = e;
  }
  expect(caught.status).toBe(502);
  expect(caught.message).toBe('Request failed (502)');
});

test('404 is an error even though fetch itself did not reject', async () => {
  const f = async () => json(404, { error: "Contact 'x' not found" });
  let caught;
  try {
    await user.fetchJson(f, '/x');
  } catch (e) {
    caught = e;
  }
  expect(caught.status).toBe(404);
});

test('204 resolves to undefined', async () => {
  const f = async () => new Response(null, { status: 204 });
  expect(await user.fetchJson(f, '/x')).toBeUndefined();
});

test('network failures propagate unchanged', async () => {
  const f = async () => {
    throw new TypeError('Failed to fetch');
  };
  let caught;
  try {
    await user.fetchJson(f, '/x');
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(TypeError);
});
```

### typetests
```ts
async function check() {
  const c = await fetchJson<{ id: number }>(async () => new Response('{}'), '/x');
  const id: number = c.id;
}
const err = new HttpError(404, 'nope');
const status: number = err.status;
```

### explanation
This function embodies the three facts of the lesson: `fetch` does not reject on HTTP errors, so check `res.ok`; error bodies may or may not be JSON, so parse defensively; and `204 No Content` has no body to read. Making the fetch function a parameter is what lets the tests run without a network. In your app you pass the real `fetch`. A dedicated `HttpError` class lets callers branch on `error.status` (for example, redirect to login on `401`).

### hints
- `if (!res.ok) { ... throw new HttpError(res.status, message) }`
- Wrap `await res.json()` for the error body in `try/catch`.
- `if (res.status === 204) return undefined as T;`

# practice: A useFetch hook

### meta
minutes: 8
language: tsx

### prompt
Write `useFetch<T>(fetcher, deps)` where `fetcher(signal)` returns a promise. It returns:

```ts
{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }
```

- Starts as `loading`. Runs `fetcher` in an effect with a fresh `AbortController`.
- When `deps` change it goes back to `loading` and fetches again; the previous request is **aborted** and its result **ignored**.
- An abort is not an error: it must not produce an `error` state.
- Unmounting aborts the request.

Then complete `UserName({ id, load })`, which shows `Loading…`, the name in an `<h2>`, or `<p role="alert">Error: <message></p>`.

### starter
```tsx
import { useEffect, useState } from 'react';

export type AsyncState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error };

export function useFetch<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  // TODO
  return { status: 'loading' };
}

export function UserName({ id, load }: { id: string; load: (id: string, signal: AbortSignal) => Promise<{ name: string }> }) {
  // TODO: useFetch((signal) => load(id, signal), [id])
  return <p>Loading…</p>;
}

export default UserName;
```

### solution
```tsx
import { useEffect, useState } from 'react';

export type AsyncState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error };

export function useFetch<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (err: unknown) => {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      },
    );

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export function UserName({ id, load }: { id: string; load: (id: string, signal: AbortSignal) => Promise<{ name: string }> }) {
  const state = useFetch((signal) => load(id, signal), [id]);
  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'error') return <p role="alert">Error: {state.error.message}</p>;
  return <h2>{state.data.name}</h2>;
}

export default UserName;
```

### tests
```tsx
const controlled = () => {
  const calls = [];
  const load = fn(
    (id, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ id, signal, resolve, reject });
      }),
  );
  return { load, calls };
};

test('goes from loading to success', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.UserName id="1" load={load} />);
  expect(view.$('p').textContent).toBe('Loading…');
  calls[0].resolve({ name: 'Ava' });
  await flush();
  expect(view.$('h2').textContent).toBe('Ava');
});

test('reports errors', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.UserName id="1" load={load} />);
  calls[0].reject(new Error('HTTP 500'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Error: HTTP 500');
});

test('refetches when the dependency changes and aborts the old request', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.UserName id="1" load={load} />);
  await view.rerender(<user.UserName id="2" load={load} />);
  expect(calls).toHaveLength(2);
  expect(calls[0].signal.aborted).toBe(true);
  expect(calls[1].signal.aborted).toBe(false);
  expect(view.$('p').textContent).toBe('Loading…');
});

test('ignores a stale response that arrives late', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.UserName id="1" load={load} />);
  await view.rerender(<user.UserName id="2" load={load} />);
  calls[1].resolve({ name: 'Second' });
  await flush();
  calls[0].resolve({ name: 'First (stale)' });
  await flush();
  expect(view.$('h2').textContent).toBe('Second');
});

test('an abort is not reported as an error', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.UserName id="1" load={load} />);
  await view.rerender(<user.UserName id="2" load={load} />);
  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';
  calls[0].reject(abortError);
  await flush();
  expect(view.$('[role=alert]')).toBeNull();
  expect(view.$('p').textContent).toBe('Loading…');
});

test('unmounting aborts the request', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.UserName id="1" load={load} />);
  view.unmount();
  await flush();
  expect(calls[0].signal.aborted).toBe(true);
});
```

### typetests
```tsx
function Check() {
  const s = useFetch(async () => ({ n: 1 }), []);
  if (s.status === 'success') {
    const n: number = s.data.n;
  }
  if (s.status === 'error') {
    const m: string = s.error.message;
  }
  // @ts-expect-error data only exists on success
  s.data;
  return null;
}
```

### explanation
`AbortController` gives each request a cancellation handle. The effect creates one per run, and its cleanup aborts it, which covers dependency changes and unmounting alike. Two safeguards make the hook race-proof: aborting a request frees the network, and the `signal.aborted` check ensures a response that still arrives is discarded. Because an abort rejects the promise, it must be filtered out so that cancelling never looks like a failure. The discriminated union means `data` only exists in the `success` branch, enforced by the compiler.

### hints
- `const controller = new AbortController(); fetcher(controller.signal)...`
- `return () => controller.abort();`
- In `.then` and the rejection handler check `controller.signal.aborted` before setting state.
- Use the `deps` array as the effect's dependency list.

# practice: Four states in a list

### meta
minutes: 8
language: tsx

### prompt
Build `ContactList({ load })`. `load()` returns a promise of an array of `{ id, name }`.

Render exactly one of:

- Loading: `<p>Loading contacts…</p>`
- Error: `<p role="alert">Could not load contacts: <message></p>` and a **Retry** button that loads again (and shows the loading state while it does)
- Empty (success with no items): `<p>No contacts yet.</p>`
- Success: a `<ul>` with an `<li>` per contact

Ignore results from a previous attempt (a retry must not be overwritten by an older response), and do nothing after unmount.

### starter
```tsx
import { useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: { id: string; name: string }[] };

export function ContactList({ load }: { load: () => Promise<{ id: string; name: string }[]> }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  // TODO: attempt counter, effect with ignore flag, retry
  return <p>Loading contacts…</p>;
}

export default ContactList;
```

### solution
```tsx
import { useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: { id: string; name: string }[] };

export function ContactList({ load }: { load: () => Promise<{ id: string; name: string }[]> }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState({ status: 'loading' });
    load().then(
      (items) => {
        if (!ignore) setState({ status: 'success', items });
      },
      (err: unknown) => {
        if (!ignore) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  if (state.status === 'loading') return <p>Loading contacts…</p>;
  if (state.status === 'error') {
    return (
      <div>
        <p role="alert">Could not load contacts: {state.message}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </div>
    );
  }
  if (state.items.length === 0) return <p>No contacts yet.</p>;
  return (
    <ul>
      {state.items.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}

export default ContactList;
```

### tests
```tsx
const controlled = () => {
  const calls = [];
  const load = fn(() => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  return { load, calls };
};

test('shows loading first', async () => {
  const { load } = controlled();
  const view = await render(<user.ContactList load={load} />);
  expect(view.$('p').textContent).toBe('Loading contacts…');
  expect(load).toHaveBeenCalledTimes(1);
});

test('renders the list on success', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.ContactList load={load} />);
  calls[0].resolve([{ id: '1', name: 'Ava' }, { id: '2', name: 'Liam' }]);
  await flush();
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['Ava', 'Liam']);
});

test('renders an empty state', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.ContactList load={load} />);
  calls[0].resolve([]);
  await flush();
  expect(view.$('p').textContent).toBe('No contacts yet.');
  expect(view.$('ul')).toBeNull();
});

test('renders an error with a retry button', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.ContactList load={load} />);
  calls[0].reject(new Error('HTTP 503'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Could not load contacts: HTTP 503');
  expect(view.getByRole('button', { name: 'Retry' })).toBeTruthy();
});

test('retry shows loading again and then the new result', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.ContactList load={load} />);
  calls[0].reject(new Error('boom'));
  await flush();
  await click(view.getByRole('button', { name: 'Retry' }));
  expect(view.$('p').textContent).toBe('Loading contacts…');
  expect(load).toHaveBeenCalledTimes(2);
  calls[1].resolve([{ id: '1', name: 'Ava' }]);
  await flush();
  expect(view.$$('li')).toHaveLength(1);
  expect(view.$('[role=alert]')).toBeNull();
});

test('an older response cannot overwrite a newer retry', async () => {
  const { load, calls } = controlled();
  const view = await render(<user.ContactList load={load} />);
  calls[0].reject(new Error('first failed'));
  await flush();
  await click(view.getByRole('button', { name: 'Retry' }));
  calls[1].resolve([{ id: '1', name: 'Fresh' }]);
  await flush();
  expect(view.$('li').textContent).toBe('Fresh');
});
```

### typetests
```tsx
const ok = <ContactList load={async () => [{ id: '1', name: 'A' }]} />;
// @ts-expect-error load must return objects with id and name
const bad = <ContactList load={async () => [{ title: 'A' }]} />;
```

### explanation
One discriminated-union state means exactly one branch renders: loading, error, empty or success. The *empty* case is deliberately separate from success because the right message to show is different. The retry button uses the counter-in-dependencies trick: bumping `attempt` re-runs the effect, whose cleanup first marks the previous run as stale via `ignore`. Resetting to `loading` at the start of each run gives the user immediate feedback after pressing Retry.

### hints
- A union state with `loading`, `error`, `success`.
- `const [attempt, setAttempt] = useState(0)` in the dependency list; Retry does `setAttempt((n) => n + 1)`.
- `let ignore = false;` and set it to `true` in the cleanup.
- Check `items.length === 0` before rendering the `<ul>`.

# challenge: Server-side pagination

### meta
minutes: 10
language: tsx

### prompt
Build `PagedContacts({ fetchPage })`. `fetchPage(page, signal)` returns `{ data: { id, name }[], page, totalPages }`.

- Shows `Loading…` while a page loads, then the names in a `<ul>`, `<span>Page N of M</span>`, and **Previous** / **Next** buttons.
- Buttons are disabled at the ends **and while loading**.
- Clicking **Next** / **Previous** fetches that page; the previous request is **aborted** if you navigate again before it returns.
- While a new page loads, keep showing the **previous page's items** (no blank flash) and show a `<small>Updating…</small>`. The very first load shows `Loading…` because there is nothing to keep.
- A failure shows `<p role="alert">Failed to load page: <message></p>` and keeps the buttons usable.

### starter
```tsx
import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  name: string;
}
interface PageResult {
  data: Contact[];
  page: number;
  totalPages: number;
}

export function PagedContacts({ fetchPage }: { fetchPage: (page: number, signal: AbortSignal) => Promise<PageResult> }) {
  // TODO
  return <p>Loading…</p>;
}

export default PagedContacts;
```

### solution
```tsx
import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  name: string;
}
interface PageResult {
  data: Contact[];
  page: number;
  totalPages: number;
}

export function PagedContacts({ fetchPage }: { fetchPage: (page: number, signal: AbortSignal) => Promise<PageResult> }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchPage(page, controller.signal).then(
      (r) => {
        if (controller.signal.aborted) return;
        setResult(r);
        setLoading(false);
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [page, fetchPage]);

  if (!result && loading) return <p>Loading…</p>;

  const totalPages = result?.totalPages ?? 1;
  return (
    <div>
      {error && <p role="alert">Failed to load page: {error}</p>}
      {result && (
        <ul>
          {result.data.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      )}
      {loading && <small>Updating…</small>}
      <button onClick={() => setPage((p) => p - 1)} disabled={loading || page <= 1}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button onClick={() => setPage((p) => p + 1)} disabled={loading || page >= totalPages}>
        Next
      </button>
    </div>
  );
}

export default PagedContacts;
```

### tests
```tsx
const make = () => {
  const calls = [];
  const fetchPage = fn(
    (page, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ page, signal, resolve, reject });
      }),
  );
  return { fetchPage, calls };
};
const names = (view) => view.$$('li').map((li) => li.textContent);
const next = (view) => view.getByRole('button', { name: 'Next' });
const prev = (view) => view.getByRole('button', { name: 'Previous' });
const pageResult = (page, names) => ({ page, totalPages: 3, data: names.map((n, i) => ({ id: page + '-' + i, name: n })) });

test('the first load shows Loading… with nothing to keep', async () => {
  const { fetchPage } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  expect(view.$('p').textContent).toBe('Loading…');
  expect(fetchPage.calls[0][0]).toBe(1);
});

test('renders the first page and its controls', async () => {
  const { fetchPage, calls } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  calls[0].resolve(pageResult(1, ['Ava', 'Liam']));
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam']);
  expect(view.$('span').textContent).toBe('Page 1 of 3');
  expect(prev(view).disabled).toBe(true);
  expect(next(view).disabled).toBe(false);
});

test('keeps the previous items visible while the next page loads', async () => {
  const { fetchPage, calls } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  calls[0].resolve(pageResult(1, ['Ava']));
  await flush();
  await click(next(view));
  expect(calls[1].page).toBe(2);
  expect(names(view)).toEqual(['Ava']);
  expect(view.$('small').textContent).toBe('Updating…');
  expect(next(view).disabled).toBe(true);
  expect(prev(view).disabled).toBe(true);
  calls[1].resolve(pageResult(2, ['Mia']));
  await flush();
  expect(names(view)).toEqual(['Mia']);
  expect(view.$('small')).toBeNull();
  expect(view.$('span').textContent).toBe('Page 2 of 3');
});

test('can go back to the previous page', async () => {
  const { fetchPage, calls } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  calls[0].resolve(pageResult(1, ['Ava']));
  await flush();
  await click(next(view));
  calls[1].resolve(pageResult(2, ['Mia']));
  await flush();
  await click(prev(view));
  expect(calls[2].page).toBe(1);
  calls[2].resolve(pageResult(1, ['Ava']));
  await flush();
  expect(view.$('span').textContent).toBe('Page 1 of 3');
});

test('disables Next on the last page', async () => {
  const { fetchPage, calls } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  calls[0].resolve({ page: 1, totalPages: 1, data: [{ id: 'x', name: 'Only' }] });
  await flush();
  expect(next(view).disabled).toBe(true);
});

test('shows an error but keeps the controls usable', async () => {
  const { fetchPage, calls } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  calls[0].resolve(pageResult(1, ['Ava']));
  await flush();
  await click(next(view));
  calls[1].reject(new Error('HTTP 500'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Failed to load page: HTTP 500');
  expect(prev(view).disabled).toBe(false);
});

test('unmounting aborts the request in flight', async () => {
  const { fetchPage, calls } = make();
  const view = await render(<user.PagedContacts fetchPage={fetchPage} />);
  view.unmount();
  await flush();
  expect(calls[0].signal.aborted).toBe(true);
});
```

### typetests
```tsx
const ok = <PagedContacts fetchPage={async (page, signal) => ({ data: [], page, totalPages: 1 })} />;
// @ts-expect-error the page result needs totalPages
const bad = <PagedContacts fetchPage={async (page) => ({ data: [], page })} />;
```

### explanation
Server-side pagination changes *where* the slice happens, but the UI state is still just the current `page`. Keeping the last successful `result` while a new request is in flight avoids the table flashing empty, a detail users notice. Separating `result`, `loading` and `error` into three values is justified here because they can legitimately overlap (old data plus a loading flag, or old data plus an error), which a single exclusive union cannot express. The abort in the cleanup handles both rapid navigation and unmount, and the `signal.aborted` checks stop a stale response from changing state.

### hints
- State: `page`, `result` (last good page or `null`), `loading`, `error`.
- Show `Loading…` only when there is no `result` yet.
- Disable buttons while `loading`.
- `return () => controller.abort();` and check `controller.signal.aborted` in both handlers.
