## Don't optimise first. Measure first.

React is fast by default. Most "slow React apps" are slow because of one of three things: **too much work per render** (an expensive calculation), **too many components rendering that did not need to**, or **too much DOM** (rendering 10,000 rows). Each has a different fix, and guessing wrong adds complexity for nothing.

> **The thinking pattern:** *measure → find the bottleneck → apply the smallest fix → measure again.* An optimisation you have not measured is a guess. A guess that adds `useMemo` everywhere makes code harder to read and often makes it slower.

## Measuring

- **React DevTools Profiler:** record an interaction, then see which components rendered, why, and how long each took. Turn on "Highlight updates when components render" to watch re-renders happen.
- **Browser Performance panel:** where the time really goes: scripting, layout, paint.
- **`console.time` / `performance.now()`** around a suspect calculation.
- **Lighthouse / Web Vitals:** loading performance (LCP), responsiveness (INP), layout stability (CLS).

Always measure a **production build** (`npm run build && npm run preview`). Development mode is deliberately slower and includes checks like StrictMode's double rendering.

## What "render" means

A **render** is React *calling your component function* to find out what it should look like. Rendering is **not** the same as updating the DOM: React diffs the result and only touches the DOM where something changed. So an extra render is usually cheap, and it only matters when the function itself is expensive, or when there are thousands of them.

A component re-renders when:

1. its **own state** changes,
2. its **parent re-renders** (even if its props are identical!), or
3. a **context** it reads changes.

Rule 2 surprises people: typing in a search box in `App` re-renders the whole tree below it by default.

## Fix 1: move state down (colocation)

Often the best optimisation costs nothing. If only one small component needs the changing state, put the state *there*:

```tsx
// Slow shape: every keystroke re-renders the heavy table
function Page() {
  const [query, setQuery] = useState('');
  return (<><input value={query} onChange={(e) => setQuery(e.target.value)} /><HugeTable /></>);
}

// Better: the state lives in a tiny component, the table never re-renders
function SearchBox() {
  const [query, setQuery] = useState('');
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
function Page() { return (<><SearchBox /><HugeTable /></>); }
```

A related trick: **pass expensive parts as `children`**. A component that re-renders because of its own state does *not* re-render elements passed in from outside, because they were created by the parent and are the same objects:

```tsx
function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);          // changes often
  return <div className={open ? 'open' : ''}>{children}</div>;   // children element is unchanged
}
```

## Fix 2: `React.memo`

`memo(Component)` makes React **skip re-rendering** a component if its props are shallowly equal to last time.

```tsx
const ContactRow = memo(function ContactRow({ contact, onSelect }: Props) {
  return <li onClick={() => onSelect(contact.id)}>{contact.name}</li>;
});
```

Shallow equality compares each prop with `Object.is`. Numbers and strings compare by value; **objects, arrays and functions compare by reference**. And a new arrow function is created on every render:

```tsx
<ContactRow contact={c} onSelect={(id) => setSelected(id)} />   // new function every render: memo is defeated
```

## Fix 3: `useCallback` and `useMemo` (stable references)

They exist to give `memo` something stable to compare, or to avoid recomputing something expensive:

```tsx
const handleSelect = useCallback((id: string) => setSelected(id), []);     // same function between renders
const sorted = useMemo(() => sortBy(contacts, key, dir), [contacts, key, dir]);   // recomputed only if inputs change

<ContactRow contact={c} onSelect={handleSelect} />   // memo now works
```

Three honest cautions:

1. `useMemo`/`useCallback` themselves cost a little (a dependency comparison and memory). Wrapping everything makes things slower and noisier.
2. They are only useful if something **consumes** the stability: a `memo`'d child, an effect dependency, or a genuinely expensive calculation.
3. Dependency arrays must be right. A missing dependency means a stale value.

**The React Compiler** (a build tool that auto-memoises) is increasingly able to do this for you. Learning the model still matters: you need to know *why* something re-renders to read profiler output.

## A quick checklist before reaching for `memo`

1. Is it actually slow? (Profiler, not feeling.)
2. Can the state live lower in the tree?
3. Can the expensive part be passed as `children`?
4. Is the rendering itself expensive, or are there simply too many elements? (Too many → virtualise.)
5. Only now: `memo` + stable props.

## Virtualisation (windowing)

Rendering 10,000 rows creates 10,000 DOM nodes. Browsers handle that poorly, and React must create all of them. The fix is **windowing**: render only the rows visible in the scroll viewport plus a few spare ("overscan"), and fake the rest with a tall spacer so the scrollbar is right.

```text
total height = items × itemHeight           (a spacer keeps the scrollbar correct)
first visible = floor(scrollTop / itemHeight) − overscan
last visible  = ceil((scrollTop + viewportHeight) / itemHeight) + overscan
render only items[first … last], positioned at first × itemHeight
```

That is the whole idea; today you will implement it. In real projects use **TanStack Virtual** or **react-window**, which also handle variable heights, horizontal lists and dynamic measurement.

## Other tools you should know about

- **`useDeferredValue` / `useTransition`:** mark an update as low priority so typing stays responsive while a heavy list re-renders. `const deferredQuery = useDeferredValue(query)` and filter by `deferredQuery`.
- **Code splitting** (`lazy`): ship less JavaScript up front (Day 24).
- **Debouncing** input (Day 11) and **pagination / infinite scroll** to bound list size.
- **Stable keys**, so React reuses DOM nodes instead of recreating them.
- **Avoid creating objects in props for memo'd children** (`style={{ ... }}`) unless needed.

## Walkthrough: a slow contacts table

Symptom: typing in the search box lags with 2,000 contacts.

1. **Measure:** Profiler shows each keystroke renders 2,000 `ContactRow` components, each cheap, but 2,000 × a few ms hurts.
2. **Colocate:** keep the input's state in `SearchBox` and debounce what's passed to the table. Lag drops a lot.
3. **Memoise rows:** `memo(ContactRow)`; make `onSelect` stable with `useCallback`; pass `selected` as a boolean rather than the selected id (so only two rows change when the selection moves).
4. **Virtualise:** only ~20 rows exist in the DOM at once. Rendering cost is now constant, however long the list.
5. **Measure again**, and stop when it feels instant.

Notice that step 3's detail, *pass derived booleans, not the shared state*, is the sort of thing that makes `memo` effective. You will practise it today.

## CRM step: make the table fast

1. Generate 5,000 contacts in `sampleContacts.ts` (or request `?pageSize=100` pages from the API) and notice what lags.
2. Profile typing in the search box with React DevTools.
3. Wrap `ContactRow` in `memo`, pass `selected: boolean`, make handlers stable with `useCallback`.
4. Write `useVirtualList` (or install `@tanstack/react-virtual`) and render the table body through it.
5. Compare the Profiler flame graph before and after; write the before/after render counts in a comment.

- [ ] A measured baseline and a measured result
- [ ] Rows are `memo`'d and receive stable props
- [ ] The table is virtualised
- [ ] No `useMemo`/`useCallback` that doesn't serve a purpose
