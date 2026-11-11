# practice: Your first query

### meta
minutes: 7
language: tsx

### prompt
Build `ContactsList({ fetchContacts })` with `useQuery` from `@tanstack/react-query`.

- Query key `['contacts']`, query function `fetchContacts`.
- While there is no data yet: `<p>Loading…</p>`.
- On error: `<p role="alert">Error: <message></p>`.
- On success with an empty array: `<p>No contacts</p>`; otherwise a `<ul>` with one `<li>` per contact name.

The tests provide the `QueryClientProvider`, so you only write the component.

### starter
```tsx
import { useQuery } from '@tanstack/react-query';

export interface Contact {
  id: string;
  name: string;
}

export function ContactsList({ fetchContacts }: { fetchContacts: () => Promise<Contact[]> }) {
  // TODO: useQuery({ queryKey, queryFn })
  return <p>Loading…</p>;
}

export default ContactsList;
```

### solution
```tsx
import { useQuery } from '@tanstack/react-query';

export interface Contact {
  id: string;
  name: string;
}

export function ContactsList({ fetchContacts }: { fetchContacts: () => Promise<Contact[]> }) {
  const { data, status, error } = useQuery({
    queryKey: ['contacts'],
    queryFn: fetchContacts,
  });

  if (status === 'pending') return <p>Loading…</p>;
  if (status === 'error') return <p role="alert">Error: {error.message}</p>;
  if (data.length === 0) return <p>No contacts</p>;
  return (
    <ul>
      {data.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}

export default ContactsList;
```

### tests
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const setup = async (ui) => {
  useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { view, client };
};
const controlled = () => {
  const calls = [];
  const fetchContacts = fn(() => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  return { fetchContacts, calls };
};

test('shows loading, then the contacts', async () => {
  const { fetchContacts, calls } = controlled();
  const { view } = await setup(<user.ContactsList fetchContacts={fetchContacts} />);
  expect(view.$('p').textContent).toBe('Loading…');
  calls[0].resolve([{ id: '1', name: 'Ava' }, { id: '2', name: 'Liam' }]);
  await flush();
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['Ava', 'Liam']);
});

test('shows an error message', async () => {
  const { fetchContacts, calls } = controlled();
  const { view } = await setup(<user.ContactsList fetchContacts={fetchContacts} />);
  calls[0].reject(new Error('HTTP 503'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Error: HTTP 503');
});

test('shows an empty state', async () => {
  const { fetchContacts, calls } = controlled();
  const { view } = await setup(<user.ContactsList fetchContacts={fetchContacts} />);
  calls[0].resolve([]);
  await flush();
  expect(view.$('p').textContent).toBe('No contacts');
  expect(view.$('ul')).toBeNull();
});

test('is stored in the cache under the key ["contacts"]', async () => {
  const { fetchContacts, calls } = controlled();
  const { client } = await setup(<user.ContactsList fetchContacts={fetchContacts} />);
  calls[0].resolve([{ id: '1', name: 'Ava' }]);
  await flush();
  expect(client.getQueryData(['contacts'])).toEqual([{ id: '1', name: 'Ava' }]);
});

test('two components with the same key share one request', async () => {
  const { fetchContacts, calls } = controlled();
  const { view } = await setup(
    <div>
      <user.ContactsList fetchContacts={fetchContacts} />
      <user.ContactsList fetchContacts={fetchContacts} />
    </div>,
  );
  calls[0].resolve([{ id: '1', name: 'Ava' }]);
  await flush();
  expect(fetchContacts).toHaveBeenCalledTimes(1);
  expect(view.$$('ul')).toHaveLength(2);
});
```

### explanation
`useQuery` replaces the whole loading/error/success state machine you wrote on Day 14. In TanStack Query v5 the status is `'pending'` (no data yet), `'error'` or `'success'`, and inside the `success` branch `data` is defined. The query **key** identifies the cached data, and the final test shows the payoff: two components with the same key trigger **one** request and share the result.

### hints
- `const { data, status, error } = useQuery({ queryKey: ['contacts'], queryFn: fetchContacts });`
- The first status is `'pending'`, not `'loading'`.
- Check `data.length === 0` before rendering the list.

# practice: Keys and staleTime

### meta
minutes: 8
language: tsx

### prompt
Build `ContactDetail({ id, fetchContact })`.

- Query key `['contact', id]`; the query function calls `fetchContact(id)`.
- `<p>Loading…</p>` while there is nothing to show for this id, then `<h2>{name}</h2>`.
- Set `staleTime` to **60 seconds**, so going back to a contact you have just seen shows it instantly and does **not** call `fetchContact` again.
- When data is already visible but a background refetch is running, show `<small>Refreshing…</small>` (use `isFetching`).

### starter
```tsx
import { useQuery } from '@tanstack/react-query';

export function ContactDetail({ id, fetchContact }: { id: string; fetchContact: (id: string) => Promise<{ name: string }> }) {
  // TODO
  return <p>Loading…</p>;
}

export default ContactDetail;
```

### solution
```tsx
import { useQuery } from '@tanstack/react-query';

export function ContactDetail({ id, fetchContact }: { id: string; fetchContact: (id: string) => Promise<{ name: string }> }) {
  const { data, status, isFetching } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => fetchContact(id),
    staleTime: 60_000,
  });

  if (status === 'pending') return <p>Loading…</p>;
  if (status === 'error') return <p role="alert">Could not load contact</p>;
  return (
    <div>
      <h2>{data.name}</h2>
      {isFetching && <small>Refreshing…</small>}
    </div>
  );
}

