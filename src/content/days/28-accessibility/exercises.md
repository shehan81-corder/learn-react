# practice: An accessible modal

### meta
minutes: 10
language: tsx

### prompt
Build `Modal({ open, onClose, title, children })`.

- When `open` is `false`, render nothing.
- Otherwise render a backdrop `<div>` containing `<div role="dialog" aria-modal="true" aria-labelledby=ID tabIndex={-1}>` with an `<h2 id=ID>{title}</h2>`, the `children`, and a **Close** button. Create the id with `useId()`.
- **Focus in:** when it opens, move focus to the first focusable element inside the dialog.
- **Close on Escape** (listen on `document`), and when the **backdrop** is clicked (but not when the dialog itself is clicked).
- **Trap focus:** pressing Tab on the last focusable element moves focus to the first; Shift+Tab on the first moves to the last.
- **Restore focus:** when it closes, return focus to the element that was focused before it opened.

### starter
```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  // TODO
  if (!open) return null;
  return (
    <div>
      <div role="dialog">
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Modal open onClose={() => {}} title="Edit contact">
      <input aria-label="Name" />
    </Modal>
  );
}
```

### solution
```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));

    (focusable()[0] ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId}>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Modal open onClose={() => {}} title="Edit contact">
      <input aria-label="Name" />
    </Modal>
  );
}
```

