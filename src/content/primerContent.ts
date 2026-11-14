import { PRIMERS, primerUnitKey } from './primers.ts';
import { parseExercises, parseLesson } from './parse.ts';
import type { Exercise, PrimerId, PrimerUnit } from './types.ts';

/*
 * Primer lesson text. Only the primer pages and /verify import this module,
 * and both are lazy-loaded, so the text stays out of the main bundle.
 */
const lessonFiles = import.meta.glob('./primers/*/*/lesson.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const exerciseFiles = import.meta.glob('./primers/*/*/exercises.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function fileFor(files: Record<string, string>, primerId: PrimerId, index: number): string {
  const prefix = `./primers/${primerId}/${String(index).padStart(2, '0')}-`;
  const key = Object.keys(files).find((k) => k.startsWith(prefix));
  return key ? files[key] : '';
}

export const primerUnits: PrimerUnit[] = PRIMERS.flatMap((primer) =>
  primer.units.map((meta, i) => {
    const index = i + 1;
    const key = primerUnitKey(primer.id, index);
    const { sections } = parseLesson(fileFor(lessonFiles, primer.id, index));
    const { practices, challenge } = parseExercises(fileFor(exerciseFiles, primer.id, index), 0, key);
    return { ...meta, primerId: primer.id, index, key, sections, crm: null, practices, challenge };
  }),
);

export function getPrimerUnit(primerId: string | undefined, index: number): PrimerUnit | undefined {
  return primerUnits.find((u) => u.primerId === primerId && u.index === index);
}

export function primerExercises(unit: PrimerUnit): Exercise[] {
  return unit.challenge ? [...unit.practices, unit.challenge] : unit.practices;
}
