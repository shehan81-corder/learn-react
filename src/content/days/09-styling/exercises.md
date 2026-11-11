# practice: A class name helper

### meta
minutes: 6
language: ts

### prompt
Write and export `cx(...args)`, a tiny version of `clsx`. Each argument can be:

- a string: included as is (empty strings are skipped),
- a falsy value (`false`, `null`, `undefined`, `0`): skipped,
- an object: include each **key** whose value is truthy,
- an array: processed recursively.

Return the included class names joined by single spaces.

### starter
```ts
export type ClassValue = string | number | false | null | undefined | Record<string, unknown> | ClassValue[];

export function cx(...args: ClassValue[]): string {
  // TODO
  return '';
}
```

### solution
```ts
export type ClassValue = string | number | false | null | undefined | Record<string, unknown> | ClassValue[];

export function cx(...args: ClassValue[]): string {
  const out: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') out.push(arg);
    else if (Array.isArray(arg)) {
      const inner = cx(...arg);
      if (inner) out.push(inner);
    } else if (typeof arg === 'object') {
      for (const [key, value] of Object.entries(arg)) if (value) out.push(key);
    }
  }
  return out.join(' ');
}
```

### tests
```ts
test('joins strings', () => {
  expect(user.cx('a', 'b', 'c')).toBe('a b c');
});

test('skips falsy values', () => {
  expect(user.cx('btn', false, null, undefined, 0, '', 'primary')).toBe('btn primary');
});

test('conditional expressions', () => {
  const primary = true;
  const disabled = false;
  expect(user.cx('btn', primary && 'btn-primary', disabled && 'btn-disabled')).toBe('btn btn-primary');
});

test('objects include keys with truthy values', () => {
  expect(user.cx({ a: true, b: false, c: 1, d: 0, e: 'yes' })).toBe('a c e');
});

test('arrays are flattened recursively', () => {
  expect(user.cx('a', ['b', false, ['c', { d: true }]])).toBe('a b c d');
});

test('returns an empty string when nothing applies', () => {
  expect(user.cx()).toBe('');
  expect(user.cx(false, null)).toBe('');
});
```

### typetests
```ts
const s: string = cx('a', false && 'b', { c: true }, ['d']);
```

### explanation
This helper removes the whole class of bugs from hand-built class strings: stray spaces, the literal text `undefined`, and `false` leaking into the attribute. The recursion on arrays reuses `cx` itself, and the `if (!arg) continue` line handles every falsy case in one place. Every large component library ships a version of this function; now you know what it does.

### hints
- Loop over `args` and push strings into an array, then `join(' ')`.
- Use `Array.isArray(arg)` before checking for objects, because arrays are objects too.
- For objects: `Object.entries(arg)` gives `[key, value]` pairs.

# practice: A Button driven by props

### meta
minutes: 8
language: tsx

### prompt
Build `Button`. Props: `variant` (`'primary' | 'secondary' | 'danger'`, default `primary`), `size` (`'sm' | 'md'`, default `md`), `loading` (boolean) plus every native button prop.

Rendered `<button>`:

- `className` = `btn btn-<variant> btn-<size>`, plus `btn-loading` when loading, plus any `className` the caller passed (appended last).
- `disabled` when `disabled` **or** `loading`.
- `aria-busy="true"` only while loading (omit the attribute otherwise).
- Forwards other props (`onClick`, `type`, …) to the element.

### starter
```tsx
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button(props: ButtonProps) {
  // TODO
  return <button>{props.children}</button>;
}

export default function App() {
  return (
    <div>
      <Button>Save</Button>
      <Button variant="danger" size="sm">
        Delete
      </Button>
      <Button loading>Saving…</Button>
    </div>
  );
}
```

### solution
```tsx
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...rest }: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, loading ? 'btn-loading' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <button {...rest} className={classes} disabled={disabled || loading} aria-busy={loading || undefined}>
      {children}
    </button>
  );
}

export default function App() {
  return (
    <div>
      <Button>Save</Button>
      <Button variant="danger" size="sm">
        Delete
      </Button>
      <Button loading>Saving…</Button>
    </div>
  );
}
```

### tests
```tsx
test('defaults to a primary medium button', async () => {
  const view = await render(<user.Button>Save</user.Button>);
  const b = view.$('button');
  expect(b.className).toBe('btn btn-primary btn-md');
  expect(b.textContent).toBe('Save');
  expect(b.disabled).toBe(false);
  expect(b.hasAttribute('aria-busy')).toBe(false);
});

test('applies variant and size', async () => {
  const view = await render(
    <user.Button variant="danger" size="sm">
      Delete
    </user.Button>,
  );
  expect(view.$('button').className).toBe('btn btn-danger btn-sm');
});

test('loading disables the button and marks it busy', async () => {
  const view = await render(<user.Button loading>Saving…</user.Button>);
  const b = view.$('button');
  expect(b.disabled).toBe(true);
  expect(b.getAttribute('aria-busy')).toBe('true');
  expect(b.className).toContain('btn-loading');
});

test('appends the caller className and forwards native props', async () => {
  const onClick = fn();
  const view = await render(
    <user.Button className="extra" type="submit" onClick={onClick} title="hello">
      Go
    </user.Button>,
  );
  const b = view.$('button');
  expect(b.className).toBe('btn btn-primary btn-md extra');
  expect(b.type).toBe('submit');
  expect(b.title).toBe('hello');
  await click(b);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('an explicitly disabled button stays disabled', async () => {
  const view = await render(<user.Button disabled>No</user.Button>);
  expect(view.$('button').disabled).toBe(true);
  expect(view.$('button').hasAttribute('aria-busy')).toBe(false);
});
```