### tests
```tsx
import { useState } from 'react';

const modal = (props = {}) => (
  <user.Modal open onClose={() => {}} title="Edit contact" {...props}>
    <input aria-label="Name" />
    <button>Save</button>
  </user.Modal>
);
const dialog = (view) => view.$('[role=dialog]');

test('renders nothing while closed', async () => {
  const view = await render(modal({ open: false }));
  expect(view.container.children).toHaveLength(0);
});

test('has dialog semantics and an accessible name from its heading', async () => {
  const view = await render(modal());
  const d = dialog(view);
  expect(d.getAttribute('aria-modal')).toBe('true');
  const labelId = d.getAttribute('aria-labelledby');
  expect(labelId).toBeTruthy();
  const heading = view.$('h2');
  expect(heading.id).toBe(labelId);
  expect(heading.textContent).toBe('Edit contact');
});

test('moves focus to the first focusable element when it opens', async () => {
  const view = await render(modal());
  expect(document.activeElement).toBe(view.getByRole('textbox', { name: 'Name' }));
});

test('Escape closes it', async () => {
  const onClose = fn();
  const view = await render(modal({ onClose }));
  await keyDown(view.getByRole('textbox', { name: 'Name' }), 'Escape');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('clicking the backdrop closes it, clicking inside does not', async () => {
  const onClose = fn();
  const view = await render(modal({ onClose }));
  await click(dialog(view));
  await click(view.getByRole('textbox', { name: 'Name' }));
  expect(onClose).not.toHaveBeenCalled();
  await click(view.container.firstElementChild);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the Close button closes it', async () => {
  const onClose = fn();
  const view = await render(modal({ onClose }));
  await click(view.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('Tab on the last element wraps to the first', async () => {
  const view = await render(modal());
  const first = view.getByRole('textbox', { name: 'Name' });
  const last = view.getByRole('button', { name: 'Close' });
  last.focus();
  expect(document.activeElement).toBe(last);
  await keyDown(last, 'Tab');
  expect(document.activeElement).toBe(first);
});

test('Shift+Tab on the first element wraps to the last', async () => {
  const view = await render(modal());
  const first = view.getByRole('textbox', { name: 'Name' });
  const last = view.getByRole('button', { name: 'Close' });
  first.focus();
  await keyDown(first, 'Tab', { shiftKey: true });
  expect(document.activeElement).toBe(last);
});

test('focus returns to the trigger when it closes', async () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button onClick={() => setOpen(true)}>Open</button>
        <user.Modal open={open} onClose={() => setOpen(false)} title="Edit">
          <input aria-label="Name" />
        </user.Modal>
      </div>
    );
  }
  const view = await render(<Host />);
  const trigger = view.getByRole('button', { name: 'Open' });
  trigger.focus();
  await click(trigger);
  expect(document.activeElement).toBe(view.getByRole('textbox', { name: 'Name' }));
  await click(view.getByRole('button', { name: 'Close' }));
  expect(view.$('[role=dialog]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('stops listening for keys after it closes', async () => {
  const onClose = fn();
  function Host() {
    const [open, setOpen] = useState(true);
    return (
      <user.Modal
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="x"
      >
        <input aria-label="Name" />
      </user.Modal>
    );
  }
  const view = await render(<Host />);
  await keyDown(view.getByRole('textbox', { name: 'Name' }), 'Escape');
  await keyDown(document.body, 'Escape');
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

### typetests
```tsx
const ok = <Modal open onClose={() => {}} title="t"><p>x</p></Modal>;
// @ts-expect-error title is required
const bad = <Modal open onClose={() => {}}><p>x</p></Modal>;
```

### explanation
A dialog is four small contracts. **Semantics:** `role="dialog"`, `aria-modal` and `aria-labelledby` (pointing at the heading with an id from `useId`) tell assistive technology what this is and what it is called. **Focus in:** move focus to the first focusable element so keyboard and screen-reader users land inside. **Trap and escape:** a `keydown` listener on `document` closes on Escape and wraps Tab and Shift+Tab at the ends so focus cannot wander behind the dialog. **Restore:** remember the previously focused element and refocus it in the effect's cleanup, so the user returns to where they were. Keeping the latest `onClose` in a ref means the listener never goes stale without re-subscribing on every render. (The native `<dialog>` with `showModal()` provides much of this for you.)

### hints
- Save `document.activeElement` at the start of the effect and call `.focus()` on it in the cleanup.
- Query the focusable elements with a selector such as `button:not([disabled]), input, select, textarea, a[href]`.
- In the Tab handler compare `document.activeElement` with the first/last element and `preventDefault()` before moving focus.
- `onClick={(e) => e.stopPropagation()}` on the dialog stops clicks inside it from reaching the backdrop.

# practice: Fix the inaccessible form

### meta
minutes: 9
language: tsx

### prompt
This form works with a mouse but is inaccessible: the inputs have no labels (only placeholders), errors are plain text, the "button" is a `<div>`, and there is no `<form>`.

Fix it so that:

- It is a `<form>` that submits with a real `<button type="submit">Save</button>` (and `preventDefault`s the browser's own submit; add `noValidate`).
- Each input has a real `<label>` associated through `htmlFor`/`id` (use `useId()`), with the texts **Name** and **Email**.
- When a field has an error: the input gets `aria-invalid="true"` and `aria-describedby` pointing at its error element, and the error is rendered as `<p role="alert" id=...>`.
- Without an error the input has neither `aria-invalid` nor `aria-describedby`.
- Rules: name required (`Name is required`), email must contain `@` (`Enter a valid email`). A valid submit calls `onSubmit({ name, email })`.

### starter
```tsx
import { useState } from 'react';

export function ContactForm({ onSubmit }: { onSubmit: (v: { name: string; email: string }) => void }) {
  const [values, setValues] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const save = () => {
    const next: { name?: string; email?: string } = {};
    if (!values.name.trim()) next.name = 'Name is required';
    if (!values.email.includes('@')) next.email = 'Enter a valid email';
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(values);
  };

  return (
    <div>
      <div>Name</div>
      <input placeholder="Name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      {errors.name && <div className="error">{errors.name}</div>}
      <div>Email</div>
      <input placeholder="Email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
      {errors.email && <div className="error">{errors.email}</div>}
      <div className="btn" onClick={save}>
        Save
      </div>
    </div>
  );
}

export default function App() {
  return <ContactForm onSubmit={(v) => console.log(v)} />;
}
```

### solution
```tsx
import { useId, useState } from 'react';

