# practice: A TTL cache

### meta
minutes: 7
language: ts

### prompt
Write and export `createTtlCache<T>({ ttlMs, now = Date.now })` returning an object with:

- `set(key, value)`: stores the value; it expires `ttlMs` after it was set.
- `get(key)`: the value, or `undefined` if missing or expired. Reading an expired entry removes it.
- `has(key)`: `true` only for live (non-expired) entries.
- `delete(key)`: removes an entry; returns whether it existed (and was live).
- `size()`: the number of **live** entries.
- `clear()`: removes everything.

`now` is injected so tests can control time. Setting an existing key again **restarts** its timer.

### starter
```ts
export interface TtlCacheOptions {
  ttlMs: number;
  now?: () => number;
}

export function createTtlCache<T>({ ttlMs, now = Date.now }: TtlCacheOptions) {
  // TODO
  return {
    set(key: string, value: T): void {},
    get(key: string): T | undefined {
      return undefined;
    },
    has(key: string): boolean {
      return false;
    },
    delete(key: string): boolean {
      return false;
    },
    size(): number {
      return 0;
    },
    clear(): void {},
  };
}
```

### solution
```ts
export interface TtlCacheOptions {
  ttlMs: number;
  now?: () => number;
}

export function createTtlCache<T>({ ttlMs, now = Date.now }: TtlCacheOptions) {
  const entries = new Map<string, { value: T; expiresAt: number }>();

  const live = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    set(key: string, value: T): void {
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
    get(key: string): T | undefined {
      return live(key)?.value;
    },
    has(key: string): boolean {
      return live(key) !== undefined;
    },
    delete(key: string): boolean {
      const existed = live(key) !== undefined;
      entries.delete(key);
      return existed;
    },
    size(): number {
      for (const key of Array.from(entries.keys())) live(key);
      return entries.size;
    },
    clear(): void {
      entries.clear();
    },
  };
}
```

### tests
```ts
const clock = (start = 1000) => {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
};

test('returns a stored value until it expires', () => {
  const c = clock();
  const cache = user.createTtlCache({ ttlMs: 100, now: c.now });
  cache.set('a', 1);
  expect(cache.get('a')).toBe(1);
  c.advance(99);
  expect(cache.get('a')).toBe(1);
  c.advance(1);
  expect(cache.get('a')).toBeUndefined();
});

test('missing keys are undefined', () => {
  const cache = user.createTtlCache({ ttlMs: 100 });
  expect(cache.get('nope')).toBeUndefined();
  expect(cache.has('nope')).toBe(false);
});

test('has reflects expiry', () => {
  const c = clock();
  const cache = user.createTtlCache({ ttlMs: 50, now: c.now });
  cache.set('a', 'x');
  expect(cache.has('a')).toBe(true);
  c.advance(50);
  expect(cache.has('a')).toBe(false);
});

test('setting a key again restarts its timer', () => {
  const c = clock();
  const cache = user.createTtlCache({ ttlMs: 100, now: c.now });
  cache.set('a', 1);
  c.advance(80);
  cache.set('a', 2);
  c.advance(80);
  expect(cache.get('a')).toBe(2);
  c.advance(20);
  expect(cache.get('a')).toBeUndefined();
});

test('size counts only live entries', () => {
  const c = clock();
  const cache = user.createTtlCache({ ttlMs: 100, now: c.now });
  cache.set('a', 1);
  c.advance(60);
  cache.set('b', 2);
  expect(cache.size()).toBe(2);
  c.advance(50);
  expect(cache.size()).toBe(1);
  expect(cache.has('b')).toBe(true);
});

test('delete reports whether a live entry existed', () => {
  const c = clock();
  const cache = user.createTtlCache({ ttlMs: 100, now: c.now });
  cache.set('a', 1);
  expect(cache.delete('a')).toBe(true);
  expect(cache.delete('a')).toBe(false);
  cache.set('b', 1);
  c.advance(100);
  expect(cache.delete('b')).toBe(false);
});

test('clear removes everything', () => {
  const cache = user.createTtlCache({ ttlMs: 100 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.clear();
  expect(cache.size()).toBe(0);
  expect(cache.get('a')).toBeUndefined();
});

test('works with objects and defaults to the real clock', () => {
  const cache = user.createTtlCache({ ttlMs: 60000 });
  const value = { id: 1 };
  cache.set('k', value);
  expect(cache.get('k')).toBe(value);
});
```

