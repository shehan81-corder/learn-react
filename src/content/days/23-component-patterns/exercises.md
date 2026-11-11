# practice: Compound Tabs

### meta
minutes: 9
language: tsx

### prompt
Build a compound `Tabs` component.

```tsx
<Tabs defaultValue="a">
  <Tabs.List>
    <Tabs.Tab value="a">First</Tabs.Tab>
    <Tabs.Tab value="b">Second</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="a">Panel A</Tabs.Panel>
  <Tabs.Panel value="b">Panel B</Tabs.Panel>
</Tabs>
```

- `Tabs` owns the selected value (starts at `defaultValue`) and shares it through context.
- `Tabs.List` renders `<div role="tablist">`.
- `Tabs.Tab` renders `<button role="tab" aria-selected={...}>`; clicking selects its `value`.
- `Tabs.Panel` renders `<div role="tabpanel">` with its children **only while it is the selected tab** (otherwise nothing).
- Using a part outside `Tabs` throws `Error('Tabs parts must be used inside <Tabs>')`.

### starter
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface TabsContextValue {
  value: string;
  select: (value: string) => void;
}
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  // TODO
  return {} as TabsContextValue;
}

function TabsRoot({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  // TODO
  return <div>{children}</div>;
}

function List({ children }: { children: ReactNode }) {
  // TODO
  return <div>{children}</div>;
}

function Tab({ value, children }: { value: string; children: ReactNode }) {
  // TODO
  return <button>{children}</button>;
}

function Panel({ value, children }: { value: string; children: ReactNode }) {
  // TODO
  return <div>{children}</div>;
}

export const Tabs = Object.assign(TabsRoot, { List, Tab, Panel });

export default function App() {
  return (
    <Tabs defaultValue="a">
      <Tabs.List>
        <Tabs.Tab value="a">First</Tabs.Tab>
        <Tabs.Tab value="b">Second</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
      <Tabs.Panel value="b">Panel B</Tabs.Panel>
    </Tabs>
  );
}
```

### solution
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface TabsContextValue {
  value: string;
  select: (value: string) => void;
}
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs parts must be used inside <Tabs>');
  return ctx;
}

function TabsRoot({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, select: setValue }}>{children}</TabsContext.Provider>;
}

function List({ children }: { children: ReactNode }) {
  useTabs();
  return <div role="tablist">{children}</div>;
}

function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useTabs();
  return (
    <button role="tab" aria-selected={ctx.value === value} onClick={() => ctx.select(value)}>
      {children}
    </button>
  );
}

function Panel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useTabs();
  if (ctx.value !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

export const Tabs = Object.assign(TabsRoot, { List, Tab, Panel });

export default function App() {
  return (
    <Tabs defaultValue="a">
      <Tabs.List>
        <Tabs.Tab value="a">First</Tabs.Tab>
        <Tabs.Tab value="b">Second</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
      <Tabs.Panel value="b">Panel B</Tabs.Panel>
    </Tabs>
  );
}
```

### tests
```tsx
import { Component } from 'react';

const mount = () =>
  render(
    <user.Tabs defaultValue="b">
      <user.Tabs.List>
        <user.Tabs.Tab value="a">First</user.Tabs.Tab>
        <user.Tabs.Tab value="b">Second</user.Tabs.Tab>
        <user.Tabs.Tab value="c">Third</user.Tabs.Tab>
      </user.Tabs.List>
      <user.Tabs.Panel value="a">Panel A</user.Tabs.Panel>
      <user.Tabs.Panel value="b">
        <p>Panel B</p>
      </user.Tabs.Panel>
      <user.Tabs.Panel value="c">Panel C</user.Tabs.Panel>
    </user.Tabs>,
  );
const tab = (view, name) => view.getByRole('tab', { name });
const panels = (view) => view.$$('[role=tabpanel]').map((p) => p.textContent);

test('has tablist, tab and tabpanel roles', async () => {
  const view = await mount();
  expect(view.$('[role=tablist]')).toBeTruthy();
  expect(view.$$('[role=tab]')).toHaveLength(3);
  expect(view.$$('[role=tabpanel]')).toHaveLength(1);
});

test('starts on defaultValue', async () => {
  const view = await mount();
  expect(panels(view)).toEqual(['Panel B']);
  expect(tab(view, 'Second').getAttribute('aria-selected')).toBe('true');
  expect(tab(view, 'First').getAttribute('aria-selected')).toBe('false');
});

test('clicking a tab switches the panel', async () => {
  const view = await mount();
  await click(tab(view, 'Third'));
  expect(panels(view)).toEqual(['Panel C']);
  expect(tab(view, 'Third').getAttribute('aria-selected')).toBe('true');
  expect(tab(view, 'Second').getAttribute('aria-selected')).toBe('false');
  await click(tab(view, 'First'));
  expect(panels(view)).toEqual(['Panel A']);
});

test('inactive panels are not rendered at all', async () => {
  const view = await mount();
  expect(view.text).not.toContain('Panel A');
  expect(view.text).not.toContain('Panel C');
});

test('two Tabs instances are independent', async () => {
  const view = await render(
    <div>
      <user.Tabs defaultValue="x">
        <user.Tabs.Tab value="x">X1</user.Tabs.Tab>
        <user.Tabs.Tab value="y">Y1</user.Tabs.Tab>
        <user.Tabs.Panel value="x">PX1</user.Tabs.Panel>
        <user.Tabs.Panel value="y">PY1</user.Tabs.Panel>
      </user.Tabs>
      <user.Tabs defaultValue="x">
        <user.Tabs.Tab value="x">X2</user.Tabs.Tab>
        <user.Tabs.Panel value="x">PX2</user.Tabs.Panel>
      </user.Tabs>
    </div>,
  );
  await click(view.getByRole('tab', { name: 'Y1' }));
  expect(panels(view)).toEqual(['PY1', 'PX2']);
});

test('parts throw outside <Tabs>', async () => {
  const original = console.error;
  console.error = () => {};
  let message = '';
  class Catch extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
      return { error };
    }
    render() {
      if (this.state.error) {
        message = this.state.error.message;
        return null;
      }
      return this.props.children;
    }
  }
  await render(
    <Catch>
      <user.Tabs.Panel value="a">x</user.Tabs.Panel>
    </Catch>,
  );
  console.error = original;
  expect(message).toBe('Tabs parts must be used inside <Tabs>');
});
```

### explanation
A compound component is a *family* of components that share hidden state. The root owns the selected `value`; everything else reaches it through context, so the caller never passes `value` or `onSelect` down by hand. `Object.assign(TabsRoot, { List, Tab, Panel })` attaches the parts as properties, which gives the `<Tabs.Tab>` namespace. The caller can put anything inside a panel, reorder tabs, or wrap parts in their own components, with no new props. The `aria-selected` attribute and the roles are what make it behave like a real tab widget for assistive technology.

### hints
- Root: `useState(defaultValue)` and provide `{ value, select: setValue }`.
- A `useTabs()` hook that throws when the context is `null`.
- `Panel`: `if (ctx.value !== value) return null;`
- Attach the parts with `Object.assign(TabsRoot, { List, Tab, Panel })`.

# practice: Render props

### meta
minutes: 7
language: tsx

### prompt
Build two components that let the **caller** decide what to render.

1. `Toggle({ initial = false, children })`: `children` is a function `({ on, toggle, setOn }) => ReactNode`. Toggle owns the boolean state and renders whatever the function returns.
2. `List({ items, renderItem, renderEmpty })`: renders `<ul>` with one `<li>` per item, where `renderItem(item, index)` provides the content (keyed by `index`). If `items` is empty it renders `renderEmpty()` instead of the `<ul>`.

### starter
```tsx
import { useState, type ReactNode } from 'react';

export interface ToggleApi {
  on: boolean;
  toggle: () => void;
  setOn: (value: boolean) => void;
}

export function Toggle({ initial = false, children }: { initial?: boolean; children: (api: ToggleApi) => ReactNode }) {
  // TODO
  return null;
}

export function List<T>({ items, renderItem, renderEmpty }: { items: T[]; renderItem: (item: T, index: number) => ReactNode; renderEmpty: () => ReactNode }) {
  // TODO
  return null;
}

export default function App() {
  return (
    <Toggle>
      {({ on, toggle }) => <button onClick={toggle}>{on ? 'On' : 'Off'}</button>}
    </Toggle>
  );
}
```

### solution
```tsx
import { useState, type ReactNode } from 'react';

export interface ToggleApi {
  on: boolean;
  toggle: () => void;
  setOn: (value: boolean) => void;
}

export function Toggle({ initial = false, children }: { initial?: boolean; children: (api: ToggleApi) => ReactNode }) {
  const [on, setOn] = useState(initial);
  return <>{children({ on, toggle: () => setOn((v) => !v), setOn })}</>;
}

export function List<T>({ items, renderItem, renderEmpty }: { items: T[]; renderItem: (item: T, index: number) => ReactNode; renderEmpty: () => ReactNode }) {
  if (items.length === 0) return <>{renderEmpty()}</>;
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <Toggle>
      {({ on, toggle }) => <button onClick={toggle}>{on ? 'On' : 'Off'}</button>}
    </Toggle>
  );
}
```

### tests
```tsx
test('Toggle passes state and actions to its children function', async () => {
  const view = await render(
    <user.Toggle>
      {({ on, toggle }) => <button onClick={toggle}>{on ? 'On' : 'Off'}</button>}
    </user.Toggle>,
  );
  const b = view.$('button');
  expect(b.textContent).toBe('Off');
  await click(b);
  expect(b.textContent).toBe('On');
  await click(b);
  expect(b.textContent).toBe('Off');
});

test('Toggle supports an initial value and setOn', async () => {
  const view = await render(
    <user.Toggle initial>
      {({ on, setOn }) => (
        <div>
          <p>{String(on)}</p>
          <button onClick={() => setOn(false)}>off</button>
        </div>
      )}
    </user.Toggle>,
  );
  expect(view.$('p').textContent).toBe('true');
  await click(view.$('button'));
  expect(view.$('p').textContent).toBe('false');
});

test('the same Toggle can render completely different UI', async () => {
  const a = await render(<user.Toggle>{({ on }) => <i>{on ? 'yes' : 'no'}</i>}</user.Toggle>);
  expect(a.$('i').textContent).toBe('no');
  const b = await render(<user.Toggle initial>{({ on }) => <em>{on ? 'yes' : 'no'}</em>}</user.Toggle>);
  expect(b.$('em').textContent).toBe('yes');
});

test('List renders each item through renderItem', async () => {
  const view = await render(
    <user.List items={['Ava', 'Liam']} renderItem={(name, i) => <b>{i + 1}. {name}</b>} renderEmpty={() => <p>none</p>} />,
  );
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['1. Ava', '2. Liam']);
  expect(view.$('p')).toBeNull();
});

test('List renders renderEmpty instead of an empty list', async () => {
  const view = await render(<user.List items={[]} renderItem={() => null} renderEmpty={() => <p>No contacts</p>} />);
  expect(view.$('p').textContent).toBe('No contacts');
  expect(view.$('ul')).toBeNull();
});

test('List works with objects', async () => {
  const people = [{ id: 1, name: 'Ava' }];
  const view = await render(<user.List items={people} renderItem={(p) => p.name} renderEmpty={() => null} />);
  expect(view.$('li').textContent).toBe('Ava');
});
```

### typetests
```tsx
const t = (
  <Toggle>
    {({ on, toggle }) => {
      const b: boolean = on;
      toggle();
      return null;
    }}
  </Toggle>
);
const l = <List items={[1, 2]} renderItem={(n, i) => n + i} renderEmpty={() => null} />;
// @ts-expect-error item type follows items (a number has no toUpperCase)
const bad = <List items={[1]} renderItem={(n) => n.toUpperCase()} renderEmpty={() => null} />;
```

### explanation
A render prop inverts control of the *display*: the component keeps the logic (the `on` state, the iteration, the empty check) and the caller supplies a function that decides how to show it. `Toggle` hands its state and actions to `children(...)`, so the same component can render a button, a checkbox or a whole panel. `List` shows the pattern for iteration: it owns the `<ul>` and the empty-state decision, and delegates each row to `renderItem`. The generic `<T>` carries the item type into the callback so autocomplete works inside it.

### hints
- Toggle: `const [on, setOn] = useState(initial);` then `return <>{children({ on, toggle, setOn })}</>`.
- List: return `renderEmpty()` early when `items.length === 0`.
- `renderItem(item, index)` goes inside each `<li>`.

# practice: A headless disclosure hook

### meta
minutes: 8
language: tsx

### prompt
Write `useDisclosure({ defaultOpen = false, onOpen, onClose } = {})`, a *headless* hook that owns the state and the accessibility wiring but no markup. It returns:

```ts
{
  isOpen, open(), close(), toggle(),
  buttonProps: { 'aria-expanded': boolean, 'aria-controls': string, onClick: () => void },
  panelProps:  { id: string, hidden: boolean }
}
```

- `id` is created with `useId()`, so every instance is unique and `aria-controls` equals the panel's `id`.
- `onOpen` / `onClose` are called when the state **changes** to open / closed (not when `open()` is called while already open).

Then complete `Faq({ question, children })`, which renders a `<button {...buttonProps}>` with the question and a `<div {...panelProps}>` with the answer.

### starter
```tsx
import { useCallback, useId, useState, type ReactNode } from 'react';

export interface DisclosureOptions {
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useDisclosure({ defaultOpen = false, onOpen, onClose }: DisclosureOptions = {}) {
  // TODO
  return {
    isOpen: false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    buttonProps: { 'aria-expanded': false, 'aria-controls': '', onClick: () => {} },
    panelProps: { id: '', hidden: true },
  };
}

export function Faq({ question, children }: { question: string; children: ReactNode }) {
  // TODO
  return <div />;
}

export default function App() {
  return <Faq question="What is Nimbus?">A small CRM you build in 30 days.</Faq>;
}
```

### solution
```tsx
import { useCallback, useId, useState, type ReactNode } from 'react';

export interface DisclosureOptions {
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useDisclosure({ defaultOpen = false, onOpen, onClose }: DisclosureOptions = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();

  const open = useCallback(() => {
    if (isOpen) return;
    setIsOpen(true);
    onOpen?.();
  }, [isOpen, onOpen]);

  const close = useCallback(() => {
    if (!isOpen) return;
    setIsOpen(false);
    onClose?.();
  }, [isOpen, onClose]);

  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    buttonProps: { 'aria-expanded': isOpen, 'aria-controls': id, onClick: toggle },
    panelProps: { id, hidden: !isOpen },
  };
}

export function Faq({ question, children }: { question: string; children: ReactNode }) {
  const d = useDisclosure();
  return (
    <div>
      <button {...d.buttonProps}>{question}</button>
      <div {...d.panelProps}>{children}</div>
    </div>
  );
}

export default function App() {
  return <Faq question="What is Nimbus?">A small CRM you build in 30 days.</Faq>;
}
```

### tests
```tsx
test('the FAQ starts closed and toggles', async () => {
  const view = await render(<user.Faq question="Why?">Because.</user.Faq>);
  const button = view.getByRole('button', { name: 'Why?' });
  const panel = () => view.$('button + div');
  expect(panel().hidden).toBe(true);
  expect(button.getAttribute('aria-expanded')).toBe('false');
  await click(button);
  expect(panel().hidden).toBe(false);
  expect(button.getAttribute('aria-expanded')).toBe('true');
  await click(button);
  expect(panel().hidden).toBe(true);
});

test('aria-controls points at the panel id', async () => {
  const view = await render(<user.Faq question="Q">A</user.Faq>);
  const button = view.$('button');
  const panel = view.$('button + div');
  expect(panel.id).toBeTruthy();
  expect(button.getAttribute('aria-controls')).toBe(panel.id);
});

test('each instance gets a unique id', async () => {
  const view = await render(
    <div>
      <user.Faq question="One">1</user.Faq>
      <user.Faq question="Two">2</user.Faq>
    </div>,
  );
  const ids = view.$$('button').map((b) => b.getAttribute('aria-controls'));
  expect(ids[0]).not.toBe(ids[1]);
});

test('the hook exposes state and actions', async () => {
  let d;
  function Probe() {
    d = user.useDisclosure({ defaultOpen: true });
    return null;
  }
  await render(<Probe />);
  expect(d.isOpen).toBe(true);
  d.close();
  await flush();
  expect(d.isOpen).toBe(false);
  d.open();
  await flush();
  expect(d.isOpen).toBe(true);
  d.toggle();
  await flush();
  expect(d.isOpen).toBe(false);
});

test('onOpen and onClose fire only on real changes', async () => {
  const onOpen = fn();
  const onClose = fn();
  let d;
  function Probe() {
    d = user.useDisclosure({ onOpen, onClose });
    return null;
  }
  await render(<Probe />);
  d.close();
  await flush();
  expect(onClose).not.toHaveBeenCalled();
  d.open();
  await flush();
  expect(onOpen).toHaveBeenCalledTimes(1);
  d.open();
  await flush();
  expect(onOpen).toHaveBeenCalledTimes(1);
  d.close();
  await flush();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('buttonProps and panelProps can be spread onto any elements', async () => {
  function Custom() {
    const d = user.useDisclosure({ defaultOpen: true });
    return (
      <section>
        <a href="#x" {...d.buttonProps}>
          link
        </a>
        <p {...d.panelProps}>body</p>
      </section>
    );
  }
  const view = await render(<Custom />);
  expect(view.$('a').getAttribute('aria-expanded')).toBe('true');
  expect(view.$('p').hidden).toBe(false);
  await click(view.$('a'));
  expect(view.$('p').hidden).toBe(true);
});
```

### typetests
```tsx
function Check() {
  const d = useDisclosure({ defaultOpen: true, onOpen: () => {} });
  const open: boolean = d.isOpen;
  const id: string = d.panelProps.id;
  d.toggle();
  // @ts-expect-error defaultOpen is a boolean
  useDisclosure({ defaultOpen: 'yes' });
  return null;
}
```

### explanation
A *headless* hook packages the hard-to-get-right parts (state, ARIA attributes, unique ids) and leaves rendering entirely to the caller, who spreads `buttonProps` and `panelProps` onto whatever elements they like. `useId()` generates an id that is unique per instance and stable across renders, which is exactly what `aria-controls` needs. Guarding `open()`/`close()` against no-ops means `onOpen` and `onClose` report real transitions only. This is the idea behind libraries such as React Aria and Radix: behaviour and accessibility are reusable, and styling stays yours.

### hints
- `const id = useId();`
- `open`: `if (isOpen) return;` then set state and call `onOpen?.()`.
- `buttonProps.onClick` can simply be `toggle`.
- `panelProps = { id, hidden: !isOpen }`.

# challenge: A controlled-or-uncontrolled hook

### meta
minutes: 10
language: tsx

### prompt
Library components work both **uncontrolled** (they manage their own state) and **controlled** (the parent owns it). Build the reusable hook behind that.

`useControllableState({ value, defaultValue, onChange })` returns `[state, setState]`:

- **Controlled** when `value !== undefined`: `state` is `value` and `setState` only calls `onChange` (the hook never keeps its own copy).
- **Uncontrolled** otherwise: `state` starts at `defaultValue`; `setState` updates it **and** calls `onChange`.
- `setState` accepts a value or an updater function `(prev) => next`.
- `onChange` is only called when the new value differs (`Object.is`) from the current one.

Then build `Collapsible({ open, defaultOpen = false, onOpenChange, title, children })` using it: a button (the `title`) that toggles, with `aria-expanded`, and the content (`<div>`) rendered **only while open**.

### starter
```tsx
import { useCallback, useState, type ReactNode } from 'react';

export function useControllableState<T>({ value, defaultValue, onChange }: { value?: T; defaultValue: T; onChange?: (value: T) => void }) {
  // TODO
  const setState = (_next: T | ((prev: T) => T)) => {};
  return [defaultValue, setState] as const;
}

export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  title,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  // TODO
  return <div />;
}

export default function App() {
  return <Collapsible title="Details">Hidden until opened</Collapsible>;
}
```

### solution
```tsx
import { useCallback, useState, type ReactNode } from 'react';

export function useControllableState<T>({ value, defaultValue, onChange }: { value?: T; defaultValue: T; onChange?: (value: T) => void }) {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : internal;

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
      if (Object.is(resolved, current)) return;
      if (!isControlled) setInternal(resolved);
      onChange?.(resolved);
    },
    [current, isControlled, onChange],
  );

  return [current, setState] as const;
}

export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  title,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const [isOpen, setOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <div>
      <button aria-expanded={isOpen} onClick={() => setOpen((o) => !o)}>
        {title}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

export default function App() {
  return <Collapsible title="Details">Hidden until opened</Collapsible>;
}
```

### tests
```tsx
import { useState } from 'react';

const body = (view) => view.$('button + div');

test('uncontrolled: manages its own state', async () => {
  const view = await render(<user.Collapsible title="More">Secret</user.Collapsible>);
  const b = view.getByRole('button', { name: 'More' });
  expect(body(view)).toBeNull();
  expect(b.getAttribute('aria-expanded')).toBe('false');
  await click(b);
  expect(body(view).textContent).toBe('Secret');
  expect(b.getAttribute('aria-expanded')).toBe('true');
  await click(b);
  expect(body(view)).toBeNull();
});

test('uncontrolled: defaultOpen sets the starting state', async () => {
  const view = await render(<user.Collapsible title="More" defaultOpen>Secret</user.Collapsible>);
  expect(body(view).textContent).toBe('Secret');
});

test('uncontrolled: onOpenChange reports changes', async () => {
  const onOpenChange = fn();
  const view = await render(<user.Collapsible title="More" onOpenChange={onOpenChange}>Secret</user.Collapsible>);
  await click(view.$('button'));
  await click(view.$('button'));
  expect(onOpenChange.calls).toEqual([[true], [false]]);
});

test('controlled: follows the open prop', async () => {
  const view = await render(<user.Collapsible title="More" open={false}>Secret</user.Collapsible>);
  expect(body(view)).toBeNull();
  await view.rerender(<user.Collapsible title="More" open={true}>Secret</user.Collapsible>);
  expect(body(view).textContent).toBe('Secret');
});

test('controlled: clicking only requests a change and does not change itself', async () => {
  const onOpenChange = fn();
  const view = await render(<user.Collapsible title="More" open={false} onOpenChange={onOpenChange}>Secret</user.Collapsible>);
  await click(view.$('button'));
  expect(onOpenChange.calls).toEqual([[true]]);
  expect(body(view)).toBeNull();
});

test('controlled: works when the parent applies the change', async () => {
  function Parent() {
    const [open, setOpen] = useState(false);
    return <user.Collapsible title="More" open={open} onOpenChange={setOpen}>Secret</user.Collapsible>;
  }
  const view = await render(<Parent />);
  await click(view.$('button'));
  expect(body(view).textContent).toBe('Secret');
});

test('the hook supports updater functions and skips no-op changes', async () => {
  const onChange = fn();
  let api;
  function Probe() {
    api = user.useControllableState({ defaultValue: 1, onChange });
    return <p>{api[0]}</p>;
  }
  const view = await render(<Probe />);
  api[1]((n) => n + 1);
  await flush();
  expect(view.$('p').textContent).toBe('2');
  expect(onChange.calls).toEqual([[2]]);
  api[1](2);
  await flush();
  expect(onChange).toHaveBeenCalledTimes(1);
});

test('a controlled value of false is still controlled', async () => {
  const onChange = fn();
  let api;
  function Probe() {
    api = user.useControllableState({ value: false, defaultValue: true, onChange });
    return null;
  }
  await render(<Probe />);
  expect(api[0]).toBe(false);
});
```

### typetests
```tsx
function Check() {
  const [n, setN] = useControllableState({ defaultValue: 1 });
  const x: number = n;
  setN(2);
  setN((p) => p + 1);
  // @ts-expect-error the state is a number
  setN('x');
  return null;
}
const ok = <Collapsible title="t" open onOpenChange={(o) => o.valueOf()}>c</Collapsible>;
// @ts-expect-error title is required
const bad = <Collapsible>c</Collapsible>;
```

### explanation
The rule "controlled means `value !== undefined`" is what native inputs use too, and it matters that `false` or `0` still count as controlled values (hence `!== undefined`, not truthiness). In controlled mode the hook is a pure pass-through: it *requests* changes via `onChange` and trusts the parent to feed the new value back, so it never gets out of sync with the parent. In uncontrolled mode it also stores the value itself. Resolving updater functions against the *current* value and skipping `Object.is`-equal results keeps `onChange` meaningful: it fires only for real changes. This is the contract behind almost every reusable form control and disclosure widget.

### hints
- `const isControlled = value !== undefined; const current = isControlled ? value : internal;`
- Resolve updater functions with `typeof next === 'function' ? next(current) : next`.
- `if (!isControlled) setInternal(resolved); onChange?.(resolved);` and bail out when nothing changed.
