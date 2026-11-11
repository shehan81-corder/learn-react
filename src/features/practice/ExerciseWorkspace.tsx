import { useCallback, useEffect, useRef, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';
import { CheckCheck, ChevronDown, ChevronUp, Loader2, Play, RotateCcw } from 'lucide-react';
import type { Exercise } from '../../content/types.ts';
import { Markdown } from '../../components/Markdown.tsx';
import { SplitPane } from '../../components/SplitPane.tsx';
import { typecheck } from '../../editor/typecheck.ts';
import { setupMonaco } from '../../editor/monaco.ts';
import { useRunner } from '../../sandbox/useRunner.ts';
import { progress, useProgress } from '../../state/progress.ts';
import { useTheme } from '../../state/theme.ts';
import { useDebouncedCallback } from '../../lib/hooks.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { OutputPanel } from './OutputPanel.tsx';

interface Props {
  exercise: Exercise;
  onPassed?: () => void;
}

export function ExerciseWorkspace({ exercise, onPassed }: Props) {
  const state = useProgress();
  const [theme] = useTheme();
  const saved = state.exercises[exercise.id];
  const [code, setCode] = useState<string>(() => state.drafts[exercise.id] ?? exercise.starter);
  const [promptOpen, setPromptOpen] = useState(true);
  const [checking, setChecking] = useState(false);
  const [hintsShown, setHintsShown] = useState(saved?.hintsUsed ?? 0);
  const [confirmReset, setConfirmReset] = useState(false);
  const monacoRef = useRef<Monaco | null>(null);
  const { state: run, run: start, reset: resetRun } = useRunner();
  const recordedRunRef = useRef<string | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const saveDraft = useDebouncedCallback((id: string, value: string) => {
    if (value === exercise.starter) progress.clearDraft(id);
    else progress.saveDraft(id, value);
  }, 400);

  const onChange = useCallback(
    (value: string) => {
      setCode(value);
      saveDraft(exercise.id, value);
    },
    [exercise.id, saveDraft],
  );

  const doRun = useCallback(() => {
    start({ kind: 'run', userCode: codeRef.current, testCode: '', lang: exercise.language, mode: exercise.mode, theme });
  }, [start, exercise.language, exercise.mode, theme]);

  const doCheck = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const monaco = monacoRef.current ?? (await setupMonaco());
      const typeIssues = await typecheck(monaco, exercise.id, exercise.language, codeRef.current, exercise.typeTests);
      start({ kind: 'check', userCode: codeRef.current, testCode: exercise.tests, lang: exercise.language, mode: exercise.mode, theme, typeIssues });
    } finally {
      setChecking(false);
    }
  }, [checking, exercise, start, theme]);

  // Record the attempt once per completed check.
  useEffect(() => {
    if (run.kind !== 'check' || run.phase !== 'done' || !run.runId || recordedRunRef.current === run.runId) return;
    recordedRunRef.current = run.runId;
    progress.recordAttempt(exercise.id, run.passed === true);
    if (run.passed) onPassed?.();
  }, [run.kind, run.phase, run.runId, run.passed, exercise.id, onPassed]);

  useEffect(() => {
    resetRun();
    setConfirmReset(false);
  }, [exercise.id, resetRun]);

  const resetCode = () => {
    setCode(exercise.starter);
    progress.clearDraft(exercise.id);
    setConfirmReset(false);
    resetRun();
  };

  const busy = checking || run.phase === 'running';
  const status = saved?.status;

  return (
    <div className="workspace">
      <div className={`ws-prompt ${promptOpen ? '' : 'is-collapsed'}`}>
        <button type="button" className="ws-prompt-toggle" onClick={() => setPromptOpen((o) => !o)} aria-expanded={promptOpen}>
          <span className="ws-kind">{exercise.kind === 'challenge' ? 'Challenge' : `Practice ${exercise.index}`}</span>
          <strong>{exercise.title}</strong>
          <span className="muted">· {exercise.minutes} min</span>
          {status === 'passed' && <span className="badge badge-success">passed</span>}
          {promptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {promptOpen && <Markdown className="ws-prompt-body">{exercise.prompt}</Markdown>}
      </div>

      <div className="ws-toolbar">
        <button type="button" className="btn btn-sm" onClick={doRun} disabled={busy} title="Run without tests (⌘/Ctrl+Shift+Enter)">
          <Play size={14} /> Run
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={doCheck} disabled={busy} title="Run tests (⌘/Ctrl+Enter)">
          {busy ? <Loader2 size={14} className="spin" /> : <CheckCheck size={14} />} Check
        </button>
        <span className="flex-1" />
        {confirmReset ? (
          <span className="row gap-sm">
            <span className="muted small">Discard your code?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={resetCode}>
              Reset
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirmReset(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)} title="Reset to the starter code">
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      <div className="ws-body">
        <SplitPane
          direction="vertical"
          storageKey="lrt.split.editor"
          defaultRatio={0.55}
          min={0.2}
          max={0.85}
          first={
            <CodeEditor
              id={exercise.id}
              language={exercise.language}
              value={code}
              onChange={onChange}
              onCheck={() => void doCheck()}
              onRun={doRun}
              onReady={(monaco) => {
                monacoRef.current = monaco;
              }}
            />
          }
          second={
            <OutputPanel
              exercise={exercise}
              run={run}
              solutionRevealed={!!saved?.solutionRevealed}
              onRevealSolution={() => progress.revealSolution(exercise.id)}
              onLoadSolution={() => {
                setCode(exercise.solution);
                progress.saveDraft(exercise.id, exercise.solution);
              }}
              hintsShown={hintsShown}
              onShowHint={() => {
                const next = Math.min(hintsShown + 1, exercise.hints.length);
                setHintsShown(next);
                progress.useHint(exercise.id, next);
              }}
            />
          }
        />
      </div>
    </div>
  );
}
