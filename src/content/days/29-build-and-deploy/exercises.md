# practice: Validate the environment

### meta
minutes: 9
language: ts

### prompt
Write and export `parseEnv(env)`, which turns raw environment variables into a typed config and **fails loudly** when something is wrong.

```ts
interface AppConfig { apiUrl: string; appName: string; enablePwa: boolean }
```

- `VITE_API_URL` is **required** and must be a valid `http:` or `https:` URL. Return it **without a trailing slash**.
- `VITE_APP_NAME` is optional (blank or missing means `'Nimbus CRM'`).
- `VITE_ENABLE_PWA` is optional: `'true'` or `'false'` (any case), defaulting to `false`. Any other value is a problem.
- Any variable whose name starts with `VITE_` and contains `SECRET`, `PASSWORD` or `PRIVATE` is a problem (`<NAME> must not be exposed to the browser`): `VITE_` variables are embedded in the public bundle.
- Collect **every** problem and throw one `Error` whose message is `Invalid environment:` followed by a line `- <problem>` per problem. Problem texts: `VITE_API_URL is required`, `VITE_API_URL must be a valid http(s) URL`, `VITE_ENABLE_PWA must be "true" or "false"`.

### starter
```ts
export interface AppConfig {
  apiUrl: string;
  appName: string;
  enablePwa: boolean;
}

export function parseEnv(env: Record<string, string | undefined>): AppConfig {
  // TODO
  return { apiUrl: '', appName: '', enablePwa: false };
}
```

### solution
```ts
export interface AppConfig {
  apiUrl: string;
  appName: string;
  enablePwa: boolean;
}

export function parseEnv(env: Record<string, string | undefined>): AppConfig {
  const problems: string[] = [];

  let apiUrl = '';
  const rawUrl = env.VITE_API_URL?.trim();
  if (!rawUrl) {
    problems.push('VITE_API_URL is required');
  } else {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
      apiUrl = rawUrl.replace(/\/+$/, '');
    } catch {
      problems.push('VITE_API_URL must be a valid http(s) URL');
    }
  }

  const appName = env.VITE_APP_NAME?.trim() || 'Nimbus CRM';

  let enablePwa = false;
  const rawPwa = env.VITE_ENABLE_PWA?.trim().toLowerCase();
  if (rawPwa !== undefined && rawPwa !== '') {
    if (rawPwa === 'true') enablePwa = true;
    else if (rawPwa !== 'false') problems.push('VITE_ENABLE_PWA must be "true" or "false"');
  }

  for (const name of Object.keys(env)) {
    if (/^VITE_/.test(name) && /(SECRET|PASSWORD|PRIVATE)/i.test(name)) {
      problems.push(`${name} must not be exposed to the browser`);
    }
  }

  if (problems.length > 0) throw new Error(`Invalid environment:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  return { apiUrl, appName, enablePwa };
}
```

### tests
```ts
const base = { VITE_API_URL: 'https://nimbus.example.com' };
const message = (env) => {
  try {
    user.parseEnv(env);
  } catch (e) {
    return e.message;
  }
  return null;
};

test('returns a config with defaults', () => {
  expect(user.parseEnv(base)).toEqual({ apiUrl: 'https://nimbus.example.com', appName: 'Nimbus CRM', enablePwa: false });
});

test('strips trailing slashes from the API URL', () => {
  expect(user.parseEnv({ VITE_API_URL: 'https://x.test/api///' }).apiUrl).toBe('https://x.test/api');
  expect(user.parseEnv({ VITE_API_URL: 'http://localhost:5173/' }).apiUrl).toBe('http://localhost:5173');
});

test('reads the optional variables', () => {
  expect(user.parseEnv({ ...base, VITE_APP_NAME: ' Acme CRM ', VITE_ENABLE_PWA: 'TRUE' })).toEqual({
    apiUrl: 'https://nimbus.example.com',
    appName: 'Acme CRM',
    enablePwa: true,
  });
  expect(user.parseEnv({ ...base, VITE_APP_NAME: '   ', VITE_ENABLE_PWA: 'false' }).appName).toBe('Nimbus CRM');
});

test('a missing API URL is an error', () => {
  expect(message({})).toBe('Invalid environment:\n- VITE_API_URL is required');
  expect(message({ VITE_API_URL: '  ' })).toBe('Invalid environment:\n- VITE_API_URL is required');
});

