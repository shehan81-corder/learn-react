import type { Monaco } from '@monaco-editor/react';
import type { CodeLanguage } from '../content/types.ts';
import { reactTypesReady } from './monaco.ts';

export interface TypeIssue {
  line: number;
  column: number;
  message: string;
  code: number;
  inTypeTests: boolean;
}

interface Diag {
  start?: number;
  length?: number;
  messageText: string | { messageText: string; next?: Diag['messageText'][] };
  category: number;
  code: number;
}

function flatten(msg: Diag['messageText']): string {
  if (typeof msg === 'string') return msg;
  const parts = [msg.messageText];
  if (msg.next) for (const n of msg.next) parts.push(flatten(n));
  return parts.join(' ');
}

const TYPE_TEST_BANNER = '\n\n// ---------- type checks (read-only) ----------\n';

/**
 * Type-check the learner's code (plus optional type assertions) with Monaco's
 * TypeScript worker and return only errors.
 */
export async function typecheck(monaco: Monaco, id: string, lang: CodeLanguage, code: string, typeTests?: string): Promise<TypeIssue[]> {
  if (lang !== 'ts' && lang !== 'tsx') return [];
  await reactTypesReady();
  const uri = monaco.Uri.parse(`file:///typecheck/${id}.${lang}`);
  const full = typeTests ? code + TYPE_TEST_BANNER + typeTests : code;
  const existing = monaco.editor.getModel(uri);
  const model = existing ?? monaco.editor.createModel(full, 'typescript', uri);
  if (existing) existing.setValue(full);
  const boundary = typeTests ? code.length + TYPE_TEST_BANNER.length : Number.POSITIVE_INFINITY;

  try {
    const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
    const client = await getWorker(uri);
    const [syntactic, semantic] = await Promise.all([client.getSyntacticDiagnostics(uri.toString()), client.getSemanticDiagnostics(uri.toString())]);
    const ignore = new Set([2307, 7016, 6133, 6192, 6196]);
    return [...syntactic, ...semantic]
      .filter((d: Diag) => d.category === 1 && !ignore.has(d.code))
      .map((d: Diag) => {
        const pos = model.getPositionAt(d.start ?? 0);
        return {
          line: pos.lineNumber,
          column: pos.column,
          message: flatten(d.messageText),
          code: d.code,
          inTypeTests: (d.start ?? 0) >= boundary,
        };
      });
  } catch (e) {
    console.warn('typecheck failed', e);
    return [];
  } finally {
    model.dispose();
  }
}
