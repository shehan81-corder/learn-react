import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, CircleDot, PartyPopper, Trophy } from 'lucide-react';
import type { Day, Exercise } from '../../content/types.ts';
import { exercisesOf } from '../../content/index.ts';
import { useProgress } from '../../state/progress.ts';
import { TOTAL_DAYS } from '../../config.ts';
import { ExerciseWorkspace } from './ExerciseWorkspace.tsx';

export function PracticePane({ day }: { day: Day }) {
  const state = useProgress();
  const exercises = useMemo(() => exercisesOf(day), [day]);
  const firstOpen = exercises.find((e) => state.exercises[e.id]?.status !== 'passed')?.id ?? exercises[0]?.id;
  const [activeId, setActiveId] = useState<string | undefined>(firstOpen);

  useEffect(() => {
    const list = exercisesOf(day);
    const s = state;
    setActiveId(list.find((e) => s.exercises[e.id]?.status !== 'passed')?.id ?? list[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  const active = exercises.find((e) => e.id === activeId) ?? exercises[0];
  const passedCount = exercises.filter((e) => state.exercises[e.id]?.status === 'passed').length;
  const allDone = exercises.length > 0 && passedCount === exercises.length;

  if (!exercises.length) {
    return <div className="empty-state">No exercises for this day yet.</div>;
  }

  const goNext = () => {
    const idx = exercises.findIndex((e) => e.id === active.id);
    const next = exercises.slice(idx + 1).find((e) => state.exercises[e.id]?.status !== 'passed') ?? exercises[idx + 1];
    if (next) setActiveId(next.id);
  };

  return (
    <div className="practice">
      <div className="practice-tabs" role="tablist" aria-label="Exercises">
        {exercises.map((e) => (
          <ExerciseTab key={e.id} exercise={e} active={e.id === active.id} status={state.exercises[e.id]?.status} onClick={() => setActiveId(e.id)} />
        ))}
        <span className="flex-1" />
        <span className="practice-count muted small">
          {passedCount}/{exercises.length} passed
        </span>
      </div>

      {allDone && (
        <div className="banner banner-success day-done">
          <PartyPopper size={18} />
          <span>
            Day {day.id} complete! {day.crm ? 'Finish the CRM step on the left, then ' : 'Then '}
            {day.id < TOTAL_DAYS ? (
              <Link to={`/day/${day.id + 1}`}>
                continue to Day {day.id + 1} <ArrowRight size={14} />
              </Link>
            ) : (
              <Link to="/">review your journey on the home page</Link>
            )}
          </span>
        </div>
      )}

      <ExerciseWorkspace key={active.id} exercise={active} onPassed={goNext} />
    </div>
  );
}

function ExerciseTab({ exercise, active, status, onClick }: { exercise: Exercise; active: boolean; status?: 'attempted' | 'passed'; onClick: () => void }) {
  const icon = status === 'passed' ? <CheckCircle2 size={14} className="status-done" /> : status === 'attempted' ? <CircleDot size={14} className="status-progress" /> : <Circle size={14} className="status-todo" />;
  return (
    <button type="button" role="tab" aria-selected={active} className={`practice-tab ${active ? 'is-active' : ''} ${exercise.kind}`} onClick={onClick} title={exercise.title}>
      {exercise.kind === 'challenge' ? <Trophy size={14} /> : icon}
      <span>{exercise.kind === 'challenge' ? 'Challenge' : `Practice ${exercise.index}`}</span>
      {exercise.kind === 'challenge' && status === 'passed' && <CheckCircle2 size={14} className="status-done" />}
    </button>
  );
}
