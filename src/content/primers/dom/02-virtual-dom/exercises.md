# practice: Write h()

### meta
minutes: 7
language: ts

### prompt
Write `h(type, props, ...children)`, your own `createElement`. It returns a virtual node:

```ts
{ type, props: { ...props, children: VNode[] } }
```

Normalise the children so the tree has one shape:

- strings and numbers become text nodes with `textNode(String(value))` (already written for you);
- `null`, `undefined`, `true` and `false` are skipped (this is what makes `{cond && <X />}` work);
- arrays (from `.map()`) are flattened, at any depth;
- virtual nodes are kept as they are.

`props` may be `null`. Do not modify the `props` object you were given.

### starter
```ts
export interface VNode {
  type: string;
  props: { [key: string]: unknown; children: VNode[] };
}

type Child = VNode | string | number | boolean | null | undefined | Child[];

export function textNode(text: string): VNode {
  return { type: 'TEXT', props: { nodeValue: text, children: [] } };
}

export function h(type: string, props: Record<string, unknown> | null, ...children: Child[]): VNode {
  // TODO: copy props and add normalised children
  return { type, props: { children: [] } };
}

// Preview
const names = ['Ava', 'Ben'];
console.log(JSON.stringify(h('ul', { className: 'contacts' }, names.map((n) => h('li', null, n)), false, 'Total: ', 2), null, 2));
```

### solution
```ts
export interface VNode {
  type: string;
  props: { [key: string]: unknown; children: VNode[] };
}

type Child = VNode | string | number | boolean | null | undefined | Child[];

export function textNode(text: string): VNode {
  return { type: 'TEXT', props: { nodeValue: text, children: [] } };
}

function normalize(children: Child[]): VNode[] {
  const out: VNode[] = [];
  for (const child of children) {
    if (Array.isArray(child)) out.push(...normalize(child));
    else if (child === null || child === undefined || typeof child === 'boolean') continue;
    else if (typeof child === 'string' || typeof child === 'number') out.push(textNode(String(child)));
    else out.push(child);
  }
  return out;
}

export function h(type: string, props: Record<string, unknown> | null, ...children: Child[]): VNode {
  return { type, props: { ...props, children: normalize(children) } };
}

// Preview
const names = ['Ava', 'Ben'];
console.log(JSON.stringify(h('ul', { className: 'contacts' }, names.map((n) => h('li', null, n)), false, 'Total: ', 2), null, 2));
```

### tests
```ts
const text = (t) => ({ type: 'TEXT', props: { nodeValue: t, children: [] } });

test('an element with no props and no children', () => {
  expect(user.h('p', null)).toEqual({ type: 'p', props: { children: [] } });
});

test('props are copied next to children', () => {
  expect(user.h('a', { href: '/x', className: 'link' })).toEqual({ type: 'a', props: { href: '/x', className: 'link', children: [] } });
});

test('strings and numbers become text nodes', () => {
  expect(user.h('p', null, 'Total: ', 3).props.children).toEqual([text('Total: '), text('3')]);
});

test('child elements are kept as they are', () => {
  const b = user.h('b', null, 'Lee');
  const p = user.h('p', null, 'Ava ', b);
  expect(p.props.children[1]).toBe(b);
});

test('null, undefined, true and false are skipped', () => {
  expect(user.h('p', null, null, 'a', false, undefined, true, 'b').props.children).toEqual([text('a'), text('b')]);
});

test('nested arrays are flattened', () => {
  const kids = user.h('ul', null, ['a', ['b', ['c']]], 'd').props.children;
  expect(kids.map((k) => k.props.nodeValue)).toEqual(['a', 'b', 'c', 'd']);
});

test('does not modify the props object passed in', () => {
  const props = { id: 'x' };
  user.h('div', props, 'hi');
  expect(props).toEqual({ id: 'x' });
});
```

### explanation
`h` is a data constructor: it does no DOM work at all. The spread `{ ...props, children }` creates a **new** object (spreading `null` is allowed and adds nothing), which keeps the caller's object untouched; React treats props as immutable for the same reason. Normalising children up front (text into `TEXT` nodes, arrays flattened, booleans and nullish values dropped) means every later step (render, diff) handles one uniform shape. Dropping `false` is what makes `{isVip && <Badge />}` render nothing when `isVip` is false.

