# practice: A storage wrapper that never throws

### meta
minutes: 7
language: ts

### prompt
Write and export `createSafeStorage(storage, prefix = '')` returning:

- `get<T>(key, fallback: T): T`: reads `prefix + key`, parses JSON, returns `fallback` if the key is missing, the JSON is invalid, or `storage.getItem` throws.
- `set(key, value): boolean`: stores `JSON.stringify(value)`; returns `true` on success and `false` if `storage.setItem` throws (quota exceeded, disabled storage). It must not throw.
- `remove(key): void`: removes the item and never throws.

`storage` has `getItem`, `setItem`, `removeItem`.

### starter
```ts
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createSafeStorage(storage: StorageLike, prefix = '') {
  // TODO
  return {
    get<T>(key: string, fallback: T): T {
      return fallback;
    },
    set(key: string, value: unknown): boolean {
      return false;
    },
    remove(key: string): void {},
  };
}
```

### solution
```ts
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createSafeStorage(storage: StorageLike, prefix = '') {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const raw = storage.getItem(prefix + key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
      } catch {
        return fallback;
      }
    },
    set(key: string, value: unknown): boolean {
      try {
        storage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): void {
      try {
        storage.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
    },
  };
}
```

### tests
```ts
const memory = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
};

test('round-trips JSON values', () => {
  const s = user.createSafeStorage(memory());
  expect(s.set('prefs', { dark: true, size: 25 })).toBe(true);
  expect(s.get('prefs', null)).toEqual({ dark: true, size: 25 });
  s.set('n', 42);
  expect(s.get('n', 0)).toBe(42);
});

test('returns the fallback for a missing key', () => {
  const s = user.createSafeStorage(memory());
  expect(s.get('nope', 'default')).toBe('default');
  expect(s.get('nope', [])).toEqual([]);
});

test('returns the fallback for corrupt JSON', () => {
  const s = user.createSafeStorage(memory({ bad: '{not json' }));
  expect(s.get('bad', 'fallback')).toBe('fallback');
});

test('a stored null is a real value, not a missing key', () => {
  const s = user.createSafeStorage(memory());
  s.set('x', null);
  expect(s.get('x', 'fallback')).toBeNull();
});

test('uses the prefix for every operation', () => {
  const backing = memory();
  const s = user.createSafeStorage(backing, 'nimbus.');
  s.set('theme', 'dark');
  expect(Object.keys(backing.data)).toEqual(['nimbus.theme']);
  expect(s.get('theme', 'light')).toBe('dark');
  s.remove('theme');
  expect(Object.keys(backing.data)).toEqual([]);
});

test('set returns false instead of throwing when storage is full', () => {
  const full = { ...memory(), setItem: () => { throw new Error('QuotaExceededError'); } };
  const s = user.createSafeStorage(full);
  expect(s.set('a', 1)).toBe(false);
});

test('never throws when the storage itself is broken', () => {
  const broken = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('SecurityError'); },
    removeItem: () => { throw new Error('SecurityError'); },
  };
  const s = user.createSafeStorage(broken);
  expect(s.get('a', 'fb')).toBe('fb');
  expect(s.set('a', 1)).toBe(false);
  expect(() => s.remove('a')).not.toThrow();
});
```

### typetests
```ts
const s = createSafeStorage({ getItem: () => null, setItem() {}, removeItem() {} });
const n: number = s.get('k', 1);
const names: string[] = s.get('k', ['a']);
const ok: boolean = s.set('k', { a: 1 });
// @ts-expect-error the fallback decides the type
const wrong: string = s.get('k', 1);
```

### explanation
The generic signature `get<T>(key, fallback: T): T` ties the return type to the fallback, so callers get a typed value without casts. Every call to the underlying storage sits in a `try/catch` because browsers throw for many reasons: quota, disabled storage, private mode, security policies. The key design rule is that **storage problems should degrade features, not crash the app**: a failed save returns `false` and a bad read returns the fallback. Remember that `JSON.parse` of the string `'null'` is a legitimate `null`, which is why the code checks `raw === null` before parsing.

### hints
- Wrap `getItem` + `JSON.parse` in one `try`, and return `fallback` in the `catch`.
- `raw === null` means the key is missing.
- `set` returns `true` after a successful `setItem`, and `false` in the `catch`.

# practice: Versioned data and migrations

### meta
minutes: 8
language: ts

### prompt
Write and export `migrate(stored, migrations, targetVersion)`.

`stored` is `{ version?: number, data: unknown }` (a missing version means `0`). `migrations` is an object keyed by the version being upgraded **from**: `migrations[0](data)` produces version-1 data, `migrations[1](data)` produces version-2 data, and so on.