### typetests
```tsx
const a = <Button>ok</Button>;
const b = <Button variant="secondary" onClick={() => {}} type="button">ok</Button>;
// @ts-expect-error unknown variant
const c = <Button variant="huge">no</Button>;
// @ts-expect-error unknown size
const d = <Button size="xl">no</Button>;
```

### explanation
Destructure the props you handle (`variant`, `size`, `loading`, `className`) and collect everything else with `...rest`, then spread `rest` onto the element so native props keep working. `aria-busy={loading || undefined}` is a small but important idiom: React omits an attribute whose value is `undefined`, whereas `false` would render `aria-busy="false"`. Extending `ButtonHTMLAttributes<HTMLButtonElement>` gives the component every native prop with full type checking.

### hints
- Destructure with defaults: `{ variant = 'primary', size = 'md', loading = false, ...rest }`.
- Build the class list in an array, `.filter(Boolean)`, then `.join(' ')`.
- `aria-busy={loading || undefined}`

# practice: Inline styles for runtime values

### meta
minutes: 7
language: tsx

### prompt
Build `ProgressBar({ value, max = 100, label })`:

```html
<div role="progressbar" aria-valuenow=".." aria-valuemin="0" aria-valuemax=".." aria-label="..." class="progress">
  <div class="progress-fill" style="width: 40%"></div>
</div>
```

- The fill width is `value / max` as a percentage, **clamped between 0% and 100%** and rounded to a whole number.
- When `max` is `0` the width is `0%`.
- `aria-valuenow` is the clamped value (between 0 and `max`).
- The fill gets an extra class `complete` when it is at 100%.

### starter
```tsx
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  // TODO
  return <div />;
}

export default function App() {
  return <ProgressBar value={40} label="Pipeline goal" />;
}
```

### solution
```tsx
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max <= 0 ? 0 : Math.round((clamped / max) * 100);
  return (
    <div role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={max} aria-label={label} className="progress">
      <div className={percent === 100 ? 'progress-fill complete' : 'progress-fill'} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function App() {
  return <ProgressBar value={40} label="Pipeline goal" />;
}
```

### tests
```tsx
const fill = (view) => view.$('.progress-fill');

test('has progressbar semantics', async () => {
  const view = await render(<user.ProgressBar value={40} label="Goal" />);
  const bar = view.$('[role=progressbar]');
  expect(bar.getAttribute('aria-valuenow')).toBe('40');
  expect(bar.getAttribute('aria-valuemin')).toBe('0');
  expect(bar.getAttribute('aria-valuemax')).toBe('100');
  expect(bar.getAttribute('aria-label')).toBe('Goal');
  expect(bar.classList.contains('progress')).toBe(true);
});

test('sets the width from value and max', async () => {
  const view = await render(<user.ProgressBar value={3} max={8} label="x" />);
  expect(fill(view).style.width).toBe('38%');
});

test('clamps values outside the range', async () => {
  const over = await render(<user.ProgressBar value={250} label="x" />);
  expect(fill(over).style.width).toBe('100%');
  expect(over.$('[role=progressbar]').getAttribute('aria-valuenow')).toBe('100');
  const under = await render(<user.ProgressBar value={-5} label="x" />);
  expect(fill(under).style.width).toBe('0%');
  expect(under.$('[role=progressbar]').getAttribute('aria-valuenow')).toBe('0');
});

test('marks a full bar as complete', async () => {
  const full = await render(<user.ProgressBar value={10} max={10} label="x" />);
  expect(fill(full).classList.contains('complete')).toBe(true);
  const part = await render(<user.ProgressBar value={9} max={10} label="x" />);
  expect(fill(part).classList.contains('complete')).toBe(false);
});

test('survives max = 0', async () => {
  const view = await render(<user.ProgressBar value={5} max={0} label="x" />);
  expect(fill(view).style.width).toBe('0%');
});
```

### explanation
The width is the one value that is only known at runtime, which makes it the right use of an inline style; everything else is a class. Clamping once into `clamped` and deriving both the percentage and `aria-valuenow` from it keeps the visual and the accessibility information consistent. Guarding `max <= 0` prevents a division by zero from producing `NaN%`.

