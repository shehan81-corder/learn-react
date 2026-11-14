import { primerExerciseIds, primerUnitKey } from '../content/primers.ts';
import type { PrimerMeta } from '../content/types.ts';
import { dayStatus, type DayStatus, type ProgressState } from './progress.ts';

export interface PrimerProgress {
  passed: number;
  total: number;
  unitsDone: number;
  units: Array<{ index: number; status: DayStatus; passed: number; total: number }>;
  /** First unit that is not done (or the last unit when everything is done). */
  nextUnit: number;
  started: boolean;
}

export function primerProgress(state: ProgressState, primer: PrimerMeta): PrimerProgress {
  const units = primer.units.map((_, i) => {
    const index = i + 1;
    return { index, ...dayStatus(state, primerUnitKey(primer.id, index), primerExerciseIds(primer.id, index)) };
  });
  const passed = units.reduce((n, u) => n + u.passed, 0);
  const total = units.reduce((n, u) => n + u.total, 0);
  const unitsDone = units.filter((u) => u.status === 'done').length;
  const nextUnit = units.find((u) => u.status !== 'done')?.index ?? units.length;
  return { passed, total, unitsDone, units, nextUnit, started: units.some((u) => u.status !== 'not-started') };
}
