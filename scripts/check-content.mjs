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

/** Every exercise block must have the required parts and at least two hints. */
function checkExerciseBlocks(dir, ex, headings) {
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

  checkExerciseBlocks(dir, ex, headings);
}

// ---- primers -------------------------------------------------------------------
// Optional primers: src/content/primers/<id>/NN-slug/{lesson,exercises}.md, metadata in primers.ts.
// Each unit has exactly 2 practices + 1 challenge (exercise ids are derived from that).
const primersMeta = readFileSync(join(root, 'src/content/primers.ts'), 'utf8');
const widgetNames = [...readFileSync(join(root, 'src/features/widgets/index.ts'), 'utf8').matchAll(/^\s+'([\w-]+)':/gm)].map((m) => m[1]);
let primerExerciseCount = 0;
let primerUnitCount = 0;
const primerChunks = primersMeta.split(/^\s{4}id: '/m).slice(1);
if (primerChunks.length === 0) fail('primers.ts: no primers found');
for (const chunk of primerChunks) {
  const primerId = chunk.slice(0, chunk.indexOf("'"));
  const slugs = [...chunk.matchAll(/^\s+slug: '([\w-]+)'/gm)].map((m) => m[1]);
  const primerDir = join(root, 'src/content/primers', primerId);
  if (!existsSync(primerDir)) {
    fail(`primer "${primerId}": missing folder src/content/primers/${primerId}`);
    continue;
  }
  const unitDirs = readdirSync(primerDir).filter((d) => /^\d\d-/.test(d)).sort();
  if (unitDirs.length !== slugs.length) fail(`primer "${primerId}": primers.ts lists ${slugs.length} units but found ${unitDirs.length} folders`);
  unitDirs.forEach((unitDir, i) => {
    const label = `primers/${primerId}/${unitDir}`;
    primerUnitCount++;
    if (Number(unitDir.slice(0, 2)) !== i + 1) fail(`${label}: unit folders must be numbered 01, 02, ... in order`);
    if (slugs[i] && unitDir.slice(3) !== slugs[i]) fail(`${label}: folder name should end with the slug "${slugs[i]}" from primers.ts`);
    const lessonPath = join(primerDir, unitDir, 'lesson.md');
    const exercisesPath = join(primerDir, unitDir, 'exercises.md');
    if (!existsSync(lessonPath) || !existsSync(exercisesPath)) {
      fail(`${label}: needs lesson.md and exercises.md`);
      return;
    }
    const lesson = readFileSync(lessonPath, 'utf8');
    const sections = [...lesson.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    if (sections.length < 4) fail(`${label}: lesson has only ${sections.length} sections (expected at least 4)`);
    if (sections.some((t) => /^crm\b/i.test(t))) fail(`${label}: primers have no CRM step; rename the "## CRM..." section`);
    if (!/thinking pattern/i.test(lesson)) fail(`${label}: lesson should include a "thinking pattern" callout`);
    if (lesson.length < 3000) fail(`${label}: lesson looks too short (${lesson.length} characters)`);
    for (const m of lesson.matchAll(/^```widget\s*\n([\s\S]*?)\n```/gm)) {
      if (!widgetNames.includes(m[1].trim())) fail(`${label}: unknown widget "${m[1].trim()}" (known: ${widgetNames.join(', ')})`);
    }
    const ex = readFileSync(exercisesPath, 'utf8');
    const headings = [...ex.matchAll(/^# (practice|challenge): (.+)$/gm)];
    const practices = headings.filter((h) => h[1] === 'practice').length;
    const challenges = headings.filter((h) => h[1] === 'challenge').length;
    if (practices !== 2) fail(`${label}: expected 2 practices, found ${practices}`);
    if (challenges !== 1) fail(`${label}: expected exactly 1 challenge, found ${challenges}`);
    primerExerciseCount += headings.length;
    checkExerciseBlocks(label, ex, headings);
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
console.log(`Content OK: ${dirs.length} days, ${exerciseCount} exercises; ${primerChunks.length} primers, ${primerUnitCount} units, ${primerExerciseCount} primer exercises.`);
