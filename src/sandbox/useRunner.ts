import { useCallback, useEffect, useRef, useState } from 'react';
import type { CodeLanguage, SandboxMode } from '../content/types.ts';
import type { TypeIssue } from '../editor/typecheck.ts';
import { buildSrcDoc } from './srcdoc.ts';
import { CompileError, compile } from './transform.ts';

export interface ConsoleLine {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  text: string;
}
export interface RunError {
  message: string;
  stack?: string;
  phase?: string;
}
export interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
  stack?: string;
}

export interface RunState {
  runId: string | null;
  kind: 'run' | 'check';
  phase: 'idle' | 'compiling' | 'running' | 'done';
  /** The document shown in the visible Preview tab. Only "Run" changes it. */
  previewDoc: string;
  previewKey: string;
  console: ConsoleLine[];
  errors: RunError[];
  results: TestResult[] | null;
  typeIssues: TypeIssue[];
  compileError: { message: string; line?: number; column?: number } | null;
  passed: boolean | null;
}

export interface RunOptions {
  kind: 'run' | 'check';
  userCode: string;
  testCode: string;
  lang: CodeLanguage;
  mode: SandboxMode;
  theme: 'light' | 'dark';
  typeIssues?: TypeIssue[];
}

const initial: RunState = {
  runId: null,
  kind: 'run',
  phase: 'idle',
  previewDoc: '',
  previewKey: '',
  console: [],
  errors: [],
  results: null,
  typeIssues: [],
  compileError: null,
  passed: null,
};

const TIMEOUT_MS = 25_000;

function computePassed(s: RunState): boolean | null {
  if (s.kind !== 'check') return null;
  if (s.compileError) return false;
  const typeErrors = s.typeIssues.length > 0;
  if (!s.results) return false;
  return s.results.every((r) => r.status === 'pass') && !typeErrors;
}

export function useRunner() {
  const [state, setState] = useState<RunState>(initial);
  const timeoutRef = useRef<number | null>(null);
  // "Check" runs in its own off-screen iframe. Unlike the Preview iframe (display:none while the
  // Tests tab is showing) it is always laid out, so focus, scrolling and layout APIs work in tests.
  const checkFrameRef = useRef<HTMLIFrameElement | null>(null);
  const removeCheckFrame = useCallback(() => {
    checkFrameRef.current?.remove();
    checkFrameRef.current = null;
  }, []);

  const finish = useCallback((runId: string, extraError?: RunError) => {
    setState((s) => {
      if (s.runId !== runId || s.phase === 'done') return s;
      removeCheckFrame();
      const next: RunState = { ...s, phase: 'done', errors: extraError ? [...s.errors, extraError] : s.errors };
      if (next.kind === 'check' && !next.results) {
        next.results = [{ name: 'Tests did not run', status: 'fail', message: extraError?.message ?? next.errors[0]?.message ?? 'The sandbox did not report any results.' }];
      }
      next.passed = computePassed(next);
      return next;
    });
  }, [removeCheckFrame]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { __lrt?: boolean; runId?: string; type?: string } & Record<string, unknown>;
      if (!data || !data.__lrt || !data.runId) return;
      const runId = data.runId;
      switch (data.type) {
        case 'console':
          setState((s) => (s.runId === runId ? { ...s, console: [...s.console, { level: data.level as ConsoleLine['level'], text: String(data.text) }] } : s));
          break;
        case 'error':
          setState((s) => (s.runId === runId ? { ...s, errors: [...s.errors, { message: String(data.message), stack: data.stack as string | undefined, phase: data.phase as string | undefined }] } : s));
          break;
        case 'results':
          setState((s) => (s.runId === runId ? { ...s, results: data.results as TestResult[] } : s));
          break;
        case 'done':
          finish(runId);
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [finish]);

  const run = useCallback(
    (opts: RunOptions) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const typeIssues = opts.typeIssues ?? [];
      let userCode = '';
      let testCode = '';
      try {
        userCode = compile(opts.userCode, opts.lang);
        if (opts.kind === 'check' && opts.testCode) {
          const testLang: CodeLanguage = opts.lang === 'tsx' || opts.lang === 'jsx' ? 'tsx' : 'ts';
          testCode = compile(opts.testCode, testLang);
        }
      } catch (e) {
        const err = e as CompileError;
        removeCheckFrame();
        setState((prev) => {
          const s: RunState = {
            ...initial,
            previewDoc: prev.previewDoc,
            previewKey: prev.previewKey,
            runId,
            kind: opts.kind,
            phase: 'done',
            typeIssues,
            compileError: { message: err.message, line: err.line, column: err.column },
            results: opts.kind === 'check' ? [{ name: 'Code must compile before tests can run', status: 'fail', message: err.message + (err.line ? ` (line ${err.line})` : '') }] : null,
          };
          s.passed = computePassed(s);
          return s;
        });
        return;
      }
      const srcDoc = buildSrcDoc({ runId, mode: opts.mode, userCode, testCode, theme: opts.theme });
      removeCheckFrame();
      if (opts.kind === 'check') {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals');
        frame.setAttribute('aria-hidden', 'true');
        frame.tabIndex = -1;
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:700px;border:0';
        frame.srcdoc = srcDoc;
        document.body.appendChild(frame);
        checkFrameRef.current = frame;
      }
      setState((prev) => ({
        ...initial,
        previewDoc: opts.kind === 'run' ? srcDoc : prev.previewDoc,
        previewKey: opts.kind === 'run' ? runId : prev.previewKey,
        runId,
        kind: opts.kind,
        phase: 'running',
        typeIssues,
      }));
      timeoutRef.current = window.setTimeout(() => finish(runId, { message: `The sandbox did not finish within ${TIMEOUT_MS / 1000}s. Check for infinite loops or a network issue loading React.` }), TIMEOUT_MS);
    },
    [finish, removeCheckFrame],
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    removeCheckFrame();
    setState(initial);
  }, [removeCheckFrame]);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      removeCheckFrame();
    },
    [removeCheckFrame],
  );

  return { state, run, reset };
}
