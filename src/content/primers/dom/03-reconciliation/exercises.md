# practice: Diff and patch props

### meta
minutes: 8
language: ts

### prompt
When old and new elements have the **same type**, React keeps the DOM node and patches only what changed. Write both halves of that:

1. `diffProps(oldProps, newProps)` returns `{ set, remove }`:
   - `set` has every prop that is new or whose value changed (compare with `Object.is`);
   - `remove` lists the names of props that were in `oldProps` but are not in `newProps`;
   - ignore `children` completely.
2. `updateElement(dom, oldProps, newProps)` applies that diff to a real element:
   - `on*` props are listeners: remove the old listener (if there was one) and add the new one;
   - other props are DOM properties: set them, and set removed ones to `''`.

### starter
```ts
export type Props = Record<string, unknown>;

export interface PropPatch {
  set: Props;
  remove: string[];
}

export function diffProps(oldProps: Props, newProps: Props): PropPatch {
  // Naive: sets everything and never removes anything
  return { set: { ...newProps }, remove: [] };
}

export function updateElement(dom: HTMLElement, oldProps: Props, newProps: Props): void {
  // TODO: apply diffProps(oldProps, newProps) to dom
}

// Preview
console.log(diffProps({ className: 'btn', id: 'save', children: [] }, { className: 'btn primary', disabled: true, children: [] }));
```

### solution
```ts
export type Props = Record<string, unknown>;

export interface PropPatch {
  set: Props;
  remove: string[];
}

export function diffProps(oldProps: Props, newProps: Props): PropPatch {
  const set: Props = {};
  const remove: string[] = [];
  for (const [name, value] of Object.entries(newProps)) {
    if (name === 'children') continue;
    if (!(name in oldProps) || !Object.is(oldProps[name], value)) set[name] = value;
  }
  for (const name of Object.keys(oldProps)) {
    if (name !== 'children' && !(name in newProps)) remove.push(name);
  }
  return { set, remove };
}

const isEvent = (name: string) => name.startsWith('on');
const eventName = (name: string) => name.slice(2).toLowerCase();

export function updateElement(dom: HTMLElement, oldProps: Props, newProps: Props): void {
  const { set, remove } = diffProps(oldProps, newProps);
  const props = dom as unknown as Record<string, unknown>;

  for (const name of remove) {
    if (isEvent(name)) dom.removeEventListener(eventName(name), oldProps[name] as EventListener);
    else props[name] = '';
  }
  for (const [name, value] of Object.entries(set)) {
    if (isEvent(name)) {
      if (oldProps[name]) dom.removeEventListener(eventName(name), oldProps[name] as EventListener);
      dom.addEventListener(eventName(name), value as EventListener);
    } else {
      props[name] = value;
    }
  }
}

// Preview
console.log(diffProps({ className: 'btn', id: 'save', children: [] }, { className: 'btn primary', disabled: true, children: [] }));
```

### tests
```ts
test('identical props produce an empty patch', () => {
  const f = () => {};
  expect(user.diffProps({ id: 'a', onClick: f }, { id: 'a', onClick: f })).toEqual({ set: {}, remove: [] });
});

test('changed and added props go in set', () => {
  expect(user.diffProps({ className: 'btn', id: 'x' }, { className: 'btn primary', id: 'x', disabled: true })).toEqual({ set: { className: 'btn primary', disabled: true }, remove: [] });
});

test('missing props go in remove', () => {
  expect(user.diffProps({ id: 'x', title: 't' }, { id: 'x' })).toEqual({ set: {}, remove: ['title'] });
});

test('children are ignored', () => {
  expect(user.diffProps({ children: ['a'] }, { children: ['b'] })).toEqual({ set: {}, remove: [] });
  expect(user.diffProps({ children: ['a'] }, {})).toEqual({ set: {}, remove: [] });
});

test('a new handler function counts as a change', () => {
  expect(Object.keys(user.diffProps({ onClick: () => {} }, { onClick: () => {} }).set)).toEqual(['onClick']);
});

test('updateElement patches properties on the same node', () => {
  const dom = document.createElement('button');
  dom.className = 'btn';
  dom.id = 'save';
  user.updateElement(dom, { className: 'btn', id: 'save' }, { className: 'btn primary', disabled: true });
  expect(dom.className).toBe('btn primary');
  expect(dom.disabled).toBe(true);
  expect(dom.id).toBe('');
});

test('updateElement swaps event listeners', () => {
  const dom = document.createElement('button');
  const first = fn();
  const second = fn();
  dom.addEventListener('click', first);
  user.updateElement(dom, { onClick: first }, { onClick: second });
  dom.click();
  expect(first).toHaveBeenCalledTimes(0);
  expect(second).toHaveBeenCalledTimes(1);
  user.updateElement(dom, { onClick: second }, {});
  dom.click();
  expect(second).toHaveBeenCalledTimes(1);
});
```

