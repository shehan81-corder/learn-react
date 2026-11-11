## What authentication actually is

**Authentication** answers "who are you?" (login). **Authorisation** answers "what may you do?" (permissions). Your React app cannot *enforce* either; it can only *reflect* them. The server is the only trustworthy gatekeeper, because anything running in the browser can be modified by the person sitting in front of it.

> **The thinking pattern:** *the UI hides things for convenience; the server denies things for security.* If a "Delete company" button is hidden from non-admins, that is UX. The security is the server returning `403` when a non-admin calls the delete endpoint anyway. Build the second first, then the first.

## Two common approaches

| | Cookie-based session | Token-based (JWT / bearer) |
| --- | --- | --- |
| Credential | an opaque session id in an **`HttpOnly`** cookie | a signed token your JS holds and sends as `Authorization: Bearer …` |
| JavaScript can read it? | **No** (good against XSS theft) | Yes (if stored in `localStorage`/memory) |
| CSRF risk | Yes (browser sends cookies automatically), mitigated by `SameSite` and CSRF tokens | No (not sent automatically) |
| Works across domains/mobile | harder | easy |

There is no universally right answer. For a browser-only SPA talking to its own backend, an **`HttpOnly`, `Secure`, `SameSite` cookie** is the safer default because XSS cannot read it. Many APIs, including the mock one in this course, use bearer tokens because they are simpler to demonstrate. In that case keep tokens short-lived, prefer memory over `localStorage` where you can, and treat XSS prevention (no `dangerouslySetInnerHTML` with user data!) as a requirement.

## The mock API's login

```http
POST /api/auth/login
{ "email": "admin@nimbus.test", "password": "password" }
→ 200 { "token": "nimbus-token-…", "user": { "id": "us_001", "name": "Demo Admin", "email": "...", "role": "admin" } }
→ 401 { "error": "Invalid email or password" }

GET /api/auth/me      Authorization: Bearer <token>
→ 200 user    |    401
```

(Real systems often use JWTs. A JWT is three base64url parts, `header.payload.signature`. The payload is just JSON anyone can *read*, including `exp` (expiry, in seconds). Only the server can *verify* the signature, so the client may *decode* a token to show a name or check expiry, but must never *trust* it.)

## An `AuthProvider`

Who is signed in is exactly the "app-wide, slowly changing value" that belongs in context (Day 13).

```tsx
interface AuthValue {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: User; token: string } | null>(() => readSession());   // restore on load

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);          // throws on 401
    writeSession(result);
    setSession(result);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    queryClient.clear();                                       // drop cached private data!
    setSession(null);
  }, []);

  const value = useMemo(() => ({ user: session?.user ?? null, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

Things easy to forget: **restore the session on page load** (otherwise a refresh logs everyone out), **validate it** (a stored token may have expired, so call `/auth/me` or check `exp`), and **clear private caches on logout** (the next person on a shared computer must not see the previous user's contacts, including TanStack Query's cache).

## Sending the token

Centralise it in your fetch wrapper (Day 14) so no component has to remember:

```ts
async function authedFetch(url: string, init: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, { ...init, headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (res.status === 401) { onUnauthorized(); }     // token expired or revoked: log out and redirect
  return res;
}
```

A global `401` handler that signs the user out and sends them to the login page is the usual way to deal with expired sessions.

## Protected routes

A route guard decides between rendering the page and redirecting to login. In React Router, make it a *layout route* so one guard protects a whole group:

```tsx
function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<RequireAuth />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/contacts" element={<ContactsPage />} />
  </Route>
</Routes>
```

Note `state={{ from: location }}`: the guard remembers where the user was heading. After login, send them back there instead of always to the home page:

```tsx
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/';

  async function onSubmit(...) { await login(email, password); navigate(from, { replace: true }); }
}
```

`replace: true` stops the login page from sitting in history, so Back doesn't return to it.

A tidier variant uses **one code path**: redirect during render whenever a user exists, and let `login()` just update context.

```tsx
const { user, login } = useAuth();
if (user) return <Navigate to={from} replace />;   // handles "already signed in" AND "just signed in"
// onSubmit: await login(email, password);          // the re-render does the redirect
```

If you instead call `navigate(from)` *and* separately redirect signed-in users to `/`, the two can race (the context update re-renders the page before `navigate` runs) and the user loses their destination. One path, no race. You will hit exactly this in today's challenge.

While the session is being restored (`status: 'loading'`), render a spinner instead of redirecting, or logged-in users will flash through `/login` on every refresh.

## Roles and permissions in the UI

```tsx
function Can({ role, children }: { role: 'admin' | 'rep'; children: ReactNode }) {
  const { user } = useAuth();
  return user?.role === role ? <>{children}</> : null;
}
<Can role="admin"><DeleteCompanyButton /></Can>
```

Remember: this is a courtesy, not a defence. The API must also check `role`.

## The login form

You have built every piece already (Day 10): controlled inputs, validation, a pending state, a server error message. Authentication-specific advice:

- Use `type="email"` and `type="password"` with `autoComplete="username"` / `"current-password"` so password managers work.
- **Don't reveal which part was wrong** ("Invalid email or password"), and don't log passwords.
- Disable the button while pending and keep the form usable after a failure.
- Never put credentials in a URL or in `localStorage` yourself.

## Walkthrough: from a locked screen to the contact you wanted

1. Visit `/contacts/ct_7` while signed out. `RequireAuth` redirects to `/login`, remembering `from`.
2. Sign in. The provider stores the session and updates context.
3. `LoginPage` navigates to `/contacts/ct_7` with `replace`.
4. The user sees the page they asked for, and Back skips the login screen.
5. Reload: the provider restores the session from storage, so there is no login prompt.
6. Click **Log out**: storage and the query cache are cleared and the guard sends the user to `/login`.

## CRM step: authentication

1. Add `src/api/auth.ts` (`login`, `me`) and extend your fetch wrapper to attach `Authorization` and call `onUnauthorized` on `401`.
2. Build `AuthProvider` + `useAuth()`: restore from storage, validate with `/api/auth/me`, expose `status`, `user`, `login`, `logout`. Clear the Query cache on logout.
3. Build `LoginPage` (demo login: `admin@nimbus.test` / `password`) that returns the user to `location.state.from`.
4. Wrap the app routes in `RequireAuth`; show a spinner while `status === 'loading'`.
5. Show the user's name and a **Log out** button in the top bar; hide admin-only controls with a `Can` component.

- [ ] Signed-out visits redirect to `/login` and return after sign in
- [ ] Reloading the page keeps you signed in
- [ ] Log out clears storage and cached data
- [ ] A `401` anywhere signs the user out
