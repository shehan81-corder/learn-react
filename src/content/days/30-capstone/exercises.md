# practice: Validate data at the boundary

### meta
minutes: 9
language: ts

### prompt
`response.json()` returns `any`: TypeScript cannot know what the server really sent. Write and export `parseContactPage(json: unknown): Page<Contact>` that **validates** the shape at runtime and returns a correctly typed value.

A valid page is:

```ts
{ data: Contact[]; page: number; pageSize: number; total: number; totalPages: number }
// Contact: { id: string; firstName: string; lastName: string; email: string;
//            status: 'lead' | 'customer' | 'churned'; tags: string[]; companyId: string | null }
```

On the **first** problem found, throw `Error('Invalid response: <problem>')`. Check in this order, with these messages:

1. The root must be an object: `expected an object`.
2. `data must be an array`.
3. For each contact `i`, in order: it must be an object (`data[i] must be an object`), then its fields in the order `id`, `firstName`, `lastName`, `email` (`data[i].<field> must be a string`), `status` (`data[i].status must be one of lead, customer, churned`), `tags` (`data[i].tags must be an array of strings`), `companyId` (`data[i].companyId must be a string or null`).
4. Then `page`, `pageSize`, `total`, `totalPages`, each (`<name> must be a non-negative integer`).

### starter
```ts
export type ContactStatus = 'lead' | 'customer' | 'churned';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: ContactStatus;
  tags: string[];
  companyId: string | null;
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parseContactPage(json: unknown): Page<Contact> {
  // TODO: validate, then return a typed value
  return json as Page<Contact>;
}
```

### solution
```ts
export type ContactStatus = 'lead' | 'customer' | 'churned';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: ContactStatus;
  tags: string[];
  companyId: string | null;
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUSES: ContactStatus[] = ['lead', 'customer', 'churned'];
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const invalid = (problem: string) => new Error(`Invalid response: ${problem}`);

export function parseContactPage(json: unknown): Page<Contact> {
  if (!isObject(json)) throw invalid('expected an object');
  if (!Array.isArray(json.data)) throw invalid('data must be an array');

  const data: Contact[] = json.data.map((raw: unknown, i: number) => {
    if (!isObject(raw)) throw invalid(`data[${i}] must be an object`);
    for (const field of ['id', 'firstName', 'lastName', 'email'] as const) {
      if (typeof raw[field] !== 'string') throw invalid(`data[${i}].${field} must be a string`);
    }
    if (!STATUSES.includes(raw.status as ContactStatus)) throw invalid(`data[${i}].status must be one of ${STATUSES.join(', ')}`);
    if (!Array.isArray(raw.tags) || !raw.tags.every((t) => typeof t === 'string')) throw invalid(`data[${i}].tags must be an array of strings`);
    if (raw.companyId !== null && typeof raw.companyId !== 'string') throw invalid(`data[${i}].companyId must be a string or null`);
    return {
      id: raw.id as string,
      firstName: raw.firstName as string,
      lastName: raw.lastName as string,
      email: raw.email as string,
      status: raw.status as ContactStatus,
      tags: raw.tags as string[],
      companyId: raw.companyId as string | null,
    };
  });

  for (const key of ['page', 'pageSize', 'total', 'totalPages'] as const) {
    if (!isCount(json[key])) throw invalid(`${key} must be a non-negative integer`);
  }

  return {
    data,
    page: json.page as number,
    pageSize: json.pageSize as number,
    total: json.total as number,
    totalPages: json.totalPages as number,
  };
}
```