### typetests
```ts
const cache = createTtlCache<{ id: number }>({ ttlMs: 10 });
cache.set('a', { id: 1 });
const v: { id: number } | undefined = cache.get('a');
// @ts-expect-error values must match T
cache.set('b', { name: 'x' });
```

### explanation
Each entry stores the *absolute* time it expires, so checking is a single comparison with `now()`. Expiry is enforced **lazily** (when you read or count), which avoids timers and keeps the cache trivial; the private `live` helper centralises that rule so `get`, `has`, `delete` and `size` can never disagree. Taking the clock as a parameter is the standard way to test time-dependent code deterministically.

### hints
- Store `{ value, expiresAt: now() + ttlMs }` in a `Map`.
- Write one helper that returns a live entry or deletes an expired one, and reuse it everywhere.
- For `size`, purge expired entries first, then return `entries.size`.

# practice: Stale-while-revalidate

### meta
minutes: 9
language: ts

### prompt
Write and export `createSwr<T>({ staleMs, now = Date.now })` returning `get(key, fetcher, onUpdate?)`.

`get` returns a promise of the value:

- **No cached entry:** call `fetcher()`, store the result (with the time), return it. Concurrent calls for the same key while that fetch is in flight must **share one request**.
- **Fresh entry** (age `< staleMs`): return the cached value, no request.
- **Stale entry** (age `>= staleMs`): return the cached value **immediately** and refresh in the background: call `fetcher()` (one request at a time per key), store the result, then call `onUpdate?.(freshValue)`.
- If a background refresh fails, keep the stale value and do not call `onUpdate`.
- If the very first fetch fails, the promise rejects and nothing is cached.

### starter
```ts
export interface SwrOptions {
  staleMs: number;
  now?: () => number;
}

export function createSwr<T>({ staleMs, now = Date.now }: SwrOptions) {
  // TODO
  return {
    async get(key: string, fetcher: () => Promise<T>, onUpdate?: (value: T) => void): Promise<T> {
      return fetcher();
    },
  };
}
```

### solution
```ts
export interface SwrOptions {
  staleMs: number;
  now?: () => number;
}

export function createSwr<T>({ staleMs, now = Date.now }: SwrOptions) {
  const entries = new Map<string, { value: T; fetchedAt: number }>();
  const inFlight = new Map<string, Promise<T>>();

  const load = (key: string, fetcher: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) return existing;
    const promise = fetcher()
      .then((value) => {
        entries.set(key, { value, fetchedAt: now() });
        return value;
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, promise);
    return promise;
  };

  return {
    async get(key: string, fetcher: () => Promise<T>, onUpdate?: (value: T) => void): Promise<T> {
      const entry = entries.get(key);
      if (!entry) return load(key, fetcher);

      if (now() - entry.fetchedAt >= staleMs && !inFlight.has(key)) {
        load(key, fetcher).then(
          (fresh) => onUpdate?.(fresh),
          () => {
            /* keep the stale value */
          },
        );
      }
      return entry.value;
    },
  };
}
```

