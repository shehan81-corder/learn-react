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

export interface Day extends DayMeta {
  plan: TimePlan;
  sections: LessonSection[];
  practices: Exercise[];
  challenge: Exercise | null;
  crm: CrmStep | null;
}

export const DEFAULT_PLAN: TimePlan = { learn: 15, walkthrough: 10, practice: 20, challenge: 10, crm: 5 };