### tests
```ts
const contact = (over = {}) => ({
  id: 'ct_1',
  firstName: 'Ava',
  lastName: 'Nguyen',
  email: 'ava@example.com',
  status: 'lead',
  tags: ['vip'],
  companyId: 'co_1',
  ...over,
});
const page = (over = {}) => ({ data: [contact()], page: 1, pageSize: 20, total: 1, totalPages: 1, ...over });
const message = (value) => {
  try {
    user.parseContactPage(value);
  } catch (e) {
    return e.message;
  }
  return null;
};

test('accepts a valid page and returns the data', () => {
  const result = user.parseContactPage(page());
  expect(result).toEqual(page());
  expect(result.data[0].firstName).toBe('Ava');
});

test('accepts an empty page, a null companyId and extra fields', () => {
  expect(user.parseContactPage(page({ data: [], total: 0 })).data).toEqual([]);
  expect(user.parseContactPage(page({ data: [contact({ companyId: null })] })).data[0].companyId).toBeNull();
  expect(user.parseContactPage({ ...page(), extra: true }).total).toBe(1);
});

test('the root must be an object', () => {
  for (const bad of [null, undefined, 'text', 42, [], true]) {
    expect(message(bad)).toBe('Invalid response: expected an object');
  }
});

test('data must be an array', () => {
  expect(message(page({ data: 'nope' }))).toBe('Invalid response: data must be an array');
  expect(message({ page: 1 })).toBe('Invalid response: data must be an array');
});

test('each contact must be an object', () => {
  expect(message(page({ data: [contact(), null] }))).toBe('Invalid response: data[1] must be an object');
});

test('string fields are checked in order', () => {
  expect(message(page({ data: [contact({ id: 5 })] }))).toBe('Invalid response: data[0].id must be a string');
  expect(message(page({ data: [contact({ firstName: undefined })] }))).toBe('Invalid response: data[0].firstName must be a string');
  expect(message(page({ data: [contact(), contact({ email: null })] }))).toBe('Invalid response: data[1].email must be a string');
  expect(message(page({ data: [contact({ id: 1, email: 2 })] }))).toBe('Invalid response: data[0].id must be a string');
});

test('status must be one of the three', () => {
  expect(message(page({ data: [contact({ status: 'prospect' })] }))).toBe('Invalid response: data[0].status must be one of lead, customer, churned');
});

test('tags must be an array of strings', () => {
  expect(message(page({ data: [contact({ tags: 'vip' })] }))).toBe('Invalid response: data[0].tags must be an array of strings');
  expect(message(page({ data: [contact({ tags: ['a', 1] })] }))).toBe('Invalid response: data[0].tags must be an array of strings');
});

test('companyId must be a string or null', () => {
  expect(message(page({ data: [contact({ companyId: 7 })] }))).toBe('Invalid response: data[0].companyId must be a string or null');
  expect(message(page({ data: [contact({ companyId: undefined })] }))).toBe('Invalid response: data[0].companyId must be a string or null');
});

test('paging numbers must be non-negative integers', () => {
  expect(message(page({ page: '1' }))).toBe('Invalid response: page must be a non-negative integer');
  expect(message(page({ pageSize: 1.5 }))).toBe('Invalid response: pageSize must be a non-negative integer');
  expect(message(page({ total: -1 }))).toBe('Invalid response: total must be a non-negative integer');
  expect(message(page({ totalPages: NaN }))).toBe('Invalid response: totalPages must be a non-negative integer');
});

test('contact problems are reported before paging problems', () => {
  expect(message(page({ data: [contact({ id: 1 })], page: 'x' }))).toBe('Invalid response: data[0].id must be a string');
});

test('does not mutate the input', () => {
  const input = page();
  const before = JSON.stringify(input);
  user.parseContactPage(input);
  expect(JSON.stringify(input)).toBe(before);
});
```

### typetests
```ts
const parsed = parseContactPage({});
const first: Contact = parsed.data[0];
const status: 'lead' | 'customer' | 'churned' = first.status;
const total: number = parsed.total;
// @ts-expect-error status is a union, not any string
const bad: 'archived' = first.status;
```

### explanation
`JSON.parse` and `response.json()` return `any`, so a TypeScript type on an API response is a **promise, not a check**: if the backend changes a field, the compiler never notices and the bug surfaces as `undefined is not a function` somewhere far from the cause. Validating at the **boundary** (the one place where untrusted data enters your app) turns that into an immediate, specific error ("data[2].status must be one of ..."), and everything *inside* your app can then trust the types. Writing this by hand shows what schema libraries such as **Zod** do for you: `ContactPageSchema.parse(json)` validates and infers the TypeScript type from a single definition, so they cannot drift apart. The narrow type guards (`isObject`, `isCount`) are the building blocks.

### hints
- Write small guards: `isObject(v)` (not `null`, not an array) and `isCount(v)` (`Number.isInteger(v) && v >= 0`).
- Validate `data` with a loop or `map` so you know the index for each message.
- Check `STATUSES.includes(raw.status)` and `Array.isArray(raw.tags) && raw.tags.every(...)`.
- Throw on the first problem; only build and return the typed result after everything has passed.

# practice: An API client

### meta
minutes: 10
language: ts

### prompt
Write and export `ApiError` and `createApiClient({ baseUrl, fetchFn, getToken, onUnauthorized })`, returning `request(path, options?)`.

`options` is `{ method?: string; body?: unknown; query?: Record<string, string | number | boolean | null | undefined> }`.

- **URL:** `baseUrl + path`, plus `?` and an encoded query string built from `query`, **omitting** values that are `undefined`, `null` or `''`. No query means no `?`.
- **Method:** `GET` by default.
- **Headers:** always `Accept: application/json`; `Content-Type: application/json` only when a body is sent; `Authorization: Bearer <token>` only when `getToken()` returns a token.
- **Body:** `JSON.stringify(body)` when provided.
- **Response:** `204` resolves to `undefined`; otherwise the parsed JSON.
- **Errors:** a non-ok response throws `ApiError(status, message, fields?)`, where `message` is the JSON body's `error` string when present, otherwise `Request failed (<status>)`. A `401` also calls `onUnauthorized()` **before** throwing. If `fetchFn` itself rejects (offline), throw `ApiError(0, 'Network error')`.

### starter
```ts
export class ApiError extends Error {
  // TODO: status and optional fields
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchFn: (url: string, init: RequestInit) => Promise<Response>;
  getToken: () => string | null;
  onUnauthorized: () => void;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export function createApiClient(options: ApiClientOptions) {
  // TODO
  return {
    async request<T>(path: string, requestOptions: RequestOptions = {}): Promise<T> {
      return undefined as T;
    },
  };
}
```

