# practice: A pure validation function

### meta
minutes: 7
language: ts

### prompt
Write and export `validateContact(values)`. It receives `{ firstName, lastName, email, phone }` (all strings) and returns an object of error messages keyed by field name. A valid form returns `{}`.

Rules (check in this order for each field and report only the first problem):

- `firstName`: required after trimming → `'First name is required'`.
- `lastName`: required after trimming → `'Last name is required'`.
- `email`: required → `'Email is required'`; must look like `name@domain.tld` → `'Enter a valid email address'`.
- `phone`: optional, but when present it must start with `+` or a digit, contain only digits, spaces, `(`, `)` and `-`, and be at least 6 characters long → `'Enter a valid phone number'`.

### starter
```ts
export interface ContactValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type Errors<T> = Partial<Record<keyof T, string>>;

export function validateContact(values: ContactValues): Errors<ContactValues> {
  // TODO
  return {};
}
```

### solution
```ts
export interface ContactValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type Errors<T> = Partial<Record<keyof T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+\d][\d\s()-]{5,}$/;

export function validateContact(values: ContactValues): Errors<ContactValues> {
  const errors: Errors<ContactValues> = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required';

  const email = values.email.trim();
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL.test(email)) errors.email = 'Enter a valid email address';

  const phone = values.phone.trim();
  if (phone && !PHONE.test(phone)) errors.phone = 'Enter a valid phone number';

  return errors;
}
```

### tests
```ts
const valid = { firstName: 'Ava', lastName: 'Nguyen', email: 'ava@example.com', phone: '' };

test('a valid contact has no errors', () => {
  expect(user.validateContact(valid)).toEqual({});
  expect(user.validateContact({ ...valid, phone: '+61 (4) 123-4567' })).toEqual({});
});

test('required names, trimmed', () => {
  expect(user.validateContact({ ...valid, firstName: '   ' }).firstName).toBe('First name is required');
  expect(user.validateContact({ ...valid, lastName: '' }).lastName).toBe('Last name is required');
});

test('email is required and must be valid', () => {
  expect(user.validateContact({ ...valid, email: '' }).email).toBe('Email is required');
  expect(user.validateContact({ ...valid, email: 'nope' }).email).toBe('Enter a valid email address');
  expect(user.validateContact({ ...valid, email: 'a@b' }).email).toBe('Enter a valid email address');
  expect(user.validateContact({ ...valid, email: 'a b@c.de' }).email).toBe('Enter a valid email address');
});

test('phone is optional but validated when present', () => {
  expect(user.validateContact({ ...valid, phone: '' }).phone).toBeUndefined();
  expect(user.validateContact({ ...valid, phone: 'call me' }).phone).toBe('Enter a valid phone number');
  expect(user.validateContact({ ...valid, phone: '123' }).phone).toBe('Enter a valid phone number');
});

test('only the invalid fields are reported', () => {
  const errors = user.validateContact({ firstName: '', lastName: 'Nguyen', email: 'bad', phone: '' });
  expect(Object.keys(errors).sort()).toEqual(['email', 'firstName']);
});

test('does not mutate its input', () => {
  const input = { ...valid, firstName: ' x ' };
  const before = JSON.stringify(input);
  user.validateContact(input);
  expect(JSON.stringify(input)).toBe(before);
});
```

### typetests
```ts
const e: Errors<ContactValues> = validateContact({ firstName: '', lastName: '', email: '', phone: '' });
const msg: string | undefined = e.email;
// @ts-expect-error unknown field name
const bad: Errors<ContactValues> = { nickname: 'x' };
```

### explanation
Returning an object keyed by field makes the result easy to look up (`errors.email`) and easy to test (`toEqual({})` means valid). Because the function is pure, no React or DOM is needed to test every rule. Trimming before the checks stops whitespace-only values from sneaking through. The `Errors<T>` type means a mistyped key such as `errors.emial` is a compile error rather than a silent `undefined`.

### hints
- Start with `const errors: Errors<ContactValues> = {};` and fill it in.
- Use `if / else if` for the email so you only report the first problem.
- Regex ideas: email `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, phone `/^[+\d][\d\s()-]{5,}$/`.

# practice: Show errors at the right time

### meta
minutes: 8
language: tsx

### prompt
Build `SignupForm({ onSubmit })` with an **Email** field and a **Name** field.

- Labels: `Name` and `Email`, associated with their inputs.
- Rules: name required (`Name is required`), email required (`Email is required`) and containing `@` (`Enter a valid email`).
- Errors are **not** shown initially. A field's error appears after the field is blurred, or for **all** fields after a submit attempt.
- A field with a visible error gets `aria-invalid="true"` and `aria-describedby` pointing at its error element, which is a `<p role="alert">` with that id.
- Submitting a valid form calls `onSubmit({ name, email })`; an invalid form does not call it.

### starter
```tsx
import { useState } from 'react';