### explanation
This is rule 2 of reconciliation in code: same type, so keep the node and touch only the differences. `diffProps` is a pure function, which makes it easy to test: two loops, one over the new props (added or changed) and one over the old ones (removed). `Object.is` compares by identity, which is why a new arrow function on every render counts as a change. React handles that cheaply because it attaches a single delegated listener at the root and only swaps which handler it calls. `updateElement` turns the patch into DOM operations. Notice the listener swap needs the **old** function to remove it, so the old props must be kept around. React keeps them on the fiber, as you will see next unit.

### hints
- Skip `children` with `if (name === 'children') continue;` in both loops.
- A prop is in `set` when `!(name in oldProps) || !Object.is(oldProps[name], value)`.
- In `updateElement`, call `diffProps` first, then handle `remove` and `set` separately; `name.slice(2).toLowerCase()` gives the event name.

# practice: Keys keep state with the right item

### meta
minutes: 8
language: tsx

### prompt
Two bugs, both about how React matches elements between renders.

1. **`NoteList`**: each person has a note input that holds its own state. After the list is reordered or a person is added at the top, notes end up next to the wrong person. Fix the keys.
2. **`EditorPanel`**: when the panel switches from one contact to another, the name field keeps the **previous** contact's draft. Make the editor start fresh whenever the contact (by `id`) changes, but keep the draft while it is the same contact. Do not add an effect: use a `key`.

Press **Run**, type a note next to Ava and a draft name, then try it in the preview.

### starter
```tsx
import { useState } from 'react';

export interface Person {
  id: string;
  name: string;
}

function NoteInput() {
  const [note, setNote] = useState('');
  return <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />;
}

export function NoteList({ people }: { people: Person[] }) {
  return (
    <ul>
      {people.map((person, index) => (
        <li key={index}>
          <span>{person.name}</span> <NoteInput />
        </li>
      ))}
    </ul>
  );
}

function ContactEditor({ contact }: { contact: Person }) {
  const [draft, setDraft] = useState(contact.name);
  return <input aria-label="Name" value={draft} onChange={(e) => setDraft(e.target.value)} />;
}

export function EditorPanel({ contact }: { contact: Person }) {
  return (
    <section>
      <h3>Editing {contact.name}</h3>
      <ContactEditor contact={contact} />
    </section>
  );
}

// Preview
const PEOPLE: Person[] = [
  { id: 'ava', name: 'Ava' },
  { id: 'ben', name: 'Ben' },
];

export default function App() {
  const [people, setPeople] = useState(PEOPLE);
  const [selected, setSelected] = useState(0);
  return (
    <div>
      <button onClick={() => setPeople((p) => [...p].reverse())}>Reverse</button>
      <button onClick={() => setPeople((p) => [{ id: `n${p.length}`, name: `New ${p.length}` }, ...p])}>Add to top</button>
      <NoteList people={people} />
      <button onClick={() => setSelected((s) => (s + 1) % people.length)}>Next contact</button>
      <EditorPanel contact={people[selected]} />
    </div>
  );
}
```