### solution
```ts
export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchFn: (url: string, init: RequestInit) => Promise<Response>;
  getToken: () => string | null;
  onUnauthorized: () => void;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export function createApiClient({ baseUrl, fetchFn, getToken, onUnauthorized }: ApiClientOptions) {
  const buildUrl = (path: string, query: RequestOptions['query']) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    return baseUrl + path + (qs ? `?${qs}` : '');
  };

  return {
    async request<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const init: RequestInit = { method, headers };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }

      let res: Response;
      try {
        res = await fetchFn(buildUrl(path, query), init);
      } catch {
        throw new ApiError(0, 'Network error');
      }

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        let fields: Record<string, string> | undefined;
        try {
          const data = await res.json();
          if (data && typeof data.error === 'string') message = data.error;
          if (data && data.fields && typeof data.fields === 'object') fields = data.fields;
        } catch {
          /* body was not JSON */
        }
        if (res.status === 401) onUnauthorized();
        throw new ApiError(res.status, message, fields);
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },
  };
}
```

### tests
```ts
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status });
const setup = (respond = async () => json(200, { ok: true }), token = null) => {
  const fetchFn = fn(respond);
  const onUnauthorized = fn();
  const client = user.createApiClient({ baseUrl: 'https://api.test', fetchFn, getToken: () => token, onUnauthorized });
  return { client, fetchFn, onUnauthorized };
};

test('builds the URL from the base, path and query', async () => {
  const { client, fetchFn } = setup();
  await client.request('/contacts', { query: { page: 2, search: 'a b', status: undefined, tag: null, empty: '', done: false } });
  expect(fetchFn.calls[0][0]).toBe('https://api.test/contacts?page=2&search=a+b&done=false');
});

test('no query means no question mark', async () => {
  const { client, fetchFn } = setup();
  await client.request('/health');
  expect(fetchFn.calls[0][0]).toBe('https://api.test/health');
  await client.request('/health', { query: { a: undefined } });
  expect(fetchFn.calls[1][0]).toBe('https://api.test/health');
});

test('defaults to GET with an Accept header and no body', async () => {
  const { client, fetchFn } = setup();
  await client.request('/x');
  const init = fetchFn.calls[0][1];
  expect(init.method).toBe('GET');
  expect(init.headers.Accept).toBe('application/json');
  expect(init.headers['Content-Type']).toBeUndefined();
  expect(init.body).toBeUndefined();
});

test('sends JSON bodies with a content type', async () => {
  const { client, fetchFn } = setup();
  await client.request('/contacts', { method: 'POST', body: { name: 'Ava' } });
  const init = fetchFn.calls[0][1];
  expect(init.method).toBe('POST');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(init.body)).toEqual({ name: 'Ava' });
});

test('attaches the bearer token only when there is one', async () => {
  const withToken = setup(undefined, 'abc123');
  await withToken.client.request('/x');
  expect(withToken.fetchFn.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  const without = setup();
  await without.client.request('/x');
  expect(without.fetchFn.calls[0][1].headers.Authorization).toBeUndefined();
});

test('returns parsed JSON, and undefined for 204', async () => {
  const ok = setup(async () => json(200, { id: 1 }));
  expect(await ok.client.request('/x')).toEqual({ id: 1 });
  const empty = setup(async () => new Response(null, { status: 204 }));
  expect(await empty.client.request('/x', { method: 'DELETE' })).toBeUndefined();
});

test('non-ok responses throw an ApiError with the server message and fields', async () => {
  const { client } = setup(async () => json(400, { error: 'Validation failed', fields: { email: 'Email is not valid' } }));
  let caught;
  try {
    await client.request('/contacts', { method: 'POST', body: {} });
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(user.ApiError);
  expect(caught).toBeInstanceOf(Error);
  expect(caught.status).toBe(400);
  expect(caught.message).toBe('Validation failed');
  expect(caught.fields).toEqual({ email: 'Email is not valid' });
});

test('a non-JSON error body falls back to a generic message', async () => {
  const { client } = setup(async () => new Response('<html>Bad gateway</html>', { status: 502 }));
  let caught;
  try {
    await client.request('/x');
  } catch (e) {
    caught = e;
  }
  expect(caught.status).toBe(502);
  expect(caught.message).toBe('Request failed (502)');
  expect(caught.fields).toBeUndefined();
});

test('a 401 calls onUnauthorized and still throws', async () => {
  const { client, onUnauthorized } = setup(async () => json(401, { error: 'Missing or invalid token' }));
  let caught;
  try {
    await client.request('/auth/me');
  } catch (e) {
    caught = e;
  }
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
  expect(caught.status).toBe(401);
  expect(caught.message).toBe('Missing or invalid token');
});

test('other errors do not call onUnauthorized', async () => {
  const { client, onUnauthorized } = setup(async () => json(500, { error: 'boom' }));
  try {
    await client.request('/x');
  } catch {
    /* expected */
  }
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test('a network failure becomes an ApiError with status 0', async () => {
  const { client } = setup(async () => {
    throw new TypeError('Failed to fetch');
  });
  let caught;
  try {
    await client.request('/x');
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(user.ApiError);
  expect(caught.status).toBe(0);
  expect(caught.message).toBe('Network error');
});
```