test('the API URL must be a valid http(s) URL', () => {
  expect(message({ VITE_API_URL: 'not a url' })).toBe('Invalid environment:\n- VITE_API_URL must be a valid http(s) URL');
  expect(message({ VITE_API_URL: 'ftp://files.example.com' })).toBe('Invalid environment:\n- VITE_API_URL must be a valid http(s) URL');
});

test('an invalid boolean is an error', () => {
  expect(message({ ...base, VITE_ENABLE_PWA: 'yes' })).toBe('Invalid environment:\n- VITE_ENABLE_PWA must be "true" or "false"');
});

test('secrets exposed with a VITE_ prefix are rejected', () => {
  expect(message({ ...base, VITE_STRIPE_SECRET_KEY: 'sk_live_x' })).toBe('Invalid environment:\n- VITE_STRIPE_SECRET_KEY must not be exposed to the browser');
  expect(message({ ...base, VITE_DB_PASSWORD: 'x' })).toContain('VITE_DB_PASSWORD must not be exposed to the browser');
  expect(message({ ...base, VITE_PRIVATE_TOKEN: 'x' })).toContain('VITE_PRIVATE_TOKEN');
});

test('non-VITE variables with those words are ignored (they are never bundled)', () => {
  expect(user.parseEnv({ ...base, DB_PASSWORD: 'x', NODE_ENV: 'production' }).apiUrl).toBe('https://nimbus.example.com');
});

test('reports every problem at once', () => {
  expect(message({ VITE_ENABLE_PWA: 'maybe', VITE_API_SECRET: 'x' })).toBe(
    'Invalid environment:\n- VITE_API_URL is required\n- VITE_ENABLE_PWA must be "true" or "false"\n- VITE_API_SECRET must not be exposed to the browser',
  );
});
```

### typetests
```ts
const config = parseEnv({ VITE_API_URL: 'https://x.test' });
const url: string = config.apiUrl;
const pwa: boolean = config.enablePwa;
// @ts-expect-error the config has no such field
config.nope;
```

### explanation
Configuration errors are cheap to catch at startup and expensive to debug later as `undefined` somewhere deep in a component. Collecting **all** problems before throwing means a developer fixes the environment in one go instead of one error at a time. The secrets rule is the important security lesson: in a Vite app every `VITE_` variable is **inlined into the public JavaScript bundle**, so a `VITE_..._SECRET_KEY` is published to everyone who loads your site. Real secrets belong on a server. Normalising values (trimming, removing trailing slashes, defaults) in one place keeps the rest of the app simple.

### hints
- Gather messages in a `problems: string[]` array and throw once at the end.
- Validate the URL with `new URL(value)` inside `try/catch` and check `url.protocol`.
- `value.replace(/\/+$/, '')` removes trailing slashes.
- Check names with `/^VITE_/.test(name) && /(SECRET|PASSWORD|PRIVATE)/i.test(name)`.

# practice: A CI workflow as data

### meta
minutes: 7
language: ts

### prompt
GitHub Actions workflows are YAML, which is just data. Write and export `buildCiWorkflow({ nodeVersion = '22' } = {})` returning the workflow as an object (so it could be serialised to YAML):

- `name: 'CI'`.
- Triggers: `on` has `push` limited to the `main` branch, and `pull_request`.
- One job called `verify` that runs on `'ubuntu-latest'`.
- Steps **in this order**: check out the code (`actions/checkout@v4`); set up Node (`actions/setup-node@v4` with `node-version` set to the option and `cache: 'npm'`); install with **`npm ci`**; `npm run typecheck`; `npm test -- --run`; `npm run build`.

### starter
```ts
export interface WorkflowOptions {
  nodeVersion?: string;
}

export function buildCiWorkflow({ nodeVersion = '22' }: WorkflowOptions = {}) {
  // TODO
  return {};
}
```

### solution
```ts
export interface WorkflowOptions {
  nodeVersion?: string;
}

