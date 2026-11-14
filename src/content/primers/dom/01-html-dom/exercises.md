# practice: Build a list with the DOM API

### meta
minutes: 7
language: ts

### prompt
Implement `renderContacts(container, names)` using only the DOM API (no `innerHTML`):

- Remove anything already inside `container`.
- Create a `<ul class="contacts">` with one `<li>` per name, in order, and attach it to `container`.
- If `names` is empty, the list contains a single `<li class="empty">No contacts yet</li>`.
- Names are **text**: a name like `<b>Eve</b>` must appear literally, not as bold markup.
- Return the `<ul>`.

Press **Run** to see the preview code at the bottom render into the page.

### starter
```ts
export function renderContacts(container: HTMLElement, names: string[]): HTMLUListElement {
  // 1. clear the container
  // 2. create <ul class="contacts">
  // 3. one <li> per name (or the "empty" item)
  // 4. attach and return the list
  const ul = document.createElement('ul');
  return ul;
}

// Preview (Run shows this in the Preview tab)
renderContacts(document.getElementById('root')!, ['Ava Lee', 'Ben Okafor', '<b>Eve</b>']);
```

### solution
```ts
export function renderContacts(container: HTMLElement, names: string[]): HTMLUListElement {
  container.replaceChildren();

  const ul = document.createElement('ul');
  ul.className = 'contacts';

  if (names.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No contacts yet';
    ul.appendChild(li);
  }

  for (const name of names) {
    const li = document.createElement('li');
    li.textContent = name;
    ul.appendChild(li);
  }

  container.appendChild(ul);
  return ul;
}

// Preview (Run shows this in the Preview tab)
renderContacts(document.getElementById('root')!, ['Ava Lee', 'Ben Okafor', '<b>Eve</b>']);
```

### tests
```ts
const box = () => document.createElement('div');

test('creates a <ul class="contacts"> inside the container and returns it', () => {
  const c = box();
  const ul = user.renderContacts(c, ['Ava']);
  expect(ul.tagName).toBe('UL');
  expect(ul.className).toBe('contacts');
  expect(c.firstElementChild).toBe(ul);
});

test('one <li> per name, in order', () => {
  const c = box();
  user.renderContacts(c, ['Ava', 'Ben', 'Cy']);
  const items = Array.from(c.querySelectorAll('li')).map((li) => li.textContent);
  expect(items).toEqual(['Ava', 'Ben', 'Cy']);
});

test('names are inserted as text, not parsed as HTML', () => {
  const c = box();
  user.renderContacts(c, ['<b>Eve</b>']);
  expect(c.querySelector('li').textContent).toBe('<b>Eve</b>');
  expect(c.querySelector('b')).toBeNull();
});

test('an empty list shows a single "empty" item', () => {
  const c = box();
  user.renderContacts(c, []);
  const items = c.querySelectorAll('li');
  expect(items.length).toBe(1);
  expect(items[0].className).toBe('empty');
  expect(items[0].textContent).toBe('No contacts yet');
});

test('calling it again replaces the old list instead of adding a second one', () => {
  const c = box();
  c.appendChild(document.createElement('p'));
  user.renderContacts(c, ['Ava']);
  user.renderContacts(c, ['Ben', 'Cy']);
  expect(c.children.length).toBe(1);
  expect(c.querySelectorAll('li').length).toBe(2);
});
```

### explanation
The DOM API is always *create, configure, attach*. `document.createElement` makes a detached node that is not on screen; setting `textContent` and `className` configures it; `appendChild` attaches it. The list is attached to the container only once, after all items are added, so the browser does layout once. `replaceChildren()` with no arguments empties the container, which is what makes the function safe to call again. `textContent` never parses HTML, so `<b>Eve</b>` shows up as literal text. React does the same for `{name}` in JSX.

### hints
- `container.replaceChildren()` removes every child in one call.
- Create each item with `document.createElement('li')` and set `li.textContent = name`.
- Handle the empty case with an `if` before (or instead of) the loop.

# practice: Walk the tree

### meta
minutes: 8
language: ts

### prompt
Write two functions that walk a DOM tree.

1. `outline(el)` returns one line per **element** in depth-first order (the element itself first, then its children in order). Each line is the lowercase tag name, plus `#id` if it has an id, plus `.class` for each class, indented by two spaces per level:

```text
ul#contacts
  li.vip
    button
  li
```

