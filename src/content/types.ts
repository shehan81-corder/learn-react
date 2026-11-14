export type ExerciseKind = 'practice' | 'challenge';
export type CodeLanguage = 'js' | 'jsx' | 'ts' | 'tsx';
export type SandboxMode = 'script' | 'react';

export interface Exercise {
  id: string;
  dayId: number;
  kind: ExerciseKind;
  index: number;
  title: string;
  minutes: number;
  language: CodeLanguage;
  mode: SandboxMode;
  /** Markdown shown above the editor. */
  prompt: string;
  starter: string;
  solution: string;
  /** Markdown explaining the model solution. */
  explanation: string;
  /** Test code run in the sandbox after the learner's module loads. */
  tests: string;
  /** Optional TypeScript appended to the learner's code and type-checked only. */
  typeTests?: string;
  hints: string[];
}

export interface Reference {
  title: string;
  url: string;
  note?: string;
}

export interface LessonSection {
  id: string;
  title: string;
  markdown: string;
}

export interface CrmStep {
  title: string;
  markdown: string;
  checklist: string[];
}

export interface TimePlan {
  learn: number;
  walkthrough: number;
  practice: number;
  challenge: number;
  crm: number;
}

export interface Phase {
  id: string;
  number: number;
  title: string;
  description: string;
  dayIds: number[];
}

export interface DayMeta {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  phaseId: string;
  objectives: string[];
  references: Reference[];
  plan?: Partial<TimePlan>;
}

/**
 * Anything rendered with the split-screen lesson + practice layout: a course
 * day or a primer unit.
 */
export interface StudyUnit {
  /** Progress key for notes, checklist and visits ("3" for Day 3, "dom-2" for a primer unit). */
  key: string;
  objectives: string[];
  references: Reference[];
  sections: LessonSection[];
  practices: Exercise[];
  challenge: Exercise | null;
  crm: CrmStep | null;
}

export interface Day extends DayMeta, StudyUnit {
  plan: TimePlan;
}

export type PrimerId = 'dom' | 'typescript';

export interface PrimerUnitMeta {
  slug: string;
  title: string;
  tagline: string;
  minutes: number;
  objectives: string[];
  references: Reference[];
}

export interface PrimerMeta {
  id: PrimerId;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  /** The course day this primer prepares you for. */
  helpsWith: string;
  units: PrimerUnitMeta[];
}

export interface PrimerUnit extends PrimerUnitMeta, StudyUnit {
  primerId: PrimerId;
  /** 1-based position within the primer. */
  index: number;
}

export const DEFAULT_PLAN: TimePlan = { learn: 15, walkthrough: 10, practice: 20, challenge: 10, crm: 5 };
