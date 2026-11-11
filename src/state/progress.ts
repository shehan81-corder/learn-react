import { useSyncExternalStore } from 'react';

export interface ExerciseProgress {
  status: 'attempted' | 'passed';
  attempts: number;
  passedAt?: string;
  solutionRevealed?: boolean;
  hintsUsed?: number;
}

export interface ProgressState {
  version: 1;
  startedAt?: string;
  lastDayId?: number;
  exercises: Record<string, ExerciseProgress>;
  drafts: Record<string, string>;
  crm: Record<string, boolean[]>;
  visited: Record<string, string>;
  notes: Record<string, string>;
}

const KEY = 'lrt.progress.v1';

const empty = (): ProgressState => ({
  version: 1,
  exercises: {},
  drafts: {},
  crm: {},
  visited: {},
  notes: {},
});

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return { ...empty(), ...parsed, version: 1 };
  } catch {
    return empty();
  }
}

let state: ProgressState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode, quota); keep in memory */
  }
}

function setState(updater: (prev: ProgressState) => ProgressState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const progress = {
  get: () => state,

  visitDay(dayId: number) {
    const key = String(dayId);
    setState((s) => ({
      ...s,
      startedAt: s.startedAt ?? new Date().toISOString(),
      lastDayId: dayId,
      visited: { ...s.visited, [key]: new Date().toISOString() },
    }));
  },

  saveDraft(exerciseId: string, code: string) {
    setState((s) => ({ ...s, drafts: { ...s.drafts, [exerciseId]: code } }));
  },

  clearDraft(exerciseId: string) {
    setState((s) => {
      const drafts = { ...s.drafts };
      delete drafts[exerciseId];
      return { ...s, drafts };
    });
  },

  recordAttempt(exerciseId: string, passed: boolean) {
    setState((s) => {
      const prev = s.exercises[exerciseId];
      const next: ExerciseProgress = {
        status: passed || prev?.status === 'passed' ? 'passed' : 'attempted',
        attempts: (prev?.attempts ?? 0) + 1,
        passedAt: prev?.passedAt ?? (passed ? new Date().toISOString() : undefined),
        solutionRevealed: prev?.solutionRevealed,
        hintsUsed: prev?.hintsUsed,
      };
      return { ...s, exercises: { ...s.exercises, [exerciseId]: next } };
    });
  },

  revealSolution(exerciseId: string) {
    setState((s) => {
      const prev = s.exercises[exerciseId] ?? { status: 'attempted', attempts: 0 };
      return { ...s, exercises: { ...s.exercises, [exerciseId]: { ...prev, solutionRevealed: true } } };
    });
  },

  useHint(exerciseId: string, count: number) {
    setState((s) => {
      const prev = s.exercises[exerciseId] ?? { status: 'attempted', attempts: 0 };
      return { ...s, exercises: { ...s.exercises, [exerciseId]: { ...prev, hintsUsed: Math.max(prev.hintsUsed ?? 0, count) } } };
    });
  },

  toggleCrmItem(dayId: number, index: number, length: number) {
    const key = String(dayId);
    setState((s) => {
      const list = [...(s.crm[key] ?? [])];
      while (list.length < length) list.push(false);
      list[index] = !list[index];
      return { ...s, crm: { ...s.crm, [key]: list } };
    });
  },

  setNote(dayId: number, text: string) {
    setState((s) => ({ ...s, notes: { ...s.notes, [String(dayId)]: text } }));
  },

  export(): string {
    return JSON.stringify({ exportedAt: new Date().toISOString(), progress: state }, null, 2);
  },

  import(json: string): { ok: true } | { ok: false; error: string } {
    try {
      const parsed = JSON.parse(json) as { progress?: Partial<ProgressState> } & Partial<ProgressState>;
      const incoming = parsed.progress ?? parsed;
      if (!incoming || typeof incoming !== 'object' || !('exercises' in incoming)) {
        return { ok: false, error: 'That file does not look like an exported progress file.' };
      }
      setState(() => ({ ...empty(), ...incoming, version: 1 }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },

  reset() {
    setState(() => empty());
  },
};

export type DayStatus = 'not-started' | 'in-progress' | 'done';

export function dayStatus(s: ProgressState, dayId: number, exerciseIds: string[]): { status: DayStatus; passed: number; total: number } {
  const total = exerciseIds.length;
  const passed = exerciseIds.filter((id) => s.exercises[id]?.status === 'passed').length;
  if (total > 0 && passed === total) return { status: 'done', passed, total };
  const touched = passed > 0 || exerciseIds.some((id) => s.exercises[id]) || s.visited[String(dayId)];
  return { status: touched ? 'in-progress' : 'not-started', passed, total };
}
