# practice: Add the missing annotations

### meta
minutes: 6
language: ts

### prompt
These functions work, but with `strict` mode on every parameter is an error: *"implicitly has an 'any' type"*. Add annotations so the file has **no type errors**:

- `formatPrice` takes a number and an optional currency string (default `'USD'`) and returns a string.
- `initials` takes a first and a last name (strings) and returns a string.
- `totalOf` takes an array of numbers and returns a number.

Do not use `any`. Hidden type checks also make sure **wrong** calls are rejected.

### starter
```ts
export function formatPrice(amount, currency = 'USD') {
  return `${currency} ${amount.toFixed(2)}`;
}

export function initials(firstName, lastName) {
  return (firstName[0] + lastName[0]).toUpperCase();
}

export function totalOf(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

console.log(formatPrice(1299.5), initials('ava', 'lee'), totalOf([1, 2, 3]));
```

### solution
```ts
export function formatPrice(amount: number, currency = 'USD'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function initials(firstName: string, lastName: string): string {
  return (firstName[0] + lastName[0]).toUpperCase();
}

export function totalOf(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

console.log(formatPrice(1299.5), initials('ava', 'lee'), totalOf([1, 2, 3]));
```

### tests
```ts
test('formatPrice still works', () => {
  expect(user.formatPrice(5)).toBe('USD 5.00');
  expect(user.formatPrice(19.999, 'EUR')).toBe('EUR 20.00');
});

test('initials still works', () => {
  expect(user.initials('ava', 'lee')).toBe('AL');
});

test('totalOf still works', () => {
  expect(user.totalOf([1, 2, 3.5])).toBe(6.5);
  expect(user.totalOf([])).toBe(0);
});
```

### typetests
```ts
const _a: string = formatPrice(9.5);
const _b: string = formatPrice(9.5, 'AUD');
// @ts-expect-error amount must be a number
formatPrice('9.5');
// @ts-expect-error currency must be a string
formatPrice(1, 2);
const _c: string = initials('Ava', 'Lee');
// @ts-expect-error both names are required
initials('Ava');
const _d: number = totalOf([1, 2]);
// @ts-expect-error values must be numbers
totalOf(['1', '2']);
```

### explanation
Parameters are the one place TypeScript cannot guess, because the value comes from whoever calls the function. Once the parameters are typed, everything inside is checked: `amount.toFixed` is known to exist on a `number`, and `reduce` knows `sum` and `value` are numbers. `currency = 'USD'` needs no annotation because the default value tells TypeScript it is a `string`, and having a default also makes the parameter optional for callers. Return types like `: string` are optional too (they would be inferred), but writing them on exported functions documents the contract and catches a wrong `return` inside the function.

### hints
- Annotation syntax: `function f(name: string, count: number): string { ... }`.
- An array of numbers is `number[]`.
- A parameter with a default value already has a type: `currency = 'USD'` is a `string`.

# practice: Fix the bugs the compiler found

### meta
minutes: 7
language: ts

### prompt
Every red squiggle in this file is a **real bug** that would misbehave at runtime. Fix the code (not the types) so there are no type errors and the tests pass:

- `shout` has a typo in a method name.
- `daysBetween` does arithmetic on `Date` objects. Use `getTime()` to get milliseconds.
- `average` promises a `number` but returns a string for an empty list. Return `0` instead.
- `label` uses a variable before checking that it exists.

Do not use `any`, `as`, or `// @ts-ignore`.

### starter
```ts
export function shout(text: string): string {
  return text.toUppercase() + '!';
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to - from) / 86_400_000);
}

export function average(values: number[]): number {
  if (values.length === 0) return 'n/a';
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function label(name: string, company?: string): string {
  return `${name} (${company.toUpperCase()})`;
}

console.log(shout('hello'), daysBetween(new Date('2026-01-01'), new Date('2026-01-31')), average([]), label('Ava'));
```

### solution
```ts
export function shout(text: string): string {
  return text.toUpperCase() + '!';
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function label(name: string, company?: string): string {
  return company ? `${name} (${company.toUpperCase()})` : name;
}

console.log(shout('hello'), daysBetween(new Date('2026-01-01'), new Date('2026-01-31')), average([]), label('Ava'));
```

