import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Code2 } from 'lucide-react';
import { getPrimerMeta, primerUnitPath } from '../content/primers.ts';
import { getPrimerUnit } from '../content/primerContent.ts';
import { MarkdownWidgets } from '../components/Markdown.tsx';
import { SplitPane } from '../components/SplitPane.tsx';
import { LessonPane } from '../features/lesson/LessonPane.tsx';
import { PracticePane } from '../features/practice/PracticePane.tsx';
import { lessonWidgets } from '../features/widgets/index.ts';
import { progress } from '../state/progress.ts';
import { useMediaQuery } from '../lib/hooks.ts';

/** `/primers/:primerId/:unit`: the same split-screen layout as a course day. */
export default function PrimerUnitPage() {
  const { primerId, unit: unitParam } = useParams();
  const primer = getPrimerMeta(primerId);
  const unit = getPrimerUnit(primerId, Number(unitParam));
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const [mobileTab, setMobileTab] = useState<'lesson' | 'practice'>('lesson');

  useEffect(() => {
    if (!unit || !primer) return;
    progress.visitUnit(unit.key);
    document.title = `${primer.shortTitle} ${unit.index}: ${unit.title} · Learn React & TypeScript`;
    setMobileTab('lesson');
    return () => {
      document.title = 'Learn React & TypeScript in 30 Days';
    };
  }, [unit, primer]);

  if (!primer) return <Navigate to="/primers" replace />;
  if (!unit) return <Navigate to={`/primers/${primer.id}`} replace />;

  const isLast = unit.index === primer.units.length;
  const completeMessage = isLast ? (
    <>
      {primer.title} primer complete! <Link to="/primers">Back to the primers</Link> or <Link to="/">continue the 30-day course</Link>.
    </>
  ) : (
    <>
      Unit {unit.index} complete!{' '}
      <Link to={primerUnitPath(primer.id, unit.index + 1)}>
        Continue to unit {unit.index + 1}: {primer.units[unit.index].title} <ArrowRight size={14} />
      </Link>
    </>
  );

  const lesson = <LessonPane day={unit} objectivesTitle="In this unit you will learn to" />;
  const practice = <PracticePane day={unit} completeMessage={completeMessage} />;

  return (
    <MarkdownWidgets.Provider value={lessonWidgets}>
      <div className="day">
        <header className="day-header">
          <div className="day-header-main">
            <div className="crumbs">
              <Link to="/">Overview</Link>
              <span>/</span>
              <Link to="/primers">Primers</Link>
              <span>/</span>
              <Link to={`/primers/${primer.id}`}>{primer.title}</Link>
            </div>
            <h1>
              <span className="day-num">Unit {unit.index}</span> {unit.title}
            </h1>
            <p className="tagline">{unit.tagline}</p>
          </div>
          <div className="plan" aria-label="Time plan">
            <span className="badge">Optional primer</span>
            <Clock size={14} />
            <span className="plan-total">~{unit.minutes} min</span>
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
            <div className="day-mobile-body">{mobileTab === 'lesson' ? lesson : practice}</div>
          </div>
        ) : (
          <SplitPane className="day-split" storageKey="lrt.split.day" defaultRatio={0.48} min={0.25} max={0.75} first={lesson} second={practice} />
        )}
      </div>
    </MarkdownWidgets.Provider>
  );
}
