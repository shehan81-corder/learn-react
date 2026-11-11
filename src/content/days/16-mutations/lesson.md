## Reading is easy; changing is where the care goes

Fetching data is *reading*. **Mutations** (create, update, delete) change something on the server and bring new problems:

- The user must know whether it worked.
- The UI should update **now**, not after a slow round trip, or the app feels sluggish.
- The server may reject the change (validation, permissions, conflicts).
- Users double-click.
- Your local copy of the data can fall out of sync with the server's.

> **The thinking pattern:** the server is the source of truth, the UI is a *prediction* of it. A mutation sends your intent; the UI may show the predicted result immediately (optimistic), but it must always be ready to **roll back** to the truth if the server disagrees.

## The HTTP vocabulary

| Intent | Method | Typical URL | Body | Success |
| --- | --- | --- | --- | --- |
| Create | `POST` | `/contacts` | the new record | `201` + created record |
| Replace | `PUT` | `/contacts/:id` | the whole record | `200` + record |
| Update part | `PATCH` | `/contacts/:id` | only changed fields | `200` + record |
| Delete | `DELETE` | `/contacts/:id` | none | `204` |

Our mock API supports all four. Send JSON with the right header:

```ts
async function createContact(data: NewContact): Promise<Contact> {
  return fetchJson<Contact>(`${API}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
```

Validation failures come back as `400 { error, fields: { email: '...' } }`. Convert them into a typed error so forms can show messages next to the right inputs (you built that UI on Day 10):

```ts
class ValidationError extends Error {
  constructor(public fields: Record<string, string>) { super('Validation failed'); }
}
// in fetchJson: if (res.status === 400 && body.fields) throw new ValidationError(body.fields);
```

## A mutation state machine

Like a fetch, a mutation moves through states, but it is **triggered by the user**, not by rendering, so it does not belong in an effect:

```tsx
type MutationState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useMutation<TArgs, TData>(fn: (args: TArgs) => Promise<TData>) {
  const [state, setState] = useState<MutationState<TData>>({ status: 'idle' });

  const mutate = useCallback(async (args: TArgs) => {
    setState({ status: 'pending' });
    try {
      const data = await fn(args);
      setState({ status: 'success', data });
      return data;
    } catch (error) {
      setState({ status: 'error', error: error as Error });
      throw error;
    }
  }, [fn]);

  return { ...state, mutate, reset: () => setState({ status: 'idle' }) };
}
```

Remember the rule from Day 8: *events cause things to happen, so call `mutate` from the event handler.* An effect is not needed.

## Preventing double submits

Disable the trigger while pending: `<button disabled={status === 'pending'}>`. Also guard inside the function (`if (status === 'pending') return`), because a keyboard user can press Enter twice faster than React re-renders, and for destructive actions consider requiring confirmation.

## Update local state after success

Three strategies, from simplest to slickest:

1. **Refetch.** After the mutation, reload the list. Always correct, costs a request and a flash of loading.
2. **Patch from the response.** The server returns the saved record, so add or replace it in local state. No refetch, always real data.
3. **Optimistic update.** Change local state **before** the request finishes, assuming success, and undo on failure.

## Optimistic updates, step by step

Deleting a contact, optimistically:

```tsx
async function handleDelete(id: string) {
  const previous = contacts;                         // 1. snapshot for rollback
  setContacts((list) => list.filter((c) => c.id !== id));   // 2. update the UI immediately

  try {
    await deleteContact(id);                         // 3. tell the server
  } catch (err) {
    setContacts(previous);                           // 4. rollback on failure...
    setError('Could not delete the contact.');       //    ...and tell the user
  }
}
```

It feels instant, but think about the traps:

- **Rollback with a stale snapshot.** If two deletes are in flight and the first fails, restoring `previous` would also resurrect the second. More robust: on failure, **re-insert just the failed item** (at its original position), not the whole old array.
- **Ordering.** The server may process requests in a different order than you sent them.
- **Not everything should be optimistic.** Use it for fast, low-risk, easily reversible actions (star, check off, reorder, delete with undo). Do **not** use it for payments, irreversible actions or anything the server often rejects.

A friendlier delete pattern is **undo instead of confirm**: remove the row immediately, show a toast with an Undo button for a few seconds, and only send the request when the timer expires.

## Feedback is part of the feature

Every mutation needs: a *pending* state (spinner, disabled button), a *success* signal (toast, the new row highlighted), and an *error* message with a way forward (retry, fix the field). Silent failure is the worst outcome; an optimistic UI that quietly reverts leaves users confused, so always explain a rollback.

## Walkthrough: toggle VIP optimistically

Star toggling is the ideal candidate: instant feedback, tiny payload, trivially reversible.

1. **Event:** click the star on contact `c`.
2. **Predict:** flip `vip` in local state right away.
3. **Send:** `PATCH /contacts/:id { vip: !c.vip }`.
4. **On success:** nothing to do (optionally replace with the server copy).
5. **On error:** flip it back for that contact only, and show "Could not update <name>".

```tsx
const toggleVip = async (contact: Contact) => {
  const next = !contact.vip;
  setContacts((list) => list.map((c) => (c.id === contact.id ? { ...c, vip: next } : c)));
  try {
    await patchContact(contact.id, { vip: next });
  } catch {
    setContacts((list) => list.map((c) => (c.id === contact.id ? { ...c, vip: !next } : c)));
    notify(`Could not update ${contact.firstName}`);
  }
};
```

Notice the rollback touches only that contact, which makes concurrent toggles safe. Tomorrow, TanStack Query gives you `onMutate`/`onError` hooks that formalise exactly this pattern.

## CRM step: create, edit and delete

1. Add `createContact`, `updateContact` (PATCH) and `deleteContact` to `src/api/contacts.ts`, throwing `ValidationError` for `400` responses.
2. Write `useMutation` (as above) in `src/hooks/`.
3. Hook the **Add contact** form to `createContact`: disabled while pending, server field errors shown under inputs, new contact appears (patch from response) and the form resets.
4. Add **Edit** (a form pre-filled from the contact, `PATCH` with only changed fields) and **Delete** (optimistic with rollback and an error toast).
5. Test the failure paths by temporarily adding `?fail=1` to the URL in your API function.

- [ ] Create form shows server validation errors next to the fields
- [ ] No double submits (button disabled while pending)
- [ ] Delete is optimistic and restores only the failed item on error
- [ ] Every mutation shows pending, success and error feedback
