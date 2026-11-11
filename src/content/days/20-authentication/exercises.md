# practice: Read a JWT

### meta
minutes: 7
language: ts

### prompt
A JWT looks like `header.payload.signature`; each part is base64url-encoded. Write and export:

- `decodeJwt(token)`: returns the parsed **payload** object, or `null` if the token is malformed (wrong number of parts, bad base64, or the payload is not JSON).
- `isExpired(token, nowMs = Date.now())`: `true` when the token's `exp` claim (seconds since the epoch) is **at or before** the current time. A token with no `exp` never expires (`false`). A malformed token counts as expired (`true`).

base64url uses `-` and `_` instead of `+` and `/` and omits `=` padding. You do **not** need to verify the signature (only a server can).

### starter
```ts
export function decodeJwt(token: string): Record<string, unknown> | null {
  // TODO
  return null;
}

export function isExpired(token: string, nowMs: number = Date.now()): boolean {
  // TODO
  return true;
}
```

### solution
```ts
export function decodeJwt(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const payload = JSON.parse(json);
    return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function isExpired(token: string, nowMs: number = Date.now()): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= nowMs;
}
```

### tests
```ts
const b64url = (obj) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeToken = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`;

test('decodes the payload', () => {
  const token = makeToken({ sub: 'us_001', name: 'Ava', role: 'admin' });
  expect(user.decodeJwt(token)).toEqual({ sub: 'us_001', name: 'Ava', role: 'admin' });
});

test('handles unicode and base64url characters', () => {
  const payload = { name: 'Zoë Ñoño ✓', data: '??>>' };
  expect(user.decodeJwt(makeToken(payload))).toEqual(payload);
});

test('malformed tokens decode to null', () => {
  expect(user.decodeJwt('')).toBeNull();
  expect(user.decodeJwt('only.two')).toBeNull();
  expect(user.decodeJwt('a.b.c.d')).toBeNull();
  expect(user.decodeJwt('aaa.!!!notbase64!!!.ccc')).toBeNull();
  expect(user.decodeJwt('aaa.' + btoa('not json') + '.ccc')).toBeNull();
});

test('a payload that is not an object is rejected', () => {
  expect(user.decodeJwt('aaa.' + btoa('[1,2]') + '.ccc')).toBeNull();
  expect(user.decodeJwt('aaa.' + btoa('42') + '.ccc')).toBeNull();
});

test('isExpired compares exp (seconds) with now (milliseconds)', () => {
  const token = makeToken({ exp: 1000 });
  expect(user.isExpired(token, 999_999)).toBe(false);
  expect(user.isExpired(token, 1_000_000)).toBe(true);
  expect(user.isExpired(token, 5_000_000)).toBe(true);
});

test('a token without exp never expires', () => {
  expect(user.isExpired(makeToken({ sub: 'x' }), 9e15)).toBe(false);
});

test('a malformed token counts as expired', () => {
  expect(user.isExpired('garbage')).toBe(true);
});

test('uses the real clock by default', () => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  const past = Math.floor(Date.now() / 1000) - 3600;
  expect(user.isExpired(makeToken({ exp: future }))).toBe(false);
  expect(user.isExpired(makeToken({ exp: past }))).toBe(true);
});
```

### typetests
```ts
const p: Record<string, unknown> | null = decodeJwt('a.b.c');
const e: boolean = isExpired('a.b.c');
const e2: boolean = isExpired('a.b.c', 123);
// @ts-expect-error the token is a string
decodeJwt(123);
```

### explanation
A JWT payload is **encoded, not encrypted**: anyone can read it, which is why you must never put secrets in one, and why the client may *decode* a token to show a name or check expiry but must never *trust* it for security. Decoding means restoring the base64url alphabet and padding, then converting bytes to UTF-8 text before `JSON.parse`. `exp` is in **seconds** while `Date.now()` is in **milliseconds**, the classic off-by-1000 bug. Treating malformed tokens as expired is the safe default: when in doubt, ask the user to sign in again.

### hints
- Split on `.`; the payload is `parts[1]`.
- Replace `-` with `+` and `_` with `/`, then pad with `=` until the length is a multiple of 4.
- `atob` gives a binary string; convert it to UTF-8 with `decodeURIComponent` (see the solution for one way).
- `payload.exp * 1000 <= nowMs`

# practice: An auth provider

### meta
minutes: 9
language: tsx

### prompt
Build an authentication context.

`AuthProvider({ loginApi, storage, children })`:

- `loginApi(email, password)` returns `Promise<{ token: string; user: { id, name } }>` (it rejects on bad credentials).
- On first render, **restore** the session from `storage.getItem('session')` (JSON `{ token, user }`); ignore invalid JSON.
- `login(email, password)` calls `loginApi`; on success stores the session JSON under `'session'` and updates state; on failure it **rethrows** and leaves state untouched.
- `logout()` removes the stored session (`storage.removeItem('session')`) and clears the state.

`useAuth()` returns `{ user, token, login, logout }` and throws `Error('useAuth must be used inside <AuthProvider>')` outside a provider.

### starter
```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
}
export interface Session {
  token: string;
  user: User;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
interface AuthValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  loginApi,
  storage,
  children,
}: {
  loginApi: (email: string, password: string) => Promise<Session>;
  storage: StorageLike;
  children: ReactNode;
}) {
  // TODO
  return <>{children}</>;
}