export default ContactDetail;
```

### tests
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const names = { 1: 'Ava', 2: 'Liam' };
const make = () => {
  const calls = [];
  const fetchContact = fn((id) => new Promise((resolve) => calls.push({ id, resolve: () => resolve({ name: names[id] }) })));
  return { fetchContact, calls };
};
const mount = async (id, fetchContact, client) => {
  const ui = (i) => (
    <QueryClientProvider client={client}>
      <user.ContactDetail id={i} fetchContact={fetchContact} />
    </QueryClientProvider>
  );
  const view = await render(ui(id));
  return { view, show: (i) => view.rerender(ui(i)) };
};

test('loads and shows a contact', async () => {
  useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { fetchContact, calls } = make();
  const { view } = await mount('1', fetchContact, client);
  expect(view.$('p').textContent).toBe('Loading…');
  calls[0].resolve();
  await flush();
  expect(view.$('h2').textContent).toBe('Ava');
  expect(view.$('small')).toBeNull();
});

test('each id has its own cache entry and loading state', async () => {
  useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { fetchContact, calls } = make();
  const { view, show } = await mount('1', fetchContact, client);
  calls[0].resolve();
  await flush();
  await show('2');
  expect(view.$('p').textContent).toBe('Loading…');
  calls[1].resolve();
  await flush();
  expect(view.$('h2').textContent).toBe('Liam');
  expect(client.getQueryData(['contact', '1'])).toEqual({ name: 'Ava' });
  expect(client.getQueryData(['contact', '2'])).toEqual({ name: 'Liam' });
});

test('revisiting a fresh contact is instant and does not refetch', async () => {
  useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { fetchContact, calls } = make();
  const { view, show } = await mount('1', fetchContact, client);
  calls[0].resolve();
  await flush();
  await show('2');
  calls[1].resolve();
  await flush();
  await show('1');
  expect(view.$('h2').textContent).toBe('Ava');
  expect(view.$('p')).toBeNull();
  await flush();
  expect(fetchContact).toHaveBeenCalledTimes(2);
});

test('after staleTime passes, a revisit shows cached data and refreshes in the background', async () => {
  const timers = useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { fetchContact, calls } = make();
  const { view, show } = await mount('1', fetchContact, client);
  calls[0].resolve();
  await flush();
  await show('2');
  calls[1].resolve();
  await flush();
  await timers.advance(61_000);
  await show('1');
  expect(view.$('h2').textContent).toBe('Ava');
  expect(view.$('small').textContent).toBe('Refreshing…');
  expect(fetchContact).toHaveBeenCalledTimes(3);
  calls[2].resolve();
  await flush();
  expect(view.$('small')).toBeNull();
});
```

