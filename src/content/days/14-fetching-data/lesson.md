## Your CRM meets a server

Until now the data lived inside your app. Real CRMs load it from an API. This changes the nature of the problem: network calls are **slow, can fail, can return stale or surprising data, and happen outside React's control**. Every screen that fetches must answer four questions: what do we show while loading, on success, on failure, and when there is nothing?

This course ships a mock **Nimbus CRM API** for you to practise against. Open **Mock CRM API docs** in the sidebar and try a few requests. Add `?delay=1500` or `?fail=0.3` to simulate a slow or flaky network.

> **The thinking pattern:** every request is a tiny state machine: `idle → loading → success | error`. Model it explicitly (a discriminated union from Day 4) and the UI becomes a `switch`. Never model it as three loose booleans (`isLoading`, `error`, `data`) that can disagree.

## `fetch` essentials

```ts
async function getContacts(): Promise<Page<Contact>> {
  const res = await fetch('https://your-site.vercel.app/api/contacts?pageSize=10');
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);   // fetch does NOT throw on 404/500!
  return res.json();
}
```

Three facts that trip everyone up:

1. **`fetch` only rejects on network failure** (offline, DNS, CORS). A `404` or `500` resolves normally, so **check `res.ok`** yourself.
2. `res.json()` is async and can throw if the body is not JSON.
3. The result of `res.json()` is `any`. TypeScript cannot know what the server sent. You are *asserting* a type, so validate at the boundary when it matters.

A small wrapper centralises these rules:

```ts
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* body was not JSON */ }
    throw new HttpError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
```

## The data-fetching state machine

```ts
type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

A component using it:

```tsx
function ContactsList() {
  const [state, setState] = useState<AsyncState<Contact[]>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetchJson<Page<Contact>>('/api/contacts', { signal: controller.signal })
      .then((page) => setState({ status: 'success', data: page.data }))
      .catch((error) => {
        if (error.name === 'AbortError') return;          // we cancelled it ourselves, ignore
        setState({ status: 'error', error });
      });

    return () => controller.abort();                      // cancel when unmounting or re-running
  }, []);

  switch (state.status) {
    case 'loading': return <p>Loading…</p>;
    case 'error':   return <p role="alert">Could not load contacts: {state.error.message}</p>;
    case 'success': return state.data.length === 0 ? <p>No contacts yet.</p> : <List items={state.data} />;
  }
}
```

Notice three things: the empty list is a *fourth state* handled separately from success; `AbortController` cancels in-flight requests (a cleaner cousin of Day 8's `ignore` flag, which also frees the network); and AbortError must be swallowed because cancelling is not a failure.

## Race conditions

If the user types fast, request 1 may return *after* request 2. Without protection the older, slower response overwrites the newer one and the UI shows the wrong data. The fix is the cleanup you already know: each effect run owns a controller (or an `ignore` flag), and the cleanup aborts it. The component only ever reacts to the *latest* request.

## Loading, error and empty states are features

Design them on purpose:

- **Loading:** skeleton rows or a spinner; keep layout stable so the page doesn't jump. For refetches, keep showing old data with a subtle "Updating…" instead of blanking the screen.
- **Error:** say what failed and offer a **Retry** button. Distinguish "offline" from "server error" when you can.
- **Empty:** "No contacts yet. Add your first one" is a call to action, not a failure.

## Retry and a reload trigger

A retry button needs a way to re-run the effect. The idiomatic trick is a counter in the dependency array:

```tsx
const [attempt, setAttempt] = useState(0);
useEffect(() => { /* fetch */ }, [attempt]);
// <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
```

## Typing responses and validating the boundary

`res.json() as Page<Contact>` is a promise to the compiler, not a check. If the API changes shape, TypeScript will not notice. Options, from light to heavy: trust it (fine for APIs you control), write a small type guard (`isContact(x): x is Contact`), or validate with a schema library such as **Zod** (`ContactSchema.parse(json)`), which also infers the TypeScript type for you. At minimum keep the types in **one** file (`src/types.ts`) so a change is made once.

## Walkthrough: load contacts from the mock API

1. Add `VITE_API_URL` to `.env` (the base of your deployed site, or `http://localhost:5173` when using the dev server's built-in API). Read it with `import.meta.env.VITE_API_URL`.
2. Write `src/api/client.ts` with `fetchJson` and `HttpError`.
3. Write `src/api/contacts.ts`: `listContacts({ page, pageSize, search, status, signal })` that builds a query string with `URLSearchParams` and returns `Page<Contact>`.
4. In the page, hold `AsyncState<Page<Contact>>`; effect depends on the page, search and status.
5. Render the four states. Add Retry. Test with `?delay=2000` and `?fail=1` by temporarily appending them to the URL in `listContacts`.

Because the server now does the filtering, sorting and paging, the *client-side* pipeline from Day 11 becomes **query parameters** plus rendering what comes back. The UI state (page, search, status) is unchanged; only where the work happens moves.

## CRM step: connect to the API

1. Create `.env` with `VITE_API_URL=https://<your-deployed-site>` (or the URL of this platform if you are following along before deploying yours) and `src/api/client.ts` as above.
2. Add `src/api/contacts.ts` and replace the `sampleContacts` import in `ContactsPage` with real data via a `useEffect` + `AsyncState`.
3. Debounced search (Day 11) now sends `?search=` to the server. Pass the `AbortController` signal so stale requests are cancelled.
4. Render loading skeleton rows, an error banner with Retry, and an empty state.
5. Show the total from `page.total` and drive pagination from `totalPages`.

- [ ] `fetchJson` checks `res.ok` and throws a typed `HttpError`
- [ ] The page renders loading, error (with Retry), empty and success
- [ ] Changing the search cancels the previous request
- [ ] Pagination uses the server's `total` and `totalPages`
