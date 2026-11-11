import { loader, type Monaco } from '@monaco-editor/react';
import { HARNESS_GLOBAL_TYPES, REACT_QUERY_TYPES, REACT_ROUTER_TYPES } from './libTypes.ts';

loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.57.0/min/vs' },
});

let configured: Promise<Monaco> | null = null;
let reactTypes: Promise<void> = Promise.resolve();

/** Resolves once React's type definitions are registered with Monaco. */
export function reactTypesReady(): Promise<void> {
  return reactTypes;
}

/** Load Monaco once and teach its TypeScript service about React. */
export function setupMonaco(): Promise<Monaco> {
  if (configured) return configured;
  configured = (async () => {
    const monaco = await loader.init();
    const ts = monaco.languages.typescript;

    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'react',
      allowJs: true,
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      lib: ['es2020', 'dom', 'dom.iterable'],
      typeRoots: ['node_modules/@types'],
    });
    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      // 2307 / 7016: modules we load from esm.sh at runtime but have no types for in the editor.
      diagnosticCodesToIgnore: [2307, 7016, 6133, 6192, 6196],
    });
    ts.typescriptDefaults.setEagerModelSync(true);
    ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
    ts.javascriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    });

    // Load React's type definitions lazily so the editor is usable immediately.
    reactTypes = loadReactTypes(monaco);
    return monaco;
  })();
  return configured;
}

async function loadReactTypes(monaco: Monaco) {
  try {
    const [react, reactGlobal, jsxRuntime, cssType, reactDom, reactDomClient] = await Promise.all([
      import('../../node_modules/@types/react/index.d.ts?raw'),
      import('../../node_modules/@types/react/global.d.ts?raw'),
      import('../../node_modules/@types/react/jsx-runtime.d.ts?raw'),
      import('../../node_modules/csstype/index.d.ts?raw'),
      import('../../node_modules/@types/react-dom/index.d.ts?raw'),
      import('../../node_modules/@types/react-dom/client.d.ts?raw'),
    ]);
    const libs: Array<[string, string]> = [
      ['file:///node_modules/@types/react/index.d.ts', react.default],
      ['file:///node_modules/@types/react/global.d.ts', reactGlobal.default],
      ['file:///node_modules/@types/react/jsx-runtime.d.ts', jsxRuntime.default],
      ['file:///node_modules/@types/react/jsx-dev-runtime.d.ts', jsxRuntime.default],
      ['file:///node_modules/csstype/index.d.ts', cssType.default],
      ['file:///node_modules/@types/react-dom/index.d.ts', reactDom.default],
      ['file:///node_modules/@types/react-dom/client.d.ts', reactDomClient.default],
      [
        'file:///node_modules/@types/react/package.json',
        JSON.stringify({ name: '@types/react', types: 'index.d.ts', exports: { '.': { types: './index.d.ts' }, './jsx-runtime': { types: './jsx-runtime.d.ts' }, './jsx-dev-runtime': { types: './jsx-dev-runtime.d.ts' } } }),
      ],
      ['file:///node_modules/@types/react-dom/package.json', JSON.stringify({ name: '@types/react-dom', types: 'index.d.ts' })],
      ['file:///node_modules/csstype/package.json', JSON.stringify({ name: 'csstype', types: 'index.d.ts' })],
    ];
    for (const [path, content] of libs) monaco.languages.typescript.typescriptDefaults.addExtraLib(content, path);
    // Simplified typings for libraries the exercises load from a CDN.
    const ts = monaco.languages.typescript.typescriptDefaults;
    ts.addExtraLib(REACT_ROUTER_TYPES, 'file:///node_modules/@types/exercise-libs/react-router-dom.d.ts');
    ts.addExtraLib(REACT_QUERY_TYPES, 'file:///node_modules/@types/exercise-libs/tanstack-react-query.d.ts');
    ts.addExtraLib(HARNESS_GLOBAL_TYPES, 'file:///node_modules/@types/exercise-libs/harness-globals.d.ts');
  } catch (e) {
    console.warn('Could not load React type definitions for the editor', e);
  }
}

export function languageFor(lang: 'js' | 'jsx' | 'ts' | 'tsx'): 'javascript' | 'typescript' {
  return lang === 'ts' || lang === 'tsx' ? 'typescript' : 'javascript';
}

export function modelPath(id: string, lang: 'js' | 'jsx' | 'ts' | 'tsx'): string {
  return `file:///exercises/${id}.${lang}`;
}