### hints
- Write a helper `normalize(children)` that loops and pushes into an output array.
- `Array.isArray(child)` → recurse with `out.push(...normalize(child))`.
- `typeof child === 'boolean'` covers both `true` and `false`.

# practice: Render a virtual tree

### meta
minutes: 8
language: ts

### prompt
Write `render(vnode, container)`, which turns a virtual tree into real DOM nodes, appends the result to `container`, and returns the node it created:

- `TEXT` nodes become `document.createTextNode(nodeValue)`.
- Other nodes become `document.createElement(type)`.
- Props whose name starts with `on` (like `onClick`) are event listeners: `onClick` → `addEventListener('click', fn)`.
- Every other prop except `children` (and `nodeValue`) is set as a **property** on the DOM node: `className`, `id`, `value`, `disabled`, ...
- Children are rendered recursively into the new node.

`h` from the previous practice is included.

### starter
```ts
export interface VNode {
  type: string;
  props: { [key: string]: unknown; children: VNode[] };
}
type Child = VNode | string | number | boolean | null | undefined | Child[];
const textNode = (text: string): VNode => ({ type: 'TEXT', props: { nodeValue: text, children: [] } });
const normalize = (children: Child[]): VNode[] =>
  children.flatMap((c): VNode[] => (Array.isArray(c) ? normalize(c) : c == null || typeof c === 'boolean' ? [] : typeof c === 'object' ? [c] : [textNode(String(c))]));
export const h = (type: string, props: Record<string, unknown> | null, ...children: Child[]): VNode => ({ type, props: { ...props, children: normalize(children) } });

export function render(vnode: VNode, container: Node): Node {
  // TODO: text nodes, props, events and children
  const dom = document.createElement(vnode.type);
  container.appendChild(dom);
  return dom;
}

// Preview
render(
  h('div', { className: 'card' },
    h('h3', null, 'Ava Lee'),
    h('button', { onClick: () => console.log('clicked!') }, 'Say hi'),
  ),
  document.getElementById('root')!,
);
```

### solution
```ts
export interface VNode {
  type: string;
  props: { [key: string]: unknown; children: VNode[] };
}
type Child = VNode | string | number | boolean | null | undefined | Child[];
const textNode = (text: string): VNode => ({ type: 'TEXT', props: { nodeValue: text, children: [] } });
const normalize = (children: Child[]): VNode[] =>
  children.flatMap((c): VNode[] => (Array.isArray(c) ? normalize(c) : c == null || typeof c === 'boolean' ? [] : typeof c === 'object' ? [c] : [textNode(String(c))]));
export const h = (type: string, props: Record<string, unknown> | null, ...children: Child[]): VNode => ({ type, props: { ...props, children: normalize(children) } });

export function render(vnode: VNode, container: Node): Node {
  if (vnode.type === 'TEXT') {
    const text = document.createTextNode(String(vnode.props.nodeValue));
    container.appendChild(text);
    return text;
  }

  const dom = document.createElement(vnode.type);
  for (const [name, value] of Object.entries(vnode.props)) {
    if (name === 'children' || name === 'nodeValue') continue;
    if (name.startsWith('on') && typeof value === 'function') {
      dom.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
    } else {
      (dom as unknown as Record<string, unknown>)[name] = value;
    }
  }
  for (const child of vnode.props.children) render(child, dom);

  container.appendChild(dom);
  return dom;
}

// Preview
render(
  h('div', { className: 'card' },
    h('h3', null, 'Ava Lee'),
    h('button', { onClick: () => console.log('clicked!') }, 'Say hi'),
  ),
  document.getElementById('root')!,
);
```