export function ContactForm({ onSubmit }: { onSubmit: (v: { name: string; email: string }) => void }) {
  const baseId = useId();
  const [values, setValues] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: { name?: string; email?: string } = {};
    if (!values.name.trim()) next.name = 'Name is required';
    if (!values.email.includes('@')) next.email = 'Enter a valid email';
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(values);
  };

  const field = (name: 'name' | 'email', label: string) => {
    const id = `${baseId}-${name}`;
    const errorId = `${id}-error`;
    const error = errors[name];
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          value={values[name]}
          onChange={(e) => setValues({ ...values, [name]: e.target.value })}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p role="alert" id={errorId} className="error">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {field('name', 'Name')}
      {field('email', 'Email')}
      <button type="submit">Save</button>
    </form>
  );
}

export default function App() {
  return <ContactForm onSubmit={(v) => console.log(v)} />;
}
```

### tests
```tsx
const name = (view) => view.getByRole('textbox', { name: 'Name' });
const email = (view) => view.getByRole('textbox', { name: 'Email' });

test('is a real form with a submit button', async () => {
  const view = await render(<user.ContactForm onSubmit={() => {}} />);
  expect(view.$('form')).toBeTruthy();
  const button = view.getByRole('button', { name: 'Save' });
  expect(button.tagName).toBe('BUTTON');
  expect(button.type).toBe('submit');
});

test('inputs have real <label> elements, not just placeholders', async () => {
  const view = await render(<user.ContactForm onSubmit={() => {}} />);
  expect(name(view).labels).toHaveLength(1);
  expect(name(view).labels[0].textContent).toBe('Name');
  expect(email(view).labels[0].textContent).toBe('Email');
});

test('valid input is not marked invalid', async () => {
  const view = await render(<user.ContactForm onSubmit={() => {}} />);
  expect(name(view).hasAttribute('aria-invalid')).toBe(false);
  expect(name(view).hasAttribute('aria-describedby')).toBe(false);
});

test('submitting an empty form announces errors and links them to the fields', async () => {
  const onSubmit = fn();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await submit(view.$('form'));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(view.$$('[role=alert]').map((a) => a.textContent)).toEqual(['Name is required', 'Enter a valid email']);
  for (const input of [name(view), email(view)]) {
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const target = document.getElementById(input.getAttribute('aria-describedby'));
    expect(target).toBeTruthy();
    expect(target.getAttribute('role')).toBe('alert');
  }
  expect(document.getElementById(name(view).getAttribute('aria-describedby')).textContent).toBe('Name is required');
});

test('fixing a field removes its error semantics', async () => {
  const view = await render(<user.ContactForm onSubmit={() => {}} />);
  await submit(view.$('form'));
  await type(name(view), 'Ava');
  await submit(view.$('form'));
  expect(name(view).hasAttribute('aria-invalid')).toBe(false);
  expect(email(view).getAttribute('aria-invalid')).toBe('true');
  expect(view.$$('[role=alert]')).toHaveLength(1);
});

test('a valid submit calls onSubmit', async () => {
  const onSubmit = fn();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await type(name(view), 'Ava');
  await type(email(view), 'ava@example.com');
  await submit(view.$('form'));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit.calls[0][0]).toEqual({ name: 'Ava', email: 'ava@example.com' });
  expect(view.$('[role=alert]')).toBeNull();
});