### explanation
The key `['contact', id]` includes the variable the query function uses, so each contact gets its own cache entry: changing `id` is not a "refetch" but a switch between two datasets. `staleTime: 60_000` declares the data fresh for a minute, so returning to a contact inside that window is served from the cache with no request. After the window the data is *stale*: Query still shows it immediately and refreshes in the background, which is what `isFetching` lets you display. With the default `staleTime` of 0 the revisit test would see a third request every time.

### hints
- `queryKey: ['contact', id]` and `queryFn: () => fetchContact(id)`.
- `staleTime: 60_000` is in milliseconds.
- `isFetching` is true during background refetches; `status` is still `'success'` then.

# practice: Mutation and invalidation

### meta
minutes: 8
language: tsx

### prompt
Build `ContactsApp({ fetchContacts, addContact })`.

- A list (`useQuery`, key `['contacts']`) showing each contact name in an `<li>`, or `<p>Loading…</p>` first.
- A form with an input (`aria-label="Name"`) and a button that reads `Add` (or `Adding…` and `disabled` while the mutation is pending).
- Submitting calls `addContact(name)` through `useMutation`. On success: **invalidate** the `['contacts']` query so the list reloads, and clear the input.
- If `addContact` fails show `<p role="alert">Could not add: <message></p>` and keep the typed text.

### starter
```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function ContactsApp({ fetchContacts, addContact }: { fetchContacts: () => Promise<string[]>; addContact: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  // TODO: query, queryClient, mutation
  return (
    <div>
      <p>Loading…</p>
      <form>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button>Add</button>
      </form>
    </div>
  );
}

export default ContactsApp;
```

### solution
```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function ContactsApp({ fetchContacts, addContact }: { fetchContacts: () => Promise<string[]>; addContact: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const contacts = useQuery({ queryKey: ['contacts'], queryFn: fetchContacts });

  const mutation = useMutation({
    mutationFn: (n: string) => addContact(n),
    onSuccess: () => {
      setName('');
      return queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return (
    <div>
      {contacts.status === 'pending' ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {(contacts.data ?? []).map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) mutation.mutate(name.trim());
        }}
      >
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={mutation.isPending}>{mutation.isPending ? 'Adding…' : 'Add'}</button>
      </form>
      {mutation.isError && <p role="alert">Could not add: {mutation.error.message}</p>}
    </div>
  );
}

export default ContactsApp;
```

### tests
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const setup = async () => {
  useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const server = ['Ava'];
  const adds = [];
  const fetchContacts = fn(async () => [...server]);
  const addContact = fn((name) => new Promise((resolve, reject) => adds.push({ name, resolve: () => { server.push(name); resolve(); }, reject })));
  const view = await render(
    <QueryClientProvider client={client}>
      <user.ContactsApp fetchContacts={fetchContacts} addContact={addContact} />
    </QueryClientProvider>,
  );
  await flush();
  return { view, fetchContacts, addContact, adds };
};
const names = (view) => view.$$('li').map((li) => li.textContent);
const input = (view) => view.getByRole('textbox', { name: 'Name' });

test('loads the list', async () => {
  const { view, fetchContacts } = await setup();
  expect(names(view)).toEqual(['Ava']);
  expect(fetchContacts).toHaveBeenCalledTimes(1);
});

test('adding shows a pending state and disables the button', async () => {
  const { view } = await setup();
  await type(input(view), 'Liam');
  await submit(view.$('form'));
  const button = view.$('form button');
  expect(button.textContent).toBe('Adding…');
  expect(button.disabled).toBe(true);
});