### tests
```ts
const clock = (start = 0) => {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
};
const controlled = () => {
  const calls = [];
  const fetcher = fn(() => new Promise((resolve, reject) => calls.push({ resolve, reject })));
  return { fetcher, calls };
};

test('first call fetches and caches', async () => {
  const c = clock();
  const swr = user.createSwr({ staleMs: 100, now: c.now });
  const { fetcher, calls } = controlled();
  const p = swr.get('k', fetcher);
  calls[0].resolve('v1');
  expect(await p).toBe('v1');
  expect(await swr.get('k', fetcher)).toBe('v1');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('concurrent first calls share one request', async () => {
  const swr = user.createSwr({ staleMs: 100 });
  const { fetcher, calls } = controlled();
  const a = swr.get('k', fetcher);
  const b = swr.get('k', fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
  calls[0].resolve('shared');
  expect(await a).toBe('shared');
  expect(await b).toBe('shared');
});

test('a stale entry is returned immediately and refreshed in the background', async () => {
  const c = clock();
  const swr = user.createSwr({ staleMs: 100, now: c.now });
  const first = controlled();
  const p = swr.get('k', first.fetcher);
  first.calls[0].resolve('old');
  await p;
  c.advance(100);
  const second = controlled();
  const updates = [];
  const value = await swr.get('k', second.fetcher, (v) => updates.push(v));
  expect(value).toBe('old');
  expect(second.fetcher).toHaveBeenCalledTimes(1);
  expect(updates).toEqual([]);
  second.calls[0].resolve('new');
  await flush();
  expect(updates).toEqual(['new']);
  expect(await swr.get('k', second.fetcher)).toBe('new');
  expect(second.fetcher).toHaveBeenCalledTimes(1);
});

test('only one background refresh runs at a time', async () => {
  const c = clock();
  const swr = user.createSwr({ staleMs: 10, now: c.now });
  const first = controlled();
  const p = swr.get('k', first.fetcher);
  first.calls[0].resolve('old');
  await p;
  c.advance(50);
  const refresh = controlled();
  await swr.get('k', refresh.fetcher);
  await swr.get('k', refresh.fetcher);
  await swr.get('k', refresh.fetcher);
  expect(refresh.fetcher).toHaveBeenCalledTimes(1);
});

test('a failed background refresh keeps the stale value', async () => {
  const c = clock();
  const swr = user.createSwr({ staleMs: 10, now: c.now });
  const first = controlled();
  const p = swr.get('k', first.fetcher);
  first.calls[0].resolve('old');
  await p;
  c.advance(50);
  const refresh = controlled();
  const updates = [];
  expect(await swr.get('k', refresh.fetcher, (v) => updates.push(v))).toBe('old');
  refresh.calls[0].reject(new Error('offline'));
  await flush();
  expect(updates).toEqual([]);
  const retry = controlled();
  expect(await swr.get('k', retry.fetcher)).toBe('old');
  expect(retry.fetcher).toHaveBeenCalledTimes(1);
});

test('a failed first fetch rejects and caches nothing', async () => {
  const swr = user.createSwr({ staleMs: 100 });
  const first = controlled();
  const p = swr.get('k', first.fetcher);
  first.calls[0].reject(new Error('boom'));
  let message = '';
  try {
    await p;
  } catch (e) {
    message = e.message;
  }
  expect(message).toBe('boom');
  const second = controlled();
  const p2 = swr.get('k', second.fetcher);
  expect(second.fetcher).toHaveBeenCalledTimes(1);
  second.calls[0].resolve('ok');
  expect(await p2).toBe('ok');
});

test('keys are independent', async () => {
  const swr = user.createSwr({ staleMs: 100 });
  const a = controlled();
  const b = controlled();
  const pa = swr.get('a', a.fetcher);
  const pb = swr.get('b', b.fetcher);
  a.calls[0].resolve('A');
  b.calls[0].resolve('B');
  expect(await pa).toBe('A');
  expect(await pb).toBe('B');
});
```

### typetests
```ts
async function check() {
  const swr = createSwr<number>({ staleMs: 10 });
  const n: number = await swr.get('k', async () => 1);
  // @ts-expect-error the fetcher must produce a number
  await swr.get('k', async () => 'x');
}
```

### explanation
SWR is two decisions on every read: *is there a copy?* (return it) and *is it stale?* (refresh in the background). The one subtle part is **de-duplication**: an `inFlight` map of promises per key ensures concurrent callers share a single request and that repeated reads of a stale entry do not each start a refresh. Background refreshes swallow errors on purpose: failing to *refresh* must never break the read that already succeeded with cached data. This is the same behaviour TanStack Query gives you, now that you know how it works.