test('ids are unique per form instance', async () => {
  const view = await render(
    <div>
      <user.ContactForm onSubmit={() => {}} />
      <user.ContactForm onSubmit={() => {}} />
    </div>,
  );
  const ids = view.$$('input').map((i) => i.id);
  expect(new Set(ids).size).toBe(4);
});
```

### typetests
```tsx
const ok = <ContactForm onSubmit={(v) => v.name.toUpperCase()} />;
// @ts-expect-error onSubmit is required
const bad = <ContactForm />;
```

### explanation
Four fixes turn a mouse-only form into a usable one. A real **`<label htmlFor>`** gives each input a persistent accessible name that also enlarges the click target (a placeholder vanishes as you type and is not a label). A **`<form>` with `<button type="submit">`** gives Enter-to-submit, correct role and keyboard behaviour for free, which a `<div onClick>` lacks. **`aria-invalid` plus `aria-describedby`** attach the error message to its field so a screen reader reads it with the field. **`role="alert"`** makes the message announced as soon as it appears. `useId()` keeps ids unique when the component is used more than once on a page. Notice that the attributes are only present while there *is* an error: `undefined` makes React omit them.

### hints
- `const baseId = useId();` and derive `${baseId}-name`, `${baseId}-name-error`, ...
- `<label htmlFor={id}>` and `<input id={id} />`.
- `aria-invalid={error ? true : undefined}` and `aria-describedby={error ? errorId : undefined}`.
- Use `<form onSubmit>` with `e.preventDefault()`, and `<button type="submit">`.

# practice: A live-region toast system

### meta
minutes: 9
language: tsx

### prompt
Build `ToastProvider({ duration = 4000, children })` and `useToast()`.

- `useToast()` returns `{ toast(message) }` and throws `Error('useToast must be used inside <ToastProvider>')` outside a provider.
- The provider always renders its children plus **one live region**: `<div role="status" aria-live="polite">`. The region must exist **even when there are no toasts** (screen readers only announce changes inside a region that was already on the page).
- Each toast is rendered inside the region as `<div class="toast"><span>{message}</span><button aria-label="Dismiss: {message}">×</button></div>`.
- A toast disappears by itself after `duration` ms, or immediately when its dismiss button is clicked. Timers must be cleaned up (dismissing early and unmounting must leave no timers behind).

### starter
```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastApi {
  toast: (message: string) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ duration = 4000, children }: { duration?: number; children: ReactNode }) {
  // TODO
  return <>{children}</>;
}

export function useToast(): ToastApi {
  // TODO
  return { toast: () => {} };
}

