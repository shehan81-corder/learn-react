## Styling is a design decision, not an afterthought

React does not care how you style. You can use plain CSS files, CSS Modules, inline styles, utility frameworks like Tailwind, or CSS-in-JS libraries. For a CRM that you will maintain, the approach that scales best with the least magic is:

1. **Global CSS with design tokens** (CSS variables) for colours, spacing and fonts, plus resets and the app layout.
2. **CSS Modules** for component-specific styles, so class names never collide.
3. **Inline `style`** only for values that are computed at runtime (a progress bar width, a colour from data).

This very platform uses exactly this approach: look at `src/styles/global.css` in its repository. It defines tokens like `--accent` and `--bg`, and swaps them for dark mode.

> **The thinking pattern:** *state decides which class names are present; CSS decides what they look like.* Your component does not set colours, it says `variant="danger"`. The stylesheet maps that to a colour. This keeps logic and appearance separate and makes theming trivial.

## CSS Modules

Name a file `Button.module.css`. Vite turns each class into a unique name and gives you an object to look them up:

```css
/* Button.module.css */
.button { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); }
.primary { background: var(--accent); color: white; }
.small { padding: 4px 8px; font-size: 12px; }
```

```tsx
import styles from './Button.module.css';

export function Button({ children }: { children: React.ReactNode }) {
  return <button className={styles.button}>{children}</button>;
}
```

In the browser the class becomes something like `Button_button_x7f3a`. Another component's `.button` cannot clash with it. In this editor's sandbox there are no CSS files, so the exercises use plain string class names; the *logic* you practise (building class names from props) is identical.

## Conditional classes without bugs

Building a class string by hand is error-prone:

```tsx
// fragile: stray spaces, "undefined" in the output
className={'btn ' + (primary ? 'btn-primary ' : '') + (size && 'btn-' + size)}
```

Use a tiny helper (you will write it in the first exercise; the real libraries are `clsx` and `classnames`):

```tsx
className={cx('btn', primary && 'btn-primary', size && `btn-${size}`, { 'btn-disabled': disabled })}
```

`cx` joins the truthy strings and, for objects, includes the keys whose values are truthy.

## Inline styles: for runtime values only

`style` takes an object with camelCase keys. Numbers become `px` automatically (except for unitless properties like `opacity`):

```tsx
<div style={{ width: `${percent}%`, backgroundColor: colour, marginTop: 8 }} />
```

Inline styles cannot express hover, focus, media queries or pseudo-elements. Use them for the *one number that comes from data*, and a class for everything else. You can also pass **CSS variables** through `style` to bridge the two worlds:

```tsx
<div className="avatar" style={{ ['--hue' as string]: hue }} />
/* .avatar { background: hsl(var(--hue) 70% 50%); } */
```

## Layout with CSS Grid and Flexbox

An app shell in a dozen lines:

```css
.shell {
  display: grid;
  grid-template-rows: 52px 1fr;          /* top bar, then content */
  grid-template-columns: 240px 1fr;      /* sidebar, then main */
  height: 100vh;
}
.topbar  { grid-column: 1 / -1; }        /* spans both columns */
.sidebar { overflow-y: auto; }
.main    { overflow: auto; min-width: 0; }   /* min-width: 0 lets content shrink instead of overflowing */
```

Rules of thumb: **grid for page structure** (rows and columns), **flexbox for a row or column of items** (toolbars, cards, form rows). Use `gap` instead of margins between items. Make it responsive with a media query: `@media (max-width: 800px) { .shell { grid-template-columns: 1fr } }`.

## Dark mode with CSS variables

The cleanest approach: define every colour as a variable, and redefine the variables for dark mode on an attribute of the `<html>` element.

```css
:root              { --bg: #ffffff; --fg: #1a202c; --accent: #2563eb; }
:root[data-theme='dark'] { --bg: #0f1218; --fg: #e6e9ef; --accent: #60a5fa; }

body { background: var(--bg); color: var(--fg); }
```

Then a hook flips the attribute and remembers the choice:

```tsx
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark' | null) ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);   // sync the outside world (Day 8!)
    localStorage.setItem('theme', theme);
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
}
```

Note how this uses three earlier lessons at once: lazy state initialisation, an effect that syncs the DOM and storage, and a derived toggle function. To avoid a flash of the wrong theme at page load, also set the attribute in a tiny inline script in `index.html` before React starts (view this site's source to see it).

Respect the user's OS preference as the *default* and let their explicit choice override it.

## Walkthrough: a `Button` driven by props

Design from the outside in. What does a caller want to say?

```tsx
<Button>Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button loading>Saving…</Button>
```

Translate that to a typed API, then to class names:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx('btn', `btn-${variant}`, `btn-${size}`, loading && 'btn-loading', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {children}
    </button>
  );
}
```

Three details worth copying: `extends React.ButtonHTMLAttributes` makes the component accept every native button prop (`onClick`, `type`, …) for free; `...rest` forwards them; and `className` from the caller is merged, not overwritten.

## CRM step: shell, tokens and theme

1. Create `src/styles/tokens.css` with your colour, spacing and radius variables, plus a `[data-theme='dark']` override. Import it in `main.tsx`.
2. Build `AppShell.tsx`: a CSS grid with a top bar (app name, theme toggle) and a sidebar (links for Contacts, Companies, Deals; just text for now) and a main area.
3. Write `useTheme` (as above) and a `ThemeToggle` button. Check that reloading keeps the theme and that clearing site storage falls back to your OS setting.
4. Turn `StatusBadge` into a CSS Module that uses your tokens for its colours.
5. Create a reusable `Button` component with `variant` and `size`, and use it in the add-contact form.

- [ ] Tokens file with light and dark values
- [ ] `AppShell` layout with top bar and sidebar
- [ ] Theme persists and defaults to the OS preference
- [ ] `Button` supports `variant`, `size`, `loading` and forwards native props
