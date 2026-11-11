import { Link } from 'react-router-dom';
import { CheckSquare, Square } from 'lucide-react';
import { days, phases } from '../content/index.ts';
import { progress, useProgress } from '../state/progress.ts';
import { Markdown } from '../components/Markdown.tsx';
import { CRM_NAME } from '../config.ts';

export function CrmPage() {
  const state = useProgress();
  const steps = days.filter((d) => d.crm);
  const totalItems = steps.reduce((n, d) => n + (d.crm?.checklist.length ?? 0), 0);
  const doneItems = steps.reduce((n, d) => n + (state.crm[String(d.id)] ?? []).filter(Boolean).length, 0);
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="page narrow crm-page">
      <h1>{CRM_NAME} project roadmap</h1>
      <p className="lede">
        {CRM_NAME} is the small customer-relationship-management app you build on your own machine, one step per day. By Day 30 it has contacts, companies,
        deals, a pipeline board, a dashboard, authentication, offline support and tests, and it is deployed to the web.
      </p>
      <div className="crm-progress">
        <div className="progress-bar big" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>
          {doneItems}/{totalItems} steps ticked off ({pct}%)
        </span>
      </div>

      <Markdown>{`
### What you will build

| Area | Features |
| --- | --- |
| Contacts | list, search, filter, create, edit, delete, detail page, activity timeline |
| Companies | list and detail, linked contacts |
| Deals | pipeline (Kanban) board, stage changes, value and probability |
| Dashboard | KPI tiles and charts from the mock API |
| Platform | routing, auth with protected routes, data caching, offline-first, PWA install, dark mode, tests, CI and deployment |

The data comes from the mock API hosted with this site (see the API docs in the sidebar), which means your CRM works against real HTTP requests with latency, errors and pagination.
`}</Markdown>

      {phases.map((phase) => {
        const phaseSteps = steps.filter((d) => d.phaseId === phase.id);
        if (!phaseSteps.length) return null;
        return (
          <section key={phase.id} className="crm-phase">
            <h2>
              <span className="phase-num">Phase {phase.number}</span> {phase.title}
            </h2>
            {phaseSteps.map((day) => {
              const list = state.crm[String(day.id)] ?? [];
              const done = list.filter(Boolean).length;
              return (
                <article key={day.id} className="crm-card">
                  <header>
                    <Link to={`/day/${day.id}`}>
                      <span className="day-num">Day {day.id}</span> {day.crm!.title}
                    </Link>
                    <span className="muted small">
                      {done}/{day.crm!.checklist.length}
                    </span>
                  </header>
                  <ul className="checklist compact">
                    {day.crm!.checklist.map((item, i) => (
                      <li key={item}>
                        <button type="button" className={`check-item ${list[i] ? 'is-done' : ''}`} onClick={() => progress.toggleCrmItem(day.id, i, day.crm!.checklist.length)} aria-pressed={!!list[i]}>
                          {list[i] ? <CheckSquare size={16} /> : <Square size={16} />}
                          <span>{item}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
