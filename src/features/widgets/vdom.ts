/**
 * A deliberately tiny virtual DOM and diff, used by the lesson visualisers.
 * It follows React's two heuristics: different type => replace the subtree;
 * same type => update props and diff children (by key when keys are given).
 */

export interface VText {
  kind: 'text';
  id: string;
  text: string;
}

export interface VElement {
  kind: 'element';
  id: string;
  type: string;
  key?: string;
  props: Record<string, string>;
  children: VNode[];
}

export type VNode = VText | VElement;

export type PatchType = 'replace' | 'props' | 'text' | 'insert' | 'remove' | 'move';

export interface Patch {
  type: PatchType;
  /** Node in the old tree this patch touches (if any). */
  oldId?: string;
  /** Node in the new tree this patch touches (if any). */
  newId?: string;
  description: string;
}

// ---- building trees ---------------------------------------------------------

type Child = VNodeInput | string;
interface VNodeInput {
  type: string;
  key?: string;
  props?: Record<string, string>;
  children?: Child[];
}

/** Tiny hyperscript: el('li', { key: 'a' }, 'Ava'). `key` is pulled out of props. */
export function el(type: string, props: Record<string, string> = {}, ...children: Child[]): VNodeInput {
  const { key, ...rest } = props;
  return { type, key, props: rest, children };
}

/** Assign stable ids (by path) so the UI can highlight nodes. */
export function build(input: Child, prefix: string, path = '0'): VNode {
  const id = `${prefix}:${path}`;
  if (typeof input === 'string') return { kind: 'text', id, text: input };
  return {
    kind: 'element',
    id,
    type: input.type,
    key: input.key,
    props: input.props ?? {},
    children: (input.children ?? []).map((c, i) => build(c, prefix, `${path}.${i}`)),
  };
}

export function label(node: VNode): string {
  if (node.kind === 'text') return `"${node.text}"`;
  const attrs = [node.key !== undefined ? `key="${node.key}"` : '', ...Object.entries(node.props).map(([k, v]) => (v === '' ? k : `${k}="${v}"`))].filter(Boolean);
  const isComponent = /^[A-Z]/.test(node.type);
  return `<${node.type}${attrs.length ? ' ' + attrs.join(' ') : ''}${isComponent && node.children.length === 0 ? ' /' : ''}>`;
}

// ---- diffing ------------------------------------------------------------------

export function diff(oldNode: VNode | undefined, newNode: VNode | undefined): Patch[] {
  if (!oldNode && newNode) return [{ type: 'insert', newId: newNode.id, description: `Insert ${label(newNode)}` }];
  if (oldNode && !newNode) return [{ type: 'remove', oldId: oldNode.id, description: `Remove ${label(oldNode)} and everything inside it` }];
  if (!oldNode || !newNode) return [];

  if (oldNode.kind !== newNode.kind || (oldNode.kind === 'element' && newNode.kind === 'element' && oldNode.type !== newNode.type)) {
    return [
      {
        type: 'replace',
        oldId: oldNode.id,
        newId: newNode.id,
        description: `Type changed: destroy ${label(oldNode)} (and all state below it), build ${label(newNode)} from scratch`,
      },
    ];
  }

  if (oldNode.kind === 'text' && newNode.kind === 'text') {
    return oldNode.text === newNode.text ? [] : [{ type: 'text', oldId: oldNode.id, newId: newNode.id, description: `Set text ${label(oldNode)} → ${label(newNode)}` }];
  }

  const o = oldNode as VElement;
  const n = newNode as VElement;
  const patches: Patch[] = [];
  const changed: string[] = [];
  for (const [k, v] of Object.entries(n.props)) if (o.props[k] !== v) changed.push(`${k}="${v}"`);
  for (const k of Object.keys(o.props)) if (!(k in n.props)) changed.push(`remove ${k}`);
  if (changed.length) patches.push({ type: 'props', oldId: o.id, newId: n.id, description: `Update <${n.type}>: ${changed.join(', ')}` });

  return [...patches, ...diffChildren(o.children, n.children)];
}

function diffChildren(oldChildren: VNode[], newChildren: VNode[]): Patch[] {
  const keyed = (list: VNode[]) => list.length > 0 && list.every((c) => c.kind === 'element' && c.key !== undefined);
  if (!(keyed(oldChildren) && keyed(newChildren))) {
    // No keys: compare by position.
    const patches: Patch[] = [];
    const len = Math.max(oldChildren.length, newChildren.length);
    for (let i = 0; i < len; i++) patches.push(...diff(oldChildren[i], newChildren[i]));
    return patches;
  }

  // Keys: match children by key, then detect moves the way React does.
  const keyOf = (c: VNode) => (c as VElement).key as string;
  const oldIndex = new Map(oldChildren.map((c, i) => [keyOf(c), i]));
  const newKeys = new Set(newChildren.map(keyOf));
  const patches: Patch[] = [];
  let lastPlacedIndex = 0;
  newChildren.forEach((child, newPos) => {
    const idx = oldIndex.get(keyOf(child));
    if (idx === undefined) {
      patches.push({ type: 'insert', newId: child.id, description: `Insert ${label(child)} at position ${newPos}` });
      return;
    }
    const match = oldChildren[idx];
    if (idx < lastPlacedIndex) {
      patches.push({ type: 'move', oldId: match.id, newId: child.id, description: `Move key "${keyOf(child)}" (was at ${idx}, now at ${newPos})` });
    } else {
      lastPlacedIndex = idx;
    }
    patches.push(...diff(match, child));
  });
  for (const c of oldChildren) if (!newKeys.has(keyOf(c))) patches.push({ type: 'remove', oldId: c.id, description: `Remove ${label(c)}` });
  return patches;
}

/** Ids of every node in a tree (used to mark a whole replaced or removed subtree). */
export function subtreeIds(node: VNode): string[] {
  return node.kind === 'text' ? [node.id] : [node.id, ...node.children.flatMap(subtreeIds)];
}

export function findNode(node: VNode, id: string): VNode | undefined {
  if (node.id === id) return node;
  if (node.kind === 'text') return undefined;
  for (const c of node.children) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return undefined;
}
