## From HTML text to a tree

When the browser downloads an HTML file it gets **text**. It cannot draw text directly, so it *parses* it into a tree of objects in memory: the **Document Object Model**, or DOM. Everything you see on a page is drawn from that tree, and every change you make with JavaScript is a change to that tree.

```html
<ul id="contacts">
  <li>Ava</li>
  <li>Ben</li>
</ul>
```

becomes, roughly:

```text
document
└── html
    └── body
        └── ul#contacts
            ├── "\n  "        (whitespace text node)
            ├── li
            │   └── "Ava"     (text node)
            ├── "\n  "
            ├── li
            │   └── "Ben"
            └── "\n"
```

Three things to notice:

1. **The DOM is not your HTML.** The parser fixes mistakes (unclosed tags, a `<div>` inside a `<p>`), adds missing `<html>`, `<head>` and `<body>` elements, and keeps whitespace between tags as text nodes. *View source* shows the HTML; the browser's **Elements** panel shows the DOM.
2. **It is a live object graph.** Every node is a JavaScript object with properties (`textContent`, `className`, `children`) and methods (`appendChild`, `remove`, `addEventListener`).
3. **Changing it is what updates the screen.** After a change the browser recalculates styles and layout and repaints. Those steps are the expensive part, so *what* you change and *how often* matters.

```widget
dom-tree
```

> **The thinking pattern:** the screen is a *picture of a tree*. To change what the user sees you change the tree, and the browser redraws. React's whole job is to work out the smallest set of tree changes for you.

## Nodes: elements, text and the document

Every item in the tree is a `Node`. The kinds you will meet:

| Node type | Example | `nodeType` | Notes |
| --- | --- | --- | --- |
| Document | `document` | 9 | The root. Entry point for every query. |
| Element | `<li>`, `<button>` | 1 | Has a tag name, attributes and children. |
| Text | `"Ava"` | 3 | Only text. Cannot have children. |
| Comment | `<!-- note -->` | 8 | Ignored by rendering, still in the tree. |

Every node knows its neighbours, which is how you *walk* the tree:

```ts
const list = document.getElementById('contacts')!;

list.parentNode;        // <body>
list.childNodes;        // ALL child nodes, including whitespace text: NodeList(5)
list.children;          // only ELEMENT children: HTMLCollection(2) [li, li]
list.firstElementChild; // first <li>
list.firstElementChild!.nextElementSibling; // second <li>
list.firstElementChild!.textContent;        // "Ava"
```

`childNodes` versus `children` trips everyone up once: `childNodes` includes the whitespace text nodes, `children` skips everything that is not an element. Prefer the `Element` versions (`children`, `firstElementChild`, `nextElementSibling`) unless you really want text nodes.

## Finding, reading and changing nodes

You rarely walk the tree by hand. CSS selectors find nodes for you:

```ts
const list = document.querySelector('#contacts');          // first match or null
const items = document.querySelectorAll('#contacts li');   // static NodeList of all matches
const first = list?.querySelector('li');                   // search inside one element
```

Reading and changing an element:

```ts
const li = document.querySelector('li')!;

li.textContent = 'Ava Lee';            // replace the text (safe: never parsed as HTML)
li.className = 'vip';                  // the class attribute
li.classList.add('selected');          // add one class without touching others
li.setAttribute('data-id', 'c1');      // any attribute
li.dataset.id;                         // "c1": data-* attributes as an object
li.style.color = 'crimson';            // inline style
```

> **`textContent` vs `innerHTML`.** `innerHTML = '<b>hi</b>'` *parses* the string as HTML. If that string came from a user it can inject markup and scripts (an XSS attack). `textContent` always treats the value as plain text. React uses the safe path for you: `{name}` in JSX is set as text, never parsed.

## Creating and removing elements

Building UI with the DOM API is three steps: **create**, **configure**, **attach**.