- Apply migrations in order from `stored.version` up to `targetVersion`.
- Return `{ version: targetVersion, data }`.
- If the stored version equals the target, return it unchanged (same data reference).
- If the stored version is **greater** than the target, throw `Error('Stored data is from a newer version')`.
- If a needed migration is missing, throw `Error('Missing migration from version <n>')`.
- Never mutate `stored`.

### starter
```ts
export interface Stored {
  version?: number;
  data: unknown;
}

export type Migrations = Record<number, (data: any) => unknown>;

export function migrate(stored: Stored, migrations: Migrations, targetVersion: number): { version: number; data: unknown } {
  // TODO
  return { version: targetVersion, data: stored.data };
}
```

### solution
```ts
export interface Stored {
  version?: number;
  data: unknown;
}

export type Migrations = Record<number, (data: any) => unknown>;

export function migrate(stored: Stored, migrations: Migrations, targetVersion: number): { version: number; data: unknown } {
  const from = stored.version ?? 0;
  if (from > targetVersion) throw new Error('Stored data is from a newer version');

  let data = stored.data;
  for (let version = from; version < targetVersion; version++) {
    const step = migrations[version];
    if (!step) throw new Error(`Missing migration from version ${version}`);
    data = step(data);
  }
  return { version: targetVersion, data };
}
```

### tests
```ts
const migrations = {
  0: (d) => ({ name: d }),
  1: (d) => ({ firstName: d.name.split(' ')[0], lastName: d.name.split(' ')[1] ?? '' }),
  2: (d) => ({ ...d, tags: [] }),
};

test('upgrades through every step', () => {
  expect(user.migrate({ version: 0, data: 'Ava Nguyen' }, migrations, 3)).toEqual({
    version: 3,
    data: { firstName: 'Ava', lastName: 'Nguyen', tags: [] },
  });
});

test('a missing version means version 0', () => {
  expect(user.migrate({ data: 'Liam' }, migrations, 2)).toEqual({ version: 2, data: { firstName: 'Liam', lastName: '' } });
});

test('only applies the steps that are needed', () => {
  const result = user.migrate({ version: 2, data: { firstName: 'Mia', lastName: 'P' } }, migrations, 3);
  expect(result).toEqual({ version: 3, data: { firstName: 'Mia', lastName: 'P', tags: [] } });
});

test('data already at the target is returned unchanged', () => {
  const data = { firstName: 'A', lastName: 'B', tags: ['x'] };
  const result = user.migrate({ version: 3, data }, migrations, 3);
  expect(result.version).toBe(3);
  expect(result.data).toBe(data);
});

test('refuses data from a newer version', () => {
  expect(() => user.migrate({ version: 5, data: {} }, migrations, 3)).toThrow('Stored data is from a newer version');
});

test('reports a missing migration', () => {
  expect(() => user.migrate({ version: 0, data: 'x' }, { 0: (d) => d }, 3)).toThrow('Missing migration from version 1');
});

test('does not mutate the stored object', () => {
  const stored = { version: 0, data: 'Ava Nguyen' };
  const snapshot = JSON.stringify(stored);
  user.migrate(stored, migrations, 3);
  expect(JSON.stringify(stored)).toBe(snapshot);
});

test('migrations receive the output of the previous step', () => {
  const seen = [];
  const m = {
    0: (d) => (seen.push(d), 'one'),
    1: (d) => (seen.push(d), 'two'),
  };
  user.migrate({ version: 0, data: 'zero' }, m, 2);
  expect(seen).toEqual(['zero', 'one']);
});
```

### typetests
```ts
const r = migrate({ version: 1, data: {} }, { 1: (d) => d }, 2);
const v: number = r.version;
// @ts-expect-error targetVersion is a number
migrate({ data: {} }, {}, '2');
```

### explanation
Migrations are small, single-purpose functions chained in order, so each one only has to know about *adjacent* versions. A user who skipped several releases simply runs several steps. Treating a missing `version` as `0` handles data written before you introduced versioning. Throwing for a *newer* version protects users who downgrade (or open an old cached build): better to refuse than to silently corrupt data you do not understand. The golden rule: **never edit a shipped migration; add a new one.**

### hints
- `const from = stored.version ?? 0;`
- Loop `for (let v = from; v < targetVersion; v++)` applying `migrations[v]`.
- Throw before the loop for a newer stored version, and inside it for a missing step.

# practice: A key-value store over any backend

### meta
minutes: 8
language: ts

### prompt
IndexedDB wrappers such as idb-keyval expose an async key-value interface. Write `createKeyValueStore(adapter, namespace)` that sits on top of such an adapter:

