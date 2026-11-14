# practice: Build a fiber tree

### meta
minutes: 7
language: ts

### prompt
Turn a nested tree into **fibers** linked by three pointers. Implement `toFiber(node, parent = null)`:

- `child` points to the **first** child (or `null`);
- `sibling` points to the **next** sibling (or `null` for the last one);
- `return` points to the parent (or `null` for the root).

Children have no pointer back to their *previous* sibling, and a parent only points at its first child. Every other child is reached through `sibling`.

### starter
```ts
export interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export interface Fiber {
  name: string;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

export function toFiber(node: TreeNode, parent: Fiber | null = null): Fiber {
  const fiber: Fiber = { name: node.name, child: null, sibling: null, return: parent };
  // TODO: create a fiber for each child, link child / sibling pointers
  return fiber;
}

// Preview
const app = toFiber({ name: 'App', children: [{ name: 'Header' }, { name: 'List', children: [{ name: 'Row' }] }, { name: 'Footer' }] });
console.log(app.child?.name, '→', app.child?.sibling?.name, '→', app.child?.sibling?.sibling?.name);
```

### solution
```ts
export interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export interface Fiber {
  name: string;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

export function toFiber(node: TreeNode, parent: Fiber | null = null): Fiber {
  const fiber: Fiber = { name: node.name, child: null, sibling: null, return: parent };
  let previous: Fiber | null = null;
  for (const childNode of node.children ?? []) {
    const childFiber = toFiber(childNode, fiber);
    if (previous) previous.sibling = childFiber;
    else fiber.child = childFiber;
    previous = childFiber;
  }
  return fiber;
}

// Preview
const app = toFiber({ name: 'App', children: [{ name: 'Header' }, { name: 'List', children: [{ name: 'Row' }] }, { name: 'Footer' }] });
console.log(app.child?.name, '→', app.child?.sibling?.name, '→', app.child?.sibling?.sibling?.name);
```

### tests
```ts
const tree = {
  name: 'App',
  children: [
    { name: 'Header', children: [{ name: 'Logo' }, { name: 'Nav' }] },
    { name: 'List', children: [{ name: 'Row1' }, { name: 'Row2' }] },
    { name: 'Footer' },
  ],
};

test('a leaf has no child, sibling or return', () => {
  const f = user.toFiber({ name: 'Solo' });
  expect([f.name, f.child, f.sibling, f.return]).toEqual(['Solo', null, null, null]);
});

test('child points to the first child only', () => {
  const app = user.toFiber(tree);
  expect(app.child.name).toBe('Header');
  expect(app.child.child.name).toBe('Logo');
});

test('siblings are chained in order and end with null', () => {
  const app = user.toFiber(tree);
  const names = [];
  for (let f = app.child; f; f = f.sibling) names.push(f.name);
  expect(names).toEqual(['Header', 'List', 'Footer']);
});

test('every fiber returns to its parent', () => {
  const app = user.toFiber(tree);
  const list = app.child.sibling;
  const row2 = list.child.sibling;
  expect(row2.name).toBe('Row2');
  expect(row2.return).toBe(list);
  expect(list.return).toBe(app);
  expect(app.return).toBe(null);
});

test('leaves have no child', () => {
  const app = user.toFiber(tree);
  const footer = app.child.sibling.sibling;
  expect(footer.child).toBe(null);
  expect(footer.sibling).toBe(null);
});
```

### explanation
The trick is remembering the `previous` child while looping. The first child goes in the parent's `child` pointer; every later child is attached to the previous one's `sibling`. Each child gets `return: fiber` so the walk can climb back up. This shape (first child, next sibling, parent) can represent any tree, and it means "where am I in the walk" is a single variable rather than a stack of nested function calls. That is what lets React pause between any two fibers.

### hints
- Keep `let previous: Fiber | null = null` outside the loop.
- If there is no `previous` yet, set `fiber.child`; otherwise set `previous.sibling`.
- Pass the new `fiber` as the parent when you recurse: `toFiber(childNode, fiber)`.

