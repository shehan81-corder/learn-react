import { useState } from 'react';
import { days, exercisesOf } from '../content/index.ts';
import { primerExercises, primerUnits } from '../content/primerContent.ts';
import type { Exercise } from '../content/types.ts';
import { setupMonaco } from '../editor/monaco.ts';
import { typecheck } from '../editor/typecheck.ts';
import { runOnce } from '../sandbox/runOnce.ts';

interface Row {
  id: string;
  title: string;
  solutionPasses: boolean;
  starterFails: boolean;
  problems: string[];
  timing?: string;
}

declare global {
  interface Window {
    __verify?: { done: boolean; rows: Row[] };
  }
}

/**
 * Content QA. For every exercise: the model solution must pass all tests and
 * type checks, and the starter code must NOT pass (otherwise the exercise is
 * trivially solved). Visit /verify?day=3 or /verify?from=1&to=5, or
 * /verify?primer=dom (or typescript, or all) for the primers.
 */
export default function VerifyPage() {
  const params = new URLSearchParams(window.location.search);
  const only = params.get('day');
  const from = Number(params.get('from') ?? only ?? 1);
  const to = Number(params.get('to') ?? only ?? 30);
  const primer = params.get('primer');
  const targets: Exercise[] = primer
    ? primerUnits.filter((u) => primer === 'all' || u.primerId === primer).flatMap(primerExercises)
    : days.filter((d) => d.id >= from && d.id <= to).flatMap(exercisesOf);
  const scope = primer ? `Primer: ${primer}` : `Days ${from}–${to}`;
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const start = async () => {
    setRunning(true);
    window.__verify = { done: false, rows: [] };
    const monaco = await setupMonaco();
    const acc: Row[] = [];
    for (const ex of targets) {
      const problems: string[] = [];
      const t0 = performance.now();
      const lap: number[] = [];
      const mark = () => lap.push(Math.round(performance.now() - t0));
      if (!ex.solution || !ex.tests || !ex.starter) problems.push('missing starter/solution/tests');
      const sol = await runOnce({ userCode: ex.solution, testCode: ex.tests, lang: ex.language, mode: ex.mode });
      let solutionPasses = sol.ok;
      if (sol.compileError) problems.push(`solution compile error: ${sol.compileError}`);
      for (const r of sol.results.filter((r) => r.status === 'fail')) problems.push(`solution fails "${r.name}": ${r.message}`);
      for (const e of sol.errors) problems.push(`solution error: ${e.message}`);
      if (sol.timedOut) problems.push('solution run timed out');
      mark();
      const issues = await typecheck(monaco, `verify-${ex.id}-sol`, ex.language, ex.solution, ex.typeTests);
      mark();
      for (const i of issues) problems.push(`solution type error L${i.line}: ${i.message}`);
      if (issues.length) solutionPasses = false;

      const st = await runOnce({ userCode: ex.starter, testCode: ex.tests, lang: ex.language, mode: ex.mode });
      mark();
      const stIssues = await typecheck(monaco, `verify-${ex.id}-st`, ex.language, ex.starter, ex.typeTests);
      mark();
      const starterFails = !st.ok || stIssues.length > 0;
      const timing = `sol-run/sol-types/starter-run/starter-types ms = ${lap.join('/')}`;
      if (!starterFails) problems.push('starter code already passes all tests');

      acc.push({ id: ex.id, title: ex.title, solutionPasses, starterFails, problems, timing });
      setRows([...acc]);
      window.__verify = { done: false, rows: [...acc] };
    }
    window.__verify = { done: true, rows: acc };
    setDone(true);
    setRunning(false);
  };

  const bad = rows.filter((r) => r.problems.length);
  return (
    <div className="page">
      <h1>Content verification</h1>
      <p className="muted">
        {scope}: {targets.length} exercises. Each solution must pass; each starter must fail.
      </p>
      <button className="btn btn-primary" onClick={start} disabled={running}>
        {running ? 'Running…' : 'Run verification'}
      </button>
      <p>
        {rows.length} exercises checked, {bad.length} with problems{done ? ' (finished)' : ''}.
      </p>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.title}</td>
              <td>{r.problems.length ? 'FAIL' : 'ok'}</td>
              <td style={{ whiteSpace: 'pre-wrap' }}>{r.problems.join('\n')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