`adapter` has `get(key): Promise<string | undefined>`, `set(key, value: string): Promise<void>`, `del(key): Promise<void>` and `keys(): Promise<string[]>`.

Your store prefixes every key with `<namespace>:` and offers (all async):

- `get<T>(key): Promise<T | undefined>`: parsed JSON, or `undefined` if missing or corrupt.
- `set(key, value): Promise<void>`: stores JSON.
- `delete(key): Promise<void>`
- `keys(): Promise<string[]>`: only this namespace's keys, **without** the prefix, sorted.
- `clear(): Promise<void>`: deletes only this namespace's entries.

### starter
```ts
export interface Adapter {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export function createKeyValueStore(adapter: Adapter, namespace: string) {
  // TODO
  return {
    async get<T>(key: string): Promise<T | undefined> {
      return undefined;
    },
    async set(key: string, value: unknown): Promise<void> {},
    async delete(key: string): Promise<void> {},
    async keys(): Promise<string[]> {
      return [];
    },
    async clear(): Promise<void> {},
  };
}
```

### solution
```ts
export interface Adapter {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export function createKeyValueStore(adapter: Adapter, namespace: string) {
  const prefix = `${namespace}:`;
  const full = (key: string) => prefix + key;

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const raw = await adapter.get(full(key));
      if (raw === undefined) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    async set(key: string, value: unknown): Promise<void> {
      await adapter.set(full(key), JSON.stringify(value));
    },
    async delete(key: string): Promise<void> {
      await adapter.del(full(key));
    },
    async keys(): Promise<string[]> {
      const all = await adapter.keys();
      return all
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length))
        .sort();
    },
    async clear(): Promise<void> {
      const all = await adapter.keys();
      await Promise.all(all.filter((k) => k.startsWith(prefix)).map((k) => adapter.del(k)));
    },
  };
}
```

### tests
```ts
// An async in-memory adapter, like a tiny idb-keyval.
const makeAdapter = () => {
  const data = new Map();
  return {
    data,
    get: async (k) => data.get(k),
    set: async (k, v) => void data.set(k, v),
    del: async (k) => void data.delete(k),
    keys: async () => [...data.keys()],
  };
};

test('round-trips values as JSON', async () => {
  const store = user.createKeyValueStore(makeAdapter(), 'contacts');
  await store.set('ct_1', { firstName: 'Ava', tags: ['vip'] });
  expect(await store.get('ct_1')).toEqual({ firstName: 'Ava', tags: ['vip'] });
});

test('stores values under a prefixed key as a string', async () => {
  const adapter = makeAdapter();
  const store = user.createKeyValueStore(adapter, 'contacts');
  await store.set('a', 1);
  expect([...adapter.data.keys()]).toEqual(['contacts:a']);
  expect(adapter.data.get('contacts:a')).toBe('1');
});

test('missing and corrupt entries are undefined', async () => {
  const adapter = makeAdapter();
  const store = user.createKeyValueStore(adapter, 'x');
  expect(await store.get('nope')).toBeUndefined();
  adapter.data.set('x:bad', '{oops');
  expect(await store.get('bad')).toBeUndefined();
});

test('delete removes one entry', async () => {
  const store = user.createKeyValueStore(makeAdapter(), 'x');
  await store.set('a', 1);
  await store.set('b', 2);
  await store.delete('a');
  expect(await store.keys()).toEqual(['b']);
});

test('keys are unprefixed, sorted and namespaced', async () => {
  const adapter = makeAdapter();
  const contacts = user.createKeyValueStore(adapter, 'contacts');
  const deals = user.createKeyValueStore(adapter, 'deals');
  await contacts.set('b', 1);
  await contacts.set('a', 1);
  await deals.set('z', 1);
  expect(await contacts.keys()).toEqual(['a', 'b']);
  expect(await deals.keys()).toEqual(['z']);
});

test('clear only removes this namespace', async () => {
  const adapter = makeAdapter();
  const contacts = user.createKeyValueStore(adapter, 'contacts');
  const deals = user.createKeyValueStore(adapter, 'deals');
  await contacts.set('a', 1);
  await deals.set('z', 2);
  await contacts.clear();
  expect(await contacts.keys()).toEqual([]);
  expect(await deals.get('z')).toBe(2);
});

test('a namespace that is a prefix of another does not leak', async () => {
  const adapter = makeAdapter();
  const a = user.createKeyValueStore(adapter, 'app');
  const b = user.createKeyValueStore(adapter, 'app2');
  await b.set('k', 1);
  expect(await a.keys()).toEqual([]);
});
```