# practice: Walk the tree with a loop

### meta
minutes: 8
language: ts

### prompt
Implement `workOrder(root)`: walk a fiber tree the way React's work loop does, **with a loop, not recursion**, and return the log of steps:

- `"begin X"` when you first reach fiber X (on the way down);
- `"complete X"` when X and all of its children are done (on the way up).

Algorithm for each fiber: log *begin*; if it has a `child`, go there next. Otherwise, starting at this fiber: log *complete*; if it has a `sibling`, go there next; if not, move to `return` and repeat (complete the parent, try its sibling...). Stop when you climb past the root.

One test uses a tree **50,000 levels deep**. A recursive walk overflows the call stack there; the loop does not.

### starter
```ts
export interface Fiber {
  name: string;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

export function workOrder(root: Fiber): string[] {
  const log: string[] = [];
  // TODO: let next: Fiber | null = root; while (next) { ... }
  return log;
}

// Preview helpers
function fiber(name: string, ...children: Fiber[]): Fiber {
  const f: Fiber = { name, child: children[0] ?? null, sibling: null, return: null };
  children.forEach((c, i) => {
    c.return = f;
    c.sibling = children[i + 1] ?? null;
  });
  return f;
}
console.log(workOrder(fiber('App', fiber('Header', fiber('Logo')), fiber('Footer'))).join('\n'));
```

### solution
```ts
export interface Fiber {
  name: string;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

export function workOrder(root: Fiber): string[] {
  const log: string[] = [];
  let next: Fiber | null = root;

  while (next) {
    const fiber: Fiber = next;
    log.push(`begin ${fiber.name}`);
    if (fiber.child) {
      next = fiber.child;
      continue;
    }
    let f: Fiber | null = fiber;
    next = null;
    while (f) {
      log.push(`complete ${f.name}`);
      if (f === root) break;
      if (f.sibling) {
        next = f.sibling;
        break;
      }
      f = f.return;
    }
  }
  return log;
}

// Preview helpers
function fiber(name: string, ...children: Fiber[]): Fiber {
  const f: Fiber = { name, child: children[0] ?? null, sibling: null, return: null };
  children.forEach((c, i) => {
    c.return = f;
    c.sibling = children[i + 1] ?? null;
  });
  return f;
}
console.log(workOrder(fiber('App', fiber('Header', fiber('Logo')), fiber('Footer'))).join('\n'));
```

### tests
```ts
function fiber(name, ...children) {
  const f = { name, child: children[0] || null, sibling: null, return: null };
  children.forEach((c, i) => {
    c.return = f;
    c.sibling = children[i + 1] || null;
  });
  return f;
}

test('a single fiber begins and completes', () => {
  expect(user.workOrder(fiber('App'))).toEqual(['begin App', 'complete App']);
});

test('children complete before their parent', () => {
  expect(user.workOrder(fiber('App', fiber('A'), fiber('B')))).toEqual(['begin App', 'begin A', 'complete A', 'begin B', 'complete B', 'complete App']);
});

test('depth-first: down, across, back up', () => {
  const root = fiber('App', fiber('Header', fiber('Logo'), fiber('Nav')), fiber('List', fiber('Row')), fiber('Footer'));
  expect(user.workOrder(root)).toEqual([
    'begin App',
    'begin Header',
    'begin Logo',
    'complete Logo',
    'begin Nav',
    'complete Nav',
    'complete Header',
    'begin List',
    'begin Row',
    'complete Row',
    'complete List',
    'begin Footer',
    'complete Footer',
    'complete App',
  ]);
});

test('stops at the root even if the root has a sibling', () => {
  const parent = fiber('Parent', fiber('Root', fiber('Child')), fiber('Other'));
  const root = parent.child;
  expect(user.workOrder(root)).toEqual(['begin Root', 'begin Child', 'complete Child', 'complete Root']);
});

test('handles a 50,000-level-deep tree without recursion', () => {
  const root = { name: 'n0', child: null, sibling: null, return: null };
  let tip = root;
  for (let i = 1; i < 50000; i++) {
    const next = { name: 'n' + i, child: null, sibling: null, return: tip };
    tip.child = next;
    tip = next;
  }
  const log = user.workOrder(root);
  expect(log.length).toBe(100000);
  expect(log[49999]).toBe('begin n49999');
  expect(log[50000]).toBe('complete n49999');
  expect(log[99999]).toBe('complete n0');
});
```

