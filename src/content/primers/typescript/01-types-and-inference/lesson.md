## What TypeScript is (and is not)

TypeScript is **JavaScript plus type annotations**. You write normal JavaScript and add notes about what kind of value each thing holds. A tool called the **type checker** reads those notes and reports mistakes *before the code runs*, usually as red squiggles in your editor.

```ts
function greet(name: string) {
  return 'Hello, ' + name.toUpperCase();
}

greet('Ava');   // ✅
greet(42);      // ❌ Argument of type 'number' is not assignable to parameter of type 'string'.
```

What TypeScript is **not**:

- **Not a different language at runtime.** Before the browser runs it, every annotation is erased and what is left is plain JavaScript. `name: string` becomes `name`. There is no type checking while the app runs.
- **Not a validator for outside data.** If an API returns `{ "age": "34" }` when you declared `age: number`, TypeScript cannot know; it only checks your code against what you *told* it.
- **Not required to be perfect.** Types are a tool for catching bugs and documenting intent. Use them where they help.

In a Vite + React project, Vite strips the types very quickly when it serves your code, and `tsc` (the TypeScript compiler) does the actual checking in your editor and in `npm run build`.

> **The thinking pattern:** a type is a **promise about a value**: "this is always a string", "this list only contains numbers". You write the promise once at a boundary (a function parameter, a prop, an API response) and the checker makes sure every piece of code keeps it.

## Your first annotations

An annotation is `: Type` after a name:

```ts
let firstName: string = 'Ava';
let age: number = 34;            // integers and decimals are both `number`
let isVip: boolean = true;
let nickname: string | undefined; // "a string, or not set yet" (more in the next unit)

const scores: number[] = [90, 72, 85];        // array of numbers
const tags: Array<string> = ['vip', 'lead'];  // same thing, generic syntax
```

Function parameters and return values:

```ts
function fullName(first: string, last: string): string {
  return `${first} ${last}`;
}

const double = (n: number): number => n * 2;

function formatPrice(amount: number, currency = 'USD'): string {   // default value: type inferred
  return `${currency} ${amount.toFixed(2)}`;
}

function log(message: string, level?: string): void {   // `?` = optional; `void` = returns nothing useful
  console.log(level ?? 'info', message);
}
```

With `strict` mode on (it is on in every project in this course), a parameter **without** an annotation is an error: *"Parameter 'x' implicitly has an 'any' type."* Parameters are where TypeScript needs your help.

## Inference: let TypeScript do the work

You do not need to annotate everything. TypeScript **infers** types from values:

```ts
let count = 0;               // number
const name = 'Ava';          // the literal type 'Ava' (a const can never change)
const ids = [1, 2, 3];       // number[]
const doubled = ids.map((id) => id * 2);   // number[]: `id` is inferred from the array

count = 'five';              // ❌ Type 'string' is not assignable to type 'number'.
```

Hover over any name in the editor to see its inferred type. That is the fastest way to learn what TypeScript thinks.

**Rule of thumb:**

- **Annotate** function parameters, and the return type of exported functions (it documents intent and catches mistakes inside the function).
- **Let inference work** for local variables and callback parameters like `ids.map((id) => ...)`.
- **Annotate an empty value** whose type cannot be guessed: `const names: string[] = []`, `useState<string[]>([])`.

## Tuples: arrays with a fixed shape

A **tuple** is an array with a fixed length where each position has its own type:

```ts
const entry: [string, number] = ['Ava', 34];
const [label, value] = entry;   // label: string, value: number
```

You will use one in almost every React component, because `useState` returns a tuple:

```ts
const [count, setCount] = useState(0);
//      number   (value: number | ((prev: number) => number)) => void
```

## any, unknown and typeof

Two special types:

- **`any`** switches the checker off for that value. Anything goes, nothing is checked. It spreads silently: `any.foo.bar()` is also `any`. **Avoid it.** It turns TypeScript back into JavaScript exactly where you needed help.
- **`unknown`** means "could be anything, and you must check before you use it". It is the safe choice for data you do not control, such as parsed JSON or user input.

```ts
function parseCount(input: unknown): number {
  input.toFixed();                  // ❌ 'input' is of type 'unknown'.
  if (typeof input === 'number') {
    return input;                   // ✅ inside this branch, TypeScript knows it is a number
  }
  if (typeof input === 'string') {
    return Number(input);           // ✅ here it is a string
  }
  return 0;
}
```

Checking with `typeof` inside an `if` is called **narrowing**: TypeScript follows your checks and gives the value a more precise type inside each branch. The next unit covers it in depth.

## Reading error messages

TypeScript errors look scary but follow a pattern: *what you gave* vs *what was expected*.

```text
Argument of type 'string' is not assignable to parameter of type 'number'.
              ^^^^^^ what you gave                               ^^^^^^ what it needs

Property 'toUppercase' does not exist on type 'string'. Did you mean 'toUpperCase'?
          ^^^^^^^^^^^ a typo, caught before runtime

Type 'string' is not assignable to type 'number'.
  (on a `return` line: the function promised a number but returns a string)

Object is possibly 'undefined'.
  (you used something that might not exist; check for it first)
```

When an error is long, **read the last line first**: it is usually the most specific. And fix the **cause**, not the message: adding `any` or `// @ts-ignore` hides the bug instead of fixing it.

## How this shows up in React

- React component files use the **`.tsx`** extension (TypeScript + JSX). Plain helper files use `.ts`.
- Every component is a function, so the same rules apply: its parameter (the props object) needs a type, and the return type (JSX) is inferred.
- `useState(0)` infers `number`; `useState('')` infers `string`; `useState([])` cannot infer the item type, so write `useState<string[]>([])`.
- Event handler parameters written inline (`onClick={(e) => ...}`) are inferred from the prop, so you rarely annotate them.
- Hover, hover, hover. The editor shows the type of every prop, hook and value.