### hints
- Two maps: `entries` (value + `fetchedAt`) and `inFlight` (a promise per key).
- A small `load(key, fetcher)` helper that reuses an in-flight promise, stores the result and removes the in-flight record in `finally`.
- For a stale entry: start `load(...)` without awaiting it, attach `.then(onUpdate, () => {})`, and return the old value.

# practice: An online status hook

### meta
minutes: 7
language: tsx

### prompt
Write `useOnlineStatus(target)`. `target` is like `window`: it has `navigator.onLine` (boolean) and `addEventListener` / `removeEventListener` for `'online'` and `'offline'`.

- Returns `target.navigator.onLine` at first.
- Switches to `true` on an `online` event and `false` on an `offline` event.
- Removes both listeners when unmounted (and when the target changes).

Then build `OfflineBanner({ target })`, which renders nothing while online and `<p role="status">You are offline. Showing saved data.</p>` while offline.

### starter
```tsx
import { useEffect, useState } from 'react';

export interface NetworkTarget {
  navigator: { onLine: boolean };
  addEventListener(type: 'online' | 'offline', handler: () => void): void;
  removeEventListener(type: 'online' | 'offline', handler: () => void): void;
}

export function useOnlineStatus(target: NetworkTarget): boolean {
  // TODO
  return true;
}

export function OfflineBanner({ target }: { target: NetworkTarget }) {
  // TODO
  return null;
}

export default function App() {
  return <OfflineBanner target={window} />;
}
```

### solution
```tsx
import { useEffect, useState } from 'react';

export interface NetworkTarget {
  navigator: { onLine: boolean };
  addEventListener(type: 'online' | 'offline', handler: () => void): void;
  removeEventListener(type: 'online' | 'offline', handler: () => void): void;
}

export function useOnlineStatus(target: NetworkTarget): boolean {
  const [online, setOnline] = useState(() => target.navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    target.addEventListener('online', goOnline);
    target.addEventListener('offline', goOffline);
    setOnline(target.navigator.onLine);
    return () => {
      target.removeEventListener('online', goOnline);
      target.removeEventListener('offline', goOffline);
    };
  }, [target]);

  return online;
}

export function OfflineBanner({ target }: { target: NetworkTarget }) {
  const online = useOnlineStatus(target);
  if (online) return null;
  return <p role="status">You are offline. Showing saved data.</p>;
}

export default function App() {
  return <OfflineBanner target={window} />;
}
```

### tests
```tsx
const makeTarget = (onLine = true) => {
  const handlers = { online: new Set(), offline: new Set() };
  const target = {
    navigator: { onLine },
    handlers,
    addEventListener: (type, h) => handlers[type].add(h),
    removeEventListener: (type, h) => handlers[type].delete(h),
    go(next) {
      target.navigator.onLine = next;
      handlers[next ? 'online' : 'offline'].forEach((h) => h());
    },
  };
  return target;
};
const listenerCount = (t) => t.handlers.online.size + t.handlers.offline.size;

test('shows nothing while online', async () => {
  const view = await render(<user.OfflineBanner target={makeTarget(true)} />);
  expect(view.$('p')).toBeNull();
});

test('shows the banner immediately when starting offline', async () => {
  const view = await render(<user.OfflineBanner target={makeTarget(false)} />);
  expect(view.$('[role=status]').textContent).toBe('You are offline. Showing saved data.');
});

test('reacts to offline and online events', async () => {
  const target = makeTarget(true);
  const view = await render(<user.OfflineBanner target={target} />);
  target.go(false);
  await flush();
  expect(view.$('[role=status]')).toBeTruthy();
  target.go(true);
  await flush();
  expect(view.$('[role=status]')).toBeNull();
});

test('the hook returns a boolean that tracks the target', async () => {
  const target = makeTarget(true);
  let value;
  function Probe() {
    value = user.useOnlineStatus(target);
    return null;
  }
  await render(<Probe />);
  expect(value).toBe(true);
  target.go(false);
  await flush();
  expect(value).toBe(false);
});

test('removes its listeners on unmount', async () => {
  const target = makeTarget(true);
  const view = await render(<user.OfflineBanner target={target} />);
  expect(listenerCount(target)).toBe(2);
  view.unmount();
  await flush();
  expect(listenerCount(target)).toBe(0);
});

test('switches listeners when the target changes', async () => {
  const a = makeTarget(true);
  const b = makeTarget(false);
  const view = await render(<user.OfflineBanner target={a} />);
  await view.rerender(<user.OfflineBanner target={b} />);
  expect(listenerCount(a)).toBe(0);
  expect(listenerCount(b)).toBe(2);
  expect(view.$('[role=status]')).toBeTruthy();
});
```

