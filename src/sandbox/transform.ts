import { transform } from 'sucrase';
import type { CodeLanguage } from '../content/types.ts';

export const REACT_VERSION = '19.3.1';
const ESM = 'https://esm.sh';

export const REACT_URLS = {
  react: `${ESM}/react@${REACT_VERSION}`,
  jsxRuntime: `${ESM}/react@${REACT_VERSION}/jsx-runtime`,
  reactDom: `${ESM}/react-dom@${REACT_VERSION}?deps=react@${REACT_VERSION}`,
  reactDomClient: `${ESM}/react-dom@${REACT_VERSION}/client?deps=react@${REACT_VERSION}`,
};

export class CompileError extends Error {
  line?: number;
  column?: number;
  constructor(message: string, line?: number, column?: number) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

/** Resolve a bare import specifier to a CDN URL the sandbox iframe can load. */
export function resolveSpecifier(spec: string): string {
  if (spec === 'react') return REACT_URLS.react;
  if (spec === 'react/jsx-runtime' || spec === 'react/jsx-dev-runtime') return REACT_URLS.jsxRuntime;
  if (spec === 'react-dom') return REACT_URLS.reactDom;
  if (spec === 'react-dom/client') return REACT_URLS.reactDomClient;
  if (spec.startsWith('react/')) return `${ESM}/react@${REACT_VERSION}/${spec.slice('react/'.length)}`;
  if (spec.startsWith('react-dom/')) return `${ESM}/react-dom@${REACT_VERSION}/${spec.slice('react-dom/'.length)}?deps=react@${REACT_VERSION}`;
  return `${ESM}/${spec}?deps=react@${REACT_VERSION},react-dom@${REACT_VERSION}`;
}

const IMPORT_RE = /((?:^|[\s;])(?:import|export)\s*(?:[\w*\s{},$]*?\s*from\s*)?|import\s*\(\s*)(["'])([^"'\n]+)\2/gm;

export function rewriteImports(code: string): string {
  return code.replace(IMPORT_RE, (full, prefix: string, quote: string, spec: string) => {
    if (/^(https?:|data:|blob:|\.|\/)/.test(spec)) return full;
    return `${prefix}${quote}${resolveSpecifier(spec)}${quote}`;
  });
}

function transformsFor(lang: CodeLanguage): Array<'typescript' | 'jsx'> {
  switch (lang) {
    case 'ts':
      return ['typescript'];
    case 'tsx':
      return ['typescript', 'jsx'];
    case 'jsx':
      return ['jsx'];
    default:
      return [];
  }
}

/** Compile TS/TSX/JSX to plain ESM JavaScript the browser can run. */
export function compile(code: string, lang: CodeLanguage): string {
  try {
    const transforms = transformsFor(lang);
    const out = transforms.length
      ? transform(code, {
          transforms,
          jsxRuntime: 'automatic',
          production: true,
          disableESTransforms: true,
          keepUnusedImports: false,
        }).code
      : code;
    return rewriteImports(out);
  } catch (e) {
    const err = e as Error & { loc?: { line: number; column: number } };
    const m = /\((\d+):(\d+)\)/.exec(err.message);
    const line = err.loc?.line ?? (m ? Number(m[1]) : undefined);
    const column = err.loc?.column ?? (m ? Number(m[2]) : undefined);
    throw new CompileError(err.message.replace(/\s*\(\d+:\d+\)\s*$/, ''), line, column);
  }
}