### solution
```tsx
import { useState } from 'react';

export interface Person {
  id: string;
  name: string;
}

function NoteInput() {
  const [note, setNote] = useState('');
  return <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />;
}

export function NoteList({ people }: { people: Person[] }) {
  return (
    <ul>
      {people.map((person) => (
        <li key={person.id}>
          <span>{person.name}</span> <NoteInput />
        </li>
      ))}
    </ul>
  );
}

function ContactEditor({ contact }: { contact: Person }) {
  const [draft, setDraft] = useState(contact.name);
  return <input aria-label="Name" value={draft} onChange={(e) => setDraft(e.target.value)} />;
}

export function EditorPanel({ contact }: { contact: Person }) {
  return (
    <section>
      <h3>Editing {contact.name}</h3>
      <ContactEditor key={contact.id} contact={contact} />
    </section>
  );
}

// Preview
const PEOPLE: Person[] = [
  { id: 'ava', name: 'Ava' },
  { id: 'ben', name: 'Ben' },
];

export default function App() {
  const [people, setPeople] = useState(PEOPLE);
  const [selected, setSelected] = useState(0);
  return (
    <div>
      <button onClick={() => setPeople((p) => [...p].reverse())}>Reverse</button>
      <button onClick={() => setPeople((p) => [{ id: `n${p.length}`, name: `New ${p.length}` }, ...p])}>Add to top</button>
      <NoteList people={people} />
      <button onClick={() => setSelected((s) => (s + 1) % people.length)}>Next contact</button>
      <EditorPanel contact={people[selected]} />
    </div>
  );
}
```

### tests
```tsx
const ava = { id: 'ava', name: 'Ava' };
const ben = { id: 'ben', name: 'Ben' };
const cy = { id: 'cy', name: 'Cy' };
const noteFor = (view, name) => view.$$('li').find((li) => li.querySelector('span').textContent === name).querySelector('input');

test('notes follow their person when the list is reversed', async () => {
  const view = await render(<user.NoteList people={[ava, ben]} />);
  await type(noteFor(view, 'Ava'), 'Call back');
  await view.rerender(<user.NoteList people={[ben, ava]} />);
  expect(noteFor(view, 'Ava').value).toBe('Call back');
  expect(noteFor(view, 'Ben').value).toBe('');
});

test('a person added at the top starts with an empty note', async () => {
  const view = await render(<user.NoteList people={[ava, ben]} />);
  await type(noteFor(view, 'Ben'), 'VIP');
  await view.rerender(<user.NoteList people={[cy, ava, ben]} />);
  expect(noteFor(view, 'Cy').value).toBe('');
  expect(noteFor(view, 'Ben').value).toBe('VIP');
});

test('the editor resets when a different contact is shown', async () => {
  const view = await render(<user.EditorPanel contact={ava} />);
  await type(view.getByRole('textbox', { name: 'Name' }), 'Ava Lee');
  await view.rerender(<user.EditorPanel contact={ben} />);
  expect(view.getByRole('textbox', { name: 'Name' }).value).toBe('Ben');
});

test('the editor keeps its draft while it is the same contact', async () => {
  const view = await render(<user.EditorPanel contact={ava} />);
  await type(view.getByRole('textbox', { name: 'Name' }), 'Ava Lee');
  await view.rerender(<user.EditorPanel contact={{ id: 'ava', name: 'Ava' }} />);
  expect(view.getByRole('textbox', { name: 'Name' }).value).toBe('Ava Lee');
});
```

### explanation
React stores state against a **position in the tree**, refined by `key`. With `key={index}`, the first `<li>` is always "item 0" whatever person it shows, so its `NoteInput` state stays at position 0 while the names move. With `key={person.id}`, the state belongs to Ava's item and moves with it, and a newly inserted person gets a fresh item. In `EditorPanel`, `ContactEditor` is the same type in the same place for every contact, so React keeps it and its `useState` initial value is ignored after the first render. `key={contact.id}` makes each contact a different element: switching contacts unmounts the old editor and mounts a new one, while re-rendering the same contact (even as a new object) keeps the draft.

### hints
- In `NoteList`, the key must come from the data: `person.id`.
- `useState(initial)` only uses `initial` on the first mount. To get a new initial value, React needs a *new* component instance.
- Put `key={contact.id}` on `<ContactEditor />` inside `EditorPanel`.

# challenge: Detect moves like React does

### meta
minutes: 12
language: ts

### prompt
Implement `reconcileKeys(oldKeys, newKeys)`, the core of React's keyed list diff. Walk `newKeys` left to right, tracking `lastPlacedIndex` (starts at `0`):

- key not in `oldKeys` → add it to `inserted`;
- key's old index **≥** `lastPlacedIndex` → add it to `kept` and set `lastPlacedIndex` to its old index;
- key's old index **<** `lastPlacedIndex` → add it to `moved`.

