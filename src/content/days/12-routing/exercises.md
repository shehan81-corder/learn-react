# practice: Routes and a 404

### meta
minutes: 6
language: tsx

### prompt
Build `AppRoutes` using React Router:

- `/` renders `<h1>Home</h1>`.
- `/contacts` renders `<h1>Contacts</h1>`.
- Any other path renders `<h1>Page not found</h1>` and a link with text `Go home` that goes to `/`.

Also render a `<nav>` above the routes with two links: **Home** (to `/`) and **Contacts** (to `/contacts`). Use `Link`.

The tests wrap your component in a `MemoryRouter`, so do **not** add a router yourself inside `AppRoutes`.

### starter
```tsx
import { Link, Route, Routes } from 'react-router-dom';

export function AppRoutes() {
  // TODO
  return <div />;
}

export default AppRoutes;
```

### solution
```tsx
import { Link, Route, Routes } from 'react-router-dom';

export function AppRoutes() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/contacts">Contacts</Link>
      </nav>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/contacts" element={<h1>Contacts</h1>} />
        <Route
          path="*"
          element={
            <div>
              <h1>Page not found</h1>
              <Link to="/">Go home</Link>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default AppRoutes;
```

### tests
```tsx
import { MemoryRouter } from 'react-router-dom';

const at = async (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <user.AppRoutes />
  </MemoryRouter>,
);

test('renders the home route', async () => {
  const view = await at('/');
  expect(view.$('h1').textContent).toBe('Home');
});

test('renders the contacts route', async () => {
  const view = await at('/contacts');
  expect(view.$('h1').textContent).toBe('Contacts');
});

test('unknown paths show the fallback with a way home', async () => {
  const view = await at('/definitely/not/here');
  expect(view.$('h1').textContent).toBe('Page not found');
  const home = view.$$('a').find((a) => a.textContent === 'Go home');
  expect(home.getAttribute('href')).toBe('/');
});

test('the nav links work without reloading', async () => {
  const view = await at('/');
  const nav = view.$$('nav a');
  expect(nav.map((a) => a.textContent)).toEqual(['Home', 'Contacts']);
  expect(nav[1].getAttribute('href')).toBe('/contacts');
  await click(nav[1]);
  expect(view.$('h1').textContent).toBe('Contacts');
  await click(view.$$('nav a')[0]);
  expect(view.$('h1').textContent).toBe('Home');
});
```

### explanation
`Routes` picks the best-matching `Route` for the current URL; `path="*"` matches anything that nothing else did, so it is your 404. `Link` renders a real `<a href>` (good for accessibility and open-in-new-tab) but intercepts the click so the page does not reload. Because `AppRoutes` does not create its own router, the same component works under `BrowserRouter` in the app and `MemoryRouter` in tests.

### hints
- `<Routes>` contains `<Route path="..." element={...} />` children.
- The catch-all route uses `path="*"`.
- `<Link to="/contacts">Contacts</Link>`

# practice: URL parameters

### meta
minutes: 7
language: tsx

### prompt
Build `ContactRoutes({ contacts })`:

- `/contacts` lists every contact as `<li><Link to="/contacts/<id>">Name</Link></li>`.
- `/contacts/:id` shows `<h2>Name</h2>`, `<p>email</p>` and a link `Back to contacts` to `/contacts`.
- If no contact has that id, the detail route shows `<p>Contact not found</p>` plus the same back link.

Read the id with `useParams`. Write `ContactDetail` as its own component.

### starter
```tsx
import { Link, Route, Routes, useParams } from 'react-router-dom';

export interface Contact {
  id: string;
  name: string;
  email: string;
}

export function ContactDetail({ contacts }: { contacts: Contact[] }) {
  // TODO: useParams, find the contact
  return null;
}

export function ContactRoutes({ contacts }: { contacts: Contact[] }) {
  // TODO
  return null;
}

export default function App() {
  return null;
}
```

### solution
```tsx
import { Link, Route, Routes, useParams } from 'react-router-dom';

export interface Contact {
  id: string;
  name: string;
  email: string;
}

export function ContactDetail({ contacts }: { contacts: Contact[] }) {
  const { id } = useParams<{ id: string }>();
  const contact = contacts.find((c) => c.id === id);

  return (
    <div>
      {contact ? (
        <>
          <h2>{contact.name}</h2>
          <p>{contact.email}</p>
        </>
      ) : (
        <p>Contact not found</p>
      )}
      <Link to="/contacts">Back to contacts</Link>
    </div>
  );
}

export function ContactRoutes({ contacts }: { contacts: Contact[] }) {
  return (
    <Routes>
      <Route
        path="/contacts"
        element={
          <ul>
            {contacts.map((c) => (
              <li key={c.id}>
                <Link to={`/contacts/${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        }
      />
      <Route path="/contacts/:id" element={<ContactDetail contacts={contacts} />} />
    </Routes>
  );
}

export default function App() {
  return null;
}
```

### tests
```tsx
import { MemoryRouter } from 'react-router-dom';