### hints
- `Math.min(Math.max(value, 0), max)` clamps a number.
- Style objects use camelCase and a string for a percentage: `style={{ width: '40%' }}`.
- Add the `complete` class conditionally with a ternary or `cx`-style join.

# challenge: A persistent theme toggle

### meta
minutes: 10
language: tsx

### prompt
Build the dark-mode hook and button.

`useTheme(storage, prefersDark)` returns `[theme, toggle]`:

- Initial theme: the stored value (`'light'` or `'dark'`) from `storage.getItem('theme')` if valid; otherwise `'dark'` when `prefersDark` is true, else `'light'`.
- An effect sets `document.documentElement.dataset.theme` to the current theme **and** writes it to `storage.setItem('theme', theme)`.
- `toggle()` flips between the two.

`ThemeToggle({ storage, prefersDark })` renders `<button>` whose text is `Switch to dark mode` while light and `Switch to light mode` while dark, and has `aria-pressed` equal to whether dark mode is on.

### starter
```tsx
import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function useTheme(storage: StorageLike, prefersDark: boolean) {
  // TODO
  return ['light' as Theme, () => {}] as const;
}

export function ThemeToggle({ storage, prefersDark = false }: { storage: StorageLike; prefersDark?: boolean }) {
  const [theme, toggle] = useTheme(storage, prefersDark);
  // TODO
  return <button onClick={toggle}>{theme}</button>;
}

export default function App() {
  const memory: Record<string, string> = {};
  const fake: StorageLike = { getItem: (k) => memory[k] ?? null, setItem: (k, v) => void (memory[k] = v) };
  return <ThemeToggle storage={fake} />;
}
```

### solution
```tsx
import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function useTheme(storage: StorageLike, prefersDark: boolean) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = storage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.setItem('theme', theme);
  }, [theme, storage]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return [theme, toggle] as const;
}

export function ThemeToggle({ storage, prefersDark = false }: { storage: StorageLike; prefersDark?: boolean }) {
  const [theme, toggle] = useTheme(storage, prefersDark);
  return (
    <button onClick={toggle} aria-pressed={theme === 'dark'}>
      Switch to {theme === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
}

export default function App() {
  const memory: Record<string, string> = {};
  const fake: StorageLike = { getItem: (k) => memory[k] ?? null, setItem: (k, v) => void (memory[k] = v) };
  return <ThemeToggle storage={fake} />;
}
```

### tests
```tsx
const makeStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v) };
};
const root = () => document.documentElement;

test('defaults to light', async () => {
  const view = await render(<user.ThemeToggle storage={makeStorage()} />);
  expect(root().dataset.theme).toBe('light');
  expect(view.$('button').textContent).toBe('Switch to dark mode');
  expect(view.$('button').getAttribute('aria-pressed')).toBe('false');
});

test('follows the OS preference when nothing is stored', async () => {
  await render(<user.ThemeToggle storage={makeStorage()} prefersDark />);
  expect(root().dataset.theme).toBe('dark');
});

test('a stored choice beats the OS preference', async () => {
  await render(<user.ThemeToggle storage={makeStorage({ theme: 'light' })} prefersDark />);
  expect(root().dataset.theme).toBe('light');
});

test('ignores an invalid stored value', async () => {
  await render(<user.ThemeToggle storage={makeStorage({ theme: 'purple' })} />);
  expect(root().dataset.theme).toBe('light');
});

test('toggling updates the DOM attribute, the label and storage', async () => {
  const storage = makeStorage();
  const view = await render(<user.ThemeToggle storage={storage} />);
  await click(view.$('button'));
  expect(root().dataset.theme).toBe('dark');
  expect(storage.data.theme).toBe('dark');
  expect(view.$('button').textContent).toBe('Switch to light mode');
  expect(view.$('button').getAttribute('aria-pressed')).toBe('true');
  await click(view.$('button'));
  expect(root().dataset.theme).toBe('light');
  expect(storage.data.theme).toBe('light');
});
```

### typetests
```tsx
const el = <ThemeToggle storage={{ getItem: () => null, setItem: () => {} }} />;
// @ts-expect-error storage is required
const bad = <ThemeToggle />;
```

### explanation
The hook combines three ideas: a *lazy initialiser* that resolves stored preference, then OS preference, then a default; an *effect* that synchronises two outside systems (the `data-theme` attribute and storage) with the single piece of state; and a *functional update* for the toggle. Validating the stored value (`'light' || 'dark'`) matters because storage can contain anything. Passing `storage` and `prefersDark` as arguments keeps the hook testable. In the real app you would pass `localStorage` and `matchMedia(...).matches`.

### hints
- Lazy initialiser: read `storage.getItem('theme')`, accept only `'light'` or `'dark'`.
- `document.documentElement.dataset.theme = theme` inside an effect that depends on `[theme, storage]`.
- `setTheme((t) => (t === 'dark' ? 'light' : 'dark'))`
- `aria-pressed={theme === 'dark'}`