### typetests
```tsx
const fake: NetworkTarget = { navigator: { onLine: true }, addEventListener() {}, removeEventListener() {} };
const el = <OfflineBanner target={fake} />;
function Check() {
  const online: boolean = useOnlineStatus(fake);
  return null;
}
// @ts-expect-error the target needs the listener methods
const bad = <OfflineBanner target={{ navigator: { onLine: true } }} />;
```

### explanation
Subscribing to something outside React is the textbook use of an effect: subscribe, store the latest value in state, and **unsubscribe in the cleanup**. The state is initialised from `target.onLine` (lazily) so the first render is already correct, and the effect re-reads it once to catch a change that happened between render and subscription. Passing the target in (production passes `window`) keeps the hook testable. A tiny component on top (`OfflineBanner`) turns the boolean into UI; it is the kind of component you will put in your app shell.

### hints
- `useState(() => target.navigator.onLine)`.
- In the effect add two listeners and return a cleanup that removes both.
- Depend on `[target]`.
- Return `null` from the component when online.

# challenge: A persistent offline queue

### meta
minutes: 10
language: ts

### prompt
Write and export `createOfflineQueue({ storage, send, isOnline, key = 'queue', maxAttempts = 3 })`.

- `storage` has `getItem(key)` / `setItem(key, value)`. The queue persists as JSON under `key` and is **restored** when a new queue is created over the same storage (invalid JSON starts an empty queue).
- `enqueue(payload)` appends `{ id, payload, attempts: 0 }`, persists it and returns the new item. Ids are unique and increasing (`'q1'`, `'q2'`, ...), continuing after restored items.
- `items()` returns a copy of the queue; `size()` its length.
- `flush()` is async and returns `{ sent, dropped, remaining }`:
  - If `isOnline()` is false: send nothing and return `{ sent: 0, dropped: 0, remaining: size }`.
  - Otherwise send items **in order, one at a time** with `send(payload)`. A successful item is removed (persist after each change).
  - If `send` rejects, increment that item's `attempts` and persist. When `attempts` reaches `maxAttempts` the item is **dropped** (counted in `dropped`) and flushing continues with the next item; otherwise flushing **stops** there (order preserved) and returns.
- Concurrent `flush()` calls while one is running must not send anything twice: the second returns the same promise.

### starter
```ts
export interface QueueItem<T> {
  id: string;
  payload: T;
  attempts: number;
}

export interface QueueOptions<T> {
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  send: (payload: T) => Promise<void>;
  isOnline: () => boolean;
  key?: string;
  maxAttempts?: number;
}

export function createOfflineQueue<T>(options: QueueOptions<T>) {
  // TODO
  return {
    enqueue(payload: T): QueueItem<T> {
      return { id: 'q0', payload, attempts: 0 };
    },
    items(): QueueItem<T>[] {
      return [];
    },
    size(): number {
      return 0;
    },
    async flush(): Promise<{ sent: number; dropped: number; remaining: number }> {
      return { sent: 0, dropped: 0, remaining: 0 };
    },
  };
}
```

