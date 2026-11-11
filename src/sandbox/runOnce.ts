import type { CodeLanguage, SandboxMode } from '../content/types.ts';
import type { ConsoleLine, RunError, TestResult } from './useRunner.ts';
import { buildSrcDoc } from './srcdoc.ts';
import { compile } from './transform.ts';

export interface OnceResult {
  ok: boolean;
  compileError?: string;
  results: TestResult[];
  errors: RunError[];
  console: ConsoleLine[];
  timedOut: boolean;
}

/** Run code + tests in a hidden iframe and resolve when the sandbox reports done. */
export function runOnce(opts: { userCode: string; testCode: string; lang: CodeLanguage; mode: SandboxMode; timeoutMs?: number }): Promise<OnceResult> {
  return new Promise((resolve) => {
    const runId = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const out: OnceResult = { ok: false, results: [], errors: [], console: [], timedOut: false };
    let userCode: string;
    let testCode: string;
    try {
      userCode = compile(opts.userCode, opts.lang);
      testCode = compile(opts.testCode, opts.lang === 'tsx' || opts.lang === 'jsx' ? 'tsx' : 'ts');
    } catch (e) {
      out.compileError = (e as Error).message;
      resolve(out);
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals');
    iframe.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px;border:0';
    let timer = 0;
    const finish = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      iframe.remove();
      out.ok = !out.compileError && out.results.length > 0 && out.results.every((r) => r.status === 'pass');
      resolve(out);
    };
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { __lrt?: boolean; runId?: string; type?: string } & Record<string, unknown>;
      if (!d || !d.__lrt || d.runId !== runId) return;
      if (d.type === 'console') out.console.push({ level: d.level as ConsoleLine['level'], text: String(d.text) });
      else if (d.type === 'error') out.errors.push({ message: String(d.message), stack: d.stack as string | undefined, phase: d.phase as string | undefined });
      else if (d.type === 'results') out.results = d.results as TestResult[];
      else if (d.type === 'done') finish();
    };
    window.addEventListener('message', onMessage);
    timer = window.setTimeout(() => {
      out.timedOut = true;
      finish();
    }, opts.timeoutMs ?? 30000);
    iframe.srcdoc = buildSrcDoc({ runId, mode: opts.mode, userCode, testCode, theme: 'light' });
    document.body.appendChild(iframe);
  });
}
