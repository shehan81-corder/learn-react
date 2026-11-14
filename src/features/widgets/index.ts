import type { ComponentType } from 'react';
import { DomTreeWidget } from './DomTreeWidget.tsx';
import { FiberWidget } from './FiberWidget.tsx';
import { JsxWidget } from './JsxWidget.tsx';
import { KeysWidget } from './KeysWidget.tsx';
import { VdomDiffWidget } from './VdomDiffWidget.tsx';

/** Widgets that lesson Markdown can embed with a ```widget fenced block. */
export const lessonWidgets: Record<string, ComponentType> = {
  'dom-tree': DomTreeWidget,
  'jsx-to-object': JsxWidget,
  'vdom-diff': VdomDiffWidget,
  'keys-demo': KeysWidget,
  'fiber-loop': FiberWidget,
};