interface Values {
  name: string;
  email: string;
}

export function SignupForm({ onSubmit }: { onSubmit: (v: Values) => void }) {
  // TODO: values, touched, derived errors
  return (
    <form>
      <label htmlFor="name">Name</label>
      <input id="name" />
      <label htmlFor="email">Email</label>
      <input id="email" />
      <button type="submit">Sign up</button>
    </form>
  );
}

export default function App() {
  return <SignupForm onSubmit={(v) => console.log(v)} />;
}
```

### solution
```tsx
import { useState } from 'react';

interface Values {
  name: string;
  email: string;
}

const validate = (v: Values): Partial<Record<keyof Values, string>> => {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (!v.name.trim()) errors.name = 'Name is required';
  if (!v.email.trim()) errors.email = 'Email is required';
  else if (!v.email.includes('@')) errors.email = 'Enter a valid email';
  return errors;
};

export function SignupForm({ onSubmit }: { onSubmit: (v: Values) => void }) {
  const [values, setValues] = useState<Values>({ name: '', email: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const errors = validate(values);

  const visible = (field: keyof Values) => (touched[field] ? errors[field] : undefined);
  const fieldProps = (field: keyof Values) => ({
    id: field,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [field]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    'aria-invalid': visible(field) ? true : undefined,
    'aria-describedby': visible(field) ? `${field}-error` : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (Object.keys(errors).length > 0) return;
    onSubmit({ name: values.name.trim(), email: values.email.trim() });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="name">Name</label>
      <input {...fieldProps('name')} />
      {visible('name') && (
        <p id="name-error" role="alert">
          {errors.name}
        </p>
      )}
      <label htmlFor="email">Email</label>
      <input {...fieldProps('email')} />
      {visible('email') && (
        <p id="email-error" role="alert">
          {errors.email}
        </p>
      )}
      <button type="submit">Sign up</button>
    </form>
  );
}

export default function App() {
  return <SignupForm onSubmit={(v) => console.log(v)} />;
}
```

### tests
```tsx
const name = (view) => view.getByRole('textbox', { name: 'Name' });
const email = (view) => view.getByRole('textbox', { name: 'Email' });
const alerts = (view) => view.$$('[role=alert]').map((a) => a.textContent);

test('shows no errors initially', async () => {
  const view = await render(<user.SignupForm onSubmit={() => {}} />);
  expect(alerts(view)).toEqual([]);
  expect(name(view).getAttribute('aria-invalid')).toBeNull();
});

test('shows an error after blur, not before', async () => {
  const view = await render(<user.SignupForm onSubmit={() => {}} />);
  await type(email(view), 'nope');
  expect(alerts(view)).toEqual([]);
  email(view).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  email(view).blur();
  await flush();
  expect(alerts(view)).toEqual(['Enter a valid email']);
  expect(email(view).getAttribute('aria-invalid')).toBe('true');
  const id = email(view).getAttribute('aria-describedby');
  expect(view.$('#' + id).textContent).toBe('Enter a valid email');
});

test('a submit attempt reveals every error and does not submit', async () => {
  const onSubmit = fn();
  const view = await render(<user.SignupForm onSubmit={onSubmit} />);
  await submit(view.$('form'));
  expect(alerts(view)).toEqual(['Name is required', 'Email is required']);
  expect(onSubmit).not.toHaveBeenCalled();
});

test('errors clear as the user fixes the field', async () => {
  const view = await render(<user.SignupForm onSubmit={() => {}} />);
  await submit(view.$('form'));
  await type(name(view), 'Ava');
  expect(alerts(view)).toEqual(['Email is required']);
  expect(name(view).getAttribute('aria-invalid')).toBeNull();
});

test('a valid form submits trimmed values', async () => {
  const onSubmit = fn();
  const view = await render(<user.SignupForm onSubmit={onSubmit} />);
  await type(name(view), ' Ava ');
  await type(email(view), ' ava@example.com ');
  await submit(view.$('form'));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit.calls[0][0]).toEqual({ name: 'Ava', email: 'ava@example.com' });
});
```

### explanation
Three pieces of state are enough: the `values`, which fields are `touched`, and the *derived* `errors`. An error is only **visible** when its field is touched, so a blank form is calm, blur reveals one field, and a submit attempt touches everything. The helper `fieldProps` removes repetition and guarantees each field gets the same accessibility wiring: `aria-invalid` and `aria-describedby` are only added while an error is shown, and the error element's `id` matches. `noValidate` turns off the browser's own popups so your messages are the ones users see.

### hints
- `const errors = validate(values)` during render (derived, not state).
- `touched` is an object: `{ name: true }`. On submit set both fields to `true`.
- `aria-describedby={showing ? 'email-error' : undefined}` and give the `<p>` the id `email-error`.

# practice: A reusable useForm hook

### meta
minutes: 8
language: tsx

### prompt
Write the generic hook `useForm(initial, validate)` and use it in a tiny component.

The hook returns:

- `values`: current values,
- `errors`: result of `validate(values)`,
- `visibleError(field)`: the error only if the field has been touched,
- `isValid`: `true` when there are no errors,
- `setField(field, value)`, `touch(field)`, `touchAll()`, `reset()`.

Then complete `NoteForm({ onSave })`: a `Title` input (required: `Title is required`) and a **Save** button. After a valid save call `onSave({ title })` and reset the form. Show `<p role="alert">` with the visible error under the input.

### starter
```tsx
import { useState } from 'react';

type Errors<T> = Partial<Record<keyof T, string>>;

export function useForm<T extends Record<string, string>>(initial: T, validate: (values: T) => Errors<T>) {
  // TODO
  return {} as any;
}

export function NoteForm({ onSave }: { onSave: (n: { title: string }) => void }) {
  const form = useForm({ title: '' }, (v) => (v.title.trim() ? {} : { title: 'Title is required' }));
  // TODO
  return (
    <form>
      <label>
        Title
        <input />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}

export default function App() {
  return <NoteForm onSave={(n) => console.log(n)} />;
}
```

### solution
```tsx
import { useState } from 'react';

type Errors<T> = Partial<Record<keyof T, string>>;

export function useForm<T extends Record<string, string>>(initial: T, validate: (values: T) => Errors<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const errors = validate(values);

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0,
    visibleError: (field: keyof T) => (touched[field] ? errors[field] : undefined),
    setField: (field: keyof T, value: string) => setValues((v) => ({ ...v, [field]: value })),
    touch: (field: keyof T) => setTouched((t) => ({ ...t, [field]: true })),
    touchAll: () => setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])) as Partial<Record<keyof T, boolean>>),
    reset: () => {
      setValues(initial);
      setTouched({});
    },
  };
}

