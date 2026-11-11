import harnessSource from './harness.js?raw';
import { REACT_URLS } from './transform.ts';
import type { SandboxMode } from '../content/types.ts';

export interface SandboxConfig {
  runId: string;
  mode: SandboxMode;
  userCode: string;
  testCode: string;
  theme: 'light' | 'dark';
}

const safeJson = (v: unknown) => JSON.stringify(v).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

export function buildSrcDoc(cfg: SandboxConfig): string {
  const config = safeJson({
    runId: cfg.runId,
    mode: cfg.mode,
    userCode: cfg.userCode,
    testCode: cfg.testCode,
    react: { react: REACT_URLS.react, domClient: REACT_URLS.reactDomClient },
  });
  // Use replacer functions: a plain string would interpret `$&`, `$'` etc. inside the learner's code.
  const harness = harnessSource.replace('__CONFIG__;', () => `${config};`).replace(/^\/\* global __CONFIG__ \*\/\n/, () => '');
  const dark = cfg.theme === 'dark';
  return `<!doctype html>
<html data-theme="${cfg.theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: ${cfg.theme}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: ${dark ? '#e6edf3' : '#1f2937'};
    background: ${dark ? '#0d1117' : '#ffffff'};
    padding: 16px;
  }
  button, input, select, textarea { font: inherit; }
  button { cursor: pointer; }
  input, select, textarea { padding: 6px 8px; border: 1px solid ${dark ? '#30363d' : '#d1d5db'}; border-radius: 6px; background: ${dark ? '#161b22' : '#fff'}; color: inherit; }
  button { padding: 6px 12px; border: 1px solid ${dark ? '#30363d' : '#d1d5db'}; border-radius: 6px; background: ${dark ? '#21262d' : '#f3f4f6'}; color: inherit; }
  button:hover { background: ${dark ? '#30363d' : '#e5e7eb'}; }
  table { border-collapse: collapse; } td, th { border: 1px solid ${dark ? '#30363d' : '#e5e7eb'}; padding: 4px 8px; text-align: left; }
  ul { padding-left: 20px; }
  #root.empty::before { content: "Nothing rendered. Use console.log() to see output in the Console tab."; opacity: .6; font-style: italic; }
  #test-root { position: absolute; left: -10000px; top: 0; width: 800px; }
</style>
</head>
<body>
<div id="root"></div>
<div id="test-root" aria-hidden="true"></div>
<script type="module">
${harness}
</script>
</body>
</html>`;
}
