#!/usr/bin/env node
/**
 * Static checks for the course content. Run with `npm run check:content`.
 *
 * This validates structure only (fast, no browser). Whether each exercise's solution
 * passes and its starter fails is verified in the real sandbox at /verify.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const daysDir = join(root, 'src/content/days');
const curriculum = readFileSync(join(root, 'src/content/curriculum.ts'), 'utf8');

const problems = [];
const fail = (msg) => problems.push(msg);

// ---- curriculum metadata ----------------------------------------------------
const metaIds = [...curriculum.matchAll(/^\s{4}id: (\d+),$/gm)].map((m) => Number(m[1]));
if (metaIds.length !== 30) fail(`curriculum.ts should define 30 days, found ${metaIds.length}`);
metaIds.forEach((id, i) => id !== i + 1 && fail(`curriculum day ids must run 1..30 in order (position ${i + 1} has id ${id})`));

const phaseDayIds = [...curriculum.matchAll(/dayIds: \[([^\]]+)\]/g)].flatMap((m) => m[1].split(',').map((s) => Number(s.trim())));
const sortedPhase = [...phaseDayIds].sort((a, b) => a - b);
if (JSON.stringify(sortedPhase) !== JSON.stringify(Array.from({ length: 30 }, (_, i) => i + 1))) fail('PHASES must cover days 1..30 exactly once');

// ---- per-day files -----------------------------------------------------------
const dirs = readdirSync(daysDir).filter((d) => /^\d\d-/.test(d)).sort();
if (dirs.length !== 30) fail(`expected 30 day folders, found ${dirs.length}`);

let exerciseCount = 0;
const seenTitles = new Map();

for (const dir of dirs) {
  const id = Number(dir.slice(0, 2));
  const lessonPath = join(daysDir, dir, 'lesson.md');
  const exercisesPath = join(daysDir, dir, 'exercises.md');
  if (!existsSync(lessonPath)) fail(`${dir}: missing lesson.md`);
  if (!existsSync(exercisesPath)) fail(`${dir}: missing exercises.md`);
  if (!existsSync(lessonPath) || !existsSync(exercisesPath)) continue;

  const lesson = readFileSync(lessonPath, 'utf8');
  const sections = [...lesson.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if (sections.length < 4) fail(`${dir}: lesson has only ${sections.length} sections (expected at least 4)`);
  const crm = sections.find((s) => /^crm\b/i.test(s));
  if (!crm) fail(`${dir}: lesson needs a "## CRM step: ..." section`);
  else {
    const crmBody = lesson.slice(lesson.indexOf(`## ${crm}`));
    const items = crmBody.match(/^- \[ \] .+$/gm) ?? [];
    if (items.length < 2) fail(`${dir}: CRM step needs a checklist of at least 2 "- [ ]" items`);
  }
  if (!/thinking pattern/i.test(lesson)) fail(`${dir}: lesson should include a "thinking pattern" callout`);
  if (lesson.length < 4000) fail(`${dir}: lesson looks too short (${lesson.length} characters)`);

  const ex = readFileSync(exercisesPath, 'utf8');
  const headings = [...ex.matchAll(/^# (practice|challenge): (.+)$/gm)];
  const practices = headings.filter((h) => h[1] === 'practice').length;
  const challenges = headings.filter((h) => h[1] === 'challenge').length;
  if (practices !== 3) fail(`${dir}: expected 3 practices, found ${practices}`);
  if (challenges !== 1) fail(`${dir}: expected exactly 1 challenge, found ${challenges}`);
  exerciseCount += headings.length;

  for (const h of headings) {
    const title = `${h[1]}:${h[2].trim()}`;
    if (seenTitles.has(title)) fail(`${dir}: duplicate exercise title "${h[2]}" (also in ${seenTitles.get(title)})`);
    seenTitles.set(title, dir);
  }

  // every exercise block must have the required parts
  const blocks = ex.split(/^# (?:practice|challenge): /m).slice(1);
  blocks.forEach((block, i) => {
    const title = headings[i]?.[2]?.trim() ?? `#${i + 1}`;
    for (const part of ['prompt', 'starter', 'solution', 'tests', 'explanation', 'hints']) {
      if (!new RegExp(`^### ${part}\\s*$`, 'm').test(block)) fail(`${dir} / "${title}": missing "### ${part}"`);
    }
    if (!/^### hints\s*\n(?:\s*\n)*\s*[-*\d]/m.test(block)) fail(`${dir} / "${title}": hints should be a bullet list`);
    const hintCount = (block.split(/^### hints\s*$/m)[1] ?? '').split('\n').filter((l) => /^\s*[-*]|\d+\./.test(l)).length;
    if (hintCount < 2) fail(`${dir} / "${title}": give at least 2 hints`);
  });
}

// ---- references --------------------------------------------------------------
const urlRe = /url: `?(https?:\/\/[^'"`]+)`?/g;
const refUrls = [...curriculum.matchAll(urlRe)].map((m) => m[1]);
for (const url of refUrls) {
  try {
    new URL(url);
  } catch {
    fail(`curriculum: invalid reference URL ${url}`);
  }
}
// Day objects start with a numeric id; phase objects (which come first) use string ids.
const refsPerDay = curriculum.split(/^\s{2}\{\n\s{4}id: /m).slice(1).filter((chunk) => /^\d+,/.test(chunk));
refsPerDay.forEach((chunk, i) => {
  const n = (chunk.match(/^\s{6}(?:react|ts|mdn)\(|^\s{6}\{ title:/gm) ?? []).length;
  if (n < 3) fail(`curriculum: day ${i + 1} should list at least 3 references (found ${n})`);
  const objectives = (chunk.match(/objectives: \[([\s\S]*?)\n\s{4}\],/) ?? [])[1] ?? '';
  const oc = (objectives.match(/^\s{6}'/gm) ?? []).length;
  if (oc < 3) fail(`curriculum: day ${i + 1} should have at least 3 objectives (found ${oc})`);
});

if (problems.length) {
  console.error(`Content check failed with ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Content OK: ${dirs.length} days, ${exerciseCount} exercises.`);
