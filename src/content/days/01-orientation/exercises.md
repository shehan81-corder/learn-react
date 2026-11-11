# practice: Arrow functions and template literals

### meta
minutes: 6

### prompt
Warm up with the function syntax you'll write hundreds of times in React.

Implement and **export** three functions:

1. `double(n)` returns `n * 2`.
2. `greet(name)` returns the string `Hello, <name>!` using a template literal.
3. `fullName(contact)` takes an object with `firstName` and `lastName` and returns them joined by a space.

All three should be arrow functions. Press **Run** to see the `console.log` output, and **Check** to run the tests.

### starter
```js
// Replace each TODO with an arrow function.

export const double = undefined; // TODO

export const greet = undefined; // TODO

export const fullName = undefined; // TODO

console.log(double?.(21));
console.log(greet?.('Ada'));
console.log(fullName?.({ firstName: 'Grace', lastName: 'Hopper' }));
```

### solution
```js
export const double = (n) => n * 2;

export const greet = (name) => `Hello, ${name}!`;

export const fullName = (contact) => `${contact.firstName} ${contact.lastName}`;

console.log(double(21));
console.log(greet('Ada'));
console.log(fullName({ firstName: 'Grace', lastName: 'Hopper' }));
```

### tests
```js
test('double multiplies by two', () => {
  expect(user.double(2)).toBe(4);
  expect(user.double(-3)).toBe(-6);
  expect(user.double(0)).toBe(0);
});

test('greet builds a greeting with a template literal', () => {
  expect(user.greet('Ada')).toBe('Hello, Ada!');
  expect(user.greet('World')).toBe('Hello, World!');
});

test('fullName joins first and last name', () => {
  expect(user.fullName({ firstName: 'Grace', lastName: 'Hopper' })).toBe('Grace Hopper');
});

test('they are arrow functions (no own prototype)', () => {
  expect(typeof user.double).toBe('function');
  expect(user.double.prototype).toBeUndefined();
  expect(user.greet.prototype).toBeUndefined();
  expect(user.fullName.prototype).toBeUndefined();
});
```

### explanation
Arrow functions with a single expression return it implicitly, so `(n) => n * 2` needs no `return`. Template literals use backticks and `${...}` placeholders. The last test checks for arrow functions in a sneaky way: regular `function` declarations have a `prototype` property, arrow functions do not.

### hints
- An arrow function with one parameter looks like `(n) => n * 2`.
- Template literals use backticks: `` `Hello, ${name}!` ``.
- Read properties off the parameter: `contact.firstName`.

# practice: Transform data with array methods

### meta
minutes: 7

### prompt
A CRM is mostly lists of things. Given this array of contacts:

```js
const contacts = [
  { name: 'Ava Nguyen', status: 'lead', dealValue: 1200 },
  { name: 'Liam Smith', status: 'customer', dealValue: 5400 },
  { name: 'Mia Patel', status: 'customer', dealValue: 800 },
  { name: 'Noah Chen', status: 'churned', dealValue: 0 },
];
```

Export three functions that use `map`, `filter` and `reduce` (no `for` loops):

- `names(contacts)` returns an array of just the names.
- `customers(contacts)` returns only the contacts whose `status` is `'customer'`.
- `totalValue(contacts)` returns the sum of every `dealValue`.

### starter
```js
export const contacts = [
  { name: 'Ava Nguyen', status: 'lead', dealValue: 1200 },
  { name: 'Liam Smith', status: 'customer', dealValue: 5400 },
  { name: 'Mia Patel', status: 'customer', dealValue: 800 },
  { name: 'Noah Chen', status: 'churned', dealValue: 0 },
];

export function names(list) {
  // TODO: use map
}

export function customers(list) {
  // TODO: use filter
}

export function totalValue(list) {
  // TODO: use reduce
}

console.log(names(contacts));
console.log(customers(contacts));
console.log(totalValue(contacts));
```

### solution
```js
export const contacts = [
  { name: 'Ava Nguyen', status: 'lead', dealValue: 1200 },
  { name: 'Liam Smith', status: 'customer', dealValue: 5400 },
  { name: 'Mia Patel', status: 'customer', dealValue: 800 },
  { name: 'Noah Chen', status: 'churned', dealValue: 0 },
];

export function names(list) {
  return list.map((c) => c.name);
}

export function customers(list) {
  return list.filter((c) => c.status === 'customer');
}

export function totalValue(list) {
  return list.reduce((sum, c) => sum + c.dealValue, 0);
}

console.log(names(contacts));
console.log(customers(contacts));
console.log(totalValue(contacts));
```