const contacts = [
  { id: 'a1', name: 'Ava Nguyen', email: 'ava@example.com' },
  { id: 'b2', name: 'Liam Smith', email: 'liam@example.com' },
];
const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <user.ContactRoutes contacts={contacts} />
    </MemoryRouter>,
  );

test('lists contacts as links to their detail pages', async () => {
  const view = await at('/contacts');
  const links = view.$$('li a');
  expect(links.map((a) => a.textContent)).toEqual(['Ava Nguyen', 'Liam Smith']);
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/contacts/a1', '/contacts/b2']);
});

test('the detail route reads the id from the URL', async () => {
  const view = await at('/contacts/b2');
  expect(view.$('h2').textContent).toBe('Liam Smith');
  expect(view.$('p').textContent).toBe('liam@example.com');
});

test('shows a not-found message for an unknown id', async () => {
  const view = await at('/contacts/zzz');
  expect(view.$('p').textContent).toBe('Contact not found');
  expect(view.$('h2')).toBeNull();
});

test('can navigate list to detail and back', async () => {
  const view = await at('/contacts');
  await click(view.$$('li a')[0]);
  expect(view.$('h2').textContent).toBe('Ava Nguyen');
  const back = view.$$('a').find((a) => a.textContent === 'Back to contacts');
  expect(back.getAttribute('href')).toBe('/contacts');
  await click(back);
  expect(view.$$('li')).toHaveLength(2);
});

test('the back link also appears when the contact is missing', async () => {
  const view = await at('/contacts/nope');
  expect(view.$$('a').some((a) => a.textContent === 'Back to contacts')).toBe(true);
});
```

### explanation
`useParams` returns an object with one string per `:param` in the matched route. The lookup can fail, so the component handles `undefined` explicitly rather than assuming the URL is valid; users edit URLs and old bookmarks go stale. Linking with a template string (`/contacts/${c.id}`) keeps the list and the route definition in agreement. The list and detail live under one `Routes` here, but in a real app they would usually be split across route components.

### hints
- `const { id } = useParams();` then `contacts.find((c) => c.id === id)`.
- Link to a detail page with a template string: ``to={`/contacts/${c.id}`}``.
- Render the "not found" branch with a conditional.

# practice: Layout routes and active links

### meta
minutes: 8
language: tsx

### prompt
Build a layout with nested routes.

`Layout` renders:

```html
<nav> (NavLinks: Contacts → /contacts, Deals → /deals) </nav>
<main> ...child route... </main>
```

- Use `NavLink`. The currently active link must carry the class `active`. React Router adds `active` by default, so make sure you do not override `className`.
- Use `<Outlet />` inside `<main>` to show the child.

`AppRoutes` wires it up: `/contacts` shows `<h1>Contacts page</h1>` and `/deals` shows `<h1>Deals page</h1>`, both inside `Layout`. `/` redirects to `/contacts` using `<Navigate to="/contacts" replace />`.

### starter
```tsx
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';

export function Layout() {
  // TODO
  return null;
}

export function AppRoutes() {
  // TODO
  return null;
}

export default AppRoutes;
```

### solution
```tsx
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';

