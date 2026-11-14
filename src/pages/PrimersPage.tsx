import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, CircleDot, Clock, Info } from 'lucide-react';
import { PRIMERS, getPrimerMeta, primerUnitPath } from '../content/primers.ts';
import type { PrimerMeta } from '../content/types.ts';
import { useProgress } from '../state/progress.ts';
import { primerProgress } from '../state/primerProgress.ts';
import { fmtMinutes } from '../lib/format.ts';
import { PrimerIcon } from '../components/PrimerIcon.tsx';

/** `/primers` lists both primers; `/primers/:primerId` shows one. */
export function PrimersPage() {
  const { primerId } = useParams();
  const only = primerId ? getPrimerMeta(primerId) : undefined;

  useEffect(() => {
    document.title = `${only ? only.title : 'Primers'} · Learn React & TypeScript`;
    return () => {
      document.title = 'Learn React & TypeScript in 30 Days';
    };
  }, [only]);

  if (primerId && !only) return <Navigate to="/primers" replace />;
  const list = only ? [only] : PRIMERS;

  return (
    <div className="page primers-page">
      <div className="crumbs">
        <Link to="/">Overview</Link>
        <span>/</span>
        {only ? <Link to="/primers">Primers</Link> : <span>Primers</span>}
      </div>
      <h1>{only ? only.title : 'Primers: optional groundwork'}</h1>
      <div className="notice primer-notice">
        <Info size={16} />
        <span>
          Primers are <strong>optional</strong> and separate from the 30-day plan. Take them before Day 1, or whenever a day assumes something you have not met
          yet. Progress here never changes your day count.
        </span>
      </div>
      {list.map((primer) => (
        <PrimerSection key={primer.id} primer={primer} />
      ))}
      {only && (
        <p>
          <Link to="/primers">See all primers</Link>
        </p>
      )}
    </div>
  );
}

function PrimerSection({ primer }: { primer: PrimerMeta }) {
  const state = useProgress();
  const p = primerProgress(state, primer);
  const totalMinutes = primer.units.reduce((n, u) => n + u.minutes, 0);

  return (
    <section className="primer-section" id={primer.id}>
      <div className="primer-section-head">
        <div className="primer-icon">
          <PrimerIcon id={primer.id} size={22} />
        </div>
        <div className="flex-1">
          <h2>{primer.title}</h2>
          <p className="muted">{primer.description}</p>
          <p className="small muted">
            <Clock size={12} /> About {fmtMinutes(totalMinutes)} in {primer.units.length} units · Helps with {primer.helpsWith} · {p.passed}/{p.total} exercises passed
          </p>
        </div>
        <Link to={primerUnitPath(primer.id, p.nextUnit)} className="btn btn-primary">
          {p.unitsDone === primer.units.length ? 'Review' : p.started ? `Continue with unit ${p.nextUnit}` : 'Start'} <ArrowRight size={16} />
        </Link>
      </div>
      <ol className="day-grid">
        {primer.units.map((unit, i) => {
          const s = p.units[i];
          return (
            <li key={unit.slug}>
              <Link to={primerUnitPath(primer.id, i + 1)} className={`day-card status-${s.status}`}>
                <span className="day-card-num">
                  Unit {i + 1}
                  {s.status === 'done' ? <CheckCircle2 size={16} className="status-done" /> : s.status === 'in-progress' ? <CircleDot size={16} className="status-progress" /> : <Circle size={16} className="status-todo" />}
                </span>
                <span className="day-card-title">{unit.title}</span>
                <span className="day-card-tagline muted">{unit.tagline}</span>
                <span className="day-card-meta muted small">
                  ~{unit.minutes} min · {s.passed}/{s.total} exercises
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