export function buildCiWorkflow({ nodeVersion = '22' }: WorkflowOptions = {}) {
  return {
    name: 'CI',
    on: {
      push: { branches: ['main'] },
      pull_request: {},
    },
    jobs: {
      verify: {
        'runs-on': 'ubuntu-latest',
        steps: [
          { uses: 'actions/checkout@v4' },
          { uses: 'actions/setup-node@v4', with: { 'node-version': nodeVersion, cache: 'npm' } },
          { run: 'npm ci' },
          { run: 'npm run typecheck' },
          { run: 'npm test -- --run' },
          { run: 'npm run build' },
        ],
      },
    },
  };
}
```

### tests
```ts
test('is named CI and runs on pushes to main and on pull requests', () => {
  const w = user.buildCiWorkflow();
  expect(w.name).toBe('CI');
  expect(w.on.push.branches).toEqual(['main']);
  expect(w.on).toHaveProperty('pull_request');
});

test('has a single verify job on ubuntu', () => {
  const w = user.buildCiWorkflow();
  expect(Object.keys(w.jobs)).toEqual(['verify']);
  expect(w.jobs.verify['runs-on']).toBe('ubuntu-latest');
});

test('checks out the code first', () => {
  const steps = user.buildCiWorkflow().jobs.verify.steps;
  expect(steps[0].uses).toBe('actions/checkout@v4');
});

test('sets up Node with npm caching and the requested version', () => {
  const steps = user.buildCiWorkflow().jobs.verify.steps;
  expect(steps[1].uses).toBe('actions/setup-node@v4');
  expect(steps[1].with).toEqual({ 'node-version': '22', cache: 'npm' });
  const custom = user.buildCiWorkflow({ nodeVersion: '20' }).jobs.verify.steps[1];
  expect(custom.with['node-version']).toBe('20');
});

test('installs with npm ci (not npm install)', () => {
  const runs = user.buildCiWorkflow().jobs.verify.steps.map((s) => s.run).filter(Boolean);
  expect(runs[0]).toBe('npm ci');
  expect(runs).not.toContain('npm install');
});

test('runs typecheck, tests and the build, in order, after installing', () => {
  const runs = user.buildCiWorkflow().jobs.verify.steps.map((s) => s.run).filter(Boolean);
  expect(runs).toEqual(['npm ci', 'npm run typecheck', 'npm test -- --run', 'npm run build']);
});

test('returns a fresh object each time', () => {
  const a = user.buildCiWorkflow();
  const b = user.buildCiWorkflow();
  expect(a).toEqual(b);
  expect(a).not.toBe(b);
  a.jobs.verify.steps.pop();
  expect(user.buildCiWorkflow().jobs.verify.steps).toHaveLength(6);
});
```

### typetests
```ts
const w = buildCiWorkflow({ nodeVersion: '22' });
const name: string = w.name;
// @ts-expect-error nodeVersion is a string
buildCiWorkflow({ nodeVersion: 22 });
```

### explanation
CI is a checklist the machine runs for you, ordered from cheapest to most expensive so failures surface quickly: get the code, set up the toolchain (the `cache: 'npm'` option reuses downloaded packages between runs), install, then type-check, test and build. `npm ci` is deliberate: it installs exactly the versions in `package-lock.json` and fails if the lockfile and `package.json` disagree, giving reproducible builds, whereas `npm install` may quietly update things. Treating the workflow as data (an object built by a function) is a useful trick for generating or testing configuration; the object maps one-to-one onto the YAML file.

### hints
- Steps with `uses:` for actions, and `run:` for shell commands.
- `with: { 'node-version': nodeVersion, cache: 'npm' }` (note the quoted key with a hyphen).
- Keep the steps in exactly the order listed in the prompt.

# practice: Vercel configuration

### meta
minutes: 8
language: ts

### prompt
Write and export `buildVercelConfig()` returning the contents of `vercel.json`:

- **`rewrites`**: one rewrite sending every path that does **not** start with `api/` to `/index.html`: `{ source: '/((?!api/).*)', destination: '/index.html' }`. (A single-page app needs this so deep links like `/contacts/7` work after a refresh.)
- **`headers`**:
  - For `/assets/(.*)`: `Cache-Control: public, max-age=31536000, immutable` (hashed files can be cached forever).
  - For `/(.*)`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `X-Frame-Options: DENY`.

### starter
```ts
export function buildVercelConfig() {
  // TODO
  return {};
}
```

### solution
```ts
export function buildVercelConfig() {
  return {
    rewrites: [{ source: '/((?!api/).*)', destination: '/index.html' }],
    headers: [
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ],
  };
}
```

### tests
```ts
const headerMap = (entry) => Object.fromEntries(entry.headers.map((h) => [h.key, h.value]));