### typetests
```ts
async function check() {
  const client = createApiClient({ baseUrl: '', fetchFn: async () => new Response(), getToken: () => null, onUnauthorized: () => {} });
  const n = await client.request<{ id: number }>('/x', { query: { a: 1, b: 'x', c: null } });
  const id: number = n.id;
  // @ts-expect-error query values must be primitives
  await client.request('/x', { query: { a: { nested: true } } });
}
const err = new ApiError(404, 'nope');
const status: number = err.status;
```

### explanation
All network access goes through one function, so every concern from Days 14 to 20 lives in one tested place: building URLs with a properly **encoded** query string (`URLSearchParams` also turns spaces into `+`), setting headers conditionally, parsing the body, mapping failures to a typed `ApiError`, and handling a `401` globally so no component has to remember to. Distinguishing a *network* failure (status `0`) from an *HTTP* error lets the UI say "you appear to be offline" instead of "server error". Injecting `fetchFn`, `getToken` and `onUnauthorized` keeps the client free of globals, which is why it can be tested without a network, a browser, or a login.

### hints
- Build the query string with `URLSearchParams`, skipping `undefined`, `null` and `''`.
- Start `headers` with `Accept`, then add `Authorization` and `Content-Type` conditionally.
- Wrap `await fetchFn(...)` in `try/catch` and throw `new ApiError(0, 'Network error')`.
- For errors: try to `await res.json()` inside `try/catch`; call `onUnauthorized()` for `401` before throwing.

# practice: A reducer for an optimistic list

### meta
minutes: 9
language: ts

### prompt
Write and export the pure `listReducer(state, action)` that powers an optimistic list of contacts.

```ts
type Item = { id: string; name: string; status: 'saved' | 'pending' | 'failed'; error?: string };
type Action =
  | { type: 'loaded'; items: { id: string; name: string }[] }        // replace everything with saved items
  | { type: 'add_pending'; tempId: string; name: string }            // append a pending item whose id is tempId
  | { type: 'confirm'; tempId: string; item: { id: string; name: string } }   // replace the pending item (same position) with the saved one
  | { type: 'fail'; tempId: string; error: string }                  // mark the item failed and keep the error
  | { type: 'dismiss'; tempId: string }                              // remove a failed item
  | { type: 'remove'; id: string }                                   // remove an item
  | { type: 'restore'; item: Item; index: number };                  // put an item back at index (clamped), as saved
```

Rules: never mutate; when an action changes nothing (unknown id, `restore` of an id already present) return the **same state array**.

### starter
```ts
export interface Item {
  id: string;
  name: string;
  status: 'saved' | 'pending' | 'failed';
  error?: string;
}

export type Action =
  | { type: 'loaded'; items: { id: string; name: string }[] }
  | { type: 'add_pending'; tempId: string; name: string }
  | { type: 'confirm'; tempId: string; item: { id: string; name: string } }
  | { type: 'fail'; tempId: string; error: string }
  | { type: 'dismiss'; tempId: string }
  | { type: 'remove'; id: string }
  | { type: 'restore'; item: Item; index: number };

export function listReducer(state: Item[], action: Action): Item[] {
  // TODO
  return state;
}
```

### solution
```ts
export interface Item {
  id: string;
  name: string;
  status: 'saved' | 'pending' | 'failed';
  error?: string;
}

export type Action =
  | { type: 'loaded'; items: { id: string; name: string }[] }
  | { type: 'add_pending'; tempId: string; name: string }
  | { type: 'confirm'; tempId: string; item: { id: string; name: string } }
  | { type: 'fail'; tempId: string; error: string }
  | { type: 'dismiss'; tempId: string }
  | { type: 'remove'; id: string }
  | { type: 'restore'; item: Item; index: number };

export function listReducer(state: Item[], action: Action): Item[] {
  switch (action.type) {
    case 'loaded':
      return action.items.map((i) => ({ id: i.id, name: i.name, status: 'saved' as const }));

    case 'add_pending':
      if (state.some((i) => i.id === action.tempId)) return state;
      return [...state, { id: action.tempId, name: action.name, status: 'pending' }];

    case 'confirm':
      if (!state.some((i) => i.id === action.tempId)) return state;
      return state.map((i) => (i.id === action.tempId ? { id: action.item.id, name: action.item.name, status: 'saved' as const } : i));

    case 'fail':
      if (!state.some((i) => i.id === action.tempId)) return state;
      return state.map((i) => (i.id === action.tempId ? { ...i, status: 'failed' as const, error: action.error } : i));

    case 'dismiss':
      return state.some((i) => i.id === action.tempId) ? state.filter((i) => i.id !== action.tempId) : state;

    case 'remove':
      return state.some((i) => i.id === action.id) ? state.filter((i) => i.id !== action.id) : state;

    case 'restore': {
      if (state.some((i) => i.id === action.item.id)) return state;
      const index = Math.min(Math.max(0, action.index), state.length);
      const restored: Item = { id: action.item.id, name: action.item.name, status: 'saved' };
      return [...state.slice(0, index), restored, ...state.slice(index)];
    }
  }
}
```

