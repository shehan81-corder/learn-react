## The idea: describe the UI as data

Unit 1 ended with a problem: imperative DOM code has to know every *step* between two screens. The fix React popularised is to stop writing steps and instead write a **function from data to a description of the screen**:

```text
UI = f(state)
```

Every time the state changes you call `f` again and get a fresh description of the *whole* screen. Something else compares the new description with the previous one and makes the minimum number of real DOM changes.

The "description" is not DOM nodes (those are heavy and creating them is slow). It is **plain JavaScript objects**: cheap to create, cheap to throw away, easy to compare. A tree of those objects is what people call the **Virtual DOM**.

```ts
// A virtual node: just data
const vnode = {
  type: 'li',
  props: { className: 'vip', children: ['Ava Lee'] },
};
```

> **The thinking pattern:** separate *what* the screen should show from *how* to get there. You write the "what" as cheap objects, as often as you like. A library owns the "how": diffing old against new and touching the real DOM as little as possible.

## What JSX compiles to

JSX is not HTML and the browser cannot run it. A compiler (Babel, esbuild, SWC, Sucrase) turns each tag into a function call:

```tsx
const el = (
  <li className="vip" onClick={select}>
    Ava <b>Lee</b>
  </li>
);
```

compiles to (classic runtime):

```js
const el = React.createElement(
  'li',
  { className: 'vip', onClick: select },
  'Ava ',
  React.createElement('b', null, 'Lee'),
);
```

and `createElement` returns a plain object, roughly:

```js
{
  type: 'li',
  key: null,
  props: {
    className: 'vip',
    onClick: select,
    children: ['Ava ', { type: 'b', key: null, props: { children: 'Lee' } }],
  },
}
```

Rules that fall out of this:

- **Lowercase tags become strings** (`'li'`), meaning "a DOM element". **Capitalised tags become a reference to a variable** (`ContactCard`), meaning "a component". That is why components must start with a capital letter.
- **Attributes become a props object.** That is why you write `className` and `onClick`: they are object keys, and `class` is a reserved word in JavaScript.
- **Children become `props.children`.** Text, other elements, arrays (from `.map()`), or nothing.
- `{expression}` is any JavaScript expression. `false`, `null` and `undefined` render nothing, which is what makes `{isVip && <Badge />}` work.
- `key` is pulled out of props: React keeps it for itself (next unit).

Since React 17 the default is the *automatic* runtime, which compiles to `_jsx('li', {...})` imported from `react/jsx-runtime` instead of `React.createElement`. Same idea, same objects; it just means you no longer need `import React` in every file.

```widget
jsx-to-object
```

## Build a tiny virtual DOM: h() and render()

You can build the core of this in a few lines. Libraries traditionally call the element factory `h` (for "hyperscript"):

```ts
type VNode = { type: string; props: { [key: string]: unknown; children: VNode[] } };

function h(type: string, props: Record<string, unknown> | null, ...children: (VNode | string)[]): VNode {
  return {
    type,
    props: {
      ...props,
      children: children.map((c) => (typeof c === 'string' ? textNode(c) : c)),
    },
  };
}

function textNode(text: string): VNode {
  return { type: 'TEXT', props: { nodeValue: text, children: [] } };
}
```

Turning text into a `TEXT` vnode keeps the tree uniform: every node has a `type` and `props.children`, so the code that walks the tree has one shape to handle.

`render` turns a virtual tree into real DOM, recursively:

```ts
function render(vnode: VNode, container: Node): Node {
  const dom =
    vnode.type === 'TEXT'
      ? document.createTextNode(String(vnode.props.nodeValue))
      : document.createElement(vnode.type);

  for (const [name, value] of Object.entries(vnode.props)) {
    if (name === 'children' || name === 'nodeValue') continue;
    if (name.startsWith('on')) dom.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
    else (dom as any)[name] = value;           // className, id, value, disabled...
  }

  vnode.props.children.forEach((child) => render(child, dom));
  container.appendChild(dom);
  return dom;
}

render(h('ul', { className: 'contacts' }, h('li', null, 'Ava'), h('li', null, 'Ben')), document.body);
```

That is a working (if naive) UI library. This version throws the whole DOM away and rebuilds it on every change, which loses focus, scroll position and input text, and is slow. The fix is **reconciliation**: compare the new tree with the old one and patch only the differences. That is unit 3.

## Components are functions that return elements

What happens with a capitalised tag?

```tsx
function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}</p>;
}

const el = <Greeting name="Ava" />;
// { type: Greeting, props: { name: 'Ava' } }   ← type is the FUNCTION itself
```

Creating the element does **not** call `Greeting`. It only records "a `Greeting` with these props goes here". React calls the function later, when it renders that part of the tree, and then continues with whatever the function returned:

```ts
function expand(vnode) {
  if (typeof vnode.type === 'function') return expand(vnode.type(vnode.props)); // call the component
  return { ...vnode, props: { ...vnode.props, children: vnode.props.children.map(expand) } };
}
```

This is why components must be **pure** with respect to their props and state: React decides *when* and *how often* to call them. It may call one twice in development (Strict Mode), skip one whose props did not change (`memo`), or call one and throw the result away (an interrupted render, unit 4).

## What the Virtual DOM is (and is not) good for

A common myth is "the Virtual DOM is faster than the DOM". It is not: hand-written, perfectly minimal DOM updates are always at least as fast, because React does the same DOM work *plus* the diff. What it gives you is:

- **Declarative code.** You describe the screen for a given state; you never write transitions. This removes a whole class of "screen and data disagree" bugs.
- **Good-enough performance by default.** The diff finds a small set of changes without you thinking about it, and the work can be **batched**: several state updates lead to one render and one round of DOM changes.
- **Rendering anywhere.** The description is just objects, so a different "renderer" can turn it into something other than DOM: React Native turns it into iOS and Android views, and server rendering turns it into an HTML string.
- **Scheduling.** Because the work of computing the next tree is separate from touching the DOM, React can split it up, pause it and prioritise it (unit 4).

Other frameworks make different trade-offs: Svelte and Solid compile templates into direct DOM updates and skip the virtual tree entirely. Neither approach is "the right one"; React's is the one this course uses.

## How this shows up in React

- A component returns **elements** (descriptions), not DOM nodes. Returning a new object every render is normal and cheap.
- `props.children` is just a prop. `<Card><p>Hi</p></Card>` passes the `<p>` element to `Card` as `children`.
- Lists are arrays of elements: `{contacts.map((c) => <li key={c.id}>{c.name}</li>)}`.
- Never mutate an element or props object after creating it. React treats them as immutable snapshots.
- The `ReactNode` type you will meet in the TypeScript primer is "anything that can be a child": an element, a string, a number, an array of those, `null`, `undefined` or a boolean.
