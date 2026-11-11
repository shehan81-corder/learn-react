## The hardest part of React is not syntax

By now you can write components, props and state. The skill that separates a beginner from a confident React developer is **design**: given a screen, how do you break it into components and decide where each piece of data lives? The React team distils this into five steps. Today you will apply them to a CRM screen.

> **The thinking pattern:** *start from a picture, end with a tree.* Don't open the editor and type. Draw boxes, name the data, decide who owns it, *then* code.

## The five steps

Imagine this mock-up: a **Contacts** screen with a search box, a "Customers only" checkbox, and a table of contacts.

### Step 1: Break the UI into a component hierarchy

Draw a box around every piece that has a single responsibility and name it. A useful test: *would I describe this piece with one sentence?*

```text
ContactsPage                      ← the whole screen
├── FilterBar                     ← search box + checkbox
└── ContactTable                  ← headers + rows
    └── ContactRow (× many)       ← one contact
```

If a component needs "and" in its description ("it filters *and* renders *and* fetches"), split it.

### Step 2: Build a static version first

Write the components with props only, no state, no events. Pass data down from the top. It is tedious but fast to write, and it proves the structure works before any logic is involved.

```tsx
function ContactsPage({ contacts }: { contacts: Contact[] }) {
  return (
    <>
      <FilterBar query="" customersOnly={false} />
      <ContactTable contacts={contacts} />
    </>
  );
}
```

### Step 3: Find the minimal state

List every piece of data on the screen and ask three questions about each:

1. Does it **change over time**? If not, it is not state.
2. Is it **passed in from a parent** via props? If so, it is not state here.
3. Can you **compute it** from other state or props? If so, it is *not* state.

| Data | State? | Why |
| --- | --- | --- |
| The original contacts | no | passed in as props (later: fetched) |
| Search text | **yes** | changes as the user types |
| "Customers only" checkbox | **yes** | changes on click |
| The *filtered* list | **no** | computed from contacts + search + checkbox |
| The row count | **no** | `filtered.length` |

The last two rows are the most common beginner mistake: storing derived data in state. It creates two sources of truth that you then have to keep in sync, which is where bugs come from.

### Step 4: Decide where state lives

State must live in a component that is a **common parent** of every component that needs it.

- `FilterBar` *changes* the search text and `ContactTable` *depends* on it. Neither is the parent of the other, so the state lives in their closest common ancestor, `ContactsPage`.
- This is called **lifting state up**.

### Step 5: Add inverse data flow

Data flows *down* via props. To let a child change state it does not own, the parent passes down a **callback**:

```tsx
function ContactsPage({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState('');
  const [customersOnly, setCustomersOnly] = useState(false);

  // derived during render, not stored
  const visible = contacts.filter(
    (c) =>
      (!customersOnly || c.status === 'customer') &&
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <FilterBar query={query} onQueryChange={setQuery} customersOnly={customersOnly} onCustomersOnlyChange={setCustomersOnly} />
      <p>{visible.length} of {contacts.length} contacts</p>
      <ContactTable contacts={visible} />
    </>
  );
}

interface FilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  customersOnly: boolean;
  onCustomersOnlyChange: (v: boolean) => void;
}

function FilterBar({ query, onQueryChange, customersOnly, onCustomersOnlyChange }: FilterBarProps) {
  return (
    <div>
      <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search" />
      <label>
        <input type="checkbox" checked={customersOnly} onChange={(e) => onCustomersOnlyChange(e.target.checked)} />
        Customers only
      </label>
    </div>
  );
}
```

`FilterBar` has **no state of its own**. It is a *controlled component*: it displays what it is told and reports what the user did. That makes it reusable and trivial to test.

## Naming conventions that make data flow readable

- State: `[thing, setThing]`.
- Callback **props**: `onSomething`: `onQueryChange`, `onSelect`, `onDelete`.
- Handler **functions** inside a component: `handleSomething`.
- Type callback props precisely: `onSelect: (id: string) => void`.

## When lifting gets heavy

If you lift state through four layers of components that don't use it, that is called *prop drilling*. It is a smell, but not an emergency. Options, in order of preference:

1. **Restructure:** pass `children` or elements instead of data so the middle layers don't need the props.
2. **Context** (Day 13): share state with a whole subtree.
3. **A state library** (Day 25) for big, app-wide state.

Do not reach for them early. Most state belongs in the nearest common parent.

## Walkthrough: think through a pipeline screen

Requirement: *show deals; a dropdown filters by stage; show the total value of the visible deals; a "Move to next stage" button on each deal.*

1. **Hierarchy:** `PipelinePage` → `StageFilter`, `TotalBar`, `DealList` → `DealRow`.
2. **State inventory:** the deals themselves change (stages move), so they are state; the selected stage is state; the visible deals and the total are **derived**.
3. **Owner:** `PipelinePage` owns both pieces. `DealRow` needs to say "move me", so it receives `onMove(id)`.
4. **Write the derived values as plain variables** in the component body:

```tsx
const visible = stage === 'all' ? deals : deals.filter((d) => d.stage === stage);
const total = visible.reduce((sum, d) => sum + d.value, 0);
```

Nothing in this plan required typing a line of JSX. Notice that it is the same exercise you will do in the challenge today.

## CRM step: lift the contacts state

Refactor Nimbus CRM using the five steps. On paper first, then in code:

1. Write the component tree for the Contacts screen (aim for `ContactsPage`, `FilterBar`, `ContactTable`/`ContactRow`).
2. Move the search input from `App.tsx` into a `FilterBar` that is purely controlled.
3. Add a status filter (`all | lead | customer | churned`) as a `<select>` in `FilterBar`.
4. Own `contacts`, `query` and `status` in `ContactsPage`. Compute `visible` during render and show "`n` of `total` contacts".
5. Render `ContactsPage` from `App`.

- [ ] Component tree written down (a comment at the top of `ContactsPage.tsx` is fine)
- [ ] `FilterBar` has no state of its own
- [ ] Filtered list is derived, not stored
- [ ] The count line updates as filters change