2. `countText(node)` returns how many **non-whitespace text nodes** are inside `node` (at any depth). Whitespace-only text between tags does not count.

Use `children` for elements and `childNodes` when you need text nodes.

### starter
```ts
export function outline(el: Element, depth = 0): string[] {
  // TODO: the line for `el`, then the lines for each child element (depth + 1)
  return [el.tagName];
}

export function countText(node: Node): number {
  // TODO: if node is a text node with non-whitespace content, count it;
  // otherwise add up countText for every child node
  return 0;
}

// Preview
const root = document.getElementById('root')!;
root.innerHTML = `<ul id="contacts">
  <li class="vip">Ava <button>Like</button></li>
  <li>Ben</li>
</ul>`;
console.log(outline(root.firstElementChild!).join('\n'));
console.log('text nodes:', countText(root));
```

### solution
```ts
export function outline(el: Element, depth = 0): string[] {
  const id = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList).map((c) => `.${c}`).join('');
  const line = `${'  '.repeat(depth)}${el.tagName.toLowerCase()}${id}${classes}`;
  return [line, ...Array.from(el.children).flatMap((child) => outline(child, depth + 1))];
}

export function countText(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').trim() === '' ? 0 : 1;
  }
  let total = 0;
  node.childNodes.forEach((child) => {
    total += countText(child);
  });
  return total;
}

// Preview
const root = document.getElementById('root')!;
root.innerHTML = `<ul id="contacts">
  <li class="vip">Ava <button>Like</button></li>
  <li>Ben</li>
</ul>`;
console.log(outline(root.firstElementChild!).join('\n'));
console.log('text nodes:', countText(root));
```

### tests
```ts
function tree(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

test('outline lists a single element as its tag name', () => {
  expect(user.outline(tree('<p></p>').firstElementChild)).toEqual(['p']);
});

test('outline adds #id and .classes', () => {
  expect(user.outline(tree('<section id="main" class="card wide"></section>').firstElementChild)).toEqual(['section#main.card.wide']);
});

test('outline walks children depth-first with two-space indentation', () => {
  const t = tree('<ul id="contacts"><li class="vip">Ava <button>Like</button></li><li>Ben</li></ul>');
  expect(user.outline(t.firstElementChild)).toEqual(['ul#contacts', '  li.vip', '    button', '  li']);
});

test('countText counts text nodes at any depth', () => {
  const t = tree('<ul><li>Ava <b>Lee</b></li><li>Ben</li></ul>');
  expect(user.countText(t)).toBe(3);
});

test('countText ignores whitespace-only text between tags', () => {
  const t = tree('<ul>\n  <li>Ava</li>\n  <li>Ben</li>\n</ul>');
  expect(user.countText(t)).toBe(2);
});

test('countText works on a text node directly', () => {
  expect(user.countText(document.createTextNode('hi'))).toBe(1);
  expect(user.countText(document.createTextNode('   '))).toBe(0);
});
```

### explanation
Both functions are **recursive tree walks**: handle the current node, then call yourself on each child. `outline` uses `children`, which contains only elements, and passes `depth + 1` down so each level indents further. `flatMap` joins the children's arrays into one. `countText` needs `childNodes`, because text nodes are not in `children`. It checks `nodeType === Node.TEXT_NODE` and ignores whitespace-only text, which the parser creates for the line breaks and indentation between tags. React's reconciler walks its own tree in the same depth-first order, as you will see in the Fiber unit.

### hints
- Build the line from `el.tagName.toLowerCase()`, `el.id` and `el.classList`.
- `[line, ...Array.from(el.children).flatMap((c) => outline(c, depth + 1))]` puts the element before its descendants.
- In `countText`, check `node.nodeType === Node.TEXT_NODE` first, then loop over `node.childNodes`.

# challenge: Likes with event delegation

### meta
minutes: 10
language: ts

### prompt
Each contact in the list looks like this:

```html
<li data-id="ava">Ava <button class="like">♥ Like</button> <span class="count">0</span></li>
```

Implement `setupLikes(list)`:

- Clicking a `button.like` (or anything inside it) increases **that item's** `.count` by one.
- Clicks anywhere else (the name, the count, the list itself) do nothing.
- It must also work for `<li>` items added **after** `setupLikes` was called.
- It returns a cleanup function. After cleanup, clicks do nothing.

Use **one** listener on the list (event delegation), not one per button.

