## One page, many screens

A single-page app (SPA) loads one HTML file and then swaps what is on screen without reloading. The URL still matters: users bookmark, share and refresh pages, and the back button must work. A **router** keeps the URL and the visible components in sync.

This platform you are using right now is a SPA: `/day/12` renders the day page, `/crm` the roadmap. We use **React Router**, the most widely used router, in its "declarative" mode.

```bash
npm install react-router-dom
```

> **The thinking pattern:** the URL is *state*, the most shareable state your app has. Ask of every piece of UI state: "should someone be able to link to this?" If yes (which contact is open, what the search text is, which page of results), it belongs in the URL, not in `useState`.

## Setting up

Wrap the app in a router once, near the root:

```tsx
// main.tsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

Then declare which component shows for which path:

```tsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/contacts/:contactId" element={<ContactDetailPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

`path="*"` is the catch-all and must come last in your thinking (React Router picks the best match regardless of order). `:contactId` is a **URL parameter**.

## Navigating

Use `Link` instead of `<a>` so the browser does not reload the page:

```tsx
import { Link, NavLink, useNavigate } from 'react-router-dom';

<Link to="/contacts">All contacts</Link>
<Link to={`/contacts/${contact.id}`}>{contact.name}</Link>

// NavLink adds an "active" class (and aria-current="page") when it matches the current URL
<NavLink to="/deals" className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>Deals</NavLink>

// Programmatic navigation, e.g. after a form saves
const navigate = useNavigate();
navigate('/contacts');
navigate(-1);                        // back
navigate('/login', { replace: true }); // replace the history entry instead of adding one
```

Rule: **`Link` for things the user clicks, `useNavigate` for navigation that follows an action** (submit, login, delete).

## Reading the URL

```tsx
import { useParams, useSearchParams, useLocation } from 'react-router-dom';

function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();   // from /contacts/:contactId
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) return <p>Contact not found</p>;
  return <h1>{contact.name}</h1>;
}
```

Params are always **strings** (or `undefined`), so convert with `Number(...)` when you need a number, and handle "not found" explicitly. A mistyped URL is a normal situation, not an error.

## Nested routes and layouts

Most screens share chrome (sidebar, top bar). A **layout route** renders the chrome and an `<Outlet />` where the child route appears:

```tsx
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="shell">
      <nav>
        <NavLink to="/contacts">Contacts</NavLink>
        <NavLink to="/deals">Deals</NavLink>
      </nav>
      <main><Outlet /></main>
    </div>
  );
}

<Routes>
  <Route element={<Layout />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="contacts" element={<ContactsPage />} />
    <Route path="contacts/:contactId" element={<ContactDetailPage />} />
  </Route>
  <Route path="*" element={<NotFound />} />
</Routes>
```

A `<Route>` with no `path` (just `element`) is a *pathless layout*: it wraps its children without adding to the URL. The layout stays mounted while you move between its children, so the sidebar does not remount and its state is preserved.

## State in the URL: search params

The part after `?` is perfect for filters, sorting and paging:

```tsx
function ContactsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);          // copy: never mutate
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });                // typing shouldn't flood history
  };

  return <input value={query} onChange={(e) => update('q', e.target.value)} />;
}
```

Now `/contacts?q=ava&status=lead` is a link someone can send to a colleague, and refresh keeps the filters. Compare that with Day 11's `useState` version, which forgets everything on reload. Use `replace: true` for rapid changes such as typing so the back button does not step through every keystroke.

## Doing it in this sandbox

React Router is loaded from a CDN in the exercises, and instead of `BrowserRouter` (which needs a real address bar) the tests wrap your components in **`MemoryRouter`**, which keeps the "URL" in memory. Your components do not change; only the router at the top does. That is also how you test routed components in a real project.

## Walkthrough: the contact detail flow

1. **Routes** (decide the URLs first): `/contacts` (list) and `/contacts/:contactId` (detail).
2. **List page:** each row's name is a `<Link to={`/contacts/${c.id}`}>`.
3. **Detail page:** read `contactId` with `useParams`, look the contact up, render details or "Contact not found", and add a `<Link to="/contacts">← Back</Link>`.
4. **Layout:** put the sidebar in a layout route so it persists.
5. **404:** `path="*"` renders a helpful message with a link home.

Test it the way a user would: type a bad id into the address bar. If you see a blank screen or a crash, you forgot step 3's "not found" branch.

## CRM step: add routing to Nimbus

1. `npm install react-router-dom`, wrap `App` in `BrowserRouter`.
2. Create pages: `DashboardPage` (placeholder), `ContactsPage` (your table), `ContactDetailPage`, `NotFoundPage`.
3. Build `AppLayout` (from Day 9's shell) with `NavLink`s and an `<Outlet />`.
4. Move the contacts table's search text and status filter into **search params** (`?q=&status=`).
5. Make contact names link to `/contacts/:id`. The detail page shows all fields and a Back link.
6. Add a `vercel.json` rewrite later (Day 29) so refreshing a deep link works in production.

- [ ] Routes for `/`, `/contacts`, `/contacts/:contactId`, and a `*` fallback
- [ ] Layout route with `NavLink` and `Outlet`
- [ ] Search and status filter live in the URL
- [ ] Unknown contact id shows a friendly message
