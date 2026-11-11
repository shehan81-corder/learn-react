## Accessibility is part of "working"

Roughly one in five people has a disability that affects how they use software: blind users with screen readers, people who cannot use a mouse, people with low vision or colour blindness, people with tremors, deaf users, and people with temporary limits (a broken arm, a bright sunny screen). Add everyone who simply prefers the keyboard. An inaccessible CRM is one some of your users, and your colleagues, cannot use at all. In many countries it is also a **legal requirement**.

The good news: most accessibility comes from doing ordinary HTML *properly*, and React does not get in the way.

> **The thinking pattern:** *use the platform first.* A real `<button>` is focusable, activates with Enter and Space, announces itself as a button and works in high-contrast mode, for free. A `<div onClick>` has none of that and you must rebuild all of it by hand. Reach for ARIA attributes only when no native element does the job.

## The four principles (POUR)

WCAG, the standard, organises requirements as: **Perceivable** (can everyone sense it?), **Operable** (can everyone use it, including without a mouse?), **Understandable** (is it predictable and are errors clear?) and **Robust** (does it work with assistive technology?). Aim for WCAG 2.2 level AA.

## 1. Semantic HTML

Choose elements for what they *are*, not how they look:

| Instead of | Use |
| --- | --- |
| `<div onClick>` | `<button>` |
| `<div>` that navigates | `<a href>` / `<Link>` |
| a styled `<div>` heading | `<h1>`…`<h6>` in order, with no skipped levels |
| a `<div>` list of things | `<ul>` / `<ol>` / `<table>` for tabular data |
| a `<div>` wrapping a form | `<form>` with a `<button type="submit">` |
| `<div class="header">` | `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` (landmarks) |

Landmarks and headings let screen reader users jump around a page. Use **one `<main>`**, one `<h1>` per page and a heading outline that makes sense when read alone.

## 2. Names: every control needs one

A screen reader announces *"Email, edit text"*. The "Email" is the control's **accessible name**. Sources, in order of preference:

```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />                      // best: a visible label

<button aria-label="Close dialog">✕</button>           // icon-only buttons need a name

<img src={logo} alt="Nimbus CRM" />                    // informative image
<img src={divider} alt="" />                           // decorative image: empty alt, so it is skipped
```

A `placeholder` is **not** a label: it disappears when typing and has poor contrast. Use `useId()` to generate unique `id`/`htmlFor` pairs in reusable components.

## 3. Keyboard operability

Everything you can do with a mouse must be doable with the keyboard:

- **Tab / Shift+Tab** move between *focusable* elements (links, buttons, inputs). Tab order follows DOM order, so keep the DOM order logical.
- **Enter / Space** activate buttons; **Enter** follows links; **Esc** closes things; **arrow keys** move within composite widgets (tabs, menus, listboxes).
- **Never remove the focus outline** (`outline: none`) without replacing it with something equally visible. Use `:focus-visible` to show it for keyboard users only.
- `tabIndex={0}` makes a non-interactive element focusable; `tabIndex={-1}` makes it focusable by script only (for focus management); **avoid positive values**.

Test it yourself: put the mouse away and use your whole app with Tab, Shift+Tab, Enter, Space and Esc.

## 4. Focus management

Single-page apps change the screen without a page load, so *you* must move focus where a user would expect:

- **Opening a dialog:** move focus *into* it (first control or the dialog itself).
- **While open:** keep focus *inside* (a "focus trap": Tab from the last control wraps to the first) and let **Esc** close it.
- **Closing:** return focus to the control that opened it.
- **After navigation:** move focus to the new page's `<h1>` (or announce the change), otherwise a screen reader user hears nothing happen.
- **After deleting an item:** put focus on a sensible neighbour, not on `<body>`.

The native `<dialog>` element with `showModal()` does a lot of this for you (focus trap, Esc, backdrop, top layer) and is the best choice when it fits. When you build your own you must implement it all, as you will today.

## 5. ARIA: a last resort, with rules

**ARIA** (Accessible Rich Internet Applications) adds semantics when HTML cannot. Its first rule is *don't use it if a native element will do*. When you must:

- **Roles** say what something is: `role="dialog"`, `role="tablist"`, `role="alert"`.
- **States and properties** describe it: `aria-expanded`, `aria-selected`, `aria-invalid`, `aria-describedby`, `aria-controls`, `aria-labelledby`.
- ARIA changes *only what is announced*, **not behaviour**. `role="button"` on a `<div>` does not make it focusable or add Enter/Space handling.
- Follow the **WAI-ARIA Authoring Practices** patterns exactly for widgets like tabs, menus and comboboxes, including the keyboard interaction. A half-implemented ARIA widget is worse than none.

## 6. Forms and errors

- Every field has a visible `<label>`; group related fields with `<fieldset>` and `<legend>`.
- Mark invalid fields with `aria-invalid="true"` and connect the message with `aria-describedby`.
- Announce errors: put them in `role="alert"` (read immediately) or move focus to the first invalid field after a failed submit.
- Say what is wrong *and how to fix it* ("Enter an email like name@example.com"), not just "Invalid".
- Use real `type`s (`email`, `tel`) and `autoComplete` so browsers and password managers help.

## 7. Live regions: announcing changes that nobody focused

When content changes without focus moving (a toast, a "Saved" message, search results updating), assistive tech will not notice unless the change happens inside a **live region**:

```tsx
<div role="status" aria-live="polite">{message}</div>     // polite: waits for a pause
<div role="alert">{error}</div>                           // assertive: interrupts; for errors
```

Key detail: the live region element must **already exist in the DOM** before its content changes. Rendering a brand-new `<div role="status">Saved</div>` is often not announced. Keep the container mounted and change what is inside.

## 8. Colour, contrast, motion and size

- **Contrast:** body text needs at least **4.5:1** against its background (3:1 for large text and UI components). Check both themes; browser DevTools show the ratio.
- **Never use colour alone** to convey meaning (an error is red *and* has an icon and text).
- **Respect motion preferences:** `@media (prefers-reduced-motion: reduce) { * { animation: none; transition: none; } }`.
- **Touch targets** of at least 24×24 CSS pixels (44×44 is comfortable).
- Support **zoom to 200%** and text resizing without horizontal scrolling or clipped content.
- Set `<html lang="en">`, and a descriptive `<title>` per page (update it on route changes, as this platform does).

## Testing accessibility

1. **Keyboard pass:** operate the whole page without a mouse; check focus is always visible and never trapped by accident.
2. **Automated:** Lighthouse, the **axe DevTools** extension, and `eslint-plugin-jsx-a11y` (already in Vite's React template setups). In tests, `jest-axe`/`vitest-axe`. Automation finds roughly a third of issues: great for regressions, not a guarantee.
3. **Screen reader:** try VoiceOver (macOS: Cmd+F5) or NVDA (Windows, free) for ten minutes on your main flow. It is humbling and instructive.
4. **Query by role in tests** (Day 26): `getByRole('button', { name: 'Save' })` only works if your markup exposes proper roles and names, so good tests double as accessibility checks.

## Walkthrough: make the "Add contact" dialog accessible

1. **Trigger:** a real `<button>` "Add contact".
2. **Dialog:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at its `<h2>`.
3. **Focus in:** on open, focus the first field; remember the trigger.
4. **Trap and escape:** Tab wraps inside; Esc closes; clicking the backdrop closes.
5. **Form:** labelled fields, `aria-invalid`/`aria-describedby` for errors, `role="alert"` messages, a real submit button.
6. **Feedback:** on success close the dialog, return focus to the trigger and announce "Contact added" in a polite live region (a toast).
7. **Verify:** keyboard-only run, then axe, then ten minutes with a screen reader.

## CRM step: an accessibility pass

1. Add a "Skip to main content" link as the first focusable element, and landmarks (`header`, `nav`, `main`) to the app shell.
2. Build (or adopt the native `<dialog>` for) an accessible `Modal` and use it for "Add contact" and "Confirm delete".
3. Build `ToastProvider` with a live region and use it for save/delete feedback.
4. Audit every form: real labels, `aria-invalid`/`aria-describedby`, `role="alert"` errors.
5. Make the contact detail **Tabs** keyboard accessible (arrow keys, Home/End, roving `tabIndex`).
6. Run Lighthouse and axe; fix every issue; do a keyboard-only and a screen-reader pass.
7. Check both themes for contrast and add `prefers-reduced-motion` handling.

- [ ] All interactive elements are real buttons/links/inputs with names
- [ ] Dialogs trap focus, close on Esc and restore focus
- [ ] Forms announce errors and link them to fields
- [ ] Lighthouse accessibility score of 95+ and a clean keyboard-only run