Then every key of `oldKeys` that is not in `newKeys` goes in `removed` (in old order). `inserted`, `kept` and `moved` are in new order.

```text
old: a b c d   new: d a b c   → kept [d], moved [a, b, c]
old: a b c d   new: b c d a   → kept [b, c, d], moved [a]
```

### starter
```ts
export interface KeyDiff {
  inserted: string[];
  removed: string[];
  kept: string[];
  moved: string[];
}

export function reconcileKeys(oldKeys: string[], newKeys: string[]): KeyDiff {
  // Naive: anything at a different index counts as moved
  const result: KeyDiff = { inserted: [], removed: [], kept: [], moved: [] };
  newKeys.forEach((key, i) => {
    const oldIndex = oldKeys.indexOf(key);
    if (oldIndex === -1) result.inserted.push(key);
    else if (oldIndex === i) result.kept.push(key);
    else result.moved.push(key);
  });
  result.removed = oldKeys.filter((k) => !newKeys.includes(k));
  return result;
}

// Preview
console.log(reconcileKeys(['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c']));
console.log(reconcileKeys(['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a']));
```

### solution
```ts
export interface KeyDiff {
  inserted: string[];
  removed: string[];
  kept: string[];
  moved: string[];
}

export function reconcileKeys(oldKeys: string[], newKeys: string[]): KeyDiff {
  const oldIndex = new Map(oldKeys.map((key, i) => [key, i]));
  const result: KeyDiff = { inserted: [], removed: [], kept: [], moved: [] };
  let lastPlacedIndex = 0;

  for (const key of newKeys) {
    const index = oldIndex.get(key);
    if (index === undefined) {
      result.inserted.push(key);
    } else if (index >= lastPlacedIndex) {
      result.kept.push(key);
      lastPlacedIndex = index;
    } else {
      result.moved.push(key);
    }
  }

  const stillThere = new Set(newKeys);
  result.removed = oldKeys.filter((key) => !stillThere.has(key));
  return result;
}

// Preview
console.log(reconcileKeys(['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c']));
console.log(reconcileKeys(['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a']));
```

### tests
```ts
const r = (o, n) => user.reconcileKeys(o.split(''), n.split(''));

test('unchanged list: everything kept', () => {
  expect(r('abc', 'abc')).toEqual({ inserted: [], removed: [], kept: ['a', 'b', 'c'], moved: [] });
});

test('insert at the top: one insertion, nothing moves', () => {
  expect(r('abc', 'dabc')).toEqual({ inserted: ['d'], removed: [], kept: ['a', 'b', 'c'], moved: [] });
});

test('remove from the middle', () => {
  expect(r('abc', 'ac')).toEqual({ inserted: [], removed: ['b'], kept: ['a', 'c'], moved: [] });
});

test('last item to the front costs three moves', () => {
  expect(r('abcd', 'dabc')).toEqual({ inserted: [], removed: [], kept: ['d'], moved: ['a', 'b', 'c'] });
});

test('first item to the end costs one move', () => {
  expect(r('abcd', 'bcda')).toEqual({ inserted: [], removed: [], kept: ['b', 'c', 'd'], moved: ['a'] });
});

test('a mix of insert, remove and move', () => {
  expect(r('abcde', 'ebxad')).toEqual({ inserted: ['x'], removed: ['c'], kept: ['e'], moved: ['b', 'a', 'd'] });
});

test('swapping two items', () => {
  expect(r('ab', 'ba')).toEqual({ inserted: [], removed: [], kept: ['b'], moved: ['a'] });
});
```

### explanation
The naive version compares indices directly, so a single insertion at the top would mark every later item as "moved". React's insight is that only **relative order** matters. As it walks the new list it remembers the furthest-right old position it has already placed. Any item that used to be further left than that must move; any item further right can stay put and becomes the new reference point. A `Map` from key to old index makes each lookup O(1), so the whole diff is O(n). It is not always minimal (moving the last item to the front costs n - 1 moves when one would do), but it is simple, fast and predictable, which is the trade-off React makes everywhere in reconciliation.

### hints
- Build `new Map(oldKeys.map((key, i) => [key, i]))` once, before the loop.
- Keep `let lastPlacedIndex = 0` outside the loop and update it only when you keep an item.
- `removed` is `oldKeys.filter((k) => !newKeys.includes(k))` (or use a `Set`).