### typetests
```ts
async function check() {
  const store = createKeyValueStore({ get: async () => undefined, set: async () => {}, del: async () => {}, keys: async () => [] }, 'n');
  const v: number | undefined = await store.get<number>('k');
  const ks: string[] = await store.keys();
  // @ts-expect-error the adapter needs all four methods
  createKeyValueStore({ get: async () => undefined }, 'n');
}
```

### explanation
This is the *adapter pattern*: your app depends on a tiny interface, and any backend can implement it, whether that is idb-keyval over IndexedDB, `localStorage` wrapped in promises, or the in-memory fake used in these tests. The namespace prefix lets several features share one database without colliding. The `${namespace}:` prefix (with the colon) is also what stops namespace `app` from matching keys belonging to `app2`. Making every method async from the start means swapping in IndexedDB later requires no changes to the callers.

### hints
- `const prefix = namespace + ':'` and build every key with it.
- `keys()`: filter with `startsWith(prefix)`, then `slice(prefix.length)` and `sort()`.
- `clear()`: delete each key that starts with your prefix (not everything!).

# challenge: Service worker strategies

### meta
minutes: 10
language: ts

### prompt
Service workers answer `fetch` events with a *strategy*. Implement three as plain functions so they can be tested without a real service worker.

Each receives `request` (a `Request`) and an options object:

```ts
{ cache: { match(req): Promise<Response | undefined>; put(req, res): Promise<void> }, fetchFn: (req) => Promise<Response> }
```

- `cacheFirst(request, opts)`: return the cached response if there is one; otherwise fetch, store a **clone** in the cache, and return the response. Do not cache failed (non-`ok`) responses.
- `networkFirst(request, opts)`: try the network and store a clone of an `ok` response; if the network **throws**, return the cached response, or rethrow if there is none. A non-ok network response is returned as is (and not cached).
- `staleWhileRevalidate(request, opts)`: if cached, return it immediately and refresh the cache in the background; if not cached, fetch, store a clone and return it. `opts.waitUntil(promise)` (optional) receives the background promise so the worker is kept alive. A failing background refresh must not throw.

### starter
```ts
export interface CacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface StrategyOptions {
  cache: CacheLike;
  fetchFn: (request: Request) => Promise<Response>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export async function cacheFirst(request: Request, opts: StrategyOptions): Promise<Response> {
  // TODO
  return opts.fetchFn(request);
}

export async function networkFirst(request: Request, opts: StrategyOptions): Promise<Response> {
  // TODO
  return opts.fetchFn(request);
}

export async function staleWhileRevalidate(request: Request, opts: StrategyOptions): Promise<Response> {
  // TODO
  return opts.fetchFn(request);
}
```

### solution
```ts
export interface CacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface StrategyOptions {
  cache: CacheLike;
  fetchFn: (request: Request) => Promise<Response>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

async function fetchAndStore(request: Request, { cache, fetchFn }: StrategyOptions): Promise<Response> {
  const response = await fetchFn(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

export async function cacheFirst(request: Request, opts: StrategyOptions): Promise<Response> {
  const hit = await opts.cache.match(request);
  if (hit) return hit;
  return fetchAndStore(request, opts);
}

export async function networkFirst(request: Request, opts: StrategyOptions): Promise<Response> {
  try {
    return await fetchAndStore(request, opts);
  } catch (error) {
    const hit = await opts.cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

export async function staleWhileRevalidate(request: Request, opts: StrategyOptions): Promise<Response> {
  const hit = await opts.cache.match(request);
  if (!hit) return fetchAndStore(request, opts);

  const refresh = fetchAndStore(request, opts).catch(() => undefined);
  opts.waitUntil?.(refresh);
  return hit;
}
```

