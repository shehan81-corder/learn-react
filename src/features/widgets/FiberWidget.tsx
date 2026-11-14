import { useEffect, useMemo, useState } from 'react';
import { Cpu, MousePointerClick, Pause, Play, RotateCcw, StepForward } from 'lucide-react';

interface TreeSpec {
  name: string;
  children?: TreeSpec[];
}

const TREE: TreeSpec = {
  name: 'App',
  children: [
    { name: 'Header', children: [{ name: 'Logo' }, { name: 'Nav' }] },
    { name: 'ContactList', children: [{ name: 'Row (Ava)' }, { name: 'Row (Ben)' }, { name: 'Row (Cy)' }] },
    { name: 'Footer' },
  ],
};

interface Fiber {
  name: string;
  depth: number;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

function toFiber(spec: TreeSpec, parent: Fiber | null, depth: number): Fiber {
  const fiber: Fiber = { name: spec.name, depth, child: null, sibling: null, return: parent };
  let prev: Fiber | null = null;
  for (const c of spec.children ?? []) {
    const f = toFiber(c, fiber, depth + 1);
    if (prev) prev.sibling = f;
    else fiber.child = f;
    prev = f;
  }
  return fiber;
}

function flatten(f: Fiber | null): Fiber[] {
  const out: Fiber[] = [];
  const walk = (x: Fiber | null) => {
    for (let n = x; n; n = n.sibling) {
      out.push(n);
      walk(n.child);
    }
  };
  walk(f);
  return out;
}

/** One unit of work: begin the fiber, and complete every fiber we climb out of. */
interface Unit {
  begin: string;
  complete: string[];
}

function units(root: Fiber): Unit[] {
  const list: Unit[] = [];
  let next: Fiber | null = root;
  while (next) {
    const fiber: Fiber = next;
    const unit: Unit = { begin: fiber.name, complete: [] };
    if (fiber.child) {
      next = fiber.child;
    } else {
      let f: Fiber | null = fiber;
      next = null;
      while (f) {
        unit.complete.push(f.name);
        if (f.sibling) {
          next = f.sibling;
          break;
        }
        f = f.return;
      }
    }
    list.push(unit);
  }
  return list;
}

type LogEntry = { kind: 'work'; text: string } | { kind: 'yield'; text: string } | { kind: 'commit'; text: string } | { kind: 'input'; text: string };

/**
 * Steps through React's work loop on a small tree: begin/complete order,
 * yielding to the browser when the frame budget runs out, then a single
 * synchronous commit.
 */
export function FiberWidget() {
  const root = useMemo(() => toFiber(TREE, null, 0), []);
  const all = useMemo(() => flatten(root), [root]);
  const plan = useMemo(() => units(root), [root]);
  const [budget, setBudget] = useState(3);
  const [done, setDone] = useState(0); // units processed
  const [inFrame, setInFrame] = useState(0); // units processed in the current frame
  const [log, setLog] = useState<LogEntry[]>([]);
  const [committed, setCommitted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pendingClick, setPendingClick] = useState(false);

  const begun = new Set(plan.slice(0, done).map((u) => u.begin));
  const completed = new Set(plan.slice(0, done).flatMap((u) => u.complete));
  const current = done > 0 && !committed ? plan[done - 1].begin : null;
  const finished = done >= plan.length;

  const step = () => {
    if (committed) return;
    if (finished) {
      setLog((l) => [...l, { kind: 'commit', text: 'Commit phase: apply every DOM change in one go, then run layout effects and schedule useEffect.' }]);
      setCommitted(true);
      setPlaying(false);
      return;
    }
    if (inFrame >= budget) {
      setLog((l) => [
        ...l,
        { kind: 'yield', text: `Frame budget used (${budget} units). Yield to the browser so it can paint and handle input.` },
        ...(pendingClick ? [{ kind: 'input' as const, text: 'The browser handles your click right away, because React was not blocking the main thread.' }] : []),
      ]);
      setPendingClick(false);
      setInFrame(0);
      return;
    }
    const unit = plan[done];
    const text = `begin ${unit.begin}${unit.complete.length ? ` · complete ${unit.complete.join(', ')}` : ''}`;
    setLog((l) => [...l, { kind: 'work', text }]);
    setDone((d) => d + 1);
    setInFrame((n) => n + 1);
  };

  const reset = () => {
    setDone(0);
    setInFrame(0);
    setLog([]);
    setCommitted(false);
    setPlaying(false);
    setPendingClick(false);
  };

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(step, 650);
    return () => clearTimeout(id);
  });

  return (
    <figure className="widget">
      <figcaption className="widget-title">
        <Cpu size={16} /> Try it: the Fiber work loop
      </figcaption>
      <p className="widget-note">
        A state update in <code>App</code> re-renders this tree. Step through the <strong>render phase</strong>: React does one fiber per unit of work, going
        down through <code>child</code>, across through <code>sibling</code> and back up through <code>return</code>. When the frame budget is used up it yields.
        Press <em>Click the page</em> mid-render to see why that matters. The screen changes only at the <strong>commit</strong>.
      </p>
      <div className="row gap-sm wrap">
        <button type="button" className="btn btn-sm btn-primary" onClick={step} disabled={committed || playing}>
          <StepForward size={14} /> {finished && !committed ? 'Commit' : inFrame >= budget && !finished ? 'Yield' : 'Step'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setPlaying((p) => !p)} disabled={committed}>
          {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setPendingClick(true)} disabled={committed || done === 0 || pendingClick}>
          <MousePointerClick size={14} /> Click the page
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={reset}>
          <RotateCcw size={14} /> Reset
        </button>
        <label className="row gap-sm small">
          Units per frame
          <select value={budget} onChange={(e) => setBudget(Number(e.target.value))} disabled={done > 0}>
            {[1, 2, 3, 5, 99].map((n) => (
              <option key={n} value={n}>
                {n === 99 ? 'no limit (old React)' : n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="fiber-grid">
        <div>
          <div className="widget-label">Work-in-progress tree</div>
          <ul className="fiber-tree">
            {all.map((f) => {
              const state = completed.has(f.name) ? 'is-complete' : begun.has(f.name) ? 'is-begun' : '';
              return (
                <li key={f.name} className={`fiber ${state} ${current === f.name ? 'is-current' : ''}`} style={{ paddingLeft: 8 + f.depth * 18 }}>
                  {f.name}
                  <span className="fiber-ptrs muted">
                    {f.child ? ` ↓${f.child.name}` : ''}
                    {f.sibling ? ` →${f.sibling.name}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="widget-legend small muted">
            <span>
              <span className="legend-swatch fiber-begun" /> begun
            </span>
            <span>
              <span className="legend-swatch fiber-complete" /> completed
            </span>
            <span>
              <span className="legend-swatch fiber-current" /> current
            </span>
          </div>
        </div>
        <div>
          <div className="widget-label">What happened</div>
          <ol className="fiber-log">
            {log.length === 0 && <li className="muted">Press Step to start rendering.</li>}
            {log.map((entry, i) => (
              <li key={i} className={`log-${entry.kind}`}>
                {entry.text}
              </li>
            ))}
            {pendingClick && <li className="log-input muted">You clicked. The click waits until React yields…</li>}
          </ol>
          <div className="widget-label">What the user sees</div>
          <div className={`fiber-screen ${committed ? 'is-new' : ''}`}>{committed ? 'New UI (3 contacts, updated header)' : 'Old UI: nothing changes during the render phase'}</div>
        </div>
      </div>
    </figure>
  );
}