export function NoteForm({ onSave }: { onSave: (n: { title: string }) => void }) {
  const form = useForm({ title: '' }, (v) => (v.title.trim() ? {} : { title: 'Title is required' }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.touchAll();
    if (!form.isValid) return;
    onSave({ title: form.values.title.trim() });
    form.reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Title
        <input value={form.values.title} onChange={(e) => form.setField('title', e.target.value)} onBlur={() => form.touch('title')} />
      </label>
      {form.visibleError('title') && <p role="alert">{form.visibleError('title')}</p>}
      <button type="submit">Save</button>
    </form>
  );
}

export default function App() {
  return <NoteForm onSave={(n) => console.log(n)} />;
}
```

### tests
```tsx
test('NoteForm hides errors until submit, then shows them', async () => {
  const view = await render(<user.NoteForm onSave={() => {}} />);
  expect(view.$('[role=alert]')).toBeNull();
  await submit(view.$('form'));
  expect(view.$('[role=alert]').textContent).toBe('Title is required');
});

test('NoteForm saves a trimmed title and resets', async () => {
  const onSave = fn();
  const view = await render(<user.NoteForm onSave={onSave} />);
  const input = view.getByRole('textbox', { name: 'Title' });
  await type(input, '  Call Ava  ');
  await submit(view.$('form'));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave.calls[0][0]).toEqual({ title: 'Call Ava' });
  expect(input.value).toBe('');
  expect(view.$('[role=alert]')).toBeNull();
});

test('NoteForm does not save an invalid form', async () => {
  const onSave = fn();
  const view = await render(<user.NoteForm onSave={onSave} />);
  await type(view.getByRole('textbox', { name: 'Title' }), '   ');
  await submit(view.$('form'));
  expect(onSave).not.toHaveBeenCalled();
});