### tests
```ts
const makeCache = () => {
  const store = new Map();
  return {
    store,
    match: fn(async (req) => store.get(req.url)?.clone()),
    put: fn(async (req, res) => void store.set(req.url, res)),
  };
};
const req = (path = '/api/contacts') => new Request('https://example.com' + path);
const ok = (body) => new Response(body, { status: 200 });
const text = (res) => res.text();

test('cacheFirst: serves a cached response without touching the network', async () => {
  const cache = makeCache();
  cache.store.set(req().url, ok('cached'));
  const fetchFn = fn(async () => ok('network'));
  const res = await user.cacheFirst(req(), { cache, fetchFn });
  expect(await text(res)).toBe('cached');
  expect(fetchFn).not.toHaveBeenCalled();
});

test('cacheFirst: fetches on a miss and caches a clone', async () => {
  const cache = makeCache();
  const fetchFn = fn(async () => ok('network'));
  const res = await user.cacheFirst(req(), { cache, fetchFn });
  expect(await text(res)).toBe('network');
  expect(await text(cache.store.get(req().url))).toBe('network');
});

test('cacheFirst: does not cache a failed response', async () => {
  const cache = makeCache();
  const fetchFn = async () => new Response('nope', { status: 500 });
  const res = await user.cacheFirst(req(), { cache, fetchFn });
  expect(res.status).toBe(500);
  expect(cache.store.size).toBe(0);
});

test('networkFirst: prefers the network and refreshes the cache', async () => {
  const cache = makeCache();
  cache.store.set(req().url, ok('old'));
  const res = await user.networkFirst(req(), { cache, fetchFn: async () => ok('fresh') });
  expect(await text(res)).toBe('fresh');
  expect(await text(cache.store.get(req().url))).toBe('fresh');
});

test('networkFirst: falls back to the cache when the network throws', async () => {
  const cache = makeCache();
  cache.store.set(req().url, ok('saved'));
  const res = await user.networkFirst(req(), {
    cache,
    fetchFn: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  expect(await text(res)).toBe('saved');
});

test('networkFirst: rethrows when offline with nothing cached', async () => {
  const cache = makeCache();
  let caught;
  try {
    await user.networkFirst(req(), {
      cache,
      fetchFn: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(TypeError);
});

test('networkFirst: returns a non-ok network response without caching it', async () => {
  const cache = makeCache();
  const res = await user.networkFirst(req(), { cache, fetchFn: async () => new Response('x', { status: 404 }) });
  expect(res.status).toBe(404);
  expect(cache.store.size).toBe(0);
});

test('staleWhileRevalidate: returns the cached copy and refreshes in the background', async () => {
  const cache = makeCache();
  cache.store.set(req().url, ok('stale'));
  const pending = [];
  const res = await user.staleWhileRevalidate(req(), {
    cache,
    fetchFn: async () => ok('fresh'),
    waitUntil: (p) => pending.push(p),
  });
  expect(await text(res)).toBe('stale');
  expect(pending).toHaveLength(1);
  await pending[0];
  expect(await text(cache.store.get(req().url))).toBe('fresh');
});

test('staleWhileRevalidate: a failing refresh does not throw', async () => {
  const cache = makeCache();
  cache.store.set(req().url, ok('stale'));
  const pending = [];
  const res = await user.staleWhileRevalidate(req(), {
    cache,
    fetchFn: async () => {
      throw new Error('offline');
    },
    waitUntil: (p) => pending.push(p),
  });
  expect(await text(res)).toBe('stale');
  await pending[0];
  expect(await text(cache.store.get(req().url))).toBe('stale');
});

test('staleWhileRevalidate: on a miss it fetches, caches and returns', async () => {
  const cache = makeCache();
  const res = await user.staleWhileRevalidate(req(), { cache, fetchFn: async () => ok('first') });
  expect(await text(res)).toBe('first');
  expect(await text(cache.store.get(req().url))).toBe('first');
});

test('the response body can still be read after caching (clone)', async () => {
  const cache = makeCache();
  const res = await user.cacheFirst(req(), { cache, fetchFn: async () => ok('body') });
  expect(await res.text()).toBe('body');
  expect(await cache.store.get(req().url).text()).toBe('body');
});
```

### typetests
```ts
const opts: StrategyOptions = { cache: { match: async () => undefined, put: async () => {} }, fetchFn: async () => new Response() };
async function check() {
  const r: Response = await cacheFirst(new Request('https://x.test/'), opts);
  // @ts-expect-error the request must be a Request
  await cacheFirst('https://x.test/', opts);
}
```

### explanation
Every strategy is a different answer to "who do I ask first, and what do I do if they fail?". The shared helper `fetchAndStore` encodes two details that matter in real service workers: only store **successful** responses (caching a 500 would serve errors offline) and always store a `response.clone()`, because a `Response` body can be read only once: the original goes to the page and the clone goes into the cache. In `staleWhileRevalidate` the refresh is handed to `waitUntil`, which in a real service worker keeps the worker alive until the background work finishes, and its errors are swallowed because a failed refresh must not break the response the user already got.

### hints
- Write a helper that fetches, checks `response.ok`, stores `response.clone()` and returns the response.
- `cacheFirst`: `match` first. `networkFirst`: `try { fetchAndStore } catch { match or rethrow }`.
- `staleWhileRevalidate`: on a hit start `fetchAndStore(...).catch(() => undefined)`, pass it to `waitUntil?.(...)` and return the cached response.