### tests
```js
const sample = [
  { name: 'A', status: 'lead', dealValue: 10 },
  { name: 'B', status: 'customer', dealValue: 20 },
  { name: 'C', status: 'customer', dealValue: 5 },
];

test('names returns only the names, in order', () => {
  expect(user.names(sample)).toEqual(['A', 'B', 'C']);
  expect(user.names([])).toEqual([]);
});

test('customers keeps only status === "customer"', () => {
  expect(user.customers(sample)).toEqual([
    { name: 'B', status: 'customer', dealValue: 20 },
    { name: 'C', status: 'customer', dealValue: 5 },
  ]);
});

test('totalValue sums dealValue (and is 0 for an empty list)', () => {
  expect(user.totalValue(sample)).toBe(35);
  expect(user.totalValue([])).toBe(0);
});

test('the original array is not mutated', () => {
  const copy = JSON.stringify(sample);
  user.names(sample);
  user.customers(sample);
  user.totalValue(sample);
  expect(JSON.stringify(sample)).toBe(copy);
});

test('no for/while loops were used', () => {
  const src = [user.names, user.customers, user.totalValue].map((f) => f.toString()).join('\n');
  expect(src).not.toMatch(/\b(for|while)\s*\(/);
});
```

### explanation
`map` returns a new array of the same length with each item transformed. `filter` returns a new array with only the items for which the callback returns `true`. `reduce` walks the array carrying an accumulator; the second argument (`0`) is the starting value, and forgetting it is the classic bug when the array is empty. None of these touch the original array, which is exactly what React wants.

### hints
- `list.map((c) => c.name)`
- `filter` keeps items where the callback returns `true`: `c.status === 'customer'`.
- `reduce((sum, c) => sum + c.dealValue, 0)`: the `0` is the initial value.

# practice: Read a Vite project

### meta
minutes: 5

### prompt
Reading generated code is a skill. Below is a (slightly simplified) `package.json` from a fresh Vite React + TypeScript project, as a JavaScript object.

Export a function `describe(pkg)` that returns an object with:

- `devCommand`: the npm script you run for the dev server (the *command string*, e.g. `"vite"`).
- `buildCommand`: the script that builds for production.
- `runtimeDeps`: an array of the names of `dependencies` (what ships to the browser).
- `usesTypeScript`: `true` if `typescript` appears in `devDependencies`.

### starter
```js
export const pkg = {
  name: 'nimbus-crm',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'tsc -b && vite build',
    lint: 'eslint .',
    preview: 'vite preview',
  },
  dependencies: {
    react: '^19.0.0',
    'react-dom': '^19.0.0',
  },
  devDependencies: {
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    '@vitejs/plugin-react': '^4.3.0',
    typescript: '~5.7.0',
    vite: '^6.0.0',
  },
};

export function describe(p) {
  // TODO: return { devCommand, buildCommand, runtimeDeps, usesTypeScript }
}

console.log(describe(pkg));
```

### solution
```js
export const pkg = {
  name: 'nimbus-crm',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'tsc -b && vite build',
    lint: 'eslint .',
    preview: 'vite preview',
  },
  dependencies: {
    react: '^19.0.0',
    'react-dom': '^19.0.0',
  },
  devDependencies: {
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    '@vitejs/plugin-react': '^4.3.0',
    typescript: '~5.7.0',
    vite: '^6.0.0',
  },
};

export function describe(p) {
  return {
    devCommand: p.scripts.dev,
    buildCommand: p.scripts.build,
    runtimeDeps: Object.keys(p.dependencies),
    usesTypeScript: 'typescript' in p.devDependencies,
  };
}

console.log(describe(pkg));
```

### tests
```js
test('describe reads the scripts', () => {
  const d = user.describe(user.pkg);
  expect(d.devCommand).toBe('vite');
  expect(d.buildCommand).toBe('tsc -b && vite build');
});

test('runtimeDeps lists the dependency names', () => {
  expect(user.describe(user.pkg).runtimeDeps).toEqual(['react', 'react-dom']);
});

test('usesTypeScript is a boolean derived from devDependencies', () => {
  expect(user.describe(user.pkg).usesTypeScript).toBe(true);
  const noTs = { ...user.pkg, devDependencies: { vite: '^6.0.0' } };
  expect(user.describe(noTs).usesTypeScript).toBe(false);
});
```