test('the hook is generic and exposes everything', async () => {
  let form;
  function Probe() {
    form = user.useForm({ a: '', b: 'x' }, (v) => (v.a ? {} : { a: 'need a' }));
    return <p>{String(form.isValid)}</p>;
  }
  const view = await render(<Probe />);
  expect(form.values).toEqual({ a: '', b: 'x' });
  expect(form.errors).toEqual({ a: 'need a' });
  expect(form.isValid).toBe(false);
  expect(form.visibleError('a')).toBeUndefined();
  form.touch('a');
  await flush();
  expect(form.visibleError('a')).toBe('need a');
  form.setField('a', 'hello');
  await flush();
  expect(form.isValid).toBe(true);
  expect(view.$('p').textContent).toBe('true');
  form.touchAll();
  form.reset();
  await flush();
  expect(form.values).toEqual({ a: '', b: 'x' });
  expect(form.visibleError('a')).toBeUndefined();
});
```

### typetests
```tsx
function Check() {
  const f = useForm({ title: '', body: '' }, () => ({}));
  const t: string = f.values.title;
  f.setField('body', 'x');
  // @ts-expect-error unknown field
  f.setField('nope', 'x');
  // @ts-expect-error unknown field
  f.touch('nope');
  return null;
}
```

### explanation
The hook is the manual form logic from the lesson, packaged once. Its generic parameter `T` is inferred from `initial`, so `form.values.title` is a `string` and `form.setField('nope', ...)` is a compile error. The returned `visibleError` encapsulates the rule "only show errors for touched fields", so components stay short. `reset` returns to the original `initial` object, which is stable because it comes from the closure of the first render.

### hints
- Three pieces: `values` state, `touched` state, and `errors = validate(values)`.
- `visibleError(field)` returns `touched[field] ? errors[field] : undefined`.
- `touchAll`: `Object.fromEntries(Object.keys(values).map((k) => [k, true]))`.

# challenge: Async submit with server errors

### meta
minutes: 10
language: tsx

### prompt
Build `ContactForm({ onSubmit })` where `onSubmit(values)` returns a promise. Fields: **Name** and **Email**.

Client rules: name required (`Name is required`), email must contain `@` (`Enter a valid email`). Show a field's error only after submit has been attempted or the field was blurred.

Submission:

- While the promise is pending: the button is `disabled` and reads `Saving…`, and a second submit does nothing.
- On success: clear the form and show `<p role="status">Saved</p>`.
- If the promise rejects with an error that has a `fields` object (for example `{ email: 'Email already exists' }`), show those messages under the matching fields as `<p role="alert">`.
- If it rejects with any other error, show `<p role="alert">Could not save: <message></p>` at the bottom.

### starter
```tsx
import { useState } from 'react';

interface Values {
  name: string;
  email: string;
}

export function ContactForm({ onSubmit }: { onSubmit: (v: Values) => Promise<void> }) {
  // TODO
  return (
    <form>
      <label>
        Name
        <input />
      </label>
      <label>
        Email
        <input />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}

export default function App() {
  return <ContactForm onSubmit={() => new Promise((r) => setTimeout(r, 500))} />;
}
```

### solution
```tsx
import { useState } from 'react';

interface Values {
  name: string;
  email: string;
}
type FieldErrors = Partial<Record<keyof Values, string>>;
type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'failed'; message: string };

const EMPTY: Values = { name: '', email: '' };

function validate(v: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.name.trim()) errors.name = 'Name is required';
  if (!v.email.includes('@')) errors.email = 'Enter a valid email';
  return errors;
}