export default function App() {
  function Demo() {
    const { toast } = useToast();
    return <button onClick={() => toast('Contact saved')}>Save</button>;
  }
  return (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  );
}
```

### solution
```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastApi {
  toast: (message: string) => void;
}
interface ToastItem {
  id: number;
  message: string;
}
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ duration = 4000, children }: { duration?: number; children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [duration, dismiss],
  );

  useEffect(() => {
    const current = timers.current;
    return () => {
      current.forEach((timer) => clearTimeout(timer));
      current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div role="status" aria-live="polite" className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
            <button aria-label={`Dismiss: ${t.message}`} onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export default function App() {
  function Demo() {
    const { toast } = useToast();
    return <button onClick={() => toast('Contact saved')}>Save</button>;
  }
  return (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  );
}
```

### tests
```tsx
function Trigger({ message = 'Saved' }) {
  const { toast } = user.useToast();
  return <button onClick={() => toast(message)}>{'Show ' + message}</button>;
}
const mount = (props = {}, message) =>
  render(
    <user.ToastProvider {...props}>
      <Trigger message={message} />
    </user.ToastProvider>,
  );
const region = (view) => view.$('[role=status]');
const toasts = (view) => view.$$('.toast').map((t) => t.querySelector('span').textContent);

test('the live region exists before any toast', async () => {
  useFakeTimers();
  const view = await mount();
  expect(region(view)).toBeTruthy();
  expect(region(view).getAttribute('aria-live')).toBe('polite');
  expect(toasts(view)).toEqual([]);
});

test('toasts appear inside the live region', async () => {
  useFakeTimers();
  const view = await mount();
  await click(view.getByRole('button', { name: 'Show Saved' }));
  expect(toasts(view)).toEqual(['Saved']);
  expect(region(view).querySelectorAll('.toast')).toHaveLength(1);
});

test('the same live region element is reused (it is never recreated)', async () => {
  useFakeTimers();
  const view = await mount();
  const before = region(view);
  await click(view.getByRole('button', { name: 'Show Saved' }));
  expect(region(view)).toBe(before);
});

test('toasts disappear after the duration', async () => {
  const timers = useFakeTimers();
  const view = await mount({ duration: 1000 });
  await click(view.getByRole('button', { name: 'Show Saved' }));
  await timers.advance(999);
  expect(toasts(view)).toEqual(['Saved']);
  await timers.advance(1);
  expect(toasts(view)).toEqual([]);
});

test('uses a 4 second default duration', async () => {
  const timers = useFakeTimers();
  const view = await mount();
  await click(view.getByRole('button', { name: 'Show Saved' }));
  await timers.advance(3999);
  expect(toasts(view)).toHaveLength(1);
  await timers.advance(1);
  expect(toasts(view)).toHaveLength(0);
});

test('multiple toasts stack and expire independently', async () => {
  const timers = useFakeTimers();
  const view = await mount({ duration: 1000 });
  await click(view.getByRole('button', { name: 'Show Saved' }));
  await timers.advance(600);
  await click(view.getByRole('button', { name: 'Show Saved' }));
  expect(toasts(view)).toEqual(['Saved', 'Saved']);
  await timers.advance(400);
  expect(toasts(view)).toEqual(['Saved']);
  await timers.advance(600);
  expect(toasts(view)).toEqual([]);
});

test('the dismiss button has a descriptive name and removes the toast', async () => {
  const timers = useFakeTimers();
  const view = await mount({}, 'Contact saved');
  await click(view.getByRole('button', { name: 'Show Contact saved' }));
  const dismiss = view.getByRole('button', { name: 'Dismiss: Contact saved' });
  await click(dismiss);
  expect(toasts(view)).toEqual([]);
  expect(timers.pending()).toBe(0);
});

test('no timers are left behind after unmounting', async () => {
  const timers = useFakeTimers();
  const view = await mount();
  await click(view.getByRole('button', { name: 'Show Saved' }));
  expect(timers.pending()).toBe(1);
  view.unmount();
  await flush();
  expect(timers.pending()).toBe(0);
});

test('useToast throws outside the provider', async () => {
  const original = console.error;
  console.error = () => {};
  let message = '';
  class Catch extends HTMLElement {}
  function Probe() {
    try {
      user.useToast();
    } catch (e) {
      message = e.message;
    }
    return null;
  }
  await render(<Probe />);
  console.error = original;
  expect(message).toBe('useToast must be used inside <ToastProvider>');
});
```

### typetests
```tsx
function Check() {
  const { toast } = useToast();
  toast('hello');
  // @ts-expect-error toast takes a string
  toast(42);
  return null;
}
const ok = <ToastProvider duration={1000}><div /></ToastProvider>;
```

### explanation
Screen readers announce **changes inside a live region**, but only if the region was already in the DOM: a `role="status"` element that appears together with its content is frequently ignored. That is why the provider renders the region unconditionally and merely changes what is *inside* it. `aria-live="polite"` waits for a pause instead of interrupting. The dismiss button needs a name that says *which* toast it closes. Finally, every timer is tracked in a ref so dismissing early or unmounting clears it, preventing leaks and "state update on unmounted component" bugs.

### hints
- Keep toasts in state; store timer ids in a `useRef(new Map())`.
- `dismiss(id)` clears that timer and filters the toast out.
- Always render `<div role="status" aria-live="polite">` and map toasts inside it.
- Clear every remaining timer in an effect cleanup.

# challenge: Keyboard-accessible tabs

### meta
minutes: 10
language: tsx

### prompt
Build `TabList({ tabs, label })` following the WAI-ARIA tabs pattern. `tabs` is `{ id: string; label: string; content: ReactNode }[]`.

- `<div role="tablist" aria-label={label}>` with one `<button role="tab">` per tab, then **one** `<div role="tabpanel">` showing the **selected** tab's content. The first tab is selected initially.
- Each tab: `aria-selected`, `aria-controls` (the panel's id), and **roving tabindex**: `tabIndex={0}` on the selected tab, `-1` on the others.
- The panel has `aria-labelledby` pointing at the selected tab's id and `tabIndex={0}`.
- Keyboard on a tab: **ArrowRight** and **ArrowLeft** move to the next/previous tab, **wrapping around**; **Home** and **End** jump to the first and last. Moving **focuses and selects** the new tab, and calls `preventDefault()`.
- Clicking a tab selects it.

Use `useId()` for unique ids.

### starter
```tsx
import { useId, useRef, useState, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function TabList({ tabs, label }: { tabs: TabItem[]; label: string }) {
  // TODO
  return <div role="tablist" aria-label={label} />;
}

export default function App() {
  return (
    <TabList
      label="Contact sections"
      tabs={[
        { id: 'overview', label: 'Overview', content: <p>Overview content</p> },
        { id: 'deals', label: 'Deals', content: <p>Deals content</p> },
        { id: 'activity', label: 'Activity', content: <p>Activity content</p> },
      ]}
    />
  );
}
```

### solution
```tsx
import { useId, useRef, useState, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function TabList({ tabs, label }: { tabs: TabItem[]; label: string }) {
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (i: number) => `${baseId}-tab-${tabs[i].id}`;
  const panelId = `${baseId}-panel`;

  const moveTo = (index: number) => {
    setSelected(index);
    refs.current[index]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    moveTo(next);
  };

  return (
    <div>
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(i)}
            role="tab"
            aria-selected={selected === i}
            aria-controls={panelId}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(selected)} tabIndex={0}>
        {tabs[selected].content}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TabList
      label="Contact sections"
      tabs={[
        { id: 'overview', label: 'Overview', content: <p>Overview content</p> },
        { id: 'deals', label: 'Deals', content: <p>Deals content</p> },
        { id: 'activity', label: 'Activity', content: <p>Activity content</p> },
      ]}
    />
  );
}
```

### tests
```tsx
const tabs = [
  { id: 'a', label: 'Overview', content: <p>Overview content</p> },
  { id: 'b', label: 'Deals', content: <p>Deals content</p> },
  { id: 'c', label: 'Activity', content: <p>Activity content</p> },
];
const mount = () => render(<user.TabList label="Sections" tabs={tabs} />);
const tabEls = (view) => view.$$('[role=tab]');
const panel = (view) => view.$('[role=tabpanel]');
const selected = (view) => tabEls(view).findIndex((t) => t.getAttribute('aria-selected') === 'true');

test('has the tabs structure with a label', async () => {
  const view = await mount();
  expect(view.$('[role=tablist]').getAttribute('aria-label')).toBe('Sections');
  expect(tabEls(view).map((t) => t.textContent)).toEqual(['Overview', 'Deals', 'Activity']);
  expect(view.$$('[role=tabpanel]')).toHaveLength(1);
});

test('the first tab is selected and its content is shown', async () => {
  const view = await mount();
  expect(selected(view)).toBe(0);
  expect(panel(view).textContent).toBe('Overview content');
});

test('roving tabindex: only the selected tab is in the tab order', async () => {
  const view = await mount();
  expect(tabEls(view).map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
});

test('tabs and panel are linked with aria-controls and aria-labelledby', async () => {
  const view = await mount();
  const controls = tabEls(view)[0].getAttribute('aria-controls');
  expect(panel(view).id).toBe(controls);
  expect(panel(view).getAttribute('aria-labelledby')).toBe(tabEls(view)[0].id);
  expect(panel(view).getAttribute('tabindex')).toBe('0');
});

test('clicking a tab selects it', async () => {
  const view = await mount();
  await click(tabEls(view)[2]);
  expect(selected(view)).toBe(2);
  expect(panel(view).textContent).toBe('Activity content');
  expect(panel(view).getAttribute('aria-labelledby')).toBe(tabEls(view)[2].id);
  expect(tabEls(view).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);
});

test('ArrowRight moves focus and selection to the next tab', async () => {
  const view = await mount();
  tabEls(view)[0].focus();
  await keyDown(tabEls(view)[0], 'ArrowRight');
  expect(selected(view)).toBe(1);
  expect(document.activeElement).toBe(tabEls(view)[1]);
  expect(panel(view).textContent).toBe('Deals content');
});

test('ArrowRight wraps from the last tab to the first', async () => {
  const view = await mount();
  await click(tabEls(view)[2]);
  tabEls(view)[2].focus();
  await keyDown(tabEls(view)[2], 'ArrowRight');
  expect(selected(view)).toBe(0);
  expect(document.activeElement).toBe(tabEls(view)[0]);
});

test('ArrowLeft moves back and wraps from the first to the last', async () => {
  const view = await mount();
  tabEls(view)[0].focus();
  await keyDown(tabEls(view)[0], 'ArrowLeft');
  expect(selected(view)).toBe(2);
  expect(document.activeElement).toBe(tabEls(view)[2]);
  await keyDown(tabEls(view)[2], 'ArrowLeft');
  expect(selected(view)).toBe(1);
});

test('Home and End jump to the ends', async () => {
  const view = await mount();
  tabEls(view)[0].focus();
  await keyDown(tabEls(view)[0], 'End');
  expect(selected(view)).toBe(2);
  expect(document.activeElement).toBe(tabEls(view)[2]);
  await keyDown(tabEls(view)[2], 'Home');
  expect(selected(view)).toBe(0);
  expect(document.activeElement).toBe(tabEls(view)[0]);
});

test('handled keys are prevented from scrolling the page; other keys are ignored', async () => {
  const view = await mount();
  const tab = tabEls(view)[0];
  const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  tab.dispatchEvent(arrow);
  await flush();
  expect(arrow.defaultPrevented).toBe(true);
  const letter = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
  tabEls(view)[1].dispatchEvent(letter);
  await flush();
  expect(letter.defaultPrevented).toBe(false);
  expect(selected(view)).toBe(1);
});

test('ids are unique per instance', async () => {
  const view = await render(
    <div>
      <user.TabList label="One" tabs={tabs} />
      <user.TabList label="Two" tabs={tabs} />
    </div>,
  );
  const ids = view.$$('[role=tab], [role=tabpanel]').map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});
```

### typetests
```tsx
const ok = <TabList label="x" tabs={[{ id: 'a', label: 'A', content: <p>a</p> }]} />;
// @ts-expect-error label is required
const bad1 = <TabList tabs={[]} />;
// @ts-expect-error each tab needs content
const bad2 = <TabList label="x" tabs={[{ id: 'a', label: 'A' }]} />;
```

### explanation
This is the WAI-ARIA *tabs* pattern, step by step. **Roles and relationships** (`tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`) tell assistive technology how the parts relate. **Roving tabindex** means only the selected tab is in the page's Tab order (`0`), so Tab skips past the whole tab list to the panel instead of making users step through every tab; arrow keys move *within* the widget. The arrow, Home and End keys call `preventDefault()` so they do not also scroll the page, and moving selection also moves **focus** programmatically with a ref. Because ARIA changes only what is announced, not behaviour, all of this keyboard handling is your job: a tab widget with correct roles but no arrow-key support is worse than a plain list of buttons.

### hints
- Keep `selected` (an index) in state and an array of refs to the tab buttons.
- `tabIndex={selected === i ? 0 : -1}` on each tab.
- In `onKeyDown`: compute the next index (wrapping with modulo-style conditionals), `event.preventDefault()`, then `setSelected(next)` and `refs.current[next]?.focus()`.
- Give each tab an `id` and the panel `aria-labelledby` of the selected tab's id.
