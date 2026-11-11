## You have been rebuilding a library

On Days 14 to 16 you hand-wrote loading and error states, aborting, retry, refetching and optimistic updates. It was worth doing because you now understand every moving part. But if you tried to ship a big app that way you would copy that logic into dozens of places and slowly introduce bugs. **TanStack Query** (formerly React Query) is the standard library for exactly this job.

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

> **The thinking pattern:** *server state is not your state.* It lives on a server, you only hold a **cached copy** that can go stale, be shared between components, change underneath you, and fail to load. That is a different problem from `useState` for a modal or a form field, and it deserves a different tool. Use TanStack Query for **server state**, and `useState`/`useReducer`/context for **client state** (UI state that exists only in the browser).

## Setup

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter><App /></BrowserRouter>
  </QueryClientProvider>,
);
```

The `QueryClient` holds the cache. Create it **once**, outside any component.

## Queries

```tsx
import { useQuery } from '@tanstack/react-query';

function ContactsPage() {
  const { data, status, error, isFetching, refetch } = useQuery({
    queryKey: ['contacts', { search, page }],
    queryFn: ({ signal }) => listContacts({ search, page, signal }),
    staleTime: 60_000,
  });

  if (status === 'pending') return <p>Loading…</p>;
  if (status === 'error') return <p role="alert">{error.message} <button onClick={() => refetch()}>Retry</button></p>;
  return <ContactTable rows={data.data} refreshing={isFetching} />;
}
```

Compare with your Day 14 `useFetch`: the same three states, with abort signals, retries (3 by default, with back-off), request de-duplication and caching included.

**Query keys** are the heart of the library. A key is an array that *uniquely describes the data*: `['contacts']`, `['contact', id]`, `['contacts', { search, page }]`. If the key changes, Query treats it as a different dataset: it shows cached data for the new key if it has any, and fetches otherwise. Include **every variable** the query function uses in its key, just like effect dependencies.

## Freshness, staleness and the cache

Two timers explain most behaviour:

| Setting | Default | Meaning |
| --- | --- | --- |
| `staleTime` | `0` | How long fetched data is considered **fresh**. Fresh data is served from cache without a request. |
| `gcTime` | 5 minutes | How long an **unused** query stays in the cache before being garbage-collected. |

With the default `staleTime: 0`, data is stale immediately. Query still shows it instantly (that is the point), but refetches in the background when a component mounts, the window regains focus or the network reconnects. This is **stale-while-revalidate**: show what you have, update quietly. Set `staleTime` higher for data that rarely changes (a contact's profile) and leave it low for data that changes often (a live pipeline).

Open the cached-data story with a concrete scenario: the user views contact 1, then 2, then goes back to 1. With `staleTime: 60_000` the third view is instant with **no request**. With `0` it is instant *and* triggers a background refetch.

## Mutations and invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function AddContactForm() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: NewContact) => createContact(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),   // mark stale and refetch
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(values); }}>
      …
      <button disabled={mutation.isPending}>{mutation.isPending ? 'Adding…' : 'Add'}</button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
```

`invalidateQueries({ queryKey: ['contacts'] })` marks every query whose key *starts with* `['contacts']` as stale and refetches the ones on screen. One line replaces "remember to reload the list after saving". It is the single most useful thing to learn today.

## Optimistic updates, the library way

The pattern from Day 16 has a standard shape in Query:

```tsx
const toggleVip = useMutation({
  mutationFn: ({ id, vip }: { id: string; vip: boolean }) => patchContact(id, { vip }),

  onMutate: async ({ id, vip }) => {
    await queryClient.cancelQueries({ queryKey: ['contacts'] });         // stop in-flight refetches overwriting us
    const previous = queryClient.getQueryData<Contact[]>(['contacts']);   // snapshot
    queryClient.setQueryData<Contact[]>(['contacts'], (old = []) =>
      old.map((c) => (c.id === id ? { ...c, vip } : c)),                  // optimistic write
    );
    return { previous };                                                  // context for rollback
  },
  onError: (_err, _vars, context) => {
    if (context) queryClient.setQueryData(['contacts'], context.previous);  // rollback
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),   // converge with the server either way
});
```

