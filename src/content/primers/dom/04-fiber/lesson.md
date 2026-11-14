## Rendering is two phases: render and commit

When state changes, React does its work in two clearly separated phases:

| | **Render phase** | **Commit phase** |
| --- | --- | --- |
| What happens | React calls your components, builds the next tree and diffs it against the current one | React applies the list of changes to the real DOM, then runs effects |
| Touches the DOM? | **No** | **Yes** |
| Can be paused, restarted or thrown away? | **Yes** (in concurrent rendering) | **No**: always runs to completion in one go |
| Your code that runs here | Component bodies, `useState` initialisers, `useMemo` callbacks | `ref` callbacks, `useLayoutEffect`, then (after paint) `useEffect` |

"Render" in React means **calling your components**, not drawing pixels. A component can render without anything changing on screen: if the diff finds no differences, the commit has nothing to do.

This split explains the most important rule about components: **the render phase must be pure**. No DOM changes, no network requests, no writing to variables outside the component. React may call a component, pause, throw the result away and call it again. Side effects belong in event handlers (things the user did) or in effects (things that must happen *because* something rendered).

> **The thinking pattern:** "rendering" is React *thinking* about the next screen; "committing" is React *changing* the screen. Thinking can be interrupted and repeated, so it must have no side effects. Changing happens exactly once, all at once.

## What is a fiber?

Before 2017, React's reconciler walked the tree with plain **recursion**: `render(App)` called `render(Header)` called `render(Logo)`... Recursion uses the JavaScript call stack, and a call stack cannot be paused halfway. A big update could block the main thread for hundreds of milliseconds, and typing and animations froze.

**Fiber** (React 16) rewrote the reconciler so the tree walk is a **loop over a linked list** that React controls. A *fiber* is one plain object per component instance or DOM element. It holds everything React needs to work on that node and to resume later:

```ts
interface Fiber {
  type: string | Function;     // 'li', ContactCard, ...
  key: string | null;
  pendingProps: object;        // props for this render
  memoizedProps: object;       // props from the last committed render
  memoizedState: unknown;      // for function components: the list of hooks
  stateNode: Node | null;      // the real DOM node (for host elements)

  child: Fiber | null;         // first child
  sibling: Fiber | null;       // next sibling
  return: Fiber | null;        // parent ("where to return to when done")

  alternate: Fiber | null;     // the matching fiber in the other tree (see double buffering)
  flags: number;               // what the commit must do: Placement, Update, Deletion...
  lanes: number;               // priority of pending work
}
```

Three pointers turn any tree into something you can walk with a loop and a single "current position" variable:

```text
App
 │ child
 ▼
Header ──sibling──► ContactList ──sibling──► Footer
 │ child              │ child
 ▼                    ▼
Logo ──► Nav         Row ──► Row ──► Row
         (every fiber also has `return` pointing to its parent)
```

Because the position in the walk is just a variable (`workInProgress`), React can stop after any fiber, give the browser control, and pick up exactly where it left off.

## The work loop: begin and complete

React's loop processes one fiber at a time. In simplified form:

```ts
let workInProgress: Fiber | null = root;

function workLoop(shouldYield: () => boolean) {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  beginWork(fiber);            // call the component / diff props, create child fibers
  if (fiber.child) return fiber.child;            // 1. go down
  let f: Fiber | null = fiber;
  while (f) {
    completeWork(f);           // prepare DOM changes for this fiber
    if (f.sibling) return f.sibling;              // 2. go across
    f = f.return;                                 // 3. go back up
  }
  return null;                 // back at the root: render phase done
}
```

- **beginWork** happens on the way *down*. For a function component this is where your function is called and its output reconciled into child fibers.
- **completeWork** happens on the way *up*, once all of a fiber's children are done. For DOM elements this is where React prepares the DOM node and records the changes it will need.

When `workInProgress` becomes `null`, the whole tree has been processed, and React **commits**: it applies every recorded change to the DOM in one synchronous pass.

```widget
fiber-loop
```

