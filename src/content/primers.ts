import type { PrimerId, PrimerMeta } from './types.ts';

/**
 * Optional primers that learners can take before (or alongside) the 30-day
 * course. They never count towards day completion.
 *
 * Content lives in `src/content/primers/<primerId>/NN-slug/{lesson,exercises}.md`.
 * This file holds metadata only, so the shell and home page can list primers
 * without bundling their lesson text (that loads with the primer page).
 */

const react = (path: string, title: string, note?: string) => ({ title, url: `https://react.dev/${path}`, note });
const ts = (path: string, title: string, note?: string) => ({ title, url: `https://www.typescriptlang.org/docs/handbook/${path}`, note });
const mdn = (path: string, title: string, note?: string) => ({ title, url: `https://developer.mozilla.org/en-US/docs/Web/${path}`, note });

export const PRIMERS: PrimerMeta[] = [
  {
    id: 'dom',
    title: 'DOM & Virtual DOM',
    shortTitle: 'DOM primer',
    tagline: 'What the browser builds from your HTML, and how React decides what to change in it.',
    description:
      'Four short units: the HTML DOM, the Virtual DOM, reconciliation and React Fiber. You build a tiny virtual DOM, a diff and a work loop yourself, so the way React works stops being magic.',
    helpsWith: 'Days 5 to 8 (components, state, rendering and effects)',
    units: [
      {
        slug: 'html-dom',
        title: 'The HTML DOM',
        tagline: 'The tree the browser builds from HTML, and how JavaScript reads and changes it.',
        minutes: 30,
        objectives: [
          'Explain what the DOM is and how it differs from the HTML source',
          'Tell element, text and document nodes apart and walk the tree',
          'Create, update and remove elements with the DOM API',
          'Handle events with bubbling and event delegation',
          'Explain why hand-written DOM updates get hard as a UI grows',
        ],
        references: [
          mdn('API/Document_Object_Model/Introduction', 'MDN: Introduction to the DOM', 'The best short explanation of the DOM.'),
          mdn('API/Node', 'MDN: Node', 'Node types, parent/child/sibling properties.'),
          mdn('API/Document/createElement', 'MDN: document.createElement'),
          mdn('API/EventTarget/addEventListener', 'MDN: addEventListener'),
          { title: 'javascript.info: Bubbling and capturing', url: 'https://javascript.info/bubbling-and-capturing', note: 'Clear walkthrough of event propagation.' },
        ],
      },
      {
        slug: 'virtual-dom',
        title: 'The Virtual DOM',
        tagline: 'UI as plain JavaScript objects, and what JSX really compiles to.',
        minutes: 30,
        objectives: [
          'Describe a React element as a plain object with a type and props',
          'Read the createElement calls that JSX compiles to',
          'Build a tiny h() function and a render() that turns a virtual tree into real DOM',
          'Explain how function components fit into the virtual tree',
          'Say what the Virtual DOM is good for, and what it is not',
        ],
        references: [
          react('learn/writing-markup-with-jsx', 'React: Writing markup with JSX'),
          react('reference/react/createElement', 'React reference: createElement', 'What JSX turns into.'),
          { title: 'Legacy React docs: Virtual DOM and internals', url: 'https://legacy.reactjs.org/docs/faq-internals.html', note: 'Short FAQ on what "Virtual DOM" means in React.' },
          { title: 'Build your own React (Rodrigo Pombo)', url: 'https://pomb.us/build-your-own-react/', note: 'An excellent step-by-step rebuild of React. This primer follows the same path.' },
        ],
      },
      {
        slug: 'reconciliation',
        title: 'Reconciliation & keys',
        tagline: 'How React compares two virtual trees and turns the difference into DOM changes.',
        minutes: 30,
        objectives: [
          'Explain the two rules that make React’s diff fast',
          'Predict when React updates a node, replaces it, or keeps it',
          'Explain why state belongs to a position in the tree',
          'Choose correct keys for lists, and use a key on purpose to reset state',
          'Follow the algorithm React uses to detect moved list items',
        ],
        references: [
          react('learn/preserving-and-resetting-state', 'React: Preserving and resetting state', 'The official explanation of state and tree position.'),
          react('learn/rendering-lists#keeping-list-items-in-order-with-key', 'React: Keeping list items in order with key'),
          { title: 'Legacy React docs: Reconciliation', url: 'https://legacy.reactjs.org/docs/reconciliation.html', note: 'The original description of the diffing heuristics.' },
          react('learn/render-and-commit', 'React: Render and commit'),
        ],
      },
      {
        slug: 'fiber',
        title: 'React Fiber & rendering',
        tagline: 'Render and commit phases, interruptible work, priorities and why hooks have rules.',
        minutes: 30,
        objectives: [
          'Explain the render phase and the commit phase, and what may happen in each',
          'Describe a fiber and its child, sibling and return pointers',
          'Trace the order in which React begins and completes work on a tree',
          'Explain how Fiber pauses work to keep the page responsive, and what transitions add',
          'Connect hooks being stored on the fiber to the Rules of Hooks',
        ],
        references: [
          react('learn/render-and-commit', 'React: Render and commit'),
          react('learn/state-as-a-snapshot', 'React: State as a snapshot'),
          react('learn/queueing-a-series-of-state-updates', 'React: Queueing state updates (batching)'),
          react('reference/react/useTransition', 'React reference: useTransition'),
          react('reference/rules/rules-of-hooks', 'React: Rules of Hooks'),
          { title: 'acdlite/react-fiber-architecture', url: 'https://github.com/acdlite/react-fiber-architecture', note: 'The original design notes for Fiber by a React core team member.' },
        ],
      },
    ],
  },
  {
    id: 'typescript',
    title: 'TypeScript basics',
    shortTitle: 'TypeScript primer',
    tagline: 'Just enough TypeScript to read and write the React code in this course with confidence.',
    description:
      'Four short units: types and inference, objects and unions, functions and generics, and TypeScript in React components. No deep type gymnastics, only what you will meet every day.',
    helpsWith: 'Days 3 and 4, and every React day after',
    units: [
      {
        slug: 'types-and-inference',
        title: 'Types & inference',
        tagline: 'What TypeScript checks, how to annotate, and when to let it infer.',
        minutes: 25,
        objectives: [
          'Explain what TypeScript adds to JavaScript and what it removes at build time',
          'Annotate variables, arrays and function parameters with primitive types',
          'Let inference do the work and know where annotations are still needed',
          'Read a TypeScript error message and fix the cause',
          'Know why to avoid any and when to reach for unknown',
        ],
        references: [
          ts('typescript-in-5-minutes.html', 'TypeScript for JavaScript programmers', 'The official 5-minute intro.'),
          ts('2/basic-types.html', 'Handbook: The Basics'),
          ts('2/everyday-types.html', 'Handbook: Everyday Types', 'Covers almost everything in this primer.'),
          { title: 'TypeScript Playground', url: 'https://www.typescriptlang.org/play', note: 'Try snippets in the browser and see the JavaScript output.' },
        ],
      },
      {
        slug: 'objects-and-unions',
        title: 'Objects & unions',
        tagline: 'Describe the shape of your data and the set of values it can take.',
        minutes: 30,
        objectives: [
          'Describe objects with type aliases and interfaces',
          'Use optional and readonly properties',
          'Model a fixed set of values with literal unions',
          'Narrow a union with typeof, equality checks and discriminants',
          'Handle null and undefined safely with ?. and ??',
        ],
        references: [
          ts('2/objects.html', 'Handbook: Object Types'),
          ts('2/everyday-types.html#union-types', 'Handbook: Union types'),
          ts('2/narrowing.html', 'Handbook: Narrowing', 'Read the sections on typeof, equality and discriminated unions.'),
        ],
      },
      {
        slug: 'functions-and-generics',
        title: 'Functions & generics',
        tagline: 'Type function inputs, outputs and callbacks, and read the <T> you will see everywhere.',
        minutes: 30,
        objectives: [
          'Annotate parameters, optional parameters, defaults and return types',
          'Write function types for callbacks such as onChange and onSelect',
          'Read and write simple generic functions like first<T>()',
          'Recognise generics in React APIs such as useState<T>() and useRef<T>()',
          'Derive types with Partial, Pick and Omit',
        ],
        references: [
          ts('2/functions.html', 'Handbook: More on Functions'),
          ts('2/generics.html', 'Handbook: Generics', 'Read up to "Generic Constraints".'),
          ts('utility-types.html', 'Handbook: Utility Types'),
        ],
      },
      {
        slug: 'typescript-in-react',
        title: 'TypeScript in React',
        tagline: 'Typing props, children, events, state and refs in .tsx files.',
        minutes: 30,
        objectives: [
          'Type component props with an interface, including optional props and defaults',
          'Type children with React.ReactNode',
          'Type event handlers and callback props',
          'Type state with useState<T>() when inference is not enough',
          'Type refs to DOM elements with useRef<HTMLInputElement>(null)',
        ],
        references: [
          react('learn/typescript', 'React: Using TypeScript', 'The official guide. Covers every pattern in this unit.'),
          { title: 'React TypeScript Cheatsheet', url: 'https://react-typescript-cheatsheet.netlify.app/docs/basic/setup', note: 'A community reference for typing React code.' },
          ts('jsx.html', 'Handbook: JSX'),
        ],
      },
    ],
  },
];

export function getPrimerMeta(id: string | undefined): PrimerMeta | undefined {
  return PRIMERS.find((p) => p.id === id);
}

/** Progress key for a primer unit, e.g. "dom-2". Used for notes, visits and exercise ids. */
export function primerUnitKey(primerId: PrimerId, index: number): string {
  return `${primerId}-${index}`;
}

/**
 * Exercise ids of a primer unit. Each unit has exactly two practices and one
 * challenge (enforced by `npm run check:content`), so ids are known without
 * loading the content.
 */
export function primerExerciseIds(primerId: PrimerId, index: number): string[] {
  const key = primerUnitKey(primerId, index);
  return [`${key}-p1`, `${key}-p2`, `${key}-challenge`];
}

export function primerUnitPath(primerId: PrimerId, index: number): string {
  return `/primers/${primerId}/${index}`;
}
