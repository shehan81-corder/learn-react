## Typing functions

You have already annotated parameters and return types. The full set of tools:

```ts
// required, optional (?) and default parameters
function createContact(name: string, email?: string, tags: string[] = []): Contact {
  return { id: crypto.randomUUID(), name, email: email ?? '', tags };
}

// rest parameters: any number of strings, collected into an array
function joinTags(...tags: string[]): string {
  return tags.join(', ');
}

// arrow functions: same syntax
const isVip = (contact: Contact): boolean => contact.tags.includes('vip');
```

- Optional parameters must come **after** required ones.
- A parameter with a default is optional for callers, and its type is inferred from the default.
- `void` as a return type means "returns nothing useful". `never` means "never returns at all" (it always throws).

> **The thinking pattern:** a function type is a **contract at the boundary**: what callers must give, what they get back. Write the contract precisely and both sides are checked: the caller cannot pass the wrong thing, and the function body cannot return the wrong thing.

## Function types and callbacks

Functions are values, so they have types too. A **function type** looks like an arrow function with types instead of a body:

```ts
type Predicate = (contact: Contact) => boolean;
type OnChange = (value: string) => void;
type Compare = (a: Contact, b: Contact) => number;

function filterContacts(contacts: Contact[], keep: Predicate): Contact[] {
  return contacts.filter(keep);
}

filterContacts(all, (c) => c.tags.includes('vip'));   // ✅ `c` is inferred as Contact
filterContacts(all, (c) => c.name);                    // ❌ Type 'string' is not assignable to type 'boolean'
```

When you pass an inline callback, TypeScript infers its parameter types from where it is used (**contextual typing**). That is why `contacts.map((c) => c.name)` needs no annotations, and why `onClick={(e) => ...}` in React knows what `e` is.

A callback type with a `void` return accepts functions that return something. The value is just ignored:

```ts
const listeners: Array<(message: string) => void> = [];
listeners.push((m) => console.log(m));   // console.log returns undefined: fine
listeners.push((m) => m.length);         // returns a number: also fine, it is ignored
```

## Generics: functions that work for any type

Some functions do not care about the type of the data, but they do care that the output matches the input. Without generics you are stuck:

```ts
function firstAny(items: any[]): any { return items[0]; }
const a = firstAny([1, 2, 3]);       // any: we lost the information that it is a number
```

A **generic** function takes a **type parameter**, conventionally called `T`, in angle brackets. It works like a regular parameter, but for types:

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const n = first([1, 2, 3]);            // T = number   → n: number | undefined
const s = first(['Ava', 'Ben']);       // T = string   → s: string | undefined
const c = first(contacts);             // T = Contact  → c: Contact | undefined
```

You almost never write `first<number>(...)`: TypeScript **infers** `T` from the arguments. Read `<T>` as "for some type T, chosen by the caller".

More examples:

```ts
// T appears in both inputs: they must agree
function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
}
toggle(['vip'], 'lead');   // ✅ T = string
toggle(['vip'], 42);       // ❌ Argument of type 'number' is not assignable to parameter of type 'string'

// Generic types (not just functions)
interface Page<T> {
  items: T[];
  total: number;
}
const page: Page<Contact> = { items: [], total: 0 };
```

## Generics you will meet in React

You will **use** generics far more often than you write them:

```ts
const [contacts, setContacts] = useState<Contact[]>([]);       // without <Contact[]>, [] would be never[]
const [selected, setSelected] = useState<Contact | null>(null); // without it, the type would be just null
const inputRef = useRef<HTMLInputElement>(null);                // what kind of element the ref holds
const ids: Array<string> = [];                                  // same as string[]
async function load(): Promise<Contact[]> { /* ... */ }        // a promise that resolves to Contact[]
const byId = new Map<string, Contact>();                        // keys are strings, values Contacts
```

The rule: **add the type argument when the initial value does not tell the whole story**, such as an empty array, `null` that will later hold an object, or a union.

## Utility types: derive types from types

TypeScript ships generic helper types that transform other types. Four you will see constantly:

```ts
interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

type ContactDraft = Omit<Contact, 'id'>;          // everything except id (a new contact before saving)
type ContactPatch = Partial<Contact>;             // every field optional (for updates)
type ContactSummary = Pick<Contact, 'id' | 'name'>; // only id and name
type ContactsById = Record<string, Contact>;      // an object used as a map
```

Deriving types keeps them in sync: add a field to `Contact` and `ContactDraft` gets it automatically.

## How this shows up in React

- **Callback props are function types**: `onSelect: (contact: Contact) => void`, `onChange: (value: string) => void`.
- **Hooks are generic**: `useState<T>`, `useRef<T>`, `useReducer`, and later `useQuery<T>`. Inference handles most cases; add `<T>` for empty arrays, `null` initial values and unions.
- **Generic components** exist too (`function List<T>(props: { items: T[]; render: (item: T) => ReactNode })`). You will meet them on Day 22.
- **Form and API types** are derived with `Omit`, `Partial` and `Pick` instead of written twice.