### solution
```ts
export interface QueueItem<T> {
  id: string;
  payload: T;
  attempts: number;
}

export interface QueueOptions<T> {
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  send: (payload: T) => Promise<void>;
  isOnline: () => boolean;
  key?: string;
  maxAttempts?: number;
}

export function createOfflineQueue<T>({ storage, send, isOnline, key = 'queue', maxAttempts = 3 }: QueueOptions<T>) {
  const load = (): QueueItem<T>[] => {
    try {
      const raw = storage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  let queue = load();
  let counter = queue.reduce((max, item) => Math.max(max, Number(String(item.id).replace(/^q/, '')) || 0), 0);
  let running: Promise<{ sent: number; dropped: number; remaining: number }> | null = null;

  const persist = () => storage.setItem(key, JSON.stringify(queue));

  const run = async () => {
    let sent = 0;
    let dropped = 0;
    if (!isOnline()) return { sent, dropped, remaining: queue.length };

    while (queue.length > 0) {
      const item = queue[0];
      try {
        await send(item.payload);
        queue = queue.slice(1);
        sent += 1;
        persist();
      } catch {
        const attempts = item.attempts + 1;
        if (attempts >= maxAttempts) {
          queue = queue.slice(1);
          dropped += 1;
          persist();
        } else {
          queue = [{ ...item, attempts }, ...queue.slice(1)];
          persist();
          break;
        }
      }
    }
    return { sent, dropped, remaining: queue.length };
  };

  return {
    enqueue(payload: T): QueueItem<T> {
      counter += 1;
      const item: QueueItem<T> = { id: `q${counter}`, payload, attempts: 0 };
      queue = [...queue, item];
      persist();
      return item;
    },
    items(): QueueItem<T>[] {
      return queue.map((i) => ({ ...i }));
    },
    size(): number {
      return queue.length;
    },
    flush() {
      if (!running) {
        running = run().finally(() => {
          running = null;
        });
      }
      return running;
    },
  };
}
```

