import type { CodeLanguage, CrmStep, Exercise, ExerciseKind, LessonSection, SandboxMode } from './types.ts';

/** Turn a heading into a stable, URL-safe id. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Split `lesson.md` into sections on level-2 headings. A section whose title
 * starts with "CRM" becomes the day's CRM step; its `- [ ]` items are the
 * checklist.
 */
export function parseLesson(md: string): { sections: LessonSection[]; crm: CrmStep | null } {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const sections: LessonSection[] = [];
  let current: { title: string; body: string[] } | null = null;
  let inFence = false;

  const flush = () => {
    if (!current) return;
    const markdown = current.body.join('\n').trim();
    if (current.title || markdown) sections.push({ id: slugify(current.title || 'intro'), title: current.title || 'Introduction', markdown });
  };

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h2 = !inFence && /^## (.+)$/.exec(line);
    if (h2) {
      flush();
      current = { title: h2[1].trim(), body: [] };
    } else {
      if (!current) current = { title: '', body: [] };
      current.body.push(line);
    }
  }
  flush();

  const crmIndex = sections.findIndex((s) => /^crm\b/i.test(s.title));
  let crm: CrmStep | null = null;
  if (crmIndex !== -1) {
    const [section] = sections.splice(crmIndex, 1);
    const checklist: string[] = [];
    const cleaned = section.markdown
      .split('\n')
      .filter((line) => {
        const m = /^\s*[-*] \[[ xX]\] (.+)$/.exec(line);
        if (m) {
          checklist.push(m[1].trim());
          return false;
        }
        return true;
      })
      .join('\n')
      .trim();
    crm = { title: section.title.replace(/^crm\s*(step)?\s*[:\-–—]?\s*/i, '').trim() || 'CRM step', markdown: cleaned, checklist };
  }

  return { sections, crm };
}

interface RawBlock {
  kind: ExerciseKind;
  title: string;
  parts: Record<string, string>;
}

/**
 * Parse `exercises.md`. Format:
 *
 *   # practice: Title            (or `# challenge: Title`)
 *   ### meta                     (optional `key: value` lines: minutes, mode, language)
 *   ### prompt                   markdown
 *   ### starter                  one fenced code block
 *   ### solution                 one fenced code block
 *   ### tests                    one fenced code block
 *   ### typetests                optional fenced code block (TypeScript only)
 *   ### explanation              markdown
 *   ### hints                    bullet list
 */
export function parseExercises(md: string, dayId: number, idPrefix = `d${String(dayId).padStart(2, '0')}`): { practices: Exercise[]; challenge: Exercise | null } {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: RawBlock[] = [];
  let block: RawBlock | null = null;
  let part: string | null = null;
  let buf: string[] = [];
  let inFence = false;

  const flushPart = () => {
    if (block && part) block.parts[part] = buf.join('\n').trim();
    buf = [];
  };

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h1 = !inFence && /^# (practice|challenge)\s*:\s*(.+)$/i.exec(line);
    const h3 = !inFence && /^### (\w+)\s*$/.exec(line);
    if (h1) {
      flushPart();
      part = null;
      block = { kind: h1[1].toLowerCase() as ExerciseKind, title: h1[2].trim(), parts: {} };
      blocks.push(block);
    } else if (h3 && block) {
      flushPart();
      part = h3[1].toLowerCase();
    } else if (part) {
      buf.push(line);
    }
  }
  flushPart();

  let practiceIndex = 0;
  const practices: Exercise[] = [];
  let challenge: Exercise | null = null;

  for (const b of blocks) {
    const meta = parseMeta(b.parts.meta ?? '');
    const starter = extractCode(b.parts.starter ?? '');
    const solution = extractCode(b.parts.solution ?? '');
    const tests = extractCode(b.parts.tests ?? '');
    const typeTestsRaw = b.parts.typetests ? extractCode(b.parts.typetests) : undefined;
    const language = ((meta.language as CodeLanguage) || starter.lang || 'tsx') as CodeLanguage;
    const mode: SandboxMode = (meta.mode as SandboxMode) || (language === 'tsx' || language === 'jsx' ? 'react' : 'script');
    const isChallenge = b.kind === 'challenge';
    const index = isChallenge ? 0 : ++practiceIndex;
    const id = `${idPrefix}-${isChallenge ? 'challenge' : `p${index}`}`;
    const exercise: Exercise = {
      id,
      dayId,
      kind: b.kind,
      index,
      title: b.title,
      minutes: Number(meta.minutes) || (isChallenge ? 10 : 7),
      language,
      mode,
      prompt: b.parts.prompt ?? '',
      starter: starter.code,
      solution: solution.code,
      explanation: b.parts.explanation ?? '',
      tests: tests.code,
      typeTests: typeTestsRaw?.code || undefined,
      hints: parseBullets(b.parts.hints ?? ''),
    };
    if (isChallenge) challenge = exercise;
    else practices.push(exercise);
  }

  return { practices, challenge };
}

function parseMeta(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = /^\s*([\w-]+)\s*:\s*(.+?)\s*$/.exec(line);
    if (m) out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

function parseBullets(text: string): string[] {
  return text
    .split('\n')
    .map((l) => /^\s*(?:[-*]|\d+\.)\s+(.+)$/.exec(l)?.[1]?.trim() ?? '')
    .filter(Boolean);
}

export function extractCode(text: string): { code: string; lang: string } {
  const m = /(```|~~~)\s*(\w+)?[^\n]*\n([\s\S]*?)\n?\1\s*$/m.exec(text.trim());
  if (!m) return { code: text.trim(), lang: '' };
  return { code: m[3].replace(/\s+$/, ''), lang: (m[2] ?? '').toLowerCase() };
}
