## The problem: diffing two trees

Every time state changes, your components return a **new** virtual tree. React holds on to the **previous** one. **Reconciliation** is the process of comparing the two and working out which real DOM nodes to create, update, move or delete.

A perfect diff between two arbitrary trees (the smallest possible set of edits) is a known hard problem: the best general algorithms take around O(n³) time. For 1,000 elements that is a billion comparisons, on every keystroke. React does not try to be perfect. It uses two **heuristics** that make the diff O(n), a single walk over the tree, and that are right almost all the time in real UIs:

1. **Two elements of different types produce different trees.** React does not try to match anything below them.
2. **The developer can mark which children are the same across renders with a `key`.**

> **The thinking pattern:** React matches old and new by **position and type**, plus **key** in lists. When you predict what React will keep, update or throw away, ask: "Is this the same type, in the same place, with the same key, as last time?"

## Rule 1: different type → replace the whole subtree

```tsx
// before                      // after
<div>                          <section>
  <Counter />                    <Counter />
</div>                         </section>
```

The root changed from `div` to `section`. React does **not** look inside: it unmounts the old `<div>` and everything below it, destroying `Counter`'s state and running its effect cleanups, and then mounts a brand-new tree. The same happens when a component type changes, `<ContactCard />` → `<CompanyCard />`, even if they render similar markup.

This is also why you must **never define a component inside another component**:

```tsx
function Page() {
  function Field() { return <input />; }   // a NEW function every render
  return <Field />;                          // different type each time → remounts → input loses focus and text
}
```

Each render creates a new `Field` function, so the type is "different" every time and React remounts it. Define components at the top level of a module.

## Rule 2: same type → keep the node, update what changed

When the type is the same, React **keeps** the existing DOM node (or component instance with its state) and only updates what differs:

```tsx
<button className="btn" disabled={false}>Save</button>
// next render
<button className="btn primary" disabled>Saving…</button>
```

React keeps the same `<button>` DOM node and makes three small changes: set `className`, set `disabled`, change one text node. Focus, scroll position and any CSS transitions on that button are untouched.

For a **component** of the same type, React keeps the instance (and its state and refs), passes the new props, and renders it again. Then it recurses into the children of the result and applies the same two rules.

Children are compared **in order, by position**: new child 0 against old child 0, new child 1 against old child 1, and so on. That works perfectly for fixed layouts, and conditional rendering keeps positions stable because `false` and `null` still occupy a slot:

```tsx
<div>
  {showBanner && <Banner />}   {/* slot 0: Banner or nothing */}
  <ContactForm />              {/* always slot 1: keeps its state when the banner toggles */}
</div>
```

```widget
vdom-diff
```

## Lists and keys

Matching by position breaks down for **lists that change order**. Insert one item at the top and every position shifts: React pairs the new first item with the old first item, sees different text, updates it, and so on down the list. The last item looks brand new. That is wasted work, and worse, any **state** inside each item (an input's text, an expanded panel, a checkbox) stays at its position while the data moves.

Keys fix this. With `key`, React matches children by identity instead of position:

```tsx
{contacts.map((c) => (
  <ContactRow key={c.id} contact={c} />
))}
```

Now inserting at the top is one insertion, and each row keeps its state wherever it moves.

**Choosing keys:**

- Use a **stable, unique id from the data**: a database id, a UUID created when the item was created, a slug.
- Keys only need to be unique **among siblings**, not globally.
- **Do not use the array index** when the list can be reordered, filtered or have items inserted. It is the same as having no keys. It is fine for a static list that never changes.
- **Do not generate keys during render** (`key={Math.random()}` or `crypto.randomUUID()`): every render gets new keys, so every row remounts every time.

```widget
keys-demo
```

## State lives at a position in the tree

This is the most important consequence of reconciliation: **React stores state against a position in the tree** (type + place + key), not against your component function or your data.

- Same type, same place → state is **preserved**, even if props change completely.
- Different type, or the element disappears → state is **destroyed**.
- Different key → React treats it as a different element → state is **reset**.

The last point is a tool. When an editor should start fresh for each contact, give it a key:

```tsx
// Without the key, switching from Ava to Ben keeps Ava's half-typed draft in the form.
<ContactEditor key={contact.id} contact={contact} />
```

Changing the key tells React "this is a different editor": it unmounts the old one and mounts a new one with fresh state. That is cleaner than syncing state from props in an effect.

## How React detects moved items

With keys, React walks the **new** children left to right. For each key it looks up where that key was in the **old** list. It keeps track of `lastPlacedIndex`, the largest old index it has kept in place so far:

- Key not in the old list → **insert** a new node.
- Old index ≥ `lastPlacedIndex` → the item is already after everything placed so far → **keep** it where it is and set `lastPlacedIndex` to its old index.
- Old index < `lastPlacedIndex` → it must come after something that used to be later → **move** it.
- Old keys that never appeared → **delete**.

```text
old: A B C D        new: D A B C
D: old 3 ≥ 0  → keep,  lastPlacedIndex = 3
A: old 0 < 3  → move
B: old 1 < 3  → move
C: old 2 < 3  → move          3 moves to bring one item to the front!

old: A B C D        new: B C D A
B: old 1 → keep (last = 1), C: 2 → keep (2), D: 3 → keep (3), A: 0 < 3 → move   1 move
```

The algorithm is simple and linear, but not optimal for every case. Moving the last item to the front is the worst case. It does not matter for normal list sizes. It is worth knowing when you profile a huge list. You will implement it in the challenge.

## How this shows up in React

- Every `.map()` that returns elements needs a `key` on the outermost element, and the console warns when it is missing.
- Keys go on the element inside the `map`, not on an element inside the component: `<ContactRow key={c.id} />`, not `<li key={...}>` inside `ContactRow`.
- `key` is not a prop: `ContactRow` cannot read `props.key`. Pass the id separately if the component needs it.
- Use `key` on purpose to reset a subtree (forms, editors, animations) when the "thing" it shows changes.
- Keep component types stable: no components defined inside components, and no conditional `<A /> : <B />` swaps where you meant to keep state.
