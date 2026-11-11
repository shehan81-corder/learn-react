## The browser is a small database

A browser gives your app several places to keep data on the user's device. Choosing the right one is a design decision with security, size and speed consequences.

| Storage | Size (approx.) | API | Best for |
| --- | --- | --- | --- |
| `localStorage` | ~5 MB | synchronous, strings only | small settings: theme, sidebar state, page size |
| `sessionStorage` | ~5 MB | synchronous, strings only | per-tab, throw-away state (a wizard's draft) |
| **IndexedDB** | hundreds of MB+ | asynchronous, structured data | offline copies of lists, drafts, files, queues |
| **Cache API** | large | asynchronous, `Request`→`Response` | the service worker's offline copies of files and API responses |
| Cookies | ~4 KB | sent with every request | server-managed sessions (ideally `HttpOnly`) |

> **The thinking pattern:** match the storage to the data. *Small, simple and synchronous* means `localStorage`. *Large, structured or must not block the UI* means IndexedDB. *Responses for offline use* means the Cache API. And never put **secrets** (passwords, long-lived API keys) in any of them. Anything in JavaScript-readable storage can be stolen by an XSS bug.

## `localStorage` done properly

```ts
localStorage.setItem('nimbus.pageSize', '25');
const size = Number(localStorage.getItem('nimbus.pageSize') ?? 10);
```

Things that go wrong in real apps, all of which your wrapper should handle:

- **Everything is a string.** Serialise with `JSON.stringify` and parse defensively.
- **Corrupt or foreign data.** Parse inside `try/catch` and fall back to a default.
- **It can throw.** On write: the quota can be exceeded, or storage is disabled (private mode, blocked cookies). On access: it may be undefined in some contexts (a server render, a sandboxed frame like this one).
- **Namespace your keys** (`nimbus.contacts`) so you never collide with another script on the page.
- **It is synchronous**, so never store megabytes in it. Large reads block the main thread.

```ts
function createSafeStorage(storage: Storage) {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const raw = storage.getItem(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
      } catch {
        return fallback;
      }
    },
    set(key: string, value: unknown): boolean {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

## Versioning and migrations

Your data shape **will** change. If today you store `{ name: 'Ava Nguyen' }` and next month you want `{ firstName, lastName }`, users have old data on their devices. Two professional habits:

1. **Store a version** next to the data: `{ version: 2, data: { ... } }`.
2. **Migrate on read** through a chain of small functions, one per version step.

```ts
const migrations: Record<number, (data: any) => any> = {
  // key = version being upgraded FROM
  1: (d) => ({ ...d, firstName: d.name.split(' ')[0], lastName: d.name.split(' ')[1] ?? '' }),   // v1 → v2
  2: (d) => ({ ...d, tags: d.tags ?? [] }),                                                      // v2 → v3
};
```

A user on v1 runs migrations 1 then 2 and arrives at v3; a user already on v3 runs none. Never edit an old migration after release; add a new one.

## IndexedDB, without the pain

IndexedDB is the browser's real database: asynchronous, transactional, structured-clone aware (stores objects, dates, blobs). Its raw API is notoriously verbose, so people use a thin wrapper. The smallest is **idb-keyval**, a promise-based key-value store:

```ts
import { get, set, del, keys, createStore } from 'idb-keyval';

const store = createStore('nimbus', 'contacts');
await set('ct_1', { firstName: 'Ava' }, store);
const contact = await get('ct_1', store);
```

For richer needs (indexes, queries) use **idb** or **Dexie**. All of them are asynchronous, so they work naturally with `async/await` and TanStack Query's `persistQueryClient`.

The pattern of wrapping a storage backend behind a small interface (get/set/delete/keys) is worth copying: your app talks to the interface, and tests (or a different backend) plug in behind it. You will write that wrapper in today's exercises.

## Service workers: a proxy in the browser

A **service worker** is a script the browser runs in the background, separate from your page. It sits between your app and the network and can intercept every request. That makes three things possible: **offline support**, **precaching** the app shell for instant loads, and **push notifications**.

Lifecycle:

1. **Register** from your page: `navigator.serviceWorker.register('/sw.js')`.
2. **Install**: the worker downloads and *precaches* files.
3. **Activate**: it takes control; old caches get cleaned up.
4. **Fetch**: it now sees each request and answers from the cache, the network, or a mix (the strategies from yesterday).

```js
// sw.js (minimal cache-first for static assets)
const CACHE = 'nimbus-v1';
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html']))));
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))),
);
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit ?? fetch(e.request)));
});
```

Service workers need **HTTPS** (localhost is exempt), have a tricky update model (a new worker waits until old tabs close; `skipWaiting` and a "Reload to update" prompt are the usual answer) and can cache a broken version of your site forever if you are careless, so **version your caches** and test the update flow.

In practice you rarely hand-write one. **vite-plugin-pwa** (built on Google's *Workbox*) generates a worker, precaches your build output and lets you configure runtime strategies per route:

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: { name: 'Nimbus CRM', short_name: 'Nimbus', theme_color: '#2563eb', display: 'standalone', icons: [/* 192 and 512 */] },
  workbox: {
    runtimeCaching: [
      { urlPattern: /\/api\/contacts/, handler: 'StaleWhileRevalidate', options: { cacheName: 'api-contacts', expiration: { maxAgeSeconds: 3600 } } },
    ],
  },
});
```