### explanation
`Object.keys(obj)` gives the property names as an array, which is how you turn a dependency map into a list. The `in` operator (or `Boolean(obj.typescript)`) checks for a key. Notice how `build` runs `tsc -b` *before* `vite build`: the TypeScript compiler type-checks, then Vite bundles. Vite itself strips types without checking them, so this ordering is what makes type errors fail the build.

### hints
- Scripts live at `p.scripts.dev` and `p.scripts.build`.
- `Object.keys(p.dependencies)` returns the names.
- `'typescript' in p.devDependencies` gives a boolean.

# challenge: Summarise a pipeline

### meta
minutes: 10

### prompt
Put the warm-up together. Export a function `summarise(deals)` that takes an array of deals like:

```js
{ title: 'Annual plan', stage: 'won', value: 4000 }
```

and returns an object:

```js
{
  count: 4,                 // number of deals
  wonValue: 6500,           // sum of value where stage === 'won'
  openTitles: ['...'],      // titles of deals whose stage is neither 'won' nor 'lost'
  largest: 'Enterprise',    // title of the deal with the highest value (null if no deals)
}
```

Use array methods, not loops. Make `summarise([])` return `{ count: 0, wonValue: 0, openTitles: [], largest: null }`.

### starter
```js
export const deals = [
  { title: 'Annual plan', stage: 'won', value: 4000 },
  { title: 'Onboarding', stage: 'proposal', value: 1500 },
  { title: 'Enterprise', stage: 'negotiation', value: 12000 },
  { title: 'Support plan', stage: 'lost', value: 900 },
  { title: 'Team licence', stage: 'won', value: 2500 },
];

export function summarise(list) {
  // TODO
}

console.log(summarise(deals));
```

### solution
```js
export const deals = [
  { title: 'Annual plan', stage: 'won', value: 4000 },
  { title: 'Onboarding', stage: 'proposal', value: 1500 },
  { title: 'Enterprise', stage: 'negotiation', value: 12000 },
  { title: 'Support plan', stage: 'lost', value: 900 },
  { title: 'Team licence', stage: 'won', value: 2500 },
];

export function summarise(list) {
  const wonValue = list
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + d.value, 0);

  const openTitles = list
    .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
    .map((d) => d.title);

  const largest = list.reduce(
    (best, d) => (best === null || d.value > best.value ? d : best),
    null,
  );

  return {
    count: list.length,
    wonValue,
    openTitles,
    largest: largest ? largest.title : null,
  };
}

console.log(summarise(deals));
```

### tests
```js
test('summarises the sample deals', () => {
  expect(user.summarise(user.deals)).toEqual({
    count: 5,
    wonValue: 6500,
    openTitles: ['Onboarding', 'Enterprise'],
    largest: 'Enterprise',
  });
});

test('handles an empty list', () => {
  expect(user.summarise([])).toEqual({ count: 0, wonValue: 0, openTitles: [], largest: null });
});

test('largest picks the highest value regardless of stage', () => {
  const list = [
    { title: 'Small', stage: 'won', value: 10 },
    { title: 'Big but lost', stage: 'lost', value: 999 },
  ];
  expect(user.summarise(list).largest).toBe('Big but lost');
  expect(user.summarise(list).wonValue).toBe(10);
});

test('does not mutate the input', () => {
  const list = [{ title: 'X', stage: 'new', value: 1 }];
  const before = JSON.stringify(list);
  user.summarise(list);
  expect(JSON.stringify(list)).toBe(before);
});
```

### explanation
Each field is a small pipeline. `wonValue` is a filter followed by a reduce. `openTitles` is a filter followed by a map. `largest` uses reduce with `null` as the starting value so an empty list naturally yields `null`. Chaining methods like this reads top to bottom and never mutates `list`. When a field needs two steps, split it onto its own lines with a clear name rather than cramming everything into one expression.

### hints
- Compute each field separately, then assemble the object at the end.
- `wonValue`: `filter` by stage, then `reduce` to a sum.
- `largest`: `reduce` with `null` as the initial value, keeping whichever deal has the higher `value`.