```ts
function addContact(list: HTMLUListElement, name: string) {
  const li = document.createElement('li');   // 1. create (not on screen yet)
  li.textContent = name;                     // 2. configure
  list.appendChild(li);                      // 3. attach: now it renders
}

list.firstElementChild?.remove();             // remove a node
list.replaceChildren();                       // remove all children
list.prepend(li);                             // insert at the start
list.insertBefore(li, list.children[1]);      // insert before a specific child
```

A node can only be in one place. Appending a node that is already in the tree **moves** it. Moving is how list reordering is done cheaply, and you will see React rely on it when it reorders keyed list items.

When you add many nodes, build them first and attach once (a `DocumentFragment`, or a detached parent) so the browser lays out once instead of once per node.

## Events, bubbling and delegation

Elements fire events: `click`, `input`, `submit`, `keydown` and many more. You subscribe with `addEventListener`:

```ts
const button = document.querySelector('button')!;
function onClick(event: MouseEvent) {
  console.log('clicked', event.target);
}
button.addEventListener('click', onClick);
button.removeEventListener('click', onClick); // must pass the same function
```

Most events **bubble**: after firing on the element you clicked (the *target*), the same event fires on its parent, then its grandparent, all the way to `document`.

```text
click on <button>  →  <li>  →  <ul>  →  <body>  →  <html>  →  document
     (target)        each ancestor's listeners run in turn
```

Bubbling enables **event delegation**: one listener on a parent handles events for every child, including children added later.

```ts
list.addEventListener('click', (event) => {
  const button = (event.target as Element).closest('button.like');
  if (!button || !list.contains(button)) return;   // click was somewhere else
  const li = button.closest('li')!;
  console.log('liked', li.dataset.id);
});
```

`event.target` is the deepest element clicked; `closest(selector)` walks up from there to the nearest match. `event.stopPropagation()` stops bubbling and `event.preventDefault()` cancels the browser's default action (following a link, submitting a form).

React uses delegation itself: it attaches one listener per event type at the root of your app, and dispatches to your `onClick` props from there.

## Why this gets hard: imperative UI

Here is a contact counter written directly against the DOM:

```ts
let contacts: string[] = [];

function add(name: string) {
  contacts.push(name);
  const li = document.createElement('li');       // update the list...
  li.textContent = name;
  list.appendChild(li);
  count.textContent = String(contacts.length);   // ...and the counter...
  empty.hidden = contacts.length > 0;            // ...and the empty message
}

function remove(index: number) {
  contacts.splice(index, 1);
  list.children[index].remove();                 // must mirror every change by hand
  count.textContent = String(contacts.length);
  empty.hidden = contacts.length > 0;
}
```

This is **imperative** code: you write the *steps* to get from the current screen to the next one. Every action has to know every part of the screen that depends on the data. Add a filter box, a "VIP" badge and a sort order, and the number of transitions explodes. Miss one and the screen and the data disagree, which is the classic jQuery-era bug.

The alternative is **declarative** code: describe *what the screen should look like for a given state*, and let something else work out the steps:

```tsx
function ContactList({ contacts }: { contacts: string[] }) {
  return (
    <>
      <p>{contacts.length} contacts</p>
      {contacts.length === 0 && <p>No contacts yet</p>}
      <ul>{contacts.map((c) => <li key={c}>{c}</li>)}</ul>
    </>
  );
}
```

There are no "add" or "remove" steps. React compares the description with the previous one and makes the DOM changes. The next three units show how it does that.

## How this shows up in React

- You almost never call `createElement`, `appendChild` or `addEventListener` in React code. You describe the tree with JSX and pass handlers as props (`onClick`).
- `className` (not `class`) and `htmlFor` (not `for`) in JSX are the **DOM property names**, which is a hint that JSX describes DOM objects, not HTML text.
- When you *do* need the real node (focus an input, measure size, integrate a chart library) you use a **ref**: `useRef<HTMLInputElement>(null)`, then `ref.current.focus()`.
- Event handlers receive a React event that wraps the native one, with the same `target`, `preventDefault()` and `stopPropagation()`.
