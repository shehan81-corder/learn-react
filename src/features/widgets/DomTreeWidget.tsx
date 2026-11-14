import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';

const SAMPLE = `<div id="app">
  <h1>Contacts</h1>
  <ul class="list">
    <li>Ava <button>Like</button></li>
    <li>Ben</li>
  </ul>
  <!-- a comment is a node too -->
</div>`;

interface TreeNode {
  id: number;
  kind: 'element' | 'text' | 'comment';
  label: string;
  whitespace: boolean;
  children: TreeNode[];
}

/**
 * Parses HTML with DOMParser (which never runs scripts) and shows the node
 * tree the browser builds from it.
 */
function toTree(html: string): { root: TreeNode | null; counts: Record<string, number> } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const counts = { element: 0, text: 0, whitespace: 0, comment: 0 };
  let next = 0;
  const walk = (node: Node): TreeNode | null => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const elNode = node as Element;
      counts.element++;
      const attrs = Array.from(elNode.attributes).map((a) => ` ${a.name}="${a.value}"`).join('');
      return { id: next++, kind: 'element', label: `<${elNode.tagName.toLowerCase()}${attrs}>`, whitespace: false, children: Array.from(node.childNodes).map(walk).filter((n): n is TreeNode => !!n) };
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const ws = text.trim() === '';
      if (ws) counts.whitespace++;
      else counts.text++;
      return { id: next++, kind: 'text', label: ws ? `whitespace (${JSON.stringify(text).slice(1, -1).replace(/ /g, '·')})` : `"${text}"`, whitespace: ws, children: [] };
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      counts.comment++;
      return { id: next++, kind: 'comment', label: `<!--${node.textContent}-->`, whitespace: false, children: [] };
    }
    return null;
  };
  const body = doc.body;
  const root: TreeNode = { id: next++, kind: 'element', label: '<body>', whitespace: false, children: Array.from(body.childNodes).map(walk).filter((n): n is TreeNode => !!n) };
  return { root, counts };
}

export function DomTreeWidget() {
  const [html, setHtml] = useState(SAMPLE);
  const [showWs, setShowWs] = useState(true);
  const { root, counts } = useMemo(() => toTree(html), [html]);

  return (
    <figure className="widget">
      <figcaption className="widget-title">
        <Network size={16} /> Try it: HTML in, DOM tree out
      </figcaption>
      <p className="widget-note">Edit the HTML. The tree on the right is what the browser builds. Try removing a closing tag, or putting a &lt;div&gt; inside a &lt;p&gt;: the parser fixes your HTML, so the DOM is not always what you wrote.</p>
      <div className="dom-widget">
        <textarea className="widget-code" value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} aria-label="HTML source" rows={10} />
        <div className="dom-tree-view">
          {root && <DomNode node={root} showWs={showWs} />}
        </div>
      </div>
      <div className="row gap wrap small">
        <label className="row gap-sm">
          <input type="checkbox" checked={showWs} onChange={(e) => setShowWs(e.target.checked)} /> Show whitespace text nodes
        </label>
        <span className="muted">
          {counts.element} elements · {counts.text} text · {counts.whitespace} whitespace text · {counts.comment} comments
        </span>
      </div>
    </figure>
  );
}

function DomNode({ node, showWs }: { node: TreeNode; showWs: boolean }) {
  const children = node.children.filter((c) => showWs || !c.whitespace);
  return (
    <ul className="vtree">
      <li>
        <span className={`vnode node-${node.kind} ${node.whitespace ? 'is-ws' : ''}`}>{node.label}</span>
        {children.map((c) => (
          <DomNode key={c.id} node={c} showWs={showWs} />
        ))}
      </li>
    </ul>
  );
}
