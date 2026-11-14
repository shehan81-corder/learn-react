import { DAYS_META, PHASES } from './curriculum.ts';
import { parseExercises, parseLesson } from './parse.ts';
import { DEFAULT_PLAN, type Day, type Exercise, type Phase } from './types.ts';

const lessonFiles = import.meta.glob('./days/*/lesson.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const exerciseFiles = import.meta.glob('./days/*/exercises.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function fileFor(files: Record<string, string>, dayId: number): string {
  const prefix = `./days/${String(dayId).padStart(2, '0')}-`;
  const key = Object.keys(files).find((k) => k.startsWith(prefix));
  return key ? files[key] : '';
}

function buildDay(meta: (typeof DAYS_META)[number]): Day {
  const { sections, crm } = parseLesson(fileFor(lessonFiles, meta.id));
  const { practices, challenge } = parseExercises(fileFor(exerciseFiles, meta.id), meta.id);
  return {
    ...meta,
    key: String(meta.id),
    plan: { ...DEFAULT_PLAN, ...(meta.plan ?? {}) },
    sections,
    crm,
    practices,
    challenge,
  };
}

export const days: Day[] = DAYS_META.map(buildDay);
export const phases: Phase[] = PHASES;

const dayById = new Map(days.map((d) => [d.id, d]));
const exerciseById = new Map<string, Exercise>();
for (const day of days) {
  for (const p of day.practices) exerciseById.set(p.id, p);
  if (day.challenge) exerciseById.set(day.challenge.id, day.challenge);
}

export function getDay(id: number): Day | undefined {
  return dayById.get(id);
}

export function getExercise(id: string): Exercise | undefined {
  return exerciseById.get(id);
}

export function exercisesOf(day: Day): Exercise[] {
  return day.challenge ? [...day.practices, day.challenge] : day.practices;
}

export function phaseOf(day: Day): Phase {
  return phases.find((p) => p.id === day.phaseId) ?? phases[0];
}

export const totalExercises = exerciseById.size;
export const totalMinutes = days.reduce((sum, d) => sum + Object.values(d.plan).reduce((a, b) => a + b, 0), 0);