export function useAuth(): AuthValue {
  // TODO
  return {} as AuthValue;
}

export function Status() {
  const { user, logout } = useAuth();
  return user ? <button onClick={logout}>Log out {user.name}</button> : <p>Signed out</p>;
}
```

### solution
```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
}
export interface Session {
  token: string;
  user: User;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
interface AuthValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(storage: StorageLike): Session | null {
  try {
    const raw = storage.getItem('session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.token === 'string' && parsed.user ? (parsed as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({
  loginApi,
  storage,
  children,
}: {
  loginApi: (email: string, password: string) => Promise<Session>;
  storage: StorageLike;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(() => readSession(storage));

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginApi(email, password);
      storage.setItem('session', JSON.stringify(result));
      setSession(result);
    },
    [loginApi, storage],
  );

  const logout = useCallback(() => {
    storage.removeItem('session');
    setSession(null);
  }, [storage]);

  const value = useMemo<AuthValue>(
    () => ({ user: session?.user ?? null, token: session?.token ?? null, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function Status() {
  const { user, logout } = useAuth();
  return user ? <button onClick={logout}>Log out {user.name}</button> : <p>Signed out</p>;
}
```

### tests
```tsx
const makeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
};
const session = { token: 't-123', user: { id: 'u1', name: 'Ava' } };
const mount = (storage, loginApi) =>
  render(
    <user.AuthProvider loginApi={loginApi} storage={storage}>
      <user.Status />
    </user.AuthProvider>,
  );

test('starts signed out when nothing is stored', async () => {
  const view = await mount(makeStorage(), async () => session);
  expect(view.$('p').textContent).toBe('Signed out');
});

test('restores a stored session on first render', async () => {
  const view = await mount(makeStorage({ session: JSON.stringify(session) }), async () => session);
  expect(view.$('button').textContent).toBe('Log out Ava');
});

test('ignores a corrupt stored session', async () => {
  const view = await mount(makeStorage({ session: '{nope' }), async () => session);
  expect(view.$('p').textContent).toBe('Signed out');
});

test('login stores the session and updates the context', async () => {
  const storage = makeStorage();
  const loginApi = fn(async () => session);
  let auth;
  function Probe() {
    auth = user.useAuth();
    return <user.Status />;
  }
  const view = await render(
    <user.AuthProvider loginApi={loginApi} storage={storage}>
      <Probe />
    </user.AuthProvider>,
  );
  await auth.login('ava@example.com', 'secret');
  await flush();
  expect(loginApi).toHaveBeenCalledWith('ava@example.com', 'secret');
  expect(JSON.parse(storage.data.session)).toEqual(session);
  expect(view.$('button').textContent).toBe('Log out Ava');
  expect(auth.token).toBe('t-123');
  expect(auth.user).toEqual(session.user);
});

test('a failed login rethrows and changes nothing', async () => {
  const storage = makeStorage();
  let auth;
  function Probe() {
    auth = user.useAuth();
    return <user.Status />;
  }
  const view = await render(
    <user.AuthProvider
      loginApi={async () => {
        throw new Error('Invalid credentials');
      }}
      storage={storage}
    >
      <Probe />
    </user.AuthProvider>,
  );
  let message = '';
  try {
    await auth.login('a', 'b');
  } catch (e) {
    message = e.message;
  }
  await flush();
  expect(message).toBe('Invalid credentials');
  expect(storage.data.session).toBeUndefined();
  expect(view.$('p').textContent).toBe('Signed out');
});

test('logout clears the state and the storage', async () => {
  const storage = makeStorage({ session: JSON.stringify(session) });
  const view = await mount(storage, async () => session);
  await click(view.$('button'));
  expect(view.$('p').textContent).toBe('Signed out');
  expect(storage.data.session).toBeUndefined();
});

test('useAuth throws outside the provider', async () => {
  let message = '';
  function Probe() {
    try {
      user.useAuth();
    } catch (e) {
      message = e.message;
    }
    return null;
  }
  await render(<Probe />);
  expect(message).toBe('useAuth must be used inside <AuthProvider>');
});
```

### typetests
```tsx
function Check() {
  const { user, token, login, logout } = useAuth();
  const name: string | undefined = user?.name;
  const t: string | null = token;
  login('a', 'b').then(() => {});
  logout();
  // @ts-expect-error login needs both arguments
  login('a');
  return null;
}
```

### explanation
Four ideas from the lesson in one component: a **lazy initialiser** restores the session so a page refresh does not sign anyone out; `login` only updates state **after** the API succeeds and rethrows otherwise, so the caller (the login form) can show an error; `logout` clears both memory and storage so nothing lingers; and the value is wrapped in `useMemo`, with `login`/`logout` in `useCallback`, so consumers only re-render when the session actually changes. Passing `loginApi` and `storage` in keeps the provider free of hidden dependencies and easy to test.

### hints
- `useState(() => readSession(storage))` with a `try/catch` around `JSON.parse`.
- `login`: `await loginApi(...)`, then `storage.setItem('session', JSON.stringify(result))`, then `setSession(result)`.
- Let `login` throw naturally by not catching the API error.
- `useMemo` the value; `useCallback` the two functions.

# practice: A route guard

### meta
minutes: 8
language: tsx

### prompt
Build `RequireAuth({ user })` (a layout-route guard) with React Router.

- If `user` is `null`: render `<Navigate to="/login" replace state={{ from: location }} />`, where `location` comes from `useLocation()`.
- Otherwise render `<Outlet />`.

Then build `AppRoutes({ user })` with routes: `/login` shows `<h1>Login</h1>`; `/` shows `<h1>Dashboard</h1>` and `/contacts` shows `<h1>Contacts</h1>`, both **inside** the guard.

### starter
```tsx
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

export function RequireAuth({ user }: { user: { name: string } | null }) {
  // TODO
  return <Outlet />;
}

export function AppRoutes({ user }: { user: { name: string } | null }) {
  // TODO
  return null;
}

export default AppRoutes;
```

### solution
```tsx
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

export function RequireAuth({ user }: { user: { name: string } | null }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function AppRoutes({ user }: { user: { name: string } | null }) {
  return (
    <Routes>
      <Route path="/login" element={<h1>Login</h1>} />
      <Route element={<RequireAuth user={user} />}>
        <Route path="/" element={<h1>Dashboard</h1>} />
        <Route path="/contacts" element={<h1>Contacts</h1>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
```

### tests
```tsx
import { MemoryRouter, useLocation } from 'react-router-dom';

let current = null;
function Spy() {
  const l = useLocation();
  current = l;
  return null;
}
const at = (path, authed) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <user.AppRoutes user={authed ? { name: 'Ava' } : null} />
      <Spy />
    </MemoryRouter>,
  );

test('signed-in users see protected pages', async () => {
  const view = await at('/contacts', true);
  expect(view.$('h1').textContent).toBe('Contacts');
  const home = await at('/', true);
  expect(home.$('h1').textContent).toBe('Dashboard');
});

test('signed-out users are redirected to /login', async () => {
  const view = await at('/contacts', false);
  expect(view.$('h1').textContent).toBe('Login');
  expect(current.pathname).toBe('/login');
});

test('the guard remembers where the user was going', async () => {
  await at('/contacts', false);
  expect(current.state.from.pathname).toBe('/contacts');
});

test('the login page itself is public', async () => {
  const view = await at('/login', false);
  expect(view.$('h1').textContent).toBe('Login');
  expect(current.state).toBeNull();
});

test('the redirect replaces the history entry', async () => {
  const view = await at('/', false);
  expect(view.$('h1').textContent).toBe('Login');
  expect(current.pathname).toBe('/login');
  expect(current.state.from.pathname).toBe('/');
});

test('RequireAuth renders its children via an Outlet', async () => {
  const view = await render(
    <MemoryRouter initialEntries={['/x']}>
      <user.AppRoutes user={{ name: 'Ava' }} />
    </MemoryRouter>,
  );
  expect(view.$('h1')).toBeNull();
});
```

### explanation
A guard is a **layout route**: because it is one parent `Route` with no `path` that wraps the protected children, a single component protects every page inside it and you cannot forget to add the check to a new page. `<Navigate>` redirects during render; `replace` keeps the protected URL out of the history so Back does not bounce the user between it and `/login`. Passing `state={{ from: location }}` is what lets the login page send the user back to the page they originally wanted. Remember that this only controls what the *UI* shows; the API must enforce access too.

### hints
- `const location = useLocation();`
- `<Navigate to="/login" replace state={{ from: location }} />`
- Nest the protected routes inside `<Route element={<RequireAuth user={user} />}>`.

# challenge: The full login flow

### meta
minutes: 10
language: tsx

### prompt
Build `App({ loginApi })`, a complete sign-in flow with React Router, using an in-component auth state (a small context is fine).

Routes:

- `/login`: `<h1>Sign in</h1>`, a form with **Email** and **Password** inputs (labels `Email`, `Password`) and a **Sign in** button.
  - While the request is pending the button reads `Signing in…` and is disabled.
  - On failure show `<p role="alert"><message></p>` and stay on the page.
  - On success go to the page the user originally requested (`location.state.from.pathname`), or `/` if there was none, using `replace`.
  - Already signed-in users who open `/login` are redirected to `/`.
- Protected (needs a user, otherwise redirect to `/login` remembering `from`):
  - `/`: `<h1>Welcome, <name></h1>`.
  - `/contacts`: `<h1>Contacts</h1>`.
  - Both show a **Log out** button which signs out (the guard then redirects to `/login`).

`loginApi(email, password)` returns `Promise<{ name: string }>`.

### starter
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

interface User {
  name: string;
}
interface Auth {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<Auth | null>(null);
const useAuth = () => useContext(AuthContext)!;

export default function App({ loginApi }: { loginApi: (email: string, password: string) => Promise<User> }) {
  // TODO: provider state, routes, LoginPage, RequireAuth, pages
  return <Routes />;
}
```

### solution
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

interface User {
  name: string;
}
interface Auth {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<Auth | null>(null);
const useAuth = () => useContext(AuthContext)!;

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={logout}>Log out</button>;
}

function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
  // Redirecting in render covers both "already signed in" and "just signed in":
  // once login() updates the user, this component re-renders and sends them on.
  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Sign in</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function App({ loginApi }: { loginApi: (email: string, password: string) => Promise<User> }) {
  const [user, setUser] = useState<User | null>(null);

  const value: Auth = {
    user,
    login: async (email, password) => setUser(await loginApi(email, password)),
    logout: () => setUser(null),
  };

  return (
    <AuthContext.Provider value={value}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route
            path="/"
            element={
              <div>
                <h1>Welcome, {user?.name}</h1>
                <LogoutButton />
              </div>
            }
          />
          <Route
            path="/contacts"
            element={
              <div>
                <h1>Contacts</h1>
                <LogoutButton />
              </div>
            }
          />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}
```

### tests
```tsx
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

let path = '';
function Spy() {
  path = useLocation().pathname;
  return null;
}
const controlled = () => {
  const calls = [];
  const loginApi = fn((email, password) => new Promise((resolve, reject) => calls.push({ email, password, resolve, reject })));
  return { loginApi, calls };
};
const at = (entry, loginApi) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <user.default loginApi={loginApi} />
      <Spy />
    </MemoryRouter>,
  );
const fill = async (view, email = 'ava@example.com', password = 'secret') => {
  await type(view.getByRole('textbox', { name: 'Email' }), email);
  await type(view.$('input[type=password]'), password);
};

test('a signed-out visit to a protected page lands on the login form', async () => {
  const { loginApi } = controlled();
  const view = await at('/contacts', loginApi);
  expect(view.$('h1').textContent).toBe('Sign in');
  expect(path).toBe('/login');
});

test('the form has labelled fields', async () => {
  const { loginApi } = controlled();
  const view = await at('/login', loginApi);
  expect(view.getByRole('textbox', { name: 'Email' })).toBeTruthy();
  expect(view.$('input[type=password]')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Sign in' })).toBeTruthy();
});

test('shows a pending state while signing in', async () => {
  const { loginApi, calls } = controlled();
  const view = await at('/login', loginApi);
  await fill(view);
  await submit(view.$('form'));
  expect(calls[0].email).toBe('ava@example.com');
  expect(calls[0].password).toBe('secret');
  const button = view.$('button');
  expect(button.textContent).toBe('Signing in…');
  expect(button.disabled).toBe(true);
});

test('success returns the user to the page they asked for', async () => {
  const { loginApi, calls } = controlled();
  const view = await at('/contacts', loginApi);
  await fill(view);
  await submit(view.$('form'));
  calls[0].resolve({ name: 'Ava' });
  await flush();
  expect(path).toBe('/contacts');
  expect(view.$('h1').textContent).toBe('Contacts');
});

test('success with no previous page goes to the home page', async () => {
  const { loginApi, calls } = controlled();
  const view = await at('/login', loginApi);
  await fill(view);
  await submit(view.$('form'));
  calls[0].resolve({ name: 'Ava' });
  await flush();
  expect(path).toBe('/');
  expect(view.$('h1').textContent).toBe('Welcome, Ava');
});

test('failure shows the message and keeps the form usable', async () => {
  const { loginApi, calls } = controlled();
  const view = await at('/login', loginApi);
  await fill(view);
  await submit(view.$('form'));
  calls[0].reject(new Error('Invalid email or password'));
  await flush();
  expect(view.$('[role=alert]').textContent).toBe('Invalid email or password');
  expect(path).toBe('/login');
  expect(view.$('button').disabled).toBe(false);
  expect(view.$('button').textContent).toBe('Sign in');
});

test('log out sends the user back to the login page', async () => {
  const { loginApi, calls } = controlled();
  const view = await at('/', loginApi);
  await fill(view);
  await submit(view.$('form'));
  calls[0].resolve({ name: 'Ava' });
  await flush();
  await click(view.getByRole('button', { name: 'Log out' }));
  expect(path).toBe('/login');
  expect(view.$('h1').textContent).toBe('Sign in');
});

test('a signed-in user opening /login is redirected home', async () => {
  const { loginApi, calls } = controlled();
  let go;
  function Nav() {
    go = useNavigate();
    return null;
  }
  const view = await render(
    <MemoryRouter initialEntries={['/']}>
      <user.default loginApi={loginApi} />
      <Nav />
      <Spy />
    </MemoryRouter>,
  );
  await fill(view);
  await submit(view.$('form'));
  calls[0].resolve({ name: 'Ava' });
  await flush();
  go('/login');
  await flush();
  expect(path).toBe('/');
  expect(view.$('h1').textContent).toBe('Welcome, Ava');
});
```

### explanation
Each earlier piece reappears: `Navigate` with `replace` and `state={{ from: location }}` in the guard (Day 20), a form with pending and error states (Day 10), context for the current user (Day 13) and a layout route so one guard protects many pages (Day 12). The detail that makes this feel professional is the **return trip**: the guard records where the user was going and the login page reads it from `location.state` after a successful sign-in. Using `replace` on both redirects keeps the history clean, so the Back button never lands on a login screen the user has already passed. One subtle point: the login page redirects **during render** when a user exists, using the remembered destination. An earlier draft of this solution navigated explicitly after `await login(...)` *and* redirected signed-in users to `/`; the context update re-rendered the page first, so the unconditional redirect won and the user lost their destination. A single code path (redirect in render to `from`) removes the race.

### hints
- Keep `user` state in `App` and put `{ user, login, logout }` in a context.
- Guard: a layout route component that returns `<Navigate ... state={{ from: location }} />` or `<Outlet />`.
- `LoginPage`: read `from` from `useLocation().state`, and `await login(...)` in the submit handler.
- Redirect **in render**: `if (user) return <Navigate to={from} replace />;`. This handles both an already-signed-in visitor and a successful login (the context update re-renders the page).
- Trap: if you *also* call `navigate(from)` after `await login(...)`, the redirect-to-home in render can win the race and the user loses their destination.