test('success invalidates the list so it refetches, and clears the input', async () => {
  const { view, fetchContacts, addContact, adds } = await setup();
  await type(input(view), 'Liam');
  await submit(view.$('form'));
  expect(addContact).toHaveBeenCalledWith('Liam');
  adds[0].resolve();
  await flush();
  await flush();
  expect(fetchContacts).toHaveBeenCalledTimes(2);
  expect(names(view)).toEqual(['Ava', 'Liam']);
  expect(input(view).value).toBe('');
  expect(view.$('form button').textContent).toBe('Add');
});

test('failure shows an error and keeps the text', async () => {
  const { view, fetchContacts, adds } = await setup();
  await type(input(view), 'Liam');
  await submit(view.$('form'));
  adds[0].reject(new Error('Duplicate'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Could not add: Duplicate');
  expect(input(view).value).toBe('Liam');
  expect(fetchContacts).toHaveBeenCalledTimes(1);
});
```

### explanation
Mutations *change* server data, and the list you are showing is now out of date. `invalidateQueries({ queryKey: ['contacts'] })` marks every matching query stale and refetches the ones currently on screen, so the list updates from the server (the source of truth) without you wiring anything between the form and the list. `useMutation` provides `isPending`, `isError` and `error`, replacing the state machine you wrote by hand on Day 16. Returning the promise from `onSuccess` keeps the mutation in its pending state until the refetch finishes.

### hints
- `const queryClient = useQueryClient();`
- `useMutation({ mutationFn, onSuccess })`, and call `mutation.mutate(name)` from the submit handler.
- In `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['contacts'] })`.
- `mutation.isPending`, `mutation.isError`, `mutation.error.message`.

# challenge: Optimistic update with rollback

### meta
minutes: 10
language: tsx

### prompt
Build `VipList({ fetchContacts, setVip })`.

- `fetchContacts()` returns `{ id, name, vip }[]` (query key `['contacts']`).
- Each `<li>` shows the name, a `⭐` when `vip`, and a button named `Star <name>` or `Unstar <name>`.
- Clicking calls `setVip({ id, vip })` through `useMutation` with an **optimistic update**:
  - `onMutate`: cancel outgoing refetches, snapshot the cache, write the new `vip` value into the cache, and return the snapshot as context.
  - `onError`: restore the snapshot.
  - `onSettled`: invalidate `['contacts']` so the list converges with the server.
- On failure show `<p role="alert">Could not update <name></p>`.

### starter
```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Contact {
  id: string;
  name: string;
  vip: boolean;
}

export function VipList({ fetchContacts, setVip }: { fetchContacts: () => Promise<Contact[]>; setVip: (v: { id: string; vip: boolean }) => Promise<void> }) {
  // TODO
  return <ul />;
}

export default VipList;
```

### solution
```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Contact {
  id: string;
  name: string;
  vip: boolean;
}