## Interruptible rendering, priorities and transitions

`shouldYield()` returns `true` when the current time slice (about 5 ms) is used up. React then returns control to the browser, which can paint and handle input, and continues in the next slice. This is **time slicing**.

Not all updates are equally urgent. React tags each update with a priority (a *lane*):

- **Urgent** (discrete input: typing, clicking): the user expects instant feedback.
- **Transition** (marked with `startTransition`): the result can lag a little, for example filtering a large list or switching tabs.

```tsx
const [query, setQuery] = useState('');
const [filter, setFilter] = useState('');
const [isPending, startTransition] = useTransition();

function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  setQuery(e.target.value);                         // urgent: the input must update now
  startTransition(() => setFilter(e.target.value)); // can be interrupted
}
```

If the user types again while a transition render is in progress, React **throws the half-finished work-in-progress tree away** and starts over with the newest value. Nothing was committed, so the user never sees a half-rendered screen. This is concurrent rendering, and it only works because the render phase has no side effects.

Updates outside transitions (most updates in normal code) still render synchronously and are not time-sliced, so for everyday code you do not need to think about any of this. It matters when a render is genuinely slow.

## Double buffering: current and work-in-progress

React keeps **two** fiber trees:

- **current**: what is on screen now;
- **work-in-progress**: the next version, being built during render.

Each fiber's `alternate` points to its twin in the other tree, so React can reuse objects instead of allocating new ones. When the commit finishes, React swaps a single pointer: the work-in-progress tree *becomes* current. This is the same idea as double buffering in graphics: draw the next frame off-screen, then flip.

It is also why an interrupted render costs nothing visible: the half-built tree was never shown.

## Hooks live on the fiber

Where does `useState` keep its value between renders? On the component's fiber, in `memoizedState`, as a **linked list in call order**:

```tsx
function ContactForm() {
  const [name, setName] = useState('');      // hook 1
  const [email, setEmail] = useState('');    // hook 2
  useEffect(() => { /* ... */ }, [name]);    // hook 3
}
```

```text
fiber.memoizedState → { state: '' } → { state: '' } → { effect, deps: [name] }
                        hook 1          hook 2          hook 3
```

React does not know the *names* `name` and `email`. On each render it walks the list and hands out hook 1, hook 2, hook 3 in order. That is the reason behind the **Rules of Hooks**:

- **Only call hooks at the top level**: never inside `if`, loops or after an early `return`. If a hook is skipped on one render, every later hook gets its neighbour's state.
- **Only call hooks from components or custom hooks**: there must be a fiber to attach them to.

Setting state does not change the variable you have. It queues an update on the hook and schedules a render; the next call to your component reads the new value. That is why state behaves like a **snapshot** within a render.

## Batching, and when everything happens

React **batches** state updates: several `setState` calls in the same event (or the same promise callback, or timeout, since React 18) produce **one** render and one commit.

```tsx
function onSave() {
  setSaving(true);
  setError(null);
  setCount((c) => c + 1);
  // one render, not three
}
```

The full sequence for one update:

```text
setState() ─► update queued on the fiber's hook, render scheduled
          ─► RENDER: call components top-down, diff, build work-in-progress tree   (pausable)
          ─► COMMIT: apply DOM changes, swap trees, set refs, run useLayoutEffect   (synchronous)
          ─► browser paints
          ─► run useEffect callbacks (cleanup of the previous effect first)
```

## How this shows up in React

- Keep components **pure**: same props and state → same output, no side effects during render. Strict Mode renders components twice in development to catch violations.
- Put side effects in **event handlers** first, and in `useEffect` only for synchronising with something outside React.
- Call hooks unconditionally, at the top of the component, in the same order every render.
- Read DOM layout (sizes, positions) in `useLayoutEffect` or a ref callback: that runs after the DOM is updated but before paint.
- Reach for `useTransition` or `useDeferredValue` when an expensive render makes typing feel slow.
- React DevTools' **Profiler** shows the render and commit phases for every update. Use it before guessing what is slow.