export function Layout() {
  return (
    <div>
      <nav>
        <NavLink to="/contacts">Contacts</NavLink>
        <NavLink to="/deals">Deals</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/contacts" replace />} />
        <Route path="/contacts" element={<h1>Contacts page</h1>} />
        <Route path="/deals" element={<h1>Deals page</h1>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
```

### tests
```tsx
import { MemoryRouter } from 'react-router-dom';

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <user.AppRoutes />
    </MemoryRouter>,
  );
const active = (view) => view.$$('nav a').filter((a) => a.classList.contains('active')).map((a) => a.textContent);

test('renders the child inside the layout', async () => {
  const view = await at('/deals');
  expect(view.$('nav')).toBeTruthy();
  expect(view.$('main h1').textContent).toBe('Deals page');
});

test('NavLink marks the current route as active', async () => {
  const view = await at('/deals');
  expect(active(view)).toEqual(['Deals']);
  expect(view.$$('nav a').find((a) => a.textContent === 'Deals').getAttribute('aria-current')).toBe('page');
});

test('the root redirects to /contacts', async () => {
  const view = await at('/');
  expect(view.$('main h1').textContent).toBe('Contacts page');
  expect(active(view)).toEqual(['Contacts']);
});

test('the layout stays mounted while navigating', async () => {
  const view = await at('/contacts');
  const nav = view.$('nav');
  await click(view.$$('nav a')[1]);
  expect(view.$('main h1').textContent).toBe('Deals page');
  expect(active(view)).toEqual(['Deals']);
  expect(view.$('nav')).toBe(nav);
});
```

### explanation
A `Route` without a `path` is a *layout route*: it renders its `element` around whichever child matches, and `<Outlet />` marks where the child goes. Because the layout is the same element across children, React keeps it mounted when you navigate, so the nav is not rebuilt. `NavLink` compares its `to` with the current location and adds `active` and `aria-current="page"` automatically; overriding `className` with a plain string would replace that behaviour, which is why the exercise says not to. `Navigate` performs a redirect during render; `replace` stops the redirect from adding a history entry that would trap the back button.

### hints
- A layout route: `<Route element={<Layout />}> ...children... </Route>`.
- Place `<Outlet />` where the child should render.
- Redirect: `<Navigate to="/contacts" replace />`.

# challenge: Filters in the URL

### meta
minutes: 10
language: tsx

### prompt
Build `ContactSearch({ contacts })`, a list whose search text lives in the URL as `?q=`.

- An input with `aria-label="Search"` whose value comes from the `q` search param (empty when absent).
- Typing updates the URL: set `q` to the typed text, or **remove** `q` when the input is emptied. Use `replace: true` and keep any other existing search params (for example `?status=lead&q=a`).
- Show only contacts whose name contains the query (case-insensitive) as `<li>`, in a `<ul>`.
- Show `<p>No matches for "<q>"</p>` when nothing matches a non-empty query.
- Show `<p>{n} contacts</p>` above the list.

### starter
```tsx
import { useSearchParams } from 'react-router-dom';

export interface Contact {
  id: string;
  name: string;
}

export function ContactSearch({ contacts }: { contacts: Contact[] }) {
  // TODO: read and write the `q` search param
  return <div />;
}

export default function App() {
  return null;
}
```

### solution
```tsx
import { useSearchParams } from 'react-router-dom';

export interface Contact {
  id: string;
  name: string;
}

export function ContactSearch({ contacts }: { contacts: Contact[] }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';

  const onChange = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const visible = contacts.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <input aria-label="Search" value={q} onChange={(e) => onChange(e.target.value)} />
      <p>{visible.length} contacts</p>
      {visible.length === 0 && q ? (
        <p>No matches for "{q}"</p>
      ) : (
        <ul>
          {visible.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  return null;
}
```

### tests
```tsx
import { MemoryRouter, useLocation } from 'react-router-dom';

const contacts = [
  { id: '1', name: 'Ava Nguyen' },
  { id: '2', name: 'Liam Smith' },
  { id: '3', name: 'Mia Patel' },
  { id: '4', name: 'Avery Stone' },
];
let currentUrl = '';
function Spy() {
  const l = useLocation();
  currentUrl = l.pathname + l.search;
  return null;
}
const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <user.ContactSearch contacts={contacts} />
      <Spy />
    </MemoryRouter>,
  );
const names = (view) => view.$$('li').map((li) => li.textContent);
const input = (view) => view.getByRole('textbox', { name: 'Search' });

test('shows everything when there is no q', async () => {
  const view = await at('/contacts');
  expect(input(view).value).toBe('');
  expect(names(view)).toHaveLength(4);
  expect(view.$('p').textContent).toBe('4 contacts');
});

test('reads the query from the URL', async () => {
  const view = await at('/contacts?q=av');
  expect(input(view).value).toBe('av');
  expect(names(view)).toEqual(['Ava Nguyen', 'Avery Stone']);
  expect(view.$('p').textContent).toBe('2 contacts');
});

test('typing writes q to the URL', async () => {
  const view = await at('/contacts');
  await type(input(view), 'smith');
  expect(currentUrl).toBe('/contacts?q=smith');
  expect(names(view)).toEqual(['Liam Smith']);
});

test('clearing the input removes q from the URL', async () => {
  const view = await at('/contacts?q=ava');
  await type(input(view), '');
  expect(currentUrl).toBe('/contacts');
  expect(names(view)).toHaveLength(4);
});

test('keeps other search params', async () => {
  const view = await at('/contacts?status=lead');
  await type(input(view), 'mia');
  expect(currentUrl).toBe('/contacts?status=lead&q=mia');
  await type(input(view), '');
  expect(currentUrl).toBe('/contacts?status=lead');
});

test('search is case-insensitive and shows an empty message', async () => {
  const view = await at('/contacts?q=MIA');
  expect(names(view)).toEqual(['Mia Patel']);
  await type(input(view), 'zzz');
  expect(view.$('ul')).toBeNull();
  expect(view.$$('p').map((p) => p.textContent)).toEqual(['0 contacts', 'No matches for "zzz"']);
});
```

### explanation
The URL is the single source of truth: there is **no `useState` for the query**. Reading it with `params.get('q')` on each render means a pasted link, a refresh and the back button all just work. When updating, copy the existing params with `new URLSearchParams(params)` so other filters survive, and delete the key instead of storing an empty `q=`. `replace: true` overwrites the current history entry so each keystroke does not become a separate back-button stop.

### hints
- `const [params, setParams] = useSearchParams();` and `params.get('q') ?? ''`.
- Copy before changing: `const next = new URLSearchParams(params);`.
- `next.set('q', value)` or `next.delete('q')`, then `setParams(next, { replace: true })`.