### tests
```ts
test('shout upper-cases and adds "!"', () => {
  expect(user.shout('hi')).toBe('HI!');
});

test('daysBetween counts whole days', () => {
  expect(user.daysBetween(new Date('2026-01-01'), new Date('2026-01-31'))).toBe(30);
});

test('average of an empty list is 0', () => {
  expect(user.average([])).toBe(0);
  expect(user.average([2, 4])).toBe(3);
});

test('label works with and without a company', () => {
  expect(user.label('Ava', 'acme')).toBe('Ava (ACME)');
  expect(user.label('Ava')).toBe('Ava');
});
```

### explanation
Each error pointed at a bug. `toUppercase` does not exist and would throw *"is not a function"* at runtime. Subtracting `Date` objects happens to work in JavaScript through implicit conversion, but TypeScript only allows arithmetic on numbers, so `getTime()` makes the intent explicit. Returning `'n/a'` from a function that promises `number` would break every caller that does maths with the result. And `company?: string` means `company` may be `undefined`, so calling `.toUpperCase()` on it would crash. TypeScript makes you handle the missing case. The habit to build: when you see a type error, ask "what would happen at runtime?" before reaching for a way to silence it.

### hints
- Hover over `toUppercase`: TypeScript suggests the correct name.
- `to.getTime() - from.getTime()` is a number of milliseconds.
- For `label`, check `company` first: `company ? ... : name`.

# challenge: Accept unknown input safely

### meta
minutes: 8
language: ts

### prompt
Form fields and JSON give you values you cannot trust. Write `toNumber(input)`:

- The parameter type must be **`unknown`** (it accepts anything).
- A finite `number` is returned as is (`NaN` and `Infinity` → `null`).
- A `string` that, after trimming, is a non-empty valid number is converted: `' 42 '` → `42`, `'3.5'` → `3.5`. Any other string → `null`.
- Anything else (`null`, `undefined`, booleans, objects, arrays) → `null`.
- The return type is `number | null`.

Use `typeof` checks to narrow `unknown` before using it.

### starter
```ts
export function toNumber(input: any) {
  return Number(input);
}

console.log(toNumber(' 42 '), toNumber('abc'), toNumber(true), toNumber(null));
```

### solution
```ts
export function toNumber(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

console.log(toNumber(' 42 '), toNumber('abc'), toNumber(true), toNumber(null));
```

### tests
```ts
test('numbers pass through', () => {
  expect(user.toNumber(7)).toBe(7);
  expect(user.toNumber(-2.5)).toBe(-2.5);
});

test('NaN and Infinity become null', () => {
  expect(user.toNumber(NaN)).toBe(null);
  expect(user.toNumber(Infinity)).toBe(null);
});

test('numeric strings are converted after trimming', () => {
  expect(user.toNumber(' 42 ')).toBe(42);
  expect(user.toNumber('3.5')).toBe(3.5);
});

test('empty and non-numeric strings become null', () => {
  expect(user.toNumber('')).toBe(null);
  expect(user.toNumber('   ')).toBe(null);
  expect(user.toNumber('12abc')).toBe(null);
});

test('everything else becomes null', () => {
  expect(user.toNumber(null)).toBe(null);
  expect(user.toNumber(undefined)).toBe(null);
  expect(user.toNumber(true)).toBe(null);
  expect(user.toNumber([5])).toBe(null);
  expect(user.toNumber({ value: 5 })).toBe(null);
});
```

### typetests
```ts
toNumber({ any: 'object' });
toNumber(null);
toNumber([1, 2]);
const _ok: number | null = toNumber('5');
// @ts-expect-error the result may be null, so it is not a plain number
const _bad: number = toNumber('5');
```

### explanation
`unknown` is the honest type for untrusted input: TypeScript will not let you call methods on it or do maths with it until you prove what it is. Each `typeof` check **narrows** the type inside its branch: in the `string` branch `input.trim()` is allowed, in the `number` branch `Number.isFinite(input)` is. Returning `number | null` forces every caller to handle the "not a number" case. With `any` (the starter), the checker would happily let callers treat a possible `NaN` as a valid number. Note how JavaScript's own `Number()` is too forgiving on its own (`Number('') === 0`, `Number(true) === 1`, `Number([5]) === 5`), which is why the explicit checks matter.

### hints
- Start with `if (typeof input === 'number') { ... }` and `if (typeof input === 'string') { ... }`; everything else falls through to `return null`.
- `Number.isFinite(n)` is `false` for `NaN`, `Infinity` and `-Infinity`.
- Check for an empty string after `trim()`, because `Number('')` is `0`.