### tests
```ts
const box = () => document.createElement('div');

test('renders a text node', () => {
  const c = box();
  const node = user.render(user.h('p', null, 'x').props.children[0], c);
  expect(node.nodeType).toBe(3);
  expect(c.textContent).toBe('x');
});

test('renders an element with children and returns it', () => {
  const c = box();
  const ul = user.render(user.h('ul', null, user.h('li', null, 'Ava'), user.h('li', null, 'Ben')), c);
  expect(ul.tagName).toBe('UL');
  expect(c.innerHTML).toBe('<ul><li>Ava</li><li>Ben</li></ul>');
});

test('sets props as DOM properties', () => {
  const c = box();
  user.render(user.h('div', null, user.h('input', { id: 'name', className: 'field', value: 'Ava', disabled: true })), c);
  const input = c.querySelector('input');
  expect(input.id).toBe('name');
  expect(input.className).toBe('field');
  expect(input.value).toBe('Ava');
  expect(input.disabled).toBe(true);
});

test('on* props become event listeners, not attributes', () => {
  const c = box();
  const onClick = fn();
  const button = user.render(user.h('button', { onClick }, 'Save'), c);
  button.click();
  button.click();
  expect(onClick).toHaveBeenCalledTimes(2);
  expect(button.getAttribute('onclick')).toBeNull();
});

test('does not set children or nodeValue as properties', () => {
  const c = box();
  const p = user.render(user.h('p', null, 'hi'), c);
  expect(p.textContent).toBe('hi');
  expect(c.innerHTML).toBe('<p>hi</p>');
});
```

### explanation
`render` mirrors `h`: where `h` builds a tree of objects, `render` walks that tree depth-first and builds the matching DOM nodes. Text nodes are a separate branch because they are created differently and have no props or children. Setting props as DOM **properties** (rather than attributes) is why JSX uses property names: `className` is the property behind the `class` attribute, and `value` and `disabled` are live properties on inputs. The `on` prefix is a naming convention that tells the renderer "this is a listener", exactly as in React. This renderer always creates new nodes, which is fine for a first render. Updating an existing screen efficiently is the job of reconciliation, next unit.

### hints
- Handle `vnode.type === 'TEXT'` first and return early.
- Loop over `Object.entries(vnode.props)`, `continue` past `children` and `nodeValue`.
- `name.slice(2).toLowerCase()` turns `onClick` into `click`. To set any property, cast: `(dom as unknown as Record<string, unknown>)[name] = value`.

# challenge: Components and renderToString

### meta
minutes: 12
language: ts

### prompt
Now virtual nodes can have a **function** as their `type`: a component. Write `toHTML(vnode)`, a tiny `renderToString`, that returns the HTML string for a tree:

- **Components:** if `type` is a function, call it with the node's `props` and render whatever it returns.
- **Text:** escape `&`, `<`, `>` and `"` (as `&amp;` `&lt;` `&gt;` `&quot;`).
- **Elements:** `<tag attrs>children</tag>`. For attributes, in the order the props were given:
  - skip `children`, anything starting with `on`, and values that are `null`, `undefined` or `false`;
  - `className` is written as `class`;
  - `true` is written as the bare name (`disabled`);
  - anything else is `name="value"` with the value escaped.
- **Void elements** `input`, `img`, `br` and `hr` have no children and no closing tag: `<input value="Ava">`.

### starter
```ts
export type Props = { [key: string]: unknown; children: VNode[] };
export type Component = (props: Props) => VNode;
export interface VNode {
  type: string | Component;
  props: Props;
}
type Child = VNode | string | number | boolean | null | undefined | Child[];
const textNode = (text: string): VNode => ({ type: 'TEXT', props: { nodeValue: text, children: [] } });
const normalize = (children: Child[]): VNode[] =>
  children.flatMap((c): VNode[] => (Array.isArray(c) ? normalize(c) : c == null || typeof c === 'boolean' ? [] : typeof c === 'object' ? [c] : [textNode(String(c))]));
export const h = (type: string | Component, props: Record<string, unknown> | null, ...children: Child[]): VNode => ({ type, props: { ...props, children: normalize(children) } });

export function toHTML(vnode: VNode): string {
  // Handles text and plain elements only. Add: components, escaping, attributes, void elements.
  if (vnode.type === 'TEXT') return String(vnode.props.nodeValue);
  const tag = String(vnode.type);
  return `<${tag}>${vnode.props.children.map(toHTML).join('')}</${tag}>`;
}

// Preview
const Badge = (props: Props) => h('span', { className: 'badge' }, String(props.label));
console.log(toHTML(h('li', { className: 'contact', onClick: () => {} }, 'Ava & Co ', h(Badge, { label: 'VIP' }))));
```

