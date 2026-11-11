## Fast, and still working on a train

Two promises make an app feel professional: it feels **fast** (it doesn't re-download what it already has) and it feels **reliable** (it keeps working, or degrades gracefully, when the network does not). Both come from the same idea: **keep a local copy and be deliberate about when to trust it.**

> **The thinking pattern:** every piece of data has a *freshness requirement*. A contact's phone number can be an hour old. A "payment status" must be live. Decide per resource how stale is acceptable, then choose a strategy to match. There is no universal right answer, only trade-offs.

## Where caches live

Layers, from closest to your component outward:

| Layer | Example | Lifetime |
| --- | --- | --- |
| In-memory app cache | TanStack Query's cache, a `Map` | until the tab closes |
| Persisted client cache | `localStorage`, IndexedDB | survives reloads |
| Browser HTTP cache | `Cache-Control` headers | set by the server |
| Service worker cache | Cache API | survives reloads *and* works offline |
| CDN / server cache | Vercel edge, Redis | shared between users |

Yesterday's TanStack Query gave you the first layer for free. Today you add the persistence and offline layers.

## Caching strategies

There are five standard strategies. Learn their names; they are the vocabulary of every caching conversation.

| Strategy | Behaviour | Good for |
| --- | --- | --- |
| **Cache first** | Use the cache if present; otherwise go to the network | static assets, fonts, images |
| **Network first** | Try the network; fall back to the cache if it fails | pages and data where freshness matters but offline should still work |
| **Stale-while-revalidate** | Return the cached copy **immediately**, then refresh it in the background | profile data, lists, anything "good enough now, better soon" |
| **Network only** | Never cache | payments, auth |
| **Cache only** | Never hit the network | pre-cached app shell |

Stale-while-revalidate (SWR) is the best default for CRM read data and is exactly what TanStack Query does.

### A TTL cache in a few lines

A time-to-live (TTL) cache forgets entries after a while. The clock is a parameter so it can be tested:

```ts
function createTtlCache<T>(ttlMs: number, now: () => number = Date.now) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  return {
    set(key: string, value: T) { entries.set(key, { value, expiresAt: now() + ttlMs }); },
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) { entries.delete(key); return undefined; }
      return entry.value;
    },
  };
}
```

**The two hard problems** are famous: *naming things* and *cache invalidation*. Invalidation strategies, from simple to precise: expire by time (TTL), clear on mutation (Day 17's `invalidateQueries`), or version the cache key (`['contacts', 'v2']`) so old shapes are never read.

## Persisting the cache

An in-memory cache vanishes on refresh, so users re-download everything on each visit. Persist it:

- TanStack Query: `persistQueryClient` with a `localStorage` or IndexedDB persister restores the cache before first render and writes it as it changes. Use a `buster` string (your app version) so incompatible old caches are discarded after a deploy.
- Hand-rolled: `JSON.stringify` the data into storage with a timestamp and a version; on load, validate both.

Always set a **maximum age** and a **version**. Stale or incompatible persisted data is worse than no data.

## Detecting offline

```ts
navigator.onLine                              // boolean
window.addEventListener('online',  handler);
window.addEventListener('offline', handler);
```

Important caveat: `onLine === false` reliably means *no network interface*, but `true` only means *some* interface exists. You can be "online" behind a captive portal or with a dead server. So treat the browser's flag as a **hint**: use it to show a banner, but make decisions based on whether *requests actually fail*.

```tsx
function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
```

(That is a custom hook in the style of Day 15, with the event listener subscription and cleanup.)

## Designing an offline-capable UI

- **Reads:** show cached data with a clear *"Offline: showing saved data"* banner and the age of the data. Never show an empty error screen if you have something useful.
- **Writes:** don't pretend they succeeded. Queue them (see below) and show them as **pending sync**.
- **Disable what cannot work offline** (a live search that needs the server) with an explanation, rather than letting it fail.
- **Recover automatically:** when the connection returns, refetch (Query does this on reconnect) and flush the queue.

## The offline write queue

When the user adds a contact offline, store the *intent* and send it later:

```ts
interface QueuedAction { id: string; type: 'create_contact'; payload: NewContact; attempts: number }

// enqueue: append to an array persisted in storage
// flush (on 'online'): send each in order; remove on success; keep (and count attempts) on failure
```

Design questions you must answer:

1. **Ordering.** Replays should preserve the user's order ("create company" before "create contact in that company").
2. **Idempotency.** A retry may reach the server twice if the response was lost. Send a client-generated **idempotency key** so the server can ignore duplicates.
3. **Poison messages.** An item the server will *never* accept (validation error) must not block the whole queue forever: after N attempts, drop it and tell the user.
4. **Persistence.** The queue must survive closing the tab, so it lives in storage, not just memory.

## Conflicts

Two devices edit the same contact offline. Who wins? The common options:

- **Last write wins:** simple; silently loses an edit. Acceptable for low-stakes fields.
- **Field-level merge:** apply each device's changes to different fields.
- **Version checks:** the client sends the version (or `ETag`/`updatedAt`) it started from; the server returns `409 Conflict` if it changed, and the UI asks the user. Correct, and more work.

You do not have to solve this today, but you do have to *choose* consciously and write it down.

## Retries with back-off

Retrying immediately in a tight loop hammers a struggling server. Use **exponential back-off with jitter**:

```ts
const delay = Math.min(30_000, 500 * 2 ** attempt) * (0.5 + Math.random() / 2);
```

TanStack Query does this by default (3 retries). For your own queue, cap the attempts and the delay.

## Walkthrough: offline-friendly contact list

1. **Persist:** persist the Query cache with a 24-hour max age and a version `buster`.
2. **Detect:** `useOnlineStatus()` drives an `OfflineBanner` at the top of the app.
3. **Read path:** the contact list renders cached data and shows *"Offline: last updated 14:02"* using `dataUpdatedAt` from the query.
4. **Write path:** when offline, "Add contact" goes into the offline queue (persisted) and the new contact is shown at the top with a *"Waiting to sync"* badge.
5. **Recover:** on `online`, flush the queue in order, then invalidate `['contacts']`.
6. **Test it:** DevTools → Network → *Offline*. Add a contact. Reload the page. Go back online. Watch the queue drain.

## CRM step: offline support

1. Add `src/lib/offlineQueue.ts` implementing the queue from today's challenge (persisted to `localStorage`, ordered, with max attempts).
2. Add `useOnlineStatus` and an `OfflineBanner` in the app shell.
3. Persist the Query cache with `@tanstack/query-sync-storage-persister` and `@tanstack/react-query-persist-client` (`maxAge` 24h, `buster` from your app version).
4. When `navigator.onLine` is false, route "add contact" through the queue and show queued items as pending. Flush on `online`.
5. Verify with the Network panel in offline mode and a reload.

- [ ] Offline banner appears and disappears with the connection
- [ ] Contact list is visible after a reload while offline
- [ ] Offline creates are queued, persisted and flushed in order
- [ ] The cache has a max age and a version
