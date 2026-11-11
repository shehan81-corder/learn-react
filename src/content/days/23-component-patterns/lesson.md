## Props are an API. Design them like one.

A component is a function other developers (including future you) call. Bad component APIs share a smell: a **boolean-flag soup** (`<Modal showHeader showFooter hasCloseButton compact stickyFooter />`) that grows a prop for every new need until nobody remembers what combinations are valid. Good component APIs stay small by using **composition**: you build bigger things by *combining* small pieces, not by adding options.

> **The thinking pattern:** when a component keeps gaining props, stop adding props and ask "what would this look like if the *caller* assembled it from parts?" React's superpower is that elements are just values you can pass around, arrange and wrap.

## 1. Composition with `children` and slots

The simplest pattern, and the one to reach for first:

```tsx
// Configuration style: grows forever
<Card title="Ava" subtitle="Lead" footerText="Updated today" showAvatar avatarUrl="..." />

// Composition style: the caller decides what goes where
<Card>
  <Card.Header><Avatar src="..." /> Ava <Badge>Lead</Badge></Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>Updated today</Card.Footer>
</Card>
```

When a component needs **several regions**, either use named subcomponents (above) or accept JSX in props ("slots"):

```tsx
<PageLayout sidebar={<Filters />} actions={<Button>Add</Button>}>
  <ContactTable />
</PageLayout>
```

Props that accept `ReactNode` keep the layout component ignorant of what it displays: that is the point.

## 2. Compound components

A **compound component** is a family of components that work together and share *implicit state*, like HTML's `<select>` and `<option>`. The parent owns the state and exposes it through **context**; the children read it. The caller writes a tidy declarative tree and the parts coordinate invisibly:

```tsx
<Tabs defaultValue="notes">
  <Tabs.List>
    <Tabs.Tab value="notes">Notes</Tabs.Tab>
    <Tabs.Tab value="deals">Deals</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="notes">…</Tabs.Panel>
  <Tabs.Panel value="deals">…</Tabs.Panel>
</Tabs>
```

How it is built (Day 13 context, plus a namespace):

```tsx
const TabsContext = createContext<{ value: string; select: (v: string) => void } | null>(null);

function TabsRoot({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, select: setValue }}>{children}</TabsContext.Provider>;
}
function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useTabsContext();
  return <button role="tab" aria-selected={ctx.value === value} onClick={() => ctx.select(value)}>{children}</button>;
}
// ...List and Panel similarly
export const Tabs = Object.assign(TabsRoot, { List: TabsList, Tab, Panel: TabsPanel });
```

Why this beats `<Tabs tabs={[{ label, content }, ...]} />`: callers can put anything inside a tab, reorder freely, wrap parts in their own components, and add parts you never imagined, all without new props.

## 3. Render props

A **render prop** is a prop whose value is a *function that returns JSX*. The component owns some logic or data and lets the caller decide how to display it:

```tsx
<MouseTracker>{({ x, y }) => <p>Pointer at {x},{y}</p>}</MouseTracker>

<List items={contacts} renderItem={(c) => <ContactRow contact={c} />} renderEmpty={() => <p>No contacts</p>} />
```