### starter
```ts
export function setupLikes(list: HTMLElement): () => void {
  // This only wires up buttons that exist right now, and never cleans up.
  list.querySelectorAll('button.like').forEach((button) => {
    button.addEventListener('click', () => {
      const count = button.parentElement!.querySelector('.count')!;
      count.textContent = String(Number(count.textContent) + 1);
    });
  });
  return () => {};
}

// Preview
const root = document.getElementById('root')!;
root.innerHTML = `<ul>
  <li data-id="ava">Ava <button class="like">♥ Like</button> <span class="count">0</span></li>
  <li data-id="ben">Ben <button class="like">♥ Like</button> <span class="count">0</span></li>
</ul>`;
setupLikes(root.querySelector('ul')!);
```

### solution
```ts
export function setupLikes(list: HTMLElement): () => void {
  function onClick(event: Event) {
    const button = (event.target as Element).closest('button.like');
    if (!button || !list.contains(button)) return;
    const count = button.closest('li')?.querySelector('.count');
    if (count) count.textContent = String(Number(count.textContent) + 1);
  }
  list.addEventListener('click', onClick);
  return () => list.removeEventListener('click', onClick);
}

// Preview
const root = document.getElementById('root')!;
root.innerHTML = `<ul>
  <li data-id="ava">Ava <button class="like">♥ Like</button> <span class="count">0</span></li>
  <li data-id="ben">Ben <button class="like">♥ Like</button> <span class="count">0</span></li>
</ul>`;
setupLikes(root.querySelector('ul')!);
```

### tests
```ts
function makeList() {
  const ul = document.createElement('ul');
  ul.innerHTML =
    '<li data-id="ava">Ava <button class="like"><i>♥</i> Like</button> <span class="count">0</span></li>' +
    '<li data-id="ben">Ben <button class="like"><i>♥</i> Like</button> <span class="count">0</span></li>';
  document.body.appendChild(ul);
  return ul;
}
const count = (ul, id) => ul.querySelector('[data-id="' + id + '"] .count').textContent;

test('clicking a like button increments that item only', () => {
  const ul = makeList();
  user.setupLikes(ul);
  ul.querySelector('[data-id="ben"] button').click();
  ul.querySelector('[data-id="ben"] button').click();
  expect(count(ul, 'ben')).toBe('2');
  expect(count(ul, 'ava')).toBe('0');
  ul.remove();
});

test('clicking an element inside the button counts too', () => {
  const ul = makeList();
  user.setupLikes(ul);
  ul.querySelector('[data-id="ava"] button i').click();
  expect(count(ul, 'ava')).toBe('1');
  ul.remove();
});

test('clicks outside a like button do nothing', () => {
  const ul = makeList();
  user.setupLikes(ul);
  ul.querySelector('[data-id="ava"] .count').click();
  ul.querySelector('[data-id="ava"]').click();
  ul.click();
  expect(count(ul, 'ava')).toBe('0');
  ul.remove();
});

test('works for items added after setup (delegation)', () => {
  const ul = makeList();
  user.setupLikes(ul);
  ul.insertAdjacentHTML('beforeend', '<li data-id="cy">Cy <button class="like">Like</button> <span class="count">0</span></li>');
  ul.querySelector('[data-id="cy"] button').click();
  expect(count(ul, 'cy')).toBe('1');
  ul.remove();
});

test('the returned cleanup stops counting', () => {
  const ul = makeList();
  const cleanup = user.setupLikes(ul);
  expect(typeof cleanup).toBe('function');
  ul.querySelector('[data-id="ava"] button').click();
  cleanup();
  ul.querySelector('[data-id="ava"] button').click();
  expect(count(ul, 'ava')).toBe('1');
  ul.remove();
});
```

### explanation
Clicks **bubble** from the element you clicked up through every ancestor, so one listener on the `<ul>` sees every click inside it. `event.target` is the deepest element clicked (maybe the `<i>` inside the button), and `closest('button.like')` walks up from there to the nearest like button, or returns `null` if the click was elsewhere. Because nothing is attached to individual buttons, items added later work automatically. Keeping a reference to the same `onClick` function is what makes `removeEventListener` work in the cleanup. React uses the same idea: it listens once at the root and routes events to your `onClick` props, and its effects return cleanup functions just like this one.

### hints
- Attach a single `click` listener to `list` and keep it in a named function so you can remove it later.
- `(event.target as Element).closest('button.like')` finds the button even when the click landed on a child of it.
- From the button, `closest('li')` finds the item and `.querySelector('.count')` finds its counter.