test('has a single-page-app rewrite to index.html', () => {
  const c = user.buildVercelConfig();
  expect(c.rewrites).toHaveLength(1);
  expect(c.rewrites[0].destination).toBe('/index.html');
});

test('the rewrite sends app routes to the app but leaves /api alone', () => {
  const { source } = user.buildVercelConfig().rewrites[0];
  const re = new RegExp('^' + source + '$');
  expect(re.test('/contacts/123')).toBe(true);
  expect(re.test('/')).toBe(true);
  expect(re.test('/deals')).toBe(true);
  expect(re.test('/api/contacts')).toBe(false);
  expect(re.test('/api/auth/login')).toBe(false);
});

test('hashed assets are cached for a year as immutable', () => {
  const entry = user.buildVercelConfig().headers.find((h) => h.source === '/assets/(.*)');
  expect(entry).toBeDefined();
  expect(headerMap(entry)['Cache-Control']).toBe('public, max-age=31536000, immutable');
});

test('every response gets the basic security headers', () => {
  const entry = user.buildVercelConfig().headers.find((h) => h.source === '/(.*)');
  expect(entry).toBeDefined();
  expect(headerMap(entry)).toEqual({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  });
});

test('is plain JSON data', () => {
  const c = user.buildVercelConfig();
  expect(JSON.parse(JSON.stringify(c))).toEqual(c);
});

test('returns a fresh object each call', () => {
  const a = user.buildVercelConfig();
  a.rewrites.pop();
  expect(user.buildVercelConfig().rewrites).toHaveLength(1);
});
```

### typetests
```ts
const c = buildVercelConfig();
const first = c.rewrites[0].destination;
```

### explanation
Two problems are solved here. A single-page app has only one real HTML file, so a request for `/contacts/7` would normally be a 404; the **rewrite** tells Vercel to serve `index.html` and let the router take over. The pattern `/((?!api/).*)` uses a negative lookahead so requests to `/api/...` still reach the serverless functions. Second, **caching**: Vite names built assets with a content hash, so a file at `/assets/index-3f9a2c.js` never changes and can be cached for a year with `immutable`, while `index.html` (which points at the current hashes) is not cached long. The security headers prevent MIME sniffing, limit referrer leakage and stop your app being framed by other sites.

### hints
- Rewrites: `[{ source: '/((?!api/).*)', destination: '/index.html' }]`.
- Headers entries are `{ source, headers: [{ key, value }] }`.
- The asset cache header: `public, max-age=31536000, immutable`.

# challenge: A bundle budget analyser

### meta
minutes: 10
language: ts

### prompt
Write and export `analyseBundle(stats, options?)`, a tiny version of what bundle analysers report.

`stats` is `{ chunks: { name: string; modules: { name: string; size: number }[] }[] }` with sizes in **bytes**. `options` is `{ totalBudgetKb = 500, chunkBudgetKb = 250 }`. Round every KB value to **one decimal** (`Math.round(bytes / 1024 * 10) / 10`).

Return:

```ts
{
  totalKb: number,
  chunks: { name: string; kb: number }[],        // largest first
  largestChunk: { name: string; kb: number } | null,
  topModules: { name: string; kb: number }[],    // top 3 modules by total size across all chunks (same name = same module), largest first
  warnings: string[],
}
```

Warnings, in this order:

1. If `totalKb > totalBudgetKb`: `Total bundle is <totalKb> KB (budget <budget> KB)`.
2. For each chunk with `kb > chunkBudgetKb`, largest first: `Chunk "<name>" is <kb> KB (budget <budget> KB): consider code splitting`.
3. For each module name that appears in **more than one chunk**, alphabetically: `Module "<name>" is duplicated in <n> chunks`.
4. For each module named `moment` or `lodash` (alphabetically): `Consider replacing "<name>": <hint>` where the hint for `moment` is `use Intl or date-fns` and for `lodash` is `use native methods or lodash-es`.

### starter
```ts
export interface BundleStats {
  chunks: { name: string; modules: { name: string; size: number }[] }[];
}

export interface BudgetOptions {
  totalBudgetKb?: number;
  chunkBudgetKb?: number;
}

export function analyseBundle(stats: BundleStats, options: BudgetOptions = {}) {
  // TODO
  return {
    totalKb: 0,
    chunks: [] as { name: string; kb: number }[],
    largestChunk: null as { name: string; kb: number } | null,
    topModules: [] as { name: string; kb: number }[],
    warnings: [] as string[],
  };
}
```

### solution
```ts
export interface BundleStats {
  chunks: { name: string; modules: { name: string; size: number }[] }[];
}

