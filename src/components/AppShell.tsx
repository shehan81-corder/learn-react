import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, Circle, CircleDot, Code2, Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, Workflow } from 'lucide-react';
import { days, exercisesOf, phases } from '../content/index.ts';
import { PRIMERS, getPrimerMeta, primerUnitPath } from '../content/primers.ts';
import { primerProgress } from '../state/primerProgress.ts';
import { PrimerIcon } from './PrimerIcon.tsx';
import { APP_NAME, REPO_URL, TOTAL_DAYS } from '../config.ts';
import { dayStatus, useProgress } from '../state/progress.ts';
import { useTheme } from '../state/theme.ts';
import { useLocalStorageState, useMediaQuery } from '../lib/hooks.ts';
import { SettingsDialog } from './SettingsDialog.tsx';

function StatusIcon({ status }: { status: 'not-started' | 'in-progress' | 'done' }) {
  if (status === 'done') return <Check size={14} className="status-icon status-done" aria-label="Done" />;
  if (status === 'in-progress') return <CircleDot size={14} className="status-icon status-progress" aria-label="In progress" />;
  return <Circle size={14} className="status-icon status-todo" aria-label="Not started" />;
}

export function AppShell() {
  const [theme, toggleTheme] = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const [collapsed, setCollapsed] = useLocalStorageState('lrt.sidebar.collapsed', false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const params = useParams();
  const state = useProgress();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const currentDayId = location.pathname.startsWith('/day/') ? Number(params.dayId) : null;
  const currentPrimer = params.unit ? getPrimerMeta(params.primerId) : undefined;
  const currentUnit = currentPrimer ? Number(params.unit) : null;
  const doneDays = days.filter((d) => dayStatus(state, d.id, exercisesOf(d).map((e) => e.id)).status === 'done').length;
  const pct = Math.round((doneDays / TOTAL_DAYS) * 100);

  const sidebarVisible = isNarrow ? drawerOpen : !collapsed;

  return (
    <div className={`shell ${sidebarVisible ? 'has-sidebar' : ''}`}>
      <header className="topbar">
        <div className="topbar-left">
          {isNarrow ? (
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setDrawerOpen((o) => !o)} aria-label="Toggle navigation">
              <Menu size={18} />
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
          <Link to="/" className="brand">
            <BookOpen size={18} />
            <span className="brand-name">{APP_NAME}</span>
          </Link>
        </div>

        <div className="topbar-center">
          {currentPrimer && currentUnit && (
            <div className="day-nav">
              <Link to={primerUnitPath(currentPrimer.id, currentUnit - 1)} className={`btn btn-ghost btn-sm ${currentUnit <= 1 ? 'is-disabled' : ''}`} aria-disabled={currentUnit <= 1}>
                <ChevronLeft size={16} /> <span className="hide-narrow">Unit {currentUnit - 1}</span>
              </Link>
              <span className="day-nav-current">
                {currentPrimer.shortTitle} · {currentUnit} of {currentPrimer.units.length}
              </span>
              <Link
                to={primerUnitPath(currentPrimer.id, currentUnit + 1)}
                className={`btn btn-ghost btn-sm ${currentUnit >= currentPrimer.units.length ? 'is-disabled' : ''}`}
                aria-disabled={currentUnit >= currentPrimer.units.length}
              >
                <span className="hide-narrow">Unit {currentUnit + 1}</span> <ChevronRight size={16} />
              </Link>
            </div>
          )}
          {currentDayId && (
            <div className="day-nav">
              <Link to={`/day/${currentDayId - 1}`} className={`btn btn-ghost btn-sm ${currentDayId <= 1 ? 'is-disabled' : ''}`} aria-disabled={currentDayId <= 1}>
                <ChevronLeft size={16} /> <span className="hide-narrow">Day {currentDayId - 1}</span>
              </Link>
              <span className="day-nav-current">Day {currentDayId} of {TOTAL_DAYS}</span>
              <Link to={`/day/${currentDayId + 1}`} className={`btn btn-ghost btn-sm ${currentDayId >= TOTAL_DAYS ? 'is-disabled' : ''}`} aria-disabled={currentDayId >= TOTAL_DAYS}>
                <span className="hide-narrow">Day {currentDayId + 1}</span> <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>

        <div className="topbar-right">
          <div className="overall hide-narrow" title={`${doneDays} of ${TOTAL_DAYS} days complete`}>
            <div className="progress-bar" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="overall-label">{doneDays}/{TOTAL_DAYS} days</span>
          </div>
          <NavLink to="/crm" className="btn btn-ghost btn-sm hide-narrow" title="Nimbus CRM project roadmap">
            <Workflow size={16} /> CRM project
          </NavLink>
          <a href={REPO_URL} className="btn btn-ghost btn-icon hide-narrow" target="_blank" rel="noreferrer noopener" aria-label="GitHub repository">
            <Code2 size={18} />
          </a>
          <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {isNarrow && drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <aside className={`sidebar ${sidebarVisible ? 'is-open' : ''}`} aria-label="Course navigation">
        <nav>
          <div className="sidebar-phase">
            <div className="sidebar-phase-title">
              <span className="phase-num">Optional</span>
              Primers
            </div>
            <ul>
              {PRIMERS.map((primer) => {
                const p = primerProgress(state, primer);
                const status = p.unitsDone === primer.units.length ? 'done' : p.started ? 'in-progress' : 'not-started';
                return (
                  <li key={primer.id}>
                    <NavLink to={`/primers/${primer.id}`} className={({ isActive }) => `sidebar-day ${isActive || location.pathname.startsWith(`/primers/${primer.id}/`) ? 'is-active' : ''} status-${status}`}>
                      <span className="sidebar-day-num">
                        <PrimerIcon id={primer.id} size={13} />
                      </span>
                      <span className="sidebar-day-title">{primer.title}</span>
                      <StatusIcon status={status} />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
          {phases.map((phase) => (
            <div key={phase.id} className="sidebar-phase">
              <div className="sidebar-phase-title">
                <span className="phase-num">Phase {phase.number}</span>
                {phase.title}
              </div>
              <ul>
                {phase.dayIds.map((id) => {
                  const day = days.find((d) => d.id === id);
                  if (!day) return null;
                  const { status } = dayStatus(state, day.id, exercisesOf(day).map((e) => e.id));
                  return (
                    <li key={id}>
                      <NavLink to={`/day/${id}`} className={({ isActive }) => `sidebar-day ${isActive ? 'is-active' : ''} status-${status}`}>
                        <span className="sidebar-day-num">{id}</span>
                        <span className="sidebar-day-title">{day.title}</span>
                        <StatusIcon status={status} />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="sidebar-phase">
            <ul>
              <li>
                <NavLink to="/crm" className={({ isActive }) => `sidebar-day ${isActive ? 'is-active' : ''}`}>
                  <Workflow size={14} /> <span className="sidebar-day-title">CRM project roadmap</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/api-docs" className={({ isActive }) => `sidebar-day ${isActive ? 'is-active' : ''}`}>
                  <span className="sidebar-day-num">API</span> <span className="sidebar-day-title">Mock CRM API docs</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
