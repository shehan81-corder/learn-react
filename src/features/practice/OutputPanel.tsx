import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, FlaskConical, Lightbulb, Loader2, TerminalSquare, XCircle } from 'lucide-react';
import type { Exercise } from '../../content/types.ts';
import type { RunState } from '../../sandbox/useRunner.ts';
import { Markdown } from '../../components/Markdown.tsx';

type Tab = 'preview' | 'tests' | 'console' | 'solution';

interface Props {
  exercise: Exercise;
  run: RunState;
  solutionRevealed: boolean;
  onRevealSolution: () => void;
  onLoadSolution: () => void;
  hintsShown: number;
  onShowHint: () => void;
}

export function OutputPanel({ exercise, run, solutionRevealed, onRevealSolution, onLoadSolution, hintsShown, onShowHint }: Props) {
  const [tab, setTab] = useState<Tab>('preview');

  // Jump to the most useful tab when a run finishes.
  useEffect(() => {
    if (run.phase === 'idle') return;
    if (run.kind === 'check') setTab('tests');
    else if (run.compileError || (exercise.mode === 'script' && run.phase === 'done')) setTab('console');
    else setTab('preview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.runId, run.phase === 'done']);

  useEffect(() => setTab('preview'), [exercise.id]);

  const failures = (run.results ?? []).filter((r) => r.status === 'fail').length + run.typeIssues.length;
  const total = (run.results ?? []).length + run.typeIssues.length;
  const consoleCount = run.console.length + run.errors.length + (run.compileError ? 1 : 0);
  const running = run.phase === 'running' || run.phase === 'compiling';

  return (
    <div className="output">
      <div className="output-tabs" role="tablist">
        <TabButton active={tab === 'preview'} onClick={() => setTab('preview')} icon={<Eye size={14} />} label="Preview" />
        <TabButton
          active={tab === 'tests'}
          onClick={() => setTab('tests')}
          icon={running && run.kind === 'check' ? <Loader2 size={14} className="spin" /> : <FlaskConical size={14} />}
          label="Tests"
          badge={run.kind === 'check' && run.phase === 'done' ? (run.passed ? 'pass' : `${failures}/${total}`) : undefined}
          badgeTone={run.passed ? 'success' : failures ? 'danger' : undefined}
        />
        <TabButton active={tab === 'console'} onClick={() => setTab('console')} icon={<TerminalSquare size={14} />} label="Console" badge={consoleCount ? String(consoleCount) : undefined} badgeTone={run.errors.length || run.compileError ? 'danger' : undefined} />
        <TabButton active={tab === 'solution'} onClick={() => setTab('solution')} icon={<Lightbulb size={14} />} label="Hints & solution" />
      </div>

      <div className="output-body">
        <div className="output-pane" hidden={tab !== 'preview'}>
          {run.previewDoc ? (
            <iframe key={run.previewKey || 'empty'} className="preview-frame" title="Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={run.previewDoc} />
          ) : (
            <div className="empty-state">
              <Eye size={28} />
              <p>
                Press <kbd>Run</kbd> (⌘/Ctrl + Shift + Enter) to see your code, or <kbd>Check</kbd> (⌘/Ctrl + Enter) to run the tests.
              </p>
            </div>
          )}
          {run.compileError && tab === 'preview' && (
            <div className="overlay-error">
              <AlertTriangle size={16} /> {run.compileError.message}
              {run.compileError.line ? ` (line ${run.compileError.line})` : ''}
            </div>
          )}
        </div>

        <div className="output-pane scroll" hidden={tab !== 'tests'}>
          <TestsView run={run} exercise={exercise} />
        </div>

        <div className="output-pane scroll" hidden={tab !== 'console'}>
          <ConsoleView run={run} />
        </div>

        <div className="output-pane scroll" hidden={tab !== 'solution'}>
          <SolutionView exercise={exercise} revealed={solutionRevealed} onReveal={onRevealSolution} onLoad={onLoadSolution} hintsShown={hintsShown} onShowHint={onShowHint} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge, badgeTone }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string; badgeTone?: 'success' | 'danger' }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={`output-tab ${active ? 'is-active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge && <span className={`badge ${badgeTone ? `badge-${badgeTone}` : ''}`}>{badge}</span>}
    </button>
  );
}

function TestsView({ run, exercise }: { run: RunState; exercise: Exercise }) {
  if (run.kind !== 'check' || run.phase === 'idle') {
    return (
      <div className="empty-state">
        <FlaskConical size={28} />
        <p>
          Press <kbd>Check</kbd> to run the tests for <strong>{exercise.title}</strong>. You'll see exactly which expectations pass or fail.
        </p>
      </div>
    );
  }
  if (run.phase !== 'done') {
    return (
      <div className="empty-state">
        <Loader2 size={28} className="spin" />
        <p>Running tests…</p>
      </div>
    );
  }
  return (
    <div className="tests">
      {run.passed ? (
        <div className="banner banner-success">
          <CheckCircle2 size={18} /> All checks passed. Nice work!
        </div>
      ) : (
        <div className="banner banner-danger">
          <XCircle size={18} /> Not quite yet. Read each failure below, fix one thing at a time, and check again.
        </div>
      )}

      {run.typeIssues.length > 0 && (
        <section className="test-group">
          <h4>TypeScript check</h4>
          <ul>
            {run.typeIssues.map((issue, i) => (
              <li key={i} className="test fail">
                <XCircle size={16} />
                <div>
                  <div className="test-name">
                    {issue.inTypeTests ? 'Type expectation failed' : `Line ${issue.line}, column ${issue.column}`}
                  </div>
                  <pre className="test-message">{issue.message}</pre>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.results && (
        <section className="test-group">
          <h4>Behaviour</h4>
          <ul>
            {run.results.map((r, i) => (
              <li key={i} className={`test ${r.status}`}>
                {r.status === 'pass' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <div>
                  <div className="test-name">{r.name}</div>
                  {r.message && <pre className="test-message">{r.message}</pre>}
                  {r.stack && <pre className="test-stack">{r.stack}</pre>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.errors.length > 0 && (
        <section className="test-group">
          <h4>Runtime errors</h4>
          <ul>
            {run.errors.map((e, i) => (
              <li key={i} className="test fail">
                <AlertTriangle size={16} />
                <div>
                  <div className="test-name">{e.phase === 'user' ? 'Your code threw while loading' : e.phase === 'tests' ? 'Test file problem' : 'Error'}</div>
                  <pre className="test-message">{e.message}</pre>
                  {e.stack && <pre className="test-stack">{e.stack}</pre>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ConsoleView({ run }: { run: RunState }) {
  const empty = !run.console.length && !run.errors.length && !run.compileError;
  if (empty) {
    return (
      <div className="empty-state">
        <TerminalSquare size={28} />
        <p>
          Output from <code>console.log</code>, warnings and runtime errors show up here.
        </p>
      </div>
    );
  }
  return (
    <div className="console">
      {run.compileError && (
        <div className="console-line error">
          <span className="console-tag">compile</span>
          <pre>
            {run.compileError.message}
            {run.compileError.line ? ` (line ${run.compileError.line}${run.compileError.column ? `, col ${run.compileError.column}` : ''})` : ''}
          </pre>
        </div>
      )}
      {run.console.map((line, i) => (
        <div key={i} className={`console-line ${line.level}`}>
          <span className="console-tag">{line.level}</span>
          <pre>{line.text}</pre>
        </div>
      ))}
      {run.errors.map((e, i) => (
        <div key={`e${i}`} className="console-line error">
          <span className="console-tag">error</span>
          <pre>
            {e.message}
            {e.stack ? `\n${e.stack}` : ''}
          </pre>
        </div>
      ))}
    </div>
  );
}

function SolutionView({ exercise, revealed, onReveal, onLoad, hintsShown, onShowHint }: { exercise: Exercise; revealed: boolean; onReveal: () => void; onLoad: () => void; hintsShown: number; onShowHint: () => void }) {
  return (
    <div className="solution">
      {exercise.hints.length > 0 && (
        <section>
          <h4>Hints</h4>
          <ol className="hints">
            {exercise.hints.slice(0, hintsShown).map((h, i) => (
              <li key={i}>
                <Markdown>{h}</Markdown>
              </li>
            ))}
          </ol>
          {hintsShown < exercise.hints.length ? (
            <button type="button" className="btn btn-sm" onClick={onShowHint}>
              <Lightbulb size={14} /> {hintsShown === 0 ? 'Show a hint' : 'Show another hint'} ({exercise.hints.length - hintsShown} left)
            </button>
          ) : (
            <p className="muted">That's all the hints.</p>
          )}
        </section>
      )}

      <section>
        <h4>Model solution</h4>
        {revealed ? (
          <>
            <Markdown>{`\`\`\`${exercise.language}\n${exercise.solution}\n\`\`\``}</Markdown>
            {exercise.explanation && <Markdown>{exercise.explanation}</Markdown>}
            <button type="button" className="btn btn-sm" onClick={onLoad}>
              Load solution into the editor
            </button>
          </>
        ) : (
          <>
            <p className="muted">Give it an honest attempt first. Revealing is fine when you're stuck, but you learn more by reading the failing test and trying one more time.</p>
            <button type="button" className="btn btn-sm" onClick={onReveal}>
              <Eye size={14} /> Reveal solution and explanation
            </button>
          </>
        )}
      </section>
    </div>
  );
}
