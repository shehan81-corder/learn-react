import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Code2 } from 'lucide-react';
import { getDay, phaseOf } from '../content/index.ts';
import { SplitPane } from '../components/SplitPane.tsx';
import { LessonPane } from '../features/lesson/LessonPane.tsx';
import { PracticePane } from '../features/practice/PracticePane.tsx';
import { progress } from '../state/progress.ts';
import { useMediaQuery } from '../lib/hooks.ts';
import { fmtMinutes } from '../lib/format.ts';
import { TOTAL_DAYS } from '../config.ts';

export function DayPage() {
  const { dayId } = useParams();
  const id = Number(dayId);
  const day = Number.isInteger(id) ? getDay(id) : undefined;
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const [mobileTab, setMobileTab] = useState<'lesson' | 'practice'>('lesson');

  useEffect(() => {
    if (day) {
      progress.visitDay(day.id);
      document.title = `Day ${day.id}: ${day.title} · Learn React & TypeScript`;
      setMobileTab('lesson');
    }
    return () => {
      document.title = 'Learn React & TypeScript in 30 Days';
    };
  }, [day]);

  if (!day) {
    if (Number.isInteger(id) && id >= 1 && id <= TOTAL_DAYS) {
      return (
        <div className="page narrow">
          <h1>Day {id} is coming soon</h1>
          <p>
            This day's content hasn't been written yet. <Link to="/">Back to the overview</Link>.
          </p>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  const phase = phaseOf(day);
  const completeMessage = (
    <>
      Day {day.id} complete! {day.crm ? 'Finish the CRM step on the left, then ' : 'Then '}
      {day.id < TOTAL_DAYS ? (
        <Link to={`/day/${day.id + 1}`}>
          continue to Day {day.id + 1} <ArrowRight size={14} />
        </Link>
      ) : (
        <Link to="/">review your journey on the home page</Link>
      )}
    </>
  );
  const practice = <PracticePane day={day} completeMessage={completeMessage} />;
  const total = Object.values(day.plan).reduce((a, b) => a + b, 0);

  return (
    <div className="day">
      <header className="day-header">
        <div className="day-header-main">
          <div className="crumbs">
            <Link to="/">Overview</Link>
            <span>/</span>
            <span>
              Phase {phase.number}: {phase.title}
            </span>
          </div>
          <h1>
            <span className="day-num">Day {day.id}</span> {day.title}
          </h1>
          <p className="tagline">{day.tagline}</p>
        </div>
        <div className="plan" aria-label="Time plan">
          <Clock size={14} />
          <span className="plan-item">Learn {day.plan.learn}′</span>
          <span className="plan-item">Walkthrough {day.plan.walkthrough}′</span>
          <span className="plan-item">Practice {day.plan.practice}′</span>
          <span className="plan-item">Challenge {day.plan.challenge}′</span>
          <span className="plan-item">CRM {day.plan.crm}′</span>
          <span className="plan-total">{fmtMinutes(total)}</span>
        </div>
      </header>

      {isNarrow ? (
        <div className="day-mobile">
          <div className="mobile-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mobileTab === 'lesson'} className={`mobile-tab ${mobileTab === 'lesson' ? 'is-active' : ''}`} onClick={() => setMobileTab('lesson')}>
              <BookOpen size={16} /> Lesson
            </button>
            <button type="button" role="tab" aria-selected={mobileTab === 'practice'} className={`mobile-tab ${mobileTab === 'practice' ? 'is-active' : ''}`} onClick={() => setMobileTab('practice')}>
              <Code2 size={16} /> Practice
            </button>
          </div>
          <div className="day-mobile-body">{mobileTab === 'lesson' ? <LessonPane day={day} /> : practice}</div>
        </div>
      ) : (
        <SplitPane className="day-split" storageKey="lrt.split.day" defaultRatio={0.42} min={0.25} max={0.7} first={<LessonPane day={day} />} second={practice} />
      )}
    </div>
  );
}