### explanation
The walk needs no stack because every fiber already knows where to go next: `child` to go down, `sibling` to go across, `return` to go back up. The outer loop begins one fiber per iteration; the inner loop climbs back up through every fiber that has just finished, completing each one, until it finds a sibling to continue with. The `f === root` check stops the walk at the root even when the root itself has siblings (React renders subtrees this way when only part of the app changed). Because the current position is just the `next` variable, the loop can stop after any iteration and resume later, which is the whole point of Fiber.

### hints
- Outer loop: `while (next) { log begin; if (child) { next = child; continue; } ... }`.
- Inner loop: complete `f`; if `f` is the root, stop; if `f.sibling`, that is `next`; otherwise `f = f.return`.
- Set `next = null` before the inner loop so the outer loop ends when nothing is left.

# challenge: An interruptible work loop

### meta
minutes: 12
language: ts

### prompt
Build a work loop that can **pause and resume**, with a commit at the end. `createWorkLoop(root)` returns `{ log, work }`:

- `log` is an array of strings that grows as work happens.
- `work(shouldYield)` performs units of work. Before **each** unit it calls `shouldYield()`; if that returns `true`, it stops and returns `'yielded'`. The next call to `work` resumes exactly where it stopped.
- One unit of work = one fiber: log `"begin X"`, then (if it has no child) the `"complete ..."` entries for everything it climbs out of, just like the previous practice.
- When all work is done, `work` logs `"commit"` **once** and returns `'committed'`.
- Any later call returns `'idle'` and logs nothing.

### starter
```ts
export interface Fiber {
  name: string;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

export type WorkResult = 'yielded' | 'committed' | 'idle';

export function createWorkLoop(root: Fiber) {
  const log: string[] = [];

  function work(shouldYield: () => boolean): WorkResult {
    // TODO: keep the current position between calls, check shouldYield() before each unit
    return 'idle';
  }

  return { log, work };
}

// Preview: 2 units per "frame"
function fiber(name: string, ...children: Fiber[]): Fiber {
  const f: Fiber = { name, child: children[0] ?? null, sibling: null, return: null };
  children.forEach((c, i) => {
    c.return = f;
    c.sibling = children[i + 1] ?? null;
  });
  return f;
}
const loop = createWorkLoop(fiber('App', fiber('Header'), fiber('List', fiber('Row')), fiber('Footer')));
let frame = 0;
let result: WorkResult;
do {
  let units = 0;
  result = loop.work(() => units++ >= 2);
  console.log(`frame ${++frame}: ${result}`);
} while (result === 'yielded' && frame < 20);
console.log(loop.log.join('\n'));
```

### solution
```ts
export interface Fiber {
  name: string;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

export type WorkResult = 'yielded' | 'committed' | 'idle';

export function createWorkLoop(root: Fiber) {
  const log: string[] = [];
  let next: Fiber | null = root;
  let committed = false;

  function performUnitOfWork(fiber: Fiber): Fiber | null {
    log.push(`begin ${fiber.name}`);
    if (fiber.child) return fiber.child;
    let f: Fiber | null = fiber;
    while (f) {
      log.push(`complete ${f.name}`);
      if (f === root) return null;
      if (f.sibling) return f.sibling;
      f = f.return;
    }
    return null;
  }

  function work(shouldYield: () => boolean): WorkResult {
    if (committed) return 'idle';
    while (next) {
      if (shouldYield()) return 'yielded';
      next = performUnitOfWork(next);
    }
    log.push('commit');
    committed = true;
    return 'committed';
  }

  return { log, work };
}

// Preview: 2 units per "frame"
function fiber(name: string, ...children: Fiber[]): Fiber {
  const f: Fiber = { name, child: children[0] ?? null, sibling: null, return: null };
  children.forEach((c, i) => {
    c.return = f;
    c.sibling = children[i + 1] ?? null;
  });
  return f;
}
const loop = createWorkLoop(fiber('App', fiber('Header'), fiber('List', fiber('Row')), fiber('Footer')));
let frame = 0;
let result: WorkResult;
do {
  let units = 0;
  result = loop.work(() => units++ >= 2);
  console.log(`frame ${++frame}: ${result}`);
} while (result === 'yielded' && frame < 20);
console.log(loop.log.join('\n'));
```