### tests
```ts
const saved = (id, name) => ({ id, name, status: 'saved' });
const base = () => [saved('a', 'Ava'), saved('b', 'Liam'), saved('c', 'Mia')];

test('loaded replaces everything with saved items', () => {
  const result = user.listReducer([{ id: 'x', name: 'old', status: 'pending' }], { type: 'loaded', items: [{ id: 'a', name: 'Ava' }, { id: 'b', name: 'Liam' }] });
  expect(result).toEqual([saved('a', 'Ava'), saved('b', 'Liam')]);
});

test('add_pending appends a pending item', () => {
  const result = user.listReducer(base(), { type: 'add_pending', tempId: 'tmp-1', name: 'Noah' });
  expect(result).toHaveLength(4);
  expect(result[3]).toEqual({ id: 'tmp-1', name: 'Noah', status: 'pending' });
});

test('add_pending with an existing temp id changes nothing', () => {
  const state = user.listReducer(base(), { type: 'add_pending', tempId: 'tmp-1', name: 'Noah' });
  expect(user.listReducer(state, { type: 'add_pending', tempId: 'tmp-1', name: 'Again' })).toBe(state);
});

test('confirm swaps the pending item for the saved one in place', () => {
  let state = user.listReducer(base(), { type: 'add_pending', tempId: 'tmp-1', name: 'Noah' });
  state = user.listReducer(state, { type: 'add_pending', tempId: 'tmp-2', name: 'Zoe' });
  const result = user.listReducer(state, { type: 'confirm', tempId: 'tmp-1', item: { id: 'srv-9', name: 'Noah' } });
  expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c', 'srv-9', 'tmp-2']);
  expect(result[3]).toEqual(saved('srv-9', 'Noah'));
  expect(result[4].status).toBe('pending');
});

test('confirm for an unknown temp id changes nothing', () => {
  const state = base();
  expect(user.listReducer(state, { type: 'confirm', tempId: 'nope', item: { id: 'x', name: 'x' } })).toBe(state);
});

test('fail marks one item as failed and keeps the message', () => {
  const state = user.listReducer(base(), { type: 'add_pending', tempId: 'tmp-1', name: 'Noah' });
  const result = user.listReducer(state, { type: 'fail', tempId: 'tmp-1', error: 'Network error' });
  expect(result[3]).toEqual({ id: 'tmp-1', name: 'Noah', status: 'failed', error: 'Network error' });
  expect(result[0]).toBe(state[0]);
});

test('fail for an unknown id changes nothing', () => {
  const state = base();
  expect(user.listReducer(state, { type: 'fail', tempId: 'nope', error: 'x' })).toBe(state);
});

test('dismiss removes the item, or changes nothing if missing', () => {
  const state = user.listReducer(base(), { type: 'add_pending', tempId: 'tmp-1', name: 'Noah' });
  expect(user.listReducer(state, { type: 'dismiss', tempId: 'tmp-1' }).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  const same = base();
  expect(user.listReducer(same, { type: 'dismiss', tempId: 'nope' })).toBe(same);
});

test('remove deletes by id, or changes nothing if missing', () => {
  expect(user.listReducer(base(), { type: 'remove', id: 'b' }).map((i) => i.id)).toEqual(['a', 'c']);
  const state = base();
  expect(user.listReducer(state, { type: 'remove', id: 'zzz' })).toBe(state);
});

test('restore puts an item back at its index as saved', () => {
  const state = user.listReducer(base(), { type: 'remove', id: 'b' });
  const result = user.listReducer(state, { type: 'restore', item: saved('b', 'Liam'), index: 1 });
  expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  expect(result[1]).toEqual(saved('b', 'Liam'));
});

test('restore clamps the index', () => {
  const state = [saved('a', 'Ava')];
  expect(user.listReducer(state, { type: 'restore', item: saved('z', 'Zoe'), index: 99 }).map((i) => i.id)).toEqual(['a', 'z']);
  expect(user.listReducer(state, { type: 'restore', item: saved('y', 'Yan'), index: -5 }).map((i) => i.id)).toEqual(['y', 'a']);
});

test('restore of an item that is already present changes nothing', () => {
  const state = base();
  expect(user.listReducer(state, { type: 'restore', item: saved('a', 'Ava'), index: 0 })).toBe(state);
});

test('never mutates its input', () => {
  const state = base();
  const snapshot = JSON.stringify(state);
  user.listReducer(state, { type: 'add_pending', tempId: 't', name: 'x' });
  user.listReducer(state, { type: 'remove', id: 'a' });
  user.listReducer(state, { type: 'fail', tempId: 'a', error: 'e' });
  user.listReducer(state, { type: 'restore', item: saved('q', 'Q'), index: 0 });
  expect(JSON.stringify(state)).toBe(snapshot);
});
```

### typetests
```ts
const s = listReducer([], { type: 'loaded', items: [] });
// @ts-expect-error unknown action
listReducer([], { type: 'exploded' });
// @ts-expect-error fail needs an error message
listReducer([], { type: 'fail', tempId: 'x' });
// @ts-expect-error restore needs an index
listReducer([], { type: 'restore', item: { id: 'a', name: 'A', status: 'saved' } });
```

### explanation
An optimistic list has a lifecycle for each item: **pending → saved** or **pending → failed**, plus removal with a possible rollback. Modelling that as a reducer keeps every rule in one pure, testable function and gives the UI a single source of truth. Two details matter. First, `confirm` swaps the item **in place**, so the row does not jump when the server answers. Second, `restore` re-inserts at the original index (clamped, because the list may have changed since), and every no-op returns the *same array*, which lets React skip re-rendering. Compare this with the Day 16 challenge: there the logic lived inside a component; here it is a reducer you can verify without any UI.