export interface BudgetOptions {
  totalBudgetKb?: number;
  chunkBudgetKb?: number;
}

const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10;

const HINTS: Record<string, string> = {
  lodash: 'use native methods or lodash-es',
  moment: 'use Intl or date-fns',
};

export function analyseBundle(stats: BundleStats, { totalBudgetKb = 500, chunkBudgetKb = 250 }: BudgetOptions = {}) {
  const chunkSizes = stats.chunks.map((chunk) => ({
    name: chunk.name,
    bytes: chunk.modules.reduce((sum, m) => sum + m.size, 0),
  }));

  const totalBytes = chunkSizes.reduce((sum, c) => sum + c.bytes, 0);
  const chunks = chunkSizes.map((c) => ({ name: c.name, kb: kb(c.bytes) })).sort((a, b) => b.kb - a.kb || a.name.localeCompare(b.name));

  const moduleBytes = new Map<string, number>();
  const moduleChunks = new Map<string, number>();
  for (const chunk of stats.chunks) {
    const seenInThisChunk = new Set<string>();
    for (const m of chunk.modules) {
      moduleBytes.set(m.name, (moduleBytes.get(m.name) ?? 0) + m.size);
      seenInThisChunk.add(m.name);
    }
    for (const name of seenInThisChunk) moduleChunks.set(name, (moduleChunks.get(name) ?? 0) + 1);
  }

  const topModules = [...moduleBytes]
    .map(([name, bytes]) => ({ name, kb: kb(bytes) }))
    .sort((a, b) => b.kb - a.kb || a.name.localeCompare(b.name))
    .slice(0, 3);

  const totalKb = kb(totalBytes);
  const warnings: string[] = [];

  if (totalKb > totalBudgetKb) warnings.push(`Total bundle is ${totalKb} KB (budget ${totalBudgetKb} KB)`);

  for (const chunk of chunks) {
    if (chunk.kb > chunkBudgetKb) warnings.push(`Chunk "${chunk.name}" is ${chunk.kb} KB (budget ${chunkBudgetKb} KB): consider code splitting`);
  }

  const names = [...moduleChunks.keys()].sort();
  for (const name of names) {
    const count = moduleChunks.get(name) ?? 0;
    if (count > 1) warnings.push(`Module "${name}" is duplicated in ${count} chunks`);
  }
  for (const name of names) {
    if (name in HINTS) warnings.push(`Consider replacing "${name}": ${HINTS[name]}`);
  }

  return { totalKb, chunks, largestChunk: chunks[0] ?? null, topModules, warnings };
}
```

### tests
```ts
const KB = 1024;
const stats = (chunks) => ({ chunks });
const chunk = (name, modules) => ({ name, modules: Object.entries(modules).map(([n, kb]) => ({ name: n, size: kb * KB })) });

test('sums sizes per chunk and in total, rounded to one decimal', () => {
  const r = user.analyseBundle(stats([chunk('index', { app: 10.25, react: 40 }), chunk('charts', { recharts: 100 })]));
  expect(r.totalKb).toBe(150.3);
  expect(r.chunks).toEqual([
    { name: 'charts', kb: 100 },
    { name: 'index', kb: 50.3 },
  ]);
  expect(r.largestChunk).toEqual({ name: 'charts', kb: 100 });
});

test('an empty bundle', () => {
  const r = user.analyseBundle(stats([]));
  expect(r).toEqual({ totalKb: 0, chunks: [], largestChunk: null, topModules: [], warnings: [] });
});

test('top modules are aggregated across chunks and limited to three', () => {
  const r = user.analyseBundle(
    stats([chunk('a', { react: 30, router: 20, zod: 5 }), chunk('b', { react: 30, date: 12, tiny: 1 })]),
  );
  expect(r.topModules).toEqual([
    { name: 'react', kb: 60 },
    { name: 'router', kb: 20 },
    { name: 'date', kb: 12 },
  ]);
});

test('no warnings when within budget', () => {
  const r = user.analyseBundle(stats([chunk('index', { react: 100, app: 50 })]));
  expect(r.warnings).toEqual([]);
});