### solution
```ts
export type Props = { [key: string]: unknown; children: VNode[] };
export type Component = (props: Props) => VNode;
export interface VNode {
  type: string | Component;
  props: Props;
}
type Child = VNode | string | number | boolean | null | undefined | Child[];
const textNode = (text: string): VNode => ({ type: 'TEXT', props: { nodeValue: text, children: [] } });
const normalize = (children: Child[]): VNode[] =>
  children.flatMap((c): VNode[] => (Array.isArray(c) ? normalize(c) : c == null || typeof c === 'boolean' ? [] : typeof c === 'object' ? [c] : [textNode(String(c))]));
export const h = (type: string | Component, props: Record<string, unknown> | null, ...children: Child[]): VNode => ({ type, props: { ...props, children: normalize(children) } });

const VOID = new Set(['input', 'img', 'br', 'hr']);

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toHTML(vnode: VNode): string {
  if (typeof vnode.type === 'function') return toHTML(vnode.type(vnode.props));
  if (vnode.type === 'TEXT') return escape(String(vnode.props.nodeValue));

  const tag = vnode.type;
  const attrs = Object.entries(vnode.props)
    .filter(([name, value]) => name !== 'children' && !name.startsWith('on') && value !== null && value !== undefined && value !== false)
    .map(([name, value]) => {
      const attr = name === 'className' ? 'class' : name;
      return value === true ? ` ${attr}` : ` ${attr}="${escape(String(value))}"`;
    })
    .join('');

  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${vnode.props.children.map(toHTML).join('')}</${tag}>`;
}

// Preview
const Badge = (props: Props) => h('span', { className: 'badge' }, String(props.label));
console.log(toHTML(h('li', { className: 'contact', onClick: () => {} }, 'Ava & Co ', h(Badge, { label: 'VIP' }))));
```

### tests
```ts
const { h, toHTML } = user;

test('plain elements and text', () => {
  expect(toHTML(h('p', null, 'Hi'))).toBe('<p>Hi</p>');
  expect(toHTML(h('ul', null, h('li', null, 'a'), h('li', null, 'b')))).toBe('<ul><li>a</li><li>b</li></ul>');
});

test('attributes in order, className written as class', () => {
  expect(toHTML(h('a', { href: '/c/1', className: 'link' }, 'Ava'))).toBe('<a href="/c/1" class="link">Ava</a>');
});

test('skips on* handlers, null, undefined and false; true is a bare attribute', () => {
  const html = toHTML(h('button', { disabled: true, onClick: () => {}, hidden: false, title: null, name: undefined }, 'Save'));
  expect(html).toBe('<button disabled>Save</button>');
});

test('escapes text and attribute values', () => {
  expect(toHTML(h('p', { title: 'say "hi"' }, '<b> & co'))).toBe('<p title="say &quot;hi&quot;">&lt;b&gt; &amp; co</p>');
});

test('void elements have no closing tag', () => {
  expect(toHTML(h('div', null, h('input', { value: 'Ava' }), h('br', null)))).toBe('<div><input value="Ava"><br></div>');
});

test('calls function components with their props', () => {
  const Badge = (props) => h('span', { className: 'badge' }, props.label);
  expect(toHTML(h('li', null, 'Ava ', h(Badge, { label: 'VIP' })))).toBe('<li>Ava <span class="badge">VIP</span></li>');
});

test('components receive children and can nest other components', () => {
  const Card = (props) => h('div', { className: 'card' }, props.children);
  const Title = (props) => h('h3', null, props.text);
  expect(toHTML(h(Card, null, h(Title, { text: 'Deals' }), h('p', null, 'x')))).toBe('<div class="card"><h3>Deals</h3><p>x</p></div>');
});
```

### explanation
A component node is a **deferred function call**: `h(Badge, { label: 'VIP' })` stores the function and its props, and the renderer calls it when it reaches that spot in the tree. Then it keeps going with whatever the component returned, so components can return other components to any depth. Everything else is careful string building: filtering props that are not attributes, mapping `className` to `class`, handling boolean attributes, and escaping. Escaping is the important part, because it is what stops user data from becoming markup. React's `renderToString` (used for server-side rendering) follows the same approach on the same kind of element tree, which is one of the things a virtual DOM makes possible.

### hints
- Check `typeof vnode.type === 'function'` first and return `toHTML(vnode.type(vnode.props))`.
- Build attributes with `Object.entries(props).filter(...).map(...).join('')`; each attribute starts with a space.
- Replace `&` first when escaping, otherwise you would escape the `&` in `&lt;` again.