### tests
```ts
function fiber(name, ...children) {
  const f = { name, child: children[0] || null, sibling: null, return: null };
  children.forEach((c, i) => {
    c.return = f;
    c.sibling = children[i + 1] || null;
  });
  return f;
}
const budget = (n) => {
  let used = 0;
  return () => used++ >= n;
};
const tree = () => fiber('App', fiber('A'), fiber('B'));

test('never yielding renders everything and commits in one call', () => {
  const loop = user.createWorkLoop(tree());
  expect(loop.work(() => false)).toBe('committed');
  expect(loop.log).toEqual(['begin App', 'begin A', 'complete A', 'begin B', 'complete B', 'complete App', 'commit']);
});

test('yields when the budget runs out and resumes where it stopped', () => {
  const loop = user.createWorkLoop(tree());
  expect(loop.work(budget(1))).toBe('yielded');
  expect(loop.log).toEqual(['begin App']);
  expect(loop.work(budget(1))).toBe('yielded');
  expect(loop.log).toEqual(['begin App', 'begin A', 'complete A']);
  expect(loop.work(budget(5))).toBe('committed');
  expect(loop.log.slice(3)).toEqual(['begin B', 'complete B', 'complete App', 'commit']);
});

test('checks shouldYield before every unit of work', () => {
  const loop = user.createWorkLoop(tree());
  const shouldYield = fn(() => false);
  loop.work(shouldYield);
  expect(shouldYield).toHaveBeenCalledTimes(3);
});

test('a call that yields immediately does no work', () => {
  const loop = user.createWorkLoop(tree());
  expect(loop.work(() => true)).toBe('yielded');
  expect(loop.log).toEqual([]);
  expect(loop.work(() => false)).toBe('committed');
});

test('commits only once, then is idle', () => {
  const loop = user.createWorkLoop(tree());
  loop.work(() => false);
  expect(loop.work(() => false)).toBe('idle');
  expect(loop.log.filter((l) => l === 'commit').length).toBe(1);
});

test('commit never happens before all work is done', () => {
  const loop = user.createWorkLoop(fiber('App', fiber('A', fiber('A1')), fiber('B')));
  while (loop.work(budget(1)) === 'yielded') {
    const commitAt = loop.log.indexOf('commit');
    expect(commitAt).toBe(-1);
  }
  expect(loop.log[loop.log.length - 2]).toBe('complete App');
  expect(loop.log[loop.log.length - 1]).toBe('commit');
});
```

### explanation
The only state the loop needs between calls is `next` (the fiber to work on next) and whether it has committed. Both live in the closure, so returning from `work` loses nothing. Checking `shouldYield()` **before** each unit means a fiber is never half-processed: React always stops between fibers. The commit is separate and runs only when `next` is `null`, all at once and never interrupted, which matches React's guarantee that the screen never shows a half-rendered tree. In React, `shouldYield` checks whether about 5 ms have passed, and a higher-priority update can also discard the work-in-progress and restart from the root.

### hints
- Keep `let next: Fiber | null = root` and `let committed = false` inside `createWorkLoop`, outside `work`.
- Move the begin/complete logic into a `performUnitOfWork(fiber)` helper that returns the next fiber (or `null`).
- In `work`: `while (next) { if (shouldYield()) return 'yielded'; next = performUnitOfWork(next); }`, then commit.