test('warns when the total budget is exceeded', () => {
  const r = user.analyseBundle(stats([chunk('a', { x: 200 }), chunk('b', { y: 200 }), chunk('c', { z: 150 })]));
  expect(r.warnings).toEqual(['Total bundle is 550 KB (budget 500 KB)']);
});

test('warns about chunks over the chunk budget, largest first', () => {
  const r = user.analyseBundle(stats([chunk('small', { a: 10 }), chunk('medium', { b: 260 }), chunk('big', { c: 300 })]), { totalBudgetKb: 10000 });
  expect(r.warnings).toEqual([
    'Chunk "big" is 300 KB (budget 250 KB): consider code splitting',
    'Chunk "medium" is 260 KB (budget 250 KB): consider code splitting',
  ]);
});

test('custom budgets are respected in the messages', () => {
  const r = user.analyseBundle(stats([chunk('index', { a: 120 })]), { totalBudgetKb: 100, chunkBudgetKb: 50 });
  expect(r.warnings).toEqual([
    'Total bundle is 120 KB (budget 100 KB)',
    'Chunk "index" is 120 KB (budget 50 KB): consider code splitting',
  ]);
});

test('warns about modules duplicated across chunks, alphabetically', () => {
  const r = user.analyseBundle(stats([chunk('a', { react: 5, zod: 5 }), chunk('b', { react: 5, zod: 5, other: 1 }), chunk('c', { react: 5 })]));
  expect(r.warnings).toEqual(['Module "react" is duplicated in 3 chunks', 'Module "zod" is duplicated in 2 chunks']);
});

test('a module listed twice in one chunk is not a duplicate', () => {
  const r = user.analyseBundle(stats([{ name: 'a', modules: [{ name: 'x', size: KB }, { name: 'x', size: KB }] }]));
  expect(r.warnings).toEqual([]);
  expect(r.topModules).toEqual([{ name: 'x', kb: 2 }]);
});

test('suggests replacements for heavy libraries', () => {
  const r = user.analyseBundle(stats([chunk('index', { moment: 70, lodash: 70, react: 40 })]));
  expect(r.warnings).toEqual([
    'Consider replacing "lodash": use native methods or lodash-es',
    'Consider replacing "moment": use Intl or date-fns',
  ]);
});

test('warnings come in the documented order', () => {
  const r = user.analyseBundle(stats([chunk('a', { moment: 300, react: 150 }), chunk('b', { react: 150 })]));
  expect(r.warnings).toEqual([
    'Total bundle is 600 KB (budget 500 KB)',
    'Chunk "a" is 450 KB (budget 250 KB): consider code splitting',
    'Module "react" is duplicated in 2 chunks',
    'Consider replacing "moment": use Intl or date-fns',
  ]);
});

test('does not mutate the stats', () => {
  const input = stats([chunk('a', { x: 10 })]);
  const before = JSON.stringify(input);
  user.analyseBundle(input);
  expect(JSON.stringify(input)).toBe(before);
});
```

### typetests
```ts
const r = analyseBundle({ chunks: [{ name: 'a', modules: [{ name: 'x', size: 1 }] }] });
const total: number = r.totalKb;
const warnings: string[] = r.warnings;
const big: { name: string; kb: number } | null = r.largestChunk;
// @ts-expect-error modules need a size
analyseBundle({ chunks: [{ name: 'a', modules: [{ name: 'x' }] }] });
```

### explanation
This is the logic behind performance budgets in CI: turn raw sizes into a small report and warn when a limit is crossed. The structure is aggregate, then check. **Aggregate** modules by name across chunks to find the real heavyweights and, separately, how many chunks each module appears in (duplication is wasted bytes). **Check** against budgets in a fixed order, so the output is stable and easy to compare between builds. Counting each module once per chunk (using a `Set` per chunk) prevents a module listed twice in one chunk being wrongly flagged as duplicated. Real tools such as `rollup-plugin-visualizer` and `vite-bundle-visualizer` produce the same data; failing CI when a budget is exceeded keeps bundles from growing unnoticed.

### hints
- Per chunk: `bytes = modules.reduce((s, m) => s + m.size, 0)`; round with `Math.round(bytes / 1024 * 10) / 10`.
- Two `Map`s: total bytes per module name, and the number of *chunks* each name appears in.
- Sort chunks and modules by `kb` descending (break ties by name).
- Push the warnings in the documented order: total, chunks, duplicates, then replacements.
