import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Circle, CircleDot, Clock, Code2, FlaskConical, Layers, Moon, Rocket, Save, Workflow } from 'lucide-react';
import { days, exercisesOf, getExercise, phases, totalExercises } from '../content/index.ts';
import { PRIMERS } from '../content/primers.ts';
import { primerProgress } from '../state/primerProgress.ts';
import { PrimerIcon } from '../components/PrimerIcon.tsx';
import { dayStatus, useProgress } from '../state/progress.ts';
import { APP_TAGLINE, CRM_NAME, REPO_URL, TOTAL_DAYS } from '../config.ts';

export function HomePage() {
  const state = useProgress();
  const statuses = new Map(days.map((d) => [d.id, dayStatus(state, d.id, exercisesOf(d).map((e) => e.id))]));
  const doneDays = [...statuses.values()].filter((s) => s.status === 'done').length;
  // Course exercises only: primer exercises are tracked separately.
  const passed = Object.entries(state.exercises).filter(([id, e]) => e.status === 'passed' && getExercise(id)).length;
  const nextDay = days.find((d) => statuses.get(d.id)?.status !== 'done') ?? days[days.length - 1];
  const resumeDay = state.lastDayId && statuses.get(state.lastDayId)?.status !== 'done' ? state.lastDayId : nextDay?.id ?? 1;
  const started = !!state.startedAt;

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">{APP_TAGLINE}</p>
          <h1>
            Learn React &amp; TypeScript by building <span className="accent">{CRM_NAME}</span>
          </h1>
          <p className="lede">
            Thirty focused sessions for developers who already know JavaScript basics. Each day you read a short lesson on the left, write real code in the
            editor on the right, get instant feedback from tests, and add one more piece to a working CRM on your own machine.
          </p>
          <div className="row gap wrap">
            <Link to={`/day/${resumeDay}`} className="btn btn-primary btn-lg">
              {started ? `Continue with Day ${resumeDay}` : 'Start Day 1'} <ArrowRight size={18} />
            </Link>
            <Link to="/crm" className="btn btn-lg">
              <Workflow size={18} /> See the CRM roadmap
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <Stat label="Days complete" value={`${doneDays}/${TOTAL_DAYS}`} />
          <Stat label="Exercises passed" value={`${passed}/${totalExercises}`} />
          <Stat label="Time per day" value="1 hour" />
          <Stat label="Total" value="~30 hours" />
        </div>
      </section>

      <section className="primers-home">
        <h2>New to the DOM or TypeScript? Start with a primer</h2>
        <p className="muted">
          Two optional, self-paced primers outside the 30-day plan. Each has four short units with interactive examples and practice. Skip them if the topic is
          familiar.
        </p>
        <div className="primer-cards">
          {PRIMERS.map((primer) => {
            const p = primerProgress(state, primer);
            return (
              <Link key={primer.id} to={`/primers/${primer.id}`} className="primer-card">
                <span className="primer-icon">
                  <PrimerIcon id={primer.id} size={20} />
                </span>
                <span className="primer-card-body">
                  <span className="primer-card-title">
                    {primer.title} <span className="badge">Optional</span>
                  </span>
                  <span className="muted">{primer.tagline}</span>
                  <span className="small muted">
                    {primer.units.length} units · {p.unitsDone}/{primer.units.length} done · helps with {primer.helpsWith}
                  </span>
                </span>
                <ArrowRight size={18} className="primer-card-arrow" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="how">
        <h2>How each day works</h2>
        <div className="how-grid">
          <HowCard icon={<Clock size={20} />} title="15 min · Learn" text="The concept, the thinking pattern behind it, and the mistakes beginners make." />
          <HowCard icon={<Code2 size={20} />} title="10 min · Walkthrough" text="A worked example with the reasoning spelled out, step by step." />
          <HowCard icon={<FlaskConical size={20} />} title="20 min · Practice" text="Two or three exercises in a live sandbox. Tests tell you exactly what's wrong." />
          <HowCard icon={<Rocket size={20} />} title="10 min · Challenge" text="One harder problem to prove you own the concept. Solutions are always available." />
          <HowCard icon={<Layers size={20} />} title="5 min · CRM step" text={`A concrete step that moves your local ${CRM_NAME} project forward.`} />
          <HowCard icon={<Save size={20} />} title="Progress saved" text="Everything is stored in your browser. Export a backup any time from Settings." />
        </div>
      </section>

      <section className="phases">
        <h2>The 30-day plan</h2>
        {phases.map((phase) => (
          <div key={phase.id} className="phase">
            <div className="phase-head">
              <h3>
                <span className="phase-num">Phase {phase.number}</span> {phase.title}
              </h3>
              <p className="muted">{phase.description}</p>
            </div>
            <ol className="day-grid">
              {phase.dayIds.map((id) => {
                const day = days.find((d) => d.id === id);
                const s = statuses.get(id);
                if (!day || !s) {
                  return (
                    <li key={id} className="day-card is-placeholder">
                      <span className="day-card-num">Day {id}</span>
                      <span className="day-card-title muted">Coming soon</span>
                    </li>
                  );
                }
                return (
                  <li key={id}>
                    <Link to={`/day/${id}`} className={`day-card status-${s.status}`}>
                      <span className="day-card-num">
                        Day {id}
                        {s.status === 'done' ? <CheckCircle2 size={16} className="status-done" /> : s.status === 'in-progress' ? <CircleDot size={16} className="status-progress" /> : <Circle size={16} className="status-todo" />}
                      </span>
                      <span className="day-card-title">{day.title}</span>
                      <span className="day-card-tagline muted">{day.tagline}</span>
                      <span className="day-card-meta muted small">
                        {s.passed}/{s.total} exercises
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <section className="tips">
        <h2>Before you begin</h2>
        <ul className="tips-list">
          <li>
            <Check size={16} /> Use a laptop or desktop. The split-screen editor needs room, though lessons read fine on a phone.
          </li>
          <li>
            <Check size={16} /> The sandbox loads React from a CDN, so you need to be online while practising.
          </li>
          <li>
            <Moon size={16} /> Toggle dark mode from the top bar. Your choice is remembered.
          </li>
          <li>
            <Code2 size={16} />{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
              The platform itself is a React + TypeScript app
            </a>
            . Once you're past week two, read its source as a reference codebase.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function HowCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="how-card">
      <div className="how-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