export function VipList({ fetchContacts, setVip }: { fetchContacts: () => Promise<Contact[]>; setVip: (v: { id: string; vip: boolean }) => Promise<void> }) {
  const queryClient = useQueryClient();
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: fetchContacts });

  const mutation = useMutation({
    mutationFn: ({ id, vip }: { id: string; vip: boolean; name: string }) => setVip({ id, vip }),
    onMutate: async ({ id, vip }) => {
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previous = queryClient.getQueryData<Contact[]>(['contacts']);
      queryClient.setQueryData<Contact[]>(['contacts'], (old = []) => old.map((c) => (c.id === id ? { ...c, vip } : c)));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['contacts'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });

  if (contacts.status === 'pending') return <p>Loading…</p>;
  if (contacts.status === 'error') return <p role="alert">Could not load</p>;

  return (
    <div>
      {mutation.isError && <p role="alert">Could not update {mutation.variables?.name}</p>}
      <ul>
        {contacts.data.map((c) => (
          <li key={c.id}>
            <span>
              {c.name}
              {c.vip && ' ⭐'}
            </span>
            <button onClick={() => mutation.mutate({ id: c.id, vip: !c.vip, name: c.name })}>
              {c.vip ? 'Unstar' : 'Star'} {c.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VipList;
```

### tests
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const setup = async () => {
  useFakeTimers();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const server = [
    { id: 'a', name: 'Ava', vip: false },
    { id: 'b', name: 'Liam', vip: true },
  ];
  const patches = [];
  const fetchContacts = fn(async () => server.map((c) => ({ ...c })));
  const setVip = fn(
    ({ id, vip }) =>
      new Promise((resolve, reject) =>
        patches.push({
          id,
          vip,
          resolve: () => {
            server.find((c) => c.id === id).vip = vip;
            resolve();
          },
          reject,
        }),
      ),
  );
  const view = await render(
    <QueryClientProvider client={client}>
      <user.VipList fetchContacts={fetchContacts} setVip={setVip} />
    </QueryClientProvider>,
  );
  await flush();
  return { view, fetchContacts, setVip, patches };
};
const rows = (view) => view.$$('li').map((li) => li.querySelector('span').textContent);
const button = (view, name) => view.getByRole('button', { name });

test('renders the contacts', async () => {
  const { view } = await setup();
  expect(rows(view)).toEqual(['Ava', 'Liam ⭐']);
  expect(button(view, 'Star Ava')).toBeTruthy();
  expect(button(view, 'Unstar Liam')).toBeTruthy();
});

test('the star appears immediately, before the server answers', async () => {
  const { view, setVip } = await setup();
  await click(button(view, 'Star Ava'));
  await flush();
  expect(setVip).toHaveBeenCalledWith({ id: 'a', vip: true });
  expect(rows(view)).toEqual(['Ava ⭐', 'Liam ⭐']);
  expect(button(view, 'Unstar Ava')).toBeTruthy();
});

test('a successful save refetches and keeps the value', async () => {
  const { view, fetchContacts, patches } = await setup();
  await click(button(view, 'Star Ava'));
  await flush();
  patches[0].resolve();
  await flush();
  await flush();
  expect(fetchContacts).toHaveBeenCalledTimes(2);
  expect(rows(view)).toEqual(['Ava ⭐', 'Liam ⭐']);
  expect(view.$('[role=alert]')).toBeNull();
});

test('a failed save rolls back and shows an error', async () => {
  const { view, patches } = await setup();
  await click(button(view, 'Star Ava'));
  await flush();
  expect(rows(view)[0]).toBe('Ava ⭐');
  patches[0].reject(new Error('500'));
  await flush();
  await flush();
  expect(rows(view)).toEqual(['Ava', 'Liam ⭐']);
  expect(view.$('[role=alert]').textContent).toBe('Could not update Ava');
});

test('unstarring works the same way', async () => {
  const { view, setVip } = await setup();
  await click(button(view, 'Unstar Liam'));
  await flush();
  expect(setVip).toHaveBeenCalledWith({ id: 'b', vip: false });
  expect(rows(view)).toEqual(['Ava', 'Liam']);
});
```

### explanation
The three callbacks implement "predict, then reconcile". `onMutate` runs before the request: `cancelQueries` stops an in-flight refetch from overwriting the prediction, `getQueryData` takes a snapshot, `setQueryData` writes the optimistic value, and the returned object becomes the `context` for later callbacks. `onError` uses that context to restore the cache. `onSettled` runs after success **or** failure and invalidates the query, so the cache always converges on what the server really has. Compare this with the hand-written version on Day 16: the same ideas, but with the plumbing provided.

### hints
- `onMutate` is `async`: `await queryClient.cancelQueries(...)`, snapshot with `getQueryData`, write with `setQueryData`, `return { previous }`.
- `onError: (err, vars, context) => queryClient.setQueryData(['contacts'], context.previous)`.
- `onSettled: () => queryClient.invalidateQueries({ queryKey: ['contacts'] })`.
- `mutation.variables` holds the arguments of the latest call (handy for the error message).