### hints
- `switch (action.type)` with one `case` per action.
- For no-ops, check first with `state.some(...)` and return `state`.
- `confirm`: `state.map((i) => (i.id === tempId ? { ...savedItem, status: 'saved' } : i))`.
- `restore`: clamp with `Math.min(Math.max(0, index), state.length)` and splice via `slice`.

# challenge: The contacts mini-app

### meta
minutes: 10
language: tsx

### prompt
Build `ContactsApp({ api })`, using the ideas from the whole course. `api` is:

```ts
{ list(): Promise<Contact[]>; create(input: { name: string }): Promise<Contact>; remove(id: string): Promise<void> }   // Contact = { id; name }
```

**Loading:** `<p>Loading contacts…</p>` first. If `list()` rejects: `<p role="alert">Could not load contacts</p>` and a **Retry** button that loads again.

**Ready:**

- `<h1>Contacts (N)</h1>` where N is the number of items that are not `failed`.
- A search input (`aria-label="Search"`) filtering by name (case-insensitive). Show `<p>No contacts yet</p>` when there are no items at all, or `<p>No matches</p>` when the search hides everything.
- A `<ul>` with an `<li>` per visible item containing `<span>{name}</span>`, and:
  - **pending** items: `<small>Saving…</small>` (no Remove button),
  - **failed** items: `<small role="alert">Could not save</small>` and a **Dismiss** button,
  - **saved** items: `<button aria-label="Remove {name}">Remove</button>`.
- An add form: input `aria-label="Name"` and an **Add** button. Blank names are ignored. Submitting **immediately** appends a pending item, clears the input and calls `api.create({ name })` (trimmed); on success the item becomes saved with the server's data (in place); on failure it becomes failed.
- **Remove is optimistic:** the item disappears at once and `api.remove(id)` is called; if it fails the item is **restored at its original position** and `<p role="alert">Could not remove {name}</p>` appears (cleared when the next add or remove starts).

### starter
```tsx
import { useEffect, useReducer, useRef, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
}
export interface Api {
  list(): Promise<Contact[]>;
  create(input: { name: string }): Promise<Contact>;
  remove(id: string): Promise<void>;
}

interface Item {
  id: string;
  name: string;
  status: 'saved' | 'pending' | 'failed';
  error?: string;
}
type Action =
  | { type: 'loaded'; items: Contact[] }
  | { type: 'add_pending'; tempId: string; name: string }
  | { type: 'confirm'; tempId: string; item: Contact }
  | { type: 'fail'; tempId: string; error: string }
  | { type: 'dismiss'; tempId: string }
  | { type: 'remove'; id: string }
  | { type: 'restore'; item: Item; index: number };

function listReducer(state: Item[], action: Action): Item[] {
  // TODO: reuse the reducer you wrote in the previous exercise
  return state;
}

export function ContactsApp({ api }: { api: Api }) {
  // TODO
  return <p>Loading contacts…</p>;
}

export default ContactsApp;
```

