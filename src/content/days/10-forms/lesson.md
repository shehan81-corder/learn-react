## Forms are where apps get hard

Forms are the main way users put data *into* a CRM, and they are full of edge cases: required fields, formats, errors that appear at the right time, double submits, server-side rejection. Done badly they frustrate users; done well nobody notices. Today you will build a form the way a careful developer does.

> **The thinking pattern:** separate three concerns: **values** (what the user typed), **validation** (a pure function: values in, errors out) and **presentation** (when and how to show errors). Keep validation pure and the rest is easy.

## Step 1: Validation is a pure function

```ts
interface ContactValues { firstName: string; lastName: string; email: string; phone: string }
type Errors<T> = Partial<Record<keyof T, string>>;

function validateContact(values: ContactValues): Errors<ContactValues> {
  const errors: Errors<ContactValues> = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required';
  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address';
  if (values.phone && !/^[+\d][\d\s()-]{5,}$/.test(values.phone)) errors.phone = 'Enter a valid phone number';
  return errors;
}
```

No React here. It is trivially testable, reusable on the server and easy to read. An empty object means valid. `Partial<Record<keyof T, string>>` ties the error keys to the field names, so a typo is a compile error.

## Step 2: Hold values and compute errors

```tsx
const [values, setValues] = useState<ContactValues>(initial);
const errors = validateContact(values);        // derived on every render, never stored
const isValid = Object.keys(errors).length === 0;
```

Errors are **derived**, exactly like Day 7. The only extra state you need is about *when to show them*.

## Step 3: When to show errors

If you display errors immediately, an empty form looks like a wall of red before the user has typed a letter. The usual pattern:

- Show a field's error after the user **leaves the field** (`onBlur`): the field is "touched".
- On **submit**, mark every field touched so all problems show at once.

```tsx
const [touched, setTouched] = useState<Partial<Record<keyof ContactValues, boolean>>>({});

const showError = (field: keyof ContactValues) => touched[field] && errors[field];

<input
  value={values.email}
  onChange={(e) => setValues({ ...values, email: e.target.value })}
  onBlur={() => setTouched({ ...touched, email: true })}
/>
{showError('email') && <p role="alert">{errors.email}</p>}
```

## Accessible errors

Colour alone is not enough. Connect the message to the input for screen readers:

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  value={values.email}
  aria-invalid={showError('email') ? true : undefined}
  aria-describedby={showError('email') ? 'email-error' : undefined}
  ...
/>
{showError('email') && <p id="email-error" role="alert">{errors.email}</p>}
```

Every input needs a `<label>` (clicking the label focuses the input, screen readers announce it). Use the right `type` (`email`, `tel`, `number`) and `autoComplete` hints.

## Submitting: async, pending, and server errors

Client validation is a convenience, not security: the server must validate too and may reject for reasons you cannot know (duplicate email). Model submission as its own small state machine:

```tsx
type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error'; message: string };

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setTouched(allTouched);
  if (!isValid) return;                      // client-side gate
  setSubmit({ status: 'submitting' });
  try {
    await onSubmit(values);                  // may throw a server error
    setValues(initial);
    setTouched({});
    setSubmit({ status: 'idle' });
  } catch (err) {
    setSubmit({ status: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
  }
}
```

While `submitting`, disable the submit button so a double-click cannot create two contacts. If the server returns field errors (our mock API does: `{ error, fields: { email: '...' } }`), merge them into the displayed errors.

## Extract a `useForm` hook

Once you have written that twice, extract it. A generic hook keeps each form short:

```tsx
function useForm<T extends Record<string, string>>(initial: T, validate: (v: T) => Errors<T>) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const errors = validate(values);

  const setField = (field: keyof T, value: string) => setValues((v) => ({ ...v, [field]: value }));
  const touch = (field: keyof T) => setTouched((t) => ({ ...t, [field]: true }));
  const touchAll = () => setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])) as Partial<Record<keyof T, boolean>>);
  const reset = () => { setValues(initial); setTouched({}); };

  return {
    values, errors, touched,
    visibleError: (field: keyof T) => (touched[field] ? errors[field] : undefined),
    isValid: Object.keys(errors).length === 0,
    setField, touch, touchAll, reset,
  };
}
```

A generic `<T>` hook is the TypeScript skill from Day 4 paying off: `form.values.emial` becomes a compile error.

Libraries such as **React Hook Form** and **Zod** do this (and more) very well. Learn the manual approach first so you know what they are doing for you.

## Controlled vs uncontrolled

Everything above uses *controlled* inputs. For very large forms you can let the DOM hold the values and read them with `new FormData(e.currentTarget)` on submit (*uncontrolled*), which avoids re-rendering on every keystroke. Choose controlled when you need live validation or derived UI, uncontrolled for simple, large forms.

## Walkthrough: validating a deal form

Fields: `title` (required, max 80 chars), `value` (a number ≥ 0), `closeDate` (a date not in the past). Think in this order:

1. **Values are strings**, because that is what inputs give you. Parse to numbers at validation and submit time, not in state.
2. **Write `validateDeal(values)` first**, with a unit test for each rule.
3. **Reuse `useForm`**, passing `validateDeal`.
4. **Convert on submit**: `{ title: values.title.trim(), value: Number(values.value), closeDate: values.closeDate }`.

```ts
function validateDeal(v: { title: string; value: string; closeDate: string }, today = new Date()) {
  const errors: Errors<typeof v> = {};
  if (!v.title.trim()) errors.title = 'Title is required';
  else if (v.title.length > 80) errors.title = 'Keep the title under 80 characters';
  const n = Number(v.value);
  if (v.value === '' || Number.isNaN(n)) errors.value = 'Enter an amount';
  else if (n < 0) errors.value = 'Amount cannot be negative';
  if (v.closeDate && new Date(v.closeDate) < new Date(today.toDateString())) errors.closeDate = 'Close date cannot be in the past';
  return errors;
}
```

Passing `today` as a parameter (with a default) makes the date rule testable without waiting for tomorrow, the same dependency-injection idea as the `storage` parameter on Day 8.

## CRM step: the contact form

Replace Nimbus CRM's quick add form with a proper one:

1. Add `src/lib/validation.ts` with `validateContact` (first name, last name, email format, optional phone).
2. Write `src/hooks/useForm.ts` as above.
3. Build `ContactForm.tsx` using the hook: labels, `aria-invalid`, `aria-describedby`, errors after blur/submit, disabled button while submitting.
4. Add a `status` select (`lead | customer | churned`) built from the `CONTACT_STATUSES` array you created on Day 4.
5. For now `onSubmit` adds to local state (a fake 300 ms delay with `await new Promise(...)` lets you see the pending state).

- [ ] `validateContact` is a pure function with at least four rules
- [ ] Errors only appear after blur or submit
- [ ] Inputs have labels and error messages are linked with `aria-describedby`
- [ ] The submit button is disabled while submitting
