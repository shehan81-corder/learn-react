## Components are typed functions

A React component is a function that takes **one** argument, the props object, and returns JSX. So typing a component means typing that object:

```tsx
interface GreetingProps {
  name: string;
  vip?: boolean;
}

export function Greeting({ name, vip = false }: GreetingProps) {
  return <p>{vip ? '⭐ ' : ''}Hello, {name}</p>;
}

<Greeting name="Ava" />            // ✅
<Greeting name="Ava" vip />        // ✅ `vip` alone means vip={true}
<Greeting />                       // ❌ Property 'name' is missing
<Greeting name="Ava" vip="yes" />  // ❌ Type 'string' is not assignable to type 'boolean'
<Greeting name="Ava" nickname="A" /> // ❌ Property 'nickname' does not exist
```

Notes:

- The file must be **`.tsx`** to contain JSX.
- **Destructure** props in the parameter and give optional ones a **default** right there (`vip = false`). Inside the component, `vip` is then a plain `boolean`, not `boolean | undefined`.
- Name the interface `<Component>Props`. Export it if other files need it.
- You do not need to annotate the return type; it is inferred. (Avoid `React.FC`. Modern React code types the props parameter directly.)

> **The thinking pattern:** the props interface is the component's **public API**. Design it like a function signature: required data, optional settings with sensible defaults, and callbacks for anything that happens inside. When a component is hard to type, its API is often unclear.

## children and other React types

Whatever goes between the opening and closing tags arrives as the `children` prop. Type it as **`ReactNode`**, which means "anything React can render": elements, strings, numbers, arrays of those, `null`, `undefined` and booleans.

```tsx
import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;            // any prop can hold JSX, not just children
}

export function Card({ title, children, footer }: CardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

<Card title="Deals" footer={<a href="/deals">All deals</a>}>
  <p>3 open deals</p>
</Card>
```

Import React's types with `import type { ... } from 'react'`. The `type` keyword says "only for the type checker", so nothing is added to the bundle. The types you will use most:

| Type | Use for |
| --- | --- |
| `ReactNode` | `children`, or any prop that holds something renderable |
| `ChangeEvent<HTMLInputElement>` | `onChange` handler of an input (`e.target.value`) |
| `FormEvent<HTMLFormElement>` | `onSubmit` handler of a form |
| `MouseEvent<HTMLButtonElement>` | `onClick` handler, when you need the event |
| `KeyboardEvent<HTMLInputElement>` | `onKeyDown` handler (`e.key`) |
| `CSSProperties` | a `style` object |
| `ComponentProps<'button'>` | "all the props a `<button>` accepts" |

## Events and handlers

**Inline** handlers need no annotations, because TypeScript knows what `onChange` passes:

```tsx
<input value={name} onChange={(e) => setName(e.target.value)} />
//                             ^ e: ChangeEvent<HTMLInputElement>, inferred
```

When you move a handler into a **named function**, nothing tells TypeScript the type of `e`, so you annotate it. The easy way to find the right type is to hover over the prop (`onChange`) in your editor.

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';

function SearchForm() {
  const [query, setQuery] = useState('');

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();                  // stop the browser's full-page form submit
    console.log('search for', query);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={handleChange} />
      <button type="submit">Search</button>
    </form>
  );
}
```

## Callback props: letting the parent react

Children tell parents that something happened by calling a function the parent passed in. Type it as a function type, named `on<Something>`:

```tsx
interface ContactRowProps {
  contact: Contact;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;     // optional callback: check before calling
}

function ContactRow({ contact, selected, onSelect, onDelete }: ContactRowProps) {
  return (
    <li className={selected ? 'selected' : ''}>
      <button onClick={() => onSelect(contact.id)}>{contact.name}</button>
      {onDelete && <button onClick={() => onDelete(contact.id)}>Delete</button>}
    </li>
  );
}
```

The parent's callback is now checked too: `<ContactRow onSelect={(id) => setSelectedId(id)} ... />` knows `id` is a string.

## State: useState and its type argument

`useState` infers the type from the initial value. Add a type argument when the initial value does not show every value the state can hold:

```tsx
const [count, setCount] = useState(0);                         // number: inferred
const [query, setQuery] = useState('');                        // string: inferred
const [contacts, setContacts] = useState<Contact[]>([]);       // [] alone would be never[]
const [selected, setSelected] = useState<Contact | null>(null); // null now, a Contact later
const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle'); // a union

setCount('3');                // ❌ string is not a number
setSelected(contacts[0]);     // ✅
selected.name;                // ❌ 'selected' is possibly 'null'
selected?.name;               // ✅
```

## Refs to DOM elements

`useRef` gives you a box whose `.current` holds the real DOM node after React mounts it. Tell TypeScript which element, and start with `null`:

```tsx
import { useRef } from 'react';

function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  );
}
```

`.current` is `HTMLInputElement | null`, because it is `null` before mount and after unmount, so use `?.`. Element types are named `HTML<Tag>Element`: `HTMLInputElement`, `HTMLButtonElement`, `HTMLDivElement`, `HTMLFormElement`, `HTMLTextAreaElement`, `HTMLSelectElement`.

## Common errors and what they mean

| Error | Usual cause | Fix |
| --- | --- | --- |
| *Property 'x' is missing in type '{...}' but required in type 'Props'* | A required prop was not passed | Pass it, or make it optional with `?` and a default |
| *Type '{ x: ... }' is not assignable to type 'IntrinsicAttributes & Props'* | You passed a prop the component does not declare | Add it to the interface, or fix the typo |
| *Parameter 'e' implicitly has an 'any' type* | A named handler without a type | Annotate it: `(e: ChangeEvent<HTMLInputElement>)` |
| *Argument of type 'X' is not assignable to parameter of type 'SetStateAction<never[]>'* | `useState([])` without a type argument | `useState<X[]>([])` |
| *Object is possibly 'null'* | A ref's `.current` or nullable state | `?.`, or an `if` check first |
| *'React' refers to a UMD global...* | Using `React.ReactNode` without importing | `import type { ReactNode } from 'react'` |

## How this shows up in React

From Day 5 onwards every component in the course is a `.tsx` file with a props interface. The patterns in this unit cover the vast majority of what you will write:

- `interface XProps` + destructured props with defaults;
- `children: ReactNode`;
- inline handlers (inferred) or named handlers with `ChangeEvent` / `FormEvent`;
- `on<Something>` callback props typed as function types;
- `useState<T>` for empty arrays, `null` and unions;
- `useRef<HTMLInputElement>(null)` for DOM access.

When unsure, **hover** over the prop or hook in the editor. The type it shows is usually the answer.