Before hooks, render props were the main way to share stateful logic. Today a **custom hook** is usually simpler for *logic*, but render props remain the right tool when you need to share **layout or iteration** (lists, tables, virtualisation: yesterday's `renderItem`) because the callback runs *inside* the component's own rendering.

## 4. Headless components and hooks

A **headless** abstraction supplies behaviour, state and accessibility, but **no markup or styling**. You bring the look. Libraries like Radix UI, React Aria and Headless UI are built this way. Often the best form is a hook returning "prop getters":

```tsx
function useDisclosure({ defaultOpen = false } = {}) {
  const [isOpen, setOpen] = useState(defaultOpen);
  const id = useId();                                   // unique, stable, SSR-safe id
  return {
    isOpen,
    toggle: () => setOpen((o) => !o),
    buttonProps: { 'aria-expanded': isOpen, 'aria-controls': id, onClick: () => setOpen((o) => !o) },
    panelProps: { id, hidden: !isOpen },
  };
}

function FAQ() {
  const d = useDisclosure();
  return (<><button {...d.buttonProps}>What is Nimbus?</button><div {...d.panelProps}>A CRM.</div></>);
}
```

The hook owns the tricky part (ARIA wiring, unique ids), and the component owns the markup, so you can render the same behaviour as a button, a card or a table row. `useId` is the right way to generate ids for `aria-controls`/`htmlFor` pairs.

## 5. Controlled and uncontrolled, in one component

Library components usually support both modes, like a native `<input>`:

```tsx
<Collapsible defaultOpen />                         // uncontrolled: it manages its own state
<Collapsible open={open} onOpenChange={setOpen} />  // controlled: the parent owns the state
```

The reusable core is a small hook:

```tsx
function useControllableState<T>({ value, defaultValue, onChange }: { value?: T; defaultValue: T; onChange?: (v: T) => void }) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const set = useCallback((next: T | ((prev: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (p: T) => T)(current) : next;
    if (!isControlled) setInternal(resolved);
    if (resolved !== current) onChange?.(resolved);
  }, [current, isControlled, onChange]);

  return [current, set] as const;
}
```

Rules of thumb: a component should not *switch* between controlled and uncontrolled during its life, and when controlled it must not change its own state, only *request* a change via the callback. You will build this in today's challenge.

## 6. Polymorphic `as` and `asChild`

Sometimes the same styled component must render as a different element (a button that is really a link):

```tsx
<Text as="h1">Title</Text>
<Button as={Link} to="/contacts">Contacts</Button>
```

Typing `as` generically is advanced (the `ComponentPropsWithoutRef<C>` trick); the pragmatic alternative is the discriminated union from Day 22. Radix's `asChild` prop merges your component's behaviour onto its single child element. Know both exist so you recognise them in libraries.

## Choosing a pattern

| Situation | Reach for |
| --- | --- |
| A box with regions the caller fills | `children` / slot props |
| A family of parts sharing state (tabs, accordion, menu) | compound components + context |
| Caller controls *how each item/state looks* | render prop |
| Behaviour and accessibility, any markup | headless hook with prop getters |
| Must work controlled or uncontrolled | `useControllableState` |
| Just reusing stateful logic | a plain custom hook |

Don't over-engineer. A page-specific component used once can have honest, specific props. These patterns pay off in **shared UI** (your `components/` folder).

## Walkthrough: from boolean soup to composition

Starting point: `<Dialog title="Delete?" showCancel confirmText="Delete" onConfirm={...} danger footerAlign="right" />`. Every new requirement adds a prop.

1. **List what varies:** the title, the body, which buttons, their labels and actions.
2. **Ask which parts the caller should own:** the body and the actions.
3. **Re-shape:**
   ```tsx
   <Dialog open={open} onClose={close}>
     <Dialog.Title>Delete contact?</Dialog.Title>
     <Dialog.Body>This cannot be undone.</Dialog.Body>
     <Dialog.Actions>
       <Button onClick={close}>Cancel</Button>
       <Button variant="danger" onClick={confirm}>Delete</Button>
     </Dialog.Actions>
   </Dialog>
   ```
4. **Share state implicitly** (open/close, ids for `aria-labelledby`) through context so the caller never wires it.
5. **Support both modes:** `open`/`onClose` controlled, or `defaultOpen` plus a `Dialog.Trigger`.

The new version has *fewer* props, handles cases you didn't plan, and reads like the UI it produces.

## CRM step: a small design system

Create `src/components/ui/` and build, using today's patterns:

1. `Tabs` (compound) and use it on the contact detail page: **Overview**, **Deals**, **Activity**.
2. `Collapsible`/`Disclosure` using `useControllableState`, used for the "Advanced filters" section.
3. A `List`/`DataTable` with `renderEmpty` and `renderItem` slots.
4. `Card` with `Card.Header`, `Card.Body`, `Card.Footer`.
5. Document each component's props in a comment and avoid boolean-flag props wherever composition works.

- [ ] `Tabs` is a compound component with proper `role` and `aria-selected`
- [ ] A shared `useControllableState` hook powers at least one component
- [ ] No component has more than ~5 props without a reason
- [ ] The contact detail page is built from your own UI components