### solution
```tsx
import { useEffect, useReducer, useRef, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
}
export interface Api {
  list(): Promise<Contact[]>;
  create(input: { name: string }): Promise<Contact>;
  remove(id: string): Promise<void>;
}

interface Item {
  id: string;
  name: string;
  status: 'saved' | 'pending' | 'failed';
  error?: string;
}
type Action =
  | { type: 'loaded'; items: Contact[] }
  | { type: 'add_pending'; tempId: string; name: string }
  | { type: 'confirm'; tempId: string; item: Contact }
  | { type: 'fail'; tempId: string; error: string }
  | { type: 'dismiss'; tempId: string }
  | { type: 'remove'; id: string }
  | { type: 'restore'; item: Item; index: number };

function listReducer(state: Item[], action: Action): Item[] {
  switch (action.type) {
    case 'loaded':
      return action.items.map((i) => ({ id: i.id, name: i.name, status: 'saved' as const }));
    case 'add_pending':
      return state.some((i) => i.id === action.tempId) ? state : [...state, { id: action.tempId, name: action.name, status: 'pending' }];
    case 'confirm':
      return state.some((i) => i.id === action.tempId)
        ? state.map((i) => (i.id === action.tempId ? { id: action.item.id, name: action.item.name, status: 'saved' as const } : i))
        : state;
    case 'fail':
      return state.some((i) => i.id === action.tempId)
        ? state.map((i) => (i.id === action.tempId ? { ...i, status: 'failed' as const, error: action.error } : i))
        : state;
    case 'dismiss':
      return state.some((i) => i.id === action.tempId) ? state.filter((i) => i.id !== action.tempId) : state;
    case 'remove':
      return state.some((i) => i.id === action.id) ? state.filter((i) => i.id !== action.id) : state;
    case 'restore': {
      if (state.some((i) => i.id === action.item.id)) return state;
      const index = Math.min(Math.max(0, action.index), state.length);
      return [...state.slice(0, index), { id: action.item.id, name: action.item.name, status: 'saved' }, ...state.slice(index)];
    }
  }
}

type Load = 'loading' | 'error' | 'ready';

export function ContactsApp({ api }: { api: Api }) {
  const [load, setLoad] = useState<Load>('loading');
  const [attempt, setAttempt] = useState(0);
  const [items, dispatch] = useReducer(listReducer, []);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [removeError, setRemoveError] = useState<string | null>(null);
  const counter = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let ignore = false;
    setLoad('loading');
    api.list().then(
      (list) => {
        if (ignore) return;
        dispatch({ type: 'loaded', items: list });
        setLoad('ready');
      },
      () => {
        if (!ignore) setLoad('error');
      },
    );
    return () => {
      ignore = true;
    };
  }, [api, attempt]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const tempId = `tmp-${++counter.current}`;
    setRemoveError(null);
    dispatch({ type: 'add_pending', tempId, name: trimmed });
    setName('');
    api.create({ name: trimmed }).then(
      (item) => dispatch({ type: 'confirm', tempId, item }),
      (err: unknown) => dispatch({ type: 'fail', tempId, error: err instanceof Error ? err.message : 'Could not save' }),
    );
  };

  const remove = (item: Item) => {
    const index = itemsRef.current.findIndex((i) => i.id === item.id);
    setRemoveError(null);
    dispatch({ type: 'remove', id: item.id });
    api.remove(item.id).catch(() => {
      dispatch({ type: 'restore', item, index });
      setRemoveError(`Could not remove ${item.name}`);
    });
  };

  if (load === 'loading') return <p>Loading contacts…</p>;
  if (load === 'error') {
    return (
      <div>
        <p role="alert">Could not load contacts</p>
        <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = items.filter((i) => i.name.toLowerCase().includes(q));
  const count = items.filter((i) => i.status !== 'failed').length;

  return (
    <div>
      <h1>Contacts ({count})</h1>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <form onSubmit={add}>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      {removeError && <p role="alert">{removeError}</p>}
      {items.length === 0 ? (
        <p>No contacts yet</p>
      ) : visible.length === 0 ? (
        <p>No matches</p>
      ) : (
        <ul>
          {visible.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              {item.status === 'pending' && <small>Saving…</small>}
              {item.status === 'failed' && (
                <>
                  <small role="alert">Could not save</small>
                  <button onClick={() => dispatch({ type: 'dismiss', tempId: item.id })}>Dismiss</button>
                </>
              )}
              {item.status === 'saved' && (
                <button aria-label={`Remove ${item.name}`} onClick={() => remove(item)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ContactsApp;
```