## The web app manifest: make it installable

A `manifest.webmanifest` tells the browser how your app should look when installed to the home screen or desktop. For installability a browser expects roughly:

- `name` and/or `short_name`
- `start_url`
- `display` of `standalone` (or `fullscreen` / `minimal-ui`)
- **icons** of at least 192×192 and 512×512
- a service worker with a fetch handler (in some browsers) and HTTPS

Add `theme_color` and `background_color` for polish. Once those are right, Chrome can show an **install** button and fire the `beforeinstallprompt` event, which you can catch to offer your own "Install Nimbus" button:

```ts
let deferred: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BeforeInstallPromptEvent; showInstallButton(); });
// on click: deferred.prompt()
```

Check your results with Chrome DevTools → **Application** → Manifest / Service Workers, and the **Lighthouse** PWA audit.

## Storage hygiene

- **Estimate the budget:** `navigator.storage.estimate()` returns usage and quota. `navigator.storage.persist()` asks the browser not to evict your data.
- **Clear on logout:** remove user-specific data (cached contacts, queued actions) when a user signs out, especially on shared computers.
- **Expire:** caches without a max age grow forever. Give every cache an expiry and a version.
- **Privacy:** CRM data is personal data. Cache only what you need and treat the device as untrusted.

## Walkthrough: persist a draft safely

*"If the user starts typing a note and the tab crashes, restore the draft."*

1. **Pick the storage:** a small string, synchronous is fine, so `localStorage`.
2. **Key + version:** `nimbus.draft.v1.<contactId>`.
3. **Write path:** debounce 500 ms (Day 11) and `safeStorage.set`.
4. **Read path:** `safeStorage.get(key, '')` initialises the textarea (lazy initialiser).
5. **Cleanup:** remove the draft after the note is saved successfully, and on logout.
6. **Failure mode:** if `set` returns `false` (quota or disabled), carry on silently; a lost draft must never break typing.

## CRM step: installable and storage-hardened

1. Create `src/lib/storage.ts` with the safe storage wrapper (get/set/remove, JSON, never throws) and use it everywhere instead of raw `localStorage`.
2. Add a versioned `{ version, data }` shape for the persisted preferences with a `migrate` function and one real migration (e.g. rename `compact` → `density`).
3. Install `vite-plugin-pwa`; configure the manifest (name, theme colour, 192 and 512 icons) and `registerType: 'autoUpdate'`.
4. Add runtime caching for `/api/contacts` with stale-while-revalidate.
5. Build and preview (`npm run build && npm run preview`), then check **Application → Manifest** and test **offline** mode in DevTools.

- [ ] One storage wrapper, no raw `localStorage` calls elsewhere
- [ ] Stored preferences are versioned and migrated
- [ ] `npm run preview` shows the app as installable
- [ ] The contact list loads offline after the first visit
