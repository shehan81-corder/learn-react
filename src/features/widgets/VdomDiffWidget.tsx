import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GitCompareArrows } from 'lucide-react';
import { build, diff, el, findNode, label, subtreeIds, type PatchType, type VNode } from './vdom.ts';

interface Scenario {
  id: string;
  title: string;
  note: string;
  before: ReturnType<typeof el>;
  after: ReturnType<typeof el>;
}

const names = (keys: boolean, list: string[]) => list.map((n) => el('li', keys ? { key: n.toLowerCase() } : {}, n));

const SCENARIOS: Scenario[] = [
  {
    id: 'text',
    title: 'Text changes',
    note: 'Same element types in the same positions, so React keeps every DOM node and changes only the one text node. This is the common, cheap case.',
    before: el('ul', {}, ...names(false, ['Ava', 'Ben', 'Cy'])),
    after: el('ul', {}, ...names(false, ['Ava', 'Bo', 'Cy'])),
  },
  {
    id: 'props',
    title: 'Props change',
    note: 'The <button> keeps its identity (same type, same place). React compares the attribute lists and only touches the ones that changed.',
    before: el('form', {}, el('input', { value: 'Ava' }), el('button', { class: 'btn' }, 'Save')),
    after: el('form', {}, el('input', { value: 'Ava Lee' }), el('button', { class: 'btn primary', disabled: '' }, 'Saving…')),
  },
  {
    id: 'type',
    title: 'Type changes',
    note: 'The wrapper changed from <div> to <section>. React does not look inside: it destroys the old subtree, including the state of <Counter>, and mounts a fresh one.',
    before: el('div', {}, el('h2', {}, 'Deals'), el('Counter')),
    after: el('section', {}, el('h2', {}, 'Deals'), el('Counter')),
  },
  {
    id: 'insert-index',
    title: 'Insert at top, no keys',
    note: 'Without keys React pairs children by position: new[0] with old[0], and so on. Every item looks changed, so it rewrites three texts and appends one node. Any state inside the items would now sit next to the wrong name.',
    before: el('ul', {}, ...names(false, ['Ava', 'Ben', 'Cy'])),
    after: el('ul', {}, ...names(false, ['Dee', 'Ava', 'Ben', 'Cy'])),
  },
  {
    id: 'insert-key',
    title: 'Insert at top, with keys',
    note: 'With keys React pairs children by identity. It sees that "ava", "ben" and "cy" are unchanged and only inserts "dee". State stays with the right item.',
    before: el('ul', {}, ...names(true, ['Ava', 'Ben', 'Cy'])),
    after: el('ul', {}, ...names(true, ['Dee', 'Ava', 'Ben', 'Cy'])),
  },
  {
    id: 'move',
    title: 'Move last to top (keys)',
    note: 'React walks the new list left to right and remembers the furthest old position it has kept ("lastPlacedIndex"). "dee" was at 3, so everything after it that came from an earlier position is marked as moved. Moving the last item to the front costs 3 moves; moving the first item to the end would cost 1.',
    before: el('ul', {}, ...names(true, ['Ava', 'Ben', 'Cy', 'Dee'])),
    after: el('ul', {}, ...names(true, ['Dee', 'Ava', 'Ben', 'Cy'])),
  },
];

const TYPE_LABEL: Record<PatchType, string> = { replace: 'replace', props: 'update props', text: 'update text', insert: 'insert', remove: 'remove', move: 'move' };

export function VdomDiffWidget() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [step, setStep] = useState(0);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const { before, after, patches } = useMemo(() => {
    const b = build(scenario.before, 'old');
    const a = build(scenario.after, 'new');
    return { before: b, after: a, patches: diff(b, a) };
  }, [scenario]);

  const current = patches[step];
  const highlight = useMemo(() => {
    const map = new Map<string, PatchType>();
    if (!current) return map;
    const mark = (tree: VNode, id: string | undefined, deep: boolean) => {
      if (!id) return;
      const node = findNode(tree, id);
      if (!node) return;
      for (const nid of deep ? subtreeIds(node) : [node.id]) map.set(nid, current.type);
    };
    const deep = current.type === 'replace' || current.type === 'remove' || current.type === 'insert';
    mark(before, current.oldId, deep);
    mark(after, current.newId, deep);
    return map;
  }, [current, before, after]);

  const pick = (id: string) => {
    setScenarioId(id);
    setStep(0);
  };

  return (
    <figure className="widget">
      <figcaption className="widget-title">
        <GitCompareArrows size={16} /> Try it: diff two virtual trees
      </figcaption>
      <div className="widget-tabs" role="tablist" aria-label="Scenarios">
        {SCENARIOS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === scenarioId} className={`pill ${s.id === scenarioId ? 'is-active' : ''}`} onClick={() => pick(s.id)}>
            {s.title}
          </button>
        ))}
      </div>
      <p className="widget-note">{scenario.note}</p>
      <div className="vdom-trees">
        <div>
          <div className="widget-label">Previous render</div>
          <Tree node={before} highlight={highlight} />
        </div>
        <div>
          <div className="widget-label">Next render</div>
          <Tree node={after} highlight={highlight} />
        </div>
      </div>
      <div className="widget-label">
        DOM operations React will commit: <strong>{patches.length}</strong>
      </div>
      <ol className="patch-list">
        {patches.map((p, i) => (
          <li key={i}>
            <button type="button" className={`patch ${i === step ? 'is-active' : ''}`} onClick={() => setStep(i)}>
              <span className={`patch-tag tag-${p.type}`}>{TYPE_LABEL[p.type]}</span> {p.description}
            </button>
          </li>
        ))}
      </ol>
      {patches.length > 1 && (
        <div className="row gap-sm">
          <button type="button" className="btn btn-sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft size={14} /> Previous
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setStep((s) => Math.min(patches.length - 1, s + 1))} disabled={step >= patches.length - 1}>
            Next <ChevronRight size={14} />
          </button>
          <span className="muted small">
            Step {step + 1} of {patches.length}
          </span>
        </div>
      )}
      <Legend />
    </figure>
  );
}

function Tree({ node, highlight }: { node: VNode; highlight: Map<string, PatchType> }) {
  const tag = highlight.get(node.id);
  return (
    <ul className="vtree">
      <li>
        <span className={`vnode ${node.kind === 'text' ? 'is-text' : ''} ${tag ? `tag-${tag}` : ''}`}>{label(node)}</span>
        {node.kind === 'element' && node.children.length > 0 && node.children.map((c) => <Tree key={c.id} node={c} highlight={highlight} />)}
      </li>
    </ul>
  );
}

function Legend() {
  return (
    <div className="widget-legend small muted">
      {(['text', 'props', 'insert', 'move', 'remove', 'replace'] as PatchType[]).map((t) => (
        <span key={t}>
          <span className={`legend-swatch tag-${t}`} /> {TYPE_LABEL[t]}
        </span>
      ))}
    </div>
  );
}