Read it as a script: **cancel, snapshot, predict, (maybe roll back), then reconcile with the server**. The final `onSettled` refetch means that even if your prediction was slightly wrong, the UI converges on the truth.

## Useful options

- `enabled: Boolean(id)`: don't run until you have what the query needs (a selected id).
- `select: (data) => data.data`: transform or pick from the result; components re-render only if the selected part changes.
- `placeholderData: keepPreviousData`: while the next page loads, keep showing the previous page's data (no flash).
- `retry: false` or a function: control retries (useful for 404s).
- `refetchOnWindowFocus: false`: opt out of the focus refetch for a query.
- `useQueries`, `useInfiniteQuery`: many queries at once, "load more" lists.

## The devtools

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
<ReactQueryDevtools initialIsOpen={false} />   // inside the provider; removed from production builds automatically
```

It shows every query, its key, whether it is fresh, stale, fetching or inactive, and lets you trigger refetches and errors. Spend ten minutes in it: it turns the cache from something invisible into something you can watch.

## How this changes your architecture

- Components no longer `useEffect` + `fetch`. They call **query hooks** (`useContacts(filters)`, `useContact(id)`).
- A **feature folder** wraps each resource: `api/contacts.ts` (plain functions) and `hooks/useContacts.ts` (Query hooks), with a *query key factory* so keys are defined once.
- Server data no longer goes into context or reducers. Components just ask for it; the cache de-duplicates.
- Context/reducers/stores remain for true client state: selected rows, open dialogs, theme.

```ts
export const contactKeys = {
  all: ['contacts'] as const,
  list: (filters: Filters) => [...contactKeys.all, 'list', filters] as const,
  detail: (id: string) => [...contactKeys.all, 'detail', id] as const,
};
// invalidateQueries({ queryKey: contactKeys.all }) refreshes lists AND details
```

## Walkthrough: migrate the contacts page

1. Install, add `QueryClientProvider` and the devtools.
2. Create `contactKeys` and `useContacts(filters)` using `useQuery` with `placeholderData: keepPreviousData`.
3. Delete the Day 14 effect, state union and abort logic from the page. Read `status`, `data`, `error`, `isFetching`.
4. Move create, update and delete into `useMutation` hooks that **invalidate** `contactKeys.all`.
5. Make the star toggle optimistic with `onMutate`/`onError`/`onSettled`.
6. Open the devtools and watch what happens when you change the search, go back to a previous search (instant), and kill the network.

Net result: far less code, no race conditions, free caching, and a UI that feels faster.

## A note on this sandbox

The exercises load `@tanstack/react-query` from a CDN and run your components inside a `QueryClientProvider` that the tests create with `retry: false` (so failures surface at once instead of after three back-off retries). Your fetch functions are passed in as props, so you never need a real network.

## CRM step: migrate to TanStack Query

1. Install `@tanstack/react-query` and the devtools; wrap `App` in `QueryClientProvider`.
2. Create `src/api/keys.ts` (the key factory) and `src/hooks/useContacts.ts`, `useContact.ts`, `useCreateContact.ts`, `useUpdateContact.ts` (optimistic), `useDeleteContact.ts`.
3. Rewrite `ContactsPage` and `ContactDetailPage` to use them; delete the hand-written fetching state.
4. Set `staleTime: 30_000` on the detail query and watch the devtools as you click back and forth.
5. Make the status select and search part of the **query key** so each combination is cached separately.

- [ ] No `useEffect`-based fetching remains in the contact pages
- [ ] All mutations invalidate `contactKeys.all` (or update the cache)
- [ ] The star toggle is optimistic with rollback
- [ ] Devtools show distinct cache entries per search/filter