### tests
```ts
const makeStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v) };
};
const setup = (overrides = {}) => {
  const storage = overrides.storage ?? makeStorage();
  const sent = [];
  let online = overrides.online ?? true;
  const failures = overrides.failures ?? new Map();
  const send = fn(async (payload) => {
    if ((failures.get(payload) ?? 0) > 0) {
      failures.set(payload, failures.get(payload) - 1);
      throw new Error('network');
    }
    sent.push(payload);
  });
  const queue = user.createOfflineQueue({ storage, send, isOnline: () => online, ...overrides.options });
  return { queue, storage, sent, send, setOnline: (v) => (online = v), failures };
};

test('enqueue persists items with increasing ids', () => {
  const { queue, storage } = setup();
  const a = queue.enqueue({ name: 'Ava' });
  const b = queue.enqueue({ name: 'Liam' });
  expect(a).toEqual({ id: 'q1', payload: { name: 'Ava' }, attempts: 0 });
  expect(b.id).toBe('q2');
  expect(queue.size()).toBe(2);
  expect(JSON.parse(storage.data.queue)).toHaveLength(2);
});

test('items returns a copy', () => {
  const { queue } = setup();
  queue.enqueue('x');
  queue.items().pop();
  queue.items()[0].attempts = 99;
  expect(queue.size()).toBe(1);
  expect(queue.items()[0].attempts).toBe(0);
});

test('restores from storage and continues the id sequence', () => {
  const storage = makeStorage();
  setup({ storage }).queue.enqueue('a');
  setup({ storage }).queue.enqueue('b');
  const { queue } = setup({ storage });
  expect(queue.items().map((i) => i.payload)).toEqual(['a', 'b']);
  expect(queue.enqueue('c').id).toBe('q3');
});

test('invalid stored JSON starts an empty queue', () => {
  const { queue } = setup({ storage: makeStorage({ queue: '{broken' }) });
  expect(queue.size()).toBe(0);
});

test('does nothing while offline', async () => {
  const { queue, send } = setup({ online: false });
  queue.enqueue('a');
  expect(await queue.flush()).toEqual({ sent: 0, dropped: 0, remaining: 1 });
  expect(send).not.toHaveBeenCalled();
});

test('flushes in order and empties the queue', async () => {
  const { queue, sent, storage } = setup();
  ['a', 'b', 'c'].forEach((p) => queue.enqueue(p));
  expect(await queue.flush()).toEqual({ sent: 3, dropped: 0, remaining: 0 });
  expect(sent).toEqual(['a', 'b', 'c']);
  expect(JSON.parse(storage.data.queue)).toEqual([]);
});

test('a failure stops the flush, keeps order and counts the attempt', async () => {
  const { queue, sent, storage } = setup({ failures: new Map([['b', 1]]) });
  ['a', 'b', 'c'].forEach((p) => queue.enqueue(p));
  expect(await queue.flush()).toEqual({ sent: 1, dropped: 0, remaining: 2 });
  expect(sent).toEqual(['a']);
  expect(queue.items().map((i) => [i.payload, i.attempts])).toEqual([['b', 1], ['c', 0]]);
  expect(JSON.parse(storage.data.queue)[0].attempts).toBe(1);
  expect(await queue.flush()).toEqual({ sent: 2, dropped: 0, remaining: 0 });
  expect(sent).toEqual(['a', 'b', 'c']);
});

test('an item is dropped after maxAttempts so it cannot block the queue', async () => {
  const { queue, sent } = setup({ failures: new Map([['bad', 99]]), options: { maxAttempts: 2 } });
  ['a', 'bad', 'c'].forEach((p) => queue.enqueue(p));
  expect(await queue.flush()).toEqual({ sent: 1, dropped: 0, remaining: 2 });
  expect(await queue.flush()).toEqual({ sent: 1, dropped: 1, remaining: 0 });
  expect(sent).toEqual(['a', 'c']);
});

test('concurrent flushes do not send anything twice', async () => {
  const { queue, send } = setup();
  ['a', 'b'].forEach((p) => queue.enqueue(p));
  const [r1, r2] = await Promise.all([queue.flush(), queue.flush()]);
  expect(send).toHaveBeenCalledTimes(2);
  expect(r1).toEqual(r2);
});

test('sends one at a time', async () => {
  let active = 0;
  let max = 0;
  const storage = makeStorage();
  const queue = user.createOfflineQueue({
    storage,
    isOnline: () => true,
    send: async () => {
      active++;
      max = Math.max(max, active);
      await sleep(1);
      active--;
    },
  });
  ['a', 'b', 'c'].forEach((p) => queue.enqueue(p));
  await queue.flush();
  expect(max).toBe(1);
});

test('works again after going back online', async () => {
  const { queue, sent, setOnline } = setup({ online: false });
  queue.enqueue('a');
  await queue.flush();
  setOnline(true);
  expect(await queue.flush()).toEqual({ sent: 1, dropped: 0, remaining: 0 });
  expect(sent).toEqual(['a']);
});
```

### typetests
```ts
const q = createOfflineQueue<{ name: string }>({
  storage: { getItem: () => null, setItem: () => {} },
  send: async (p) => {
    p.name.toUpperCase();
  },
  isOnline: () => true,
});
const item = q.enqueue({ name: 'x' });
const attempts: number = item.attempts;
// @ts-expect-error payload must match the queue's type
q.enqueue({ title: 'x' });
```

### explanation
The queue is the offline-write pattern from the lesson in about 60 lines. The design choices map directly to its four questions: **ordering** (always send `queue[0]`, never skip ahead after a failure), **persistence** (write to storage after every change, so a crash or closed tab loses nothing), **poison messages** (an item that exhausts `maxAttempts` is dropped so it cannot block everything behind it) and **safety** (a shared `running` promise ensures two `flush()` calls, say from an `online` event and a timer, never double-send). Reassigning `queue` to new arrays instead of mutating keeps `items()` copies truly independent.

### hints
- Keep `let queue = load()` in the closure; write `persist()` after every change.
- Ids: start the counter at the highest restored id number.
- In `flush`, loop while `queue.length > 0`; `await send(queue[0].payload)`.
- On failure: increase `attempts`; if it reached `maxAttempts` drop and continue, otherwise `break`.
- Store the in-progress promise in a variable and return it to concurrent callers.