export function ContactForm({ onSubmit }: { onSubmit: (v: Values) => Promise<void> }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const clientErrors = validate(values);
  const errorFor = (field: keyof Values) => serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.kind === 'saving') return;
    setTouched({ name: true, email: true });
    setServerErrors({});
    if (Object.keys(clientErrors).length > 0) return;
    setStatus({ kind: 'saving' });
    try {
      await onSubmit({ name: values.name.trim(), email: values.email.trim() });
      setValues(EMPTY);
      setTouched({});
      setStatus({ kind: 'saved' });
    } catch (err) {
      const fields = (err as { fields?: FieldErrors } | null)?.fields;
      if (fields && typeof fields === 'object') {
        setServerErrors(fields);
        setStatus({ kind: 'idle' });
      } else {
        setStatus({ kind: 'failed', message: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  const field = (name: keyof Values, label: string) => (
    <>
      <label>
        {label}
        <input
          value={values[name]}
          onChange={(e) => {
            setValues((v) => ({ ...v, [name]: e.target.value }));
            setServerErrors((s) => ({ ...s, [name]: undefined }));
          }}
          onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
        />
      </label>
      {errorFor(name) && <p role="alert">{errorFor(name)}</p>}
    </>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {field('name', 'Name')}
      {field('email', 'Email')}
      <button type="submit" disabled={status.kind === 'saving'}>
        {status.kind === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {status.kind === 'saved' && <p role="status">Saved</p>}
      {status.kind === 'failed' && <p role="alert">Could not save: {status.message}</p>}
    </form>
  );
}

export default function App() {
  return <ContactForm onSubmit={() => new Promise((r) => setTimeout(r, 500))} />;
}
```

### tests
```tsx
const name = (view) => view.getByRole('textbox', { name: 'Name' });
const email = (view) => view.getByRole('textbox', { name: 'Email' });
const button = (view) => view.$('button');
const alerts = (view) => view.$$('[role=alert]').map((a) => a.textContent);
const controlled = () => {
  const calls = [];
  const onSubmit = fn((values) => new Promise((resolve, reject) => calls.push({ values, resolve, reject })));
  return { onSubmit, calls };
};
const fillValid = async (view) => {
  await type(name(view), 'Ava');
  await type(email(view), 'ava@example.com');
};

test('client validation blocks the submit and shows errors', async () => {
  const { onSubmit } = controlled();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await submit(view.$('form'));
  expect(alerts(view)).toEqual(['Name is required', 'Enter a valid email']);
  expect(onSubmit).not.toHaveBeenCalled();
});

test('shows a pending state and ignores double submits', async () => {
  const { onSubmit, calls } = controlled();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await fillValid(view);
  await submit(view.$('form'));
  expect(button(view).disabled).toBe(true);
  expect(button(view).textContent).toBe('Saving…');
  await submit(view.$('form'));
  expect(calls).toHaveLength(1);
});

test('success clears the form and shows a status message', async () => {
  const { onSubmit, calls } = controlled();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await fillValid(view);
  await submit(view.$('form'));
  expect(calls[0].values).toEqual({ name: 'Ava', email: 'ava@example.com' });
  calls[0].resolve();
  await flush();
  expect(view.$('[role=status]').textContent).toBe('Saved');
  expect(name(view).value).toBe('');
  expect(button(view).disabled).toBe(false);
  expect(button(view).textContent).toBe('Save');
});

test('maps server field errors onto the fields', async () => {
  const { onSubmit, calls } = controlled();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await fillValid(view);
  await submit(view.$('form'));
  const err = new Error('Validation failed');
  err.fields = { email: 'Email already exists' };
  calls[0].reject(err);
  await flush();
  expect(alerts(view)).toEqual(['Email already exists']);
  expect(email(view).value).toBe('ava@example.com');
  expect(button(view).disabled).toBe(false);
});

test('shows a general message for other failures', async () => {
  const { onSubmit, calls } = controlled();
  const view = await render(<user.ContactForm onSubmit={onSubmit} />);
  await fillValid(view);
  await submit(view.$('form'));
  calls[0].reject(new Error('Network down'));
  await flush();
  expect(alerts(view)).toEqual(['Could not save: Network down']);
  expect(button(view).disabled).toBe(false);
});
```

### typetests
```tsx
const ok = <ContactForm onSubmit={async (v) => { v.name.toUpperCase(); }} />;
// @ts-expect-error onSubmit must return a promise
const bad = <ContactForm onSubmit={(v) => 1} />;
```

### explanation
The submission status is a discriminated union (Day 4), so the button label, the success message and the general error can never contradict each other. `errorFor` merges two sources: server errors win, otherwise client errors appear for touched fields. Guarding with `if (status.kind === 'saving') return` plus the disabled button prevents double submits. Server field errors are cleared the moment the user edits that field, because the old message is no longer about the current value.

### hints
- Model submission as a union: `idle | saving | saved | failed`.
- `try { await onSubmit(...) } catch (err) { ... }`; read `err.fields` for server field errors.
- Clear a field's server error in its `onChange`.
- Return early from the submit handler while `status.kind === 'saving'`.