### tests
```tsx
const make = (initial = [{ id: 'a', name: 'Ava' }, { id: 'b', name: 'Liam' }, { id: 'c', name: 'Mia' }]) => {
  const lists = [];
  const creates = [];
  const removes = [];
  const api = {
    list: fn(() => new Promise((resolve, reject) => lists.push({ resolve, reject }))),
    create: fn((input) => new Promise((resolve, reject) => creates.push({ input, resolve, reject }))),
    remove: fn((id) => new Promise((resolve, reject) => removes.push({ id, resolve, reject }))),
  };
  return { api, lists, creates, removes, initial };
};
const mount = async (ctx, { resolveList = true } = {}) => {
  const view = await render(<user.ContactsApp api={ctx.api} />);
  if (resolveList) {
    ctx.lists[0].resolve(ctx.initial);
    await flush();
  }
  return view;
};
const names = (view) => view.$$('li').map((li) => li.querySelector('span').textContent);
const heading = (view) => view.$('h1').textContent;
const addContact = async (view, text) => {
  await type(view.getByRole('textbox', { name: 'Name' }), text);
  await submit(view.$('form'));
};

test('shows loading, then the contacts with a count', async () => {
  const ctx = make();
  const view = await mount(ctx, { resolveList: false });
  expect(view.$('p').textContent).toBe('Loading contacts…');
  ctx.lists[0].resolve(ctx.initial);
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia']);
  expect(heading(view)).toBe('Contacts (3)');
});

test('a failed load shows an error with Retry', async () => {
  const ctx = make();
  const view = await render(<user.ContactsApp api={ctx.api} />);
  ctx.lists[0].reject(new Error('down'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Could not load contacts');
  await click(view.getByRole('button', { name: 'Retry' }));
  expect(view.$('p').textContent).toBe('Loading contacts…');
  expect(ctx.api.list).toHaveBeenCalledTimes(2);
  ctx.lists[1].resolve([{ id: 'z', name: 'Zoe' }]);
  await flush();
  expect(names(view)).toEqual(['Zoe']);
});

test('empty and no-match states', async () => {
  const empty = await mount(make([]));
  expect(empty.$('p').textContent).toBe('No contacts yet');
  expect(heading(empty)).toBe('Contacts (0)');
  const view = await mount(make());
  await type(view.getByRole('textbox', { name: 'Search' }), 'zzz');
  expect(view.$$('p').map((p) => p.textContent)).toEqual(['No matches']);
});

test('search filters by name, ignoring case', async () => {
  const view = await mount(make());
  await type(view.getByRole('textbox', { name: 'Search' }), 'MI');
  expect(names(view)).toEqual(['Mia']);
  await type(view.getByRole('textbox', { name: 'Search' }), '');
  expect(names(view)).toHaveLength(3);
});

test('adding shows a pending item immediately and clears the input', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await addContact(view, '  Noah ');
  expect(ctx.api.create).toHaveBeenCalledTimes(1);
  expect(ctx.creates[0].input).toEqual({ name: 'Noah' });
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia', 'Noah']);
  const li = view.$$('li')[3];
  expect(li.querySelector('small').textContent).toBe('Saving…');
  expect(li.querySelector('button')).toBeNull();
  expect(view.getByRole('textbox', { name: 'Name' }).value).toBe('');
});

test('a successful add becomes saved with the server data, in place', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await addContact(view, 'Noah');
  await addContact(view, 'Zoe');
  ctx.creates[1].resolve({ id: 'srv-2', name: 'Zoe' });
  ctx.creates[0].resolve({ id: 'srv-1', name: 'Noah' });
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia', 'Noah', 'Zoe']);
  expect(view.$$('small')).toHaveLength(0);
  expect(view.getByRole('button', { name: 'Remove Noah' })).toBeTruthy();
});

test('a failed add can be dismissed and is not counted', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await addContact(view, 'Noah');
  expect(heading(view)).toBe('Contacts (4)');
  ctx.creates[0].reject(new Error('Network error'));
  await flush();
  expect(view.$$('li')[3].querySelector('small').textContent).toBe('Could not save');
  expect(heading(view)).toBe('Contacts (3)');
  await click(view.getByRole('button', { name: 'Dismiss' }));
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia']);
});

test('blank names are ignored', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await addContact(view, '   ');
  expect(ctx.api.create).not.toHaveBeenCalled();
  expect(names(view)).toHaveLength(3);
});

test('removing is optimistic and calls the API', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await click(view.getByRole('button', { name: 'Remove Liam' }));
  expect(names(view)).toEqual(['Ava', 'Mia']);
  expect(heading(view)).toBe('Contacts (2)');
  expect(ctx.api.remove).toHaveBeenCalledWith('b');
  ctx.removes[0].resolve();
  await flush();
  expect(names(view)).toEqual(['Ava', 'Mia']);
  expect(view.$('[role=alert]')).toBeNull();
});

test('a failed removal restores the contact at its position and explains', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await click(view.getByRole('button', { name: 'Remove Liam' }));
  ctx.removes[0].reject(new Error('500'));
  await flush();
  expect(names(view)).toEqual(['Ava', 'Liam', 'Mia']);
  expect(view.$('[role=alert]').textContent).toBe('Could not remove Liam');
  expect(heading(view)).toBe('Contacts (3)');
});

test('the removal error clears when the next action starts', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await click(view.getByRole('button', { name: 'Remove Liam' }));
  ctx.removes[0].reject(new Error('500'));
  await flush();
  await click(view.getByRole('button', { name: 'Remove Mia' }));
  expect(view.$('[role=alert]')).toBeNull();
});

test('concurrent removals: a failure only restores its own contact', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await click(view.getByRole('button', { name: 'Remove Ava' }));
  await click(view.getByRole('button', { name: 'Remove Mia' }));
  ctx.removes[1].reject(new Error('fail'));
  await flush();
  expect(names(view)).toEqual(['Liam', 'Mia']);
  ctx.removes[0].resolve();
  await flush();
  expect(names(view)).toEqual(['Liam', 'Mia']);
});

test('search applies to pending items too', async () => {
  const ctx = make();
  const view = await mount(ctx);
  await addContact(view, 'Noah');
  await type(view.getByRole('textbox', { name: 'Search' }), 'noa');
  expect(names(view)).toEqual(['Noah']);
  expect(view.$('small').textContent).toBe('Saving…');
});
```

### typetests
```tsx
const api: Api = { list: async () => [], create: async (i) => ({ id: '1', name: i.name }), remove: async () => {} };
const ok = <ContactsApp api={api} />;
// @ts-expect-error api is required
const bad1 = <ContactsApp />;
// @ts-expect-error api methods are required
const bad2 = <ContactsApp api={{ list: async () => [] }} />;
```

### explanation
This capstone is the whole course in one component. **State** is minimal: the reducer owns the list (with each item's lifecycle: saved, pending, failed), while `load`, `query`, `name` and `removeError` are small, separate concerns, and the heading, filtered list and counts are all *derived*. **Effects** appear once, for loading, with the `ignore` cleanup from Day 8. **Mutations** are optimistic: adding appends a pending item and confirms it *in place*, so rows do not jump; removing deletes at once and restores *only that item* at its remembered index if the server refuses, which keeps concurrent operations independent. **UX** covers every state (loading, error with Retry, empty, no matches, saving, failed) and explains rollbacks. **Accessibility** shows in the labels and the `role="alert"` messages. Everything is injected through `api`, which is why it is testable without a network. The same structure, with TanStack Query in place of the hand-written loading and mutations, is what you would build in production.

### hints
- Reuse the reducer from the previous exercise; keep a `useRef` counter for temporary ids (`tmp-1`, `tmp-2`, ...).
- Load in `useEffect` with an `ignore` flag; a `attempt` counter in the dependencies powers Retry.
- Before removing, find the item's index in the **current** list (a ref helps) so you can `restore` it there.
- Derive the heading count and the filtered list during render instead of storing them.
