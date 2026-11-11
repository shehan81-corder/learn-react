# practice: Monthly totals

### meta
minutes: 9
language: ts

### prompt
Write and export `monthlyTotals(deals, { now, months = 6 })` for a revenue chart.

- `deals` are `{ stage: string; value: number; closedAt?: string }` (ISO dates).
- Only deals with `stage === 'won'` and a valid `closedAt` count.
- Return `months` entries, **oldest first**, ending with the month that contains `now`: `{ month: 'YYYY-MM', value: number }`.
- Months with no wins appear with `value: 0` (no gaps); deals outside the window are ignored; several deals in one month are summed.
- Bucket by **UTC** year and month. `now` may be a `Date`, an ISO string or a timestamp.

### starter
```ts
export interface Deal {
  stage: string;
  value: number;
  closedAt?: string;
}

export interface MonthTotal {
  month: string;
  value: number;
}

export function monthlyTotals(deals: Deal[], options: { now: Date | string | number; months?: number }): MonthTotal[] {
  // TODO
  return [];
}
```

### solution
```ts
export interface Deal {
  stage: string;
  value: number;
  closedAt?: string;
}

export interface MonthTotal {
  month: string;
  value: number;
}

const keyOf = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

export function monthlyTotals(deals: Deal[], { now, months = 6 }: { now: Date | string | number; months?: number }): MonthTotal[] {
  const end = new Date(now);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    keys.push(keyOf(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1))));
  }

  const totals = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const deal of deals) {
    if (deal.stage !== 'won' || !deal.closedAt) continue;
    const closed = new Date(deal.closedAt);
    if (Number.isNaN(closed.getTime())) continue;
    const key = keyOf(closed);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + deal.value);
  }

  return keys.map((month) => ({ month, value: totals.get(month) ?? 0 }));
}
```

### tests
```ts
const now = '2026-11-15T10:00:00Z';

test('returns one entry per month, oldest first, ending at the current month', () => {
  expect(user.monthlyTotals([], { now, months: 3 })).toEqual([
    { month: '2026-09', value: 0 },
    { month: '2026-10', value: 0 },
    { month: '2026-11', value: 0 },
  ]);
});

test('defaults to six months', () => {
  const result = user.monthlyTotals([], { now });
  expect(result).toHaveLength(6);
  expect(result[0].month).toBe('2026-06');
  expect(result[5].month).toBe('2026-11');
});

test('crosses a year boundary', () => {
  const result = user.monthlyTotals([], { now: '2026-02-10T00:00:00Z', months: 4 });
  expect(result.map((r) => r.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
});

test('sums won deals into their month', () => {
  const deals = [
    { stage: 'won', value: 100, closedAt: '2026-10-02T00:00:00Z' },
    { stage: 'won', value: 250, closedAt: '2026-10-28T12:00:00Z' },
    { stage: 'won', value: 40, closedAt: '2026-11-01T00:00:00Z' },
  ];
  expect(user.monthlyTotals(deals, { now, months: 3 })).toEqual([
    { month: '2026-09', value: 0 },
    { month: '2026-10', value: 350 },
    { month: '2026-11', value: 40 },
  ]);
});

test('ignores deals that are not won, have no date, or have an invalid date', () => {
  const deals = [
    { stage: 'lost', value: 999, closedAt: '2026-11-02T00:00:00Z' },
    { stage: 'proposal', value: 999, closedAt: '2026-11-03T00:00:00Z' },
    { stage: 'won', value: 999 },
    { stage: 'won', value: 999, closedAt: 'not a date' },
  ];
  expect(user.monthlyTotals(deals, { now, months: 2 }).map((r) => r.value)).toEqual([0, 0]);
});

test('ignores deals outside the window', () => {
  const deals = [
    { stage: 'won', value: 500, closedAt: '2025-01-15T00:00:00Z' },
    { stage: 'won', value: 600, closedAt: '2027-01-15T00:00:00Z' },
  ];
  expect(user.monthlyTotals(deals, { now, months: 3 }).map((r) => r.value)).toEqual([0, 0, 0]);
});

test('buckets by UTC at month edges', () => {
  const deals = [
    { stage: 'won', value: 1, closedAt: '2026-10-31T23:59:59Z' },
    { stage: 'won', value: 2, closedAt: '2026-11-01T00:00:00Z' },
  ];
  const [, oct, nov] = user.monthlyTotals(deals, { now, months: 3 });
  expect(oct.value).toBe(1);
  expect(nov.value).toBe(2);
});

test('accepts Date objects and timestamps for now', () => {
  expect(user.monthlyTotals([], { now: new Date('2026-11-15T00:00:00Z'), months: 1 })[0].month).toBe('2026-11');
  expect(user.monthlyTotals([], { now: Date.UTC(2026, 5, 20), months: 1 })[0].month).toBe('2026-06');
});

test('does not mutate the deals', () => {
  const deals = [{ stage: 'won', value: 5, closedAt: '2026-11-01T00:00:00Z' }];
  const before = JSON.stringify(deals);
  user.monthlyTotals(deals, { now });
  expect(JSON.stringify(deals)).toBe(before);
});
```

### typetests
```ts
const r = monthlyTotals([{ stage: 'won', value: 1 }], { now: new Date() });
const m: string = r[0].month;
const v: number = r[0].value;
// @ts-expect-error now is required
monthlyTotals([], { months: 3 });
```

### explanation
Generating the **expected buckets first** and then adding data into them is what guarantees there are no gaps: a month with no wins still appears as `0`, so the chart's x-axis is honest. Passing `now` in makes the function deterministic; if it called `new Date()` itself you could never test "the month boundary". Using UTC getters (`getUTCFullYear`, `getUTCMonth`) means a deal closed at `23:59:59Z` on the 31st belongs to that month regardless of the viewer's time zone. `Date.UTC(year, month - i, 1)` handles year rollovers automatically because months outside 0..11 roll into adjacent years.

### hints
- Build the list of month keys first: `Date.UTC(endYear, endMonth - i, 1)` for `i` from `months - 1` down to `0`.
- Put zeros in a `Map`, then add each qualifying deal's value to its key if the key is in the window.
- `String(date.getUTCMonth() + 1).padStart(2, '0')` formats the month.

# practice: Format numbers and dates

### meta
minutes: 8
language: ts

### prompt
Write and export four formatters using `Intl` (locale `en-AU`):

- `formatCurrency(amount, currency = 'AUD')`: currency with thousands separators and two decimals, e.g. `$1,234.50`. Negative amounts keep the minus sign.
- `formatCompact(n)`: compact notation with at most one decimal: `999` → `999`, `1234` → `1.2K`, `1_500_000` → `1.5M`.
- `formatPercent(ratio, digits = 0)`: a ratio as a percent with the given decimals: `0.1234` → `12%`, with `digits = 1` → `12.3%`.
- `formatMonth(key)`: turns `'2026-03'` into a short month and year such as `Mar 2026` (use UTC so the result never depends on the viewer's time zone).

Create each `Intl` formatter **once** (outside the functions), not on every call.

### starter
```ts
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return String(amount);
}

export function formatCompact(n: number): string {
  return String(n);
}

export function formatPercent(ratio: number, digits: number = 0): string {
  return String(ratio);
}

export function formatMonth(key: string): string {
  return key;
}
```

### solution
```ts
const LOCALE = 'en-AU';

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const percentFormatters = new Map<number, Intl.NumberFormat>();
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function formatCompact(n: number): string {
  return compact.format(n);
}

export function formatPercent(ratio: number, digits: number = 0): string {
  let formatter = percentFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits });
    percentFormatters.set(digits, formatter);
  }
  return formatter.format(ratio);
}

export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
}
```

### tests
```ts
test('formatCurrency uses a dollar sign, separators and two decimals', () => {
  expect(user.formatCurrency(1234.5)).toBe('$1,234.50');
  expect(user.formatCurrency(0)).toBe('$0.00');
  expect(user.formatCurrency(1000000)).toBe('$1,000,000.00');
});

test('formatCurrency keeps the sign of negative amounts', () => {
  expect(user.formatCurrency(-5)).toMatch(/^-\$5\.00$/);
});

test('formatCurrency supports other currencies', () => {
  const nzd = user.formatCurrency(10, 'NZD');
  expect(nzd).toContain('10.00');
  expect(nzd).not.toBe(user.formatCurrency(10, 'AUD'));
});

test('formatCompact abbreviates large numbers', () => {
  expect(user.formatCompact(999)).toBe('999');
  expect(user.formatCompact(1234)).toBe('1.2K');
  expect(user.formatCompact(1500000)).toBe('1.5M');
  expect(user.formatCompact(12000)).toBe('12K');
});

test('formatPercent formats ratios', () => {
  expect(user.formatPercent(0.1234)).toBe('12%');
  expect(user.formatPercent(0.1234, 1)).toBe('12.3%');
  expect(user.formatPercent(1)).toBe('100%');
  expect(user.formatPercent(0)).toBe('0%');
});

test('formatMonth shows a short month and the year', () => {
  expect(user.formatMonth('2026-03')).toMatch(/^Mar(ch)? 2026$/);
  expect(user.formatMonth('2026-11')).toMatch(/^Nov(ember)? 2026$/);
  expect(user.formatMonth('2025-12')).toMatch(/^Dec(ember)? 2025$/);
});

test('formatMonth does not depend on the time zone (first day of the month)', () => {
  expect(user.formatMonth('2026-01')).toMatch(/^Jan(uary)? 2026$/);
});
```

### typetests
```ts
const a: string = formatCurrency(1);
const b: string = formatCurrency(1, 'USD');
const c: string = formatCompact(1);
const d: string = formatPercent(0.5, 1);
const e: string = formatMonth('2026-01');
// @ts-expect-error amounts are numbers
formatCurrency('1');
```

### explanation
`Intl.NumberFormat` and `Intl.DateTimeFormat` already know how every locale writes numbers, currencies and dates, so you never hand-roll separators or month names. Constructing a formatter is comparatively expensive, so they are created once and reused (the small `Map`s cache the ones that depend on a parameter). For `formatMonth` the month key is turned into a UTC date and formatted with `timeZone: 'UTC'`: without that, `2026-01-01T00:00Z` would render as *December 2025* for anyone west of Greenwich. Formatting belongs in tiny pure functions like these so every chart, tile and table shows numbers consistently.

### hints
- `new Intl.NumberFormat('en-AU', { style: 'currency', currency })`
- Compact: `{ notation: 'compact', maximumFractionDigits: 1 }`
- Percent: `{ style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }`
- Month: `new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' })` on `Date.UTC(year, month - 1, 1)`.

# practice: A KPI tile with every state

### meta
minutes: 8
language: tsx

### prompt
Build `KpiTile({ label, value, status = 'ready', delta, onRetry })`.

The tile is a `<div role="group" aria-label={label}>` and always shows the label in an `<h3>`.

- `status="loading"`: add `aria-busy="true"` and show `<span class="skeleton" aria-hidden="true"></span>` instead of a value.
- `status="error"`: show `<p role="alert">Could not load</p>` and a **Retry** button that calls `onRetry`.
- `status="ready"`: show `<p class="value">{value}</p>`; when `value` is `null` or `undefined` show an em dash `—`.
- In the ready state, when `delta` (a ratio such as `0.12`) is provided show `<small class="delta up|down|flat">` containing an arrow and the absolute percentage: `▲ 12%`, `▼ 5%` or `– 0%` for no change. The sign must be expressed with the arrow, not only colour.

### starter
```tsx
export interface KpiTileProps {
  label: string;
  value?: string | null;
  status?: 'loading' | 'error' | 'ready';
  delta?: number;
  onRetry?: () => void;
}

export function KpiTile(props: KpiTileProps) {
  // TODO
  return <div />;
}

export default function App() {
  return (
    <div>
      <KpiTile label="Open value" value="$12,500" delta={0.12} />
      <KpiTile label="Win rate" status="loading" />
      <KpiTile label="Deals" status="error" onRetry={() => {}} />
    </div>
  );
}
```

### solution
```tsx
export interface KpiTileProps {
  label: string;
  value?: string | null;
  status?: 'loading' | 'error' | 'ready';
  delta?: number;
  onRetry?: () => void;
}

const percent = (ratio: number) => `${Math.round(Math.abs(ratio) * 100)}%`;

export function KpiTile({ label, value, status = 'ready', delta, onRetry }: KpiTileProps) {
  return (
    <div role="group" aria-label={label} aria-busy={status === 'loading' ? true : undefined}>
      <h3>{label}</h3>
      {status === 'loading' && <span className="skeleton" aria-hidden="true"></span>}
      {status === 'error' && (
        <div>
          <p role="alert">Could not load</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}
      {status === 'ready' && (
        <>
          <p className="value">{value ?? '—'}</p>
          {delta !== undefined && (
            <small className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {percent(delta)}
            </small>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <KpiTile label="Open value" value="$12,500" delta={0.12} />
      <KpiTile label="Win rate" status="loading" />
      <KpiTile label="Deals" status="error" onRetry={() => {}} />
    </div>
  );
}
```

### tests
```tsx
const tile = (view) => view.$('[role=group]');

test('is a labelled group with a heading', async () => {
  const view = await render(<user.KpiTile label="Open value" value="$1" />);
  expect(tile(view).getAttribute('aria-label')).toBe('Open value');
  expect(view.$('h3').textContent).toBe('Open value');
});

test('ready: shows the value', async () => {
  const view = await render(<user.KpiTile label="Open" value="$12,500" />);
  expect(view.$('.value').textContent).toBe('$12,500');
  expect(tile(view).hasAttribute('aria-busy')).toBe(false);
});

test('ready: shows an em dash when there is no value', async () => {
  const a = await render(<user.KpiTile label="Open" value={null} />);
  expect(a.$('.value').textContent).toBe('—');
  const b = await render(<user.KpiTile label="Open" />);
  expect(b.$('.value').textContent).toBe('—');
});

test('loading: busy skeleton instead of a value', async () => {
  const view = await render(<user.KpiTile label="Open" status="loading" value="$1" />);
  expect(tile(view).getAttribute('aria-busy')).toBe('true');
  expect(view.$('.skeleton').getAttribute('aria-hidden')).toBe('true');
  expect(view.$('.value')).toBeNull();
});

test('error: an alert with a working Retry button', async () => {
  const onRetry = fn();
  const view = await render(<user.KpiTile label="Open" status="error" onRetry={onRetry} />);
  expect(view.$('[role=alert]').textContent).toBe('Could not load');
  expect(view.$('.value')).toBeNull();
  await click(view.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('delta: up, down and flat use arrows and absolute percentages', async () => {
  const up = await render(<user.KpiTile label="A" value="1" delta={0.12} />);
  expect(up.$('.delta').textContent).toBe('▲ 12%');
  expect(up.$('.delta').classList.contains('up')).toBe(true);
  const down = await render(<user.KpiTile label="B" value="1" delta={-0.054} />);
  expect(down.$('.delta').textContent).toBe('▼ 5%');
  expect(down.$('.delta').classList.contains('down')).toBe(true);
  const flat = await render(<user.KpiTile label="C" value="1" delta={0} />);
  expect(flat.$('.delta').textContent).toBe('– 0%');
  expect(flat.$('.delta').classList.contains('flat')).toBe(true);
});

test('no delta element without a delta, and none while loading or failed', async () => {
  const none = await render(<user.KpiTile label="A" value="1" />);
  expect(none.$('.delta')).toBeNull();
  const loading = await render(<user.KpiTile label="B" status="loading" delta={0.5} />);
  expect(loading.$('.delta')).toBeNull();
});
```

### typetests
```tsx
const a = <KpiTile label="x" />;
const b = <KpiTile label="x" status="error" onRetry={() => {}} />;
// @ts-expect-error label is required
const c = <KpiTile value="1" />;
// @ts-expect-error unknown status
const d = <KpiTile label="x" status="broken" />;
```

### explanation
A tile is really four UIs behind one component, so each state is rendered explicitly: a **skeleton** that reserves space (and `aria-busy` so assistive technology knows content is coming), an **error** with a way forward, an honest **dash** for missing data (never `0` or `NaN`) and the **ready** value. The delta carries its meaning in an *arrow and a number*, not just colour, because red/green alone is invisible to colour-blind users. `role="group"` with an `aria-label` lets screen readers announce each tile as a unit.

### hints
- `aria-busy={status === 'loading' ? true : undefined}` so the attribute is absent otherwise.
- `{value ?? '—'}` handles both `null` and `undefined`.
- Choose arrow and class from the sign of `delta`; show `Math.round(Math.abs(delta) * 100)`.

# challenge: A bar chart in SVG

### meta
minutes: 10
language: tsx

### prompt
Build `BarChart({ data, width = 300, height = 108, label })` using plain SVG.

`data` is `{ label: string; value: number }[]`.

- When `data` is empty render `<p>No data</p>` instead of the chart.
- Otherwise render `<svg role="img" aria-label={label} width height viewBox="0 0 {width} {height}">` containing a `<title>{label}</title>`.
- Layout constants: `top = 8` and `bottom = 24` (room for labels), so the plot height is `height - top - bottom`. Each bar gets an equal **slot** (`width / data.length`); the bar is **60%** of the slot, centred in it.
- Bar height is `value / max * plotHeight`, where `max` is the largest value (negative values count as `0`). If the maximum is `0`, all heights are `0`. Bars sit on the baseline: `y = top + plotHeight - barHeight`.
- Each bar is a `<rect>` with numeric `x`, `y`, `width` and `height` attributes and a child `<title>{label}: {value}</title>` (a hover tooltip).
- Under each bar render a `<text>` with the bar's label, centred (`textAnchor="middle"`) at the slot's centre, `y = height - 6`.

### starter
```tsx
export interface Datum {
  label: string;
  value: number;
}

export function BarChart({ data, width = 300, height = 108, label }: { data: Datum[]; width?: number; height?: number; label: string }) {
  // TODO
  return <svg />;
}

export default function App() {
  return (
    <BarChart
      label="Won revenue by month"
      data={[
        { label: 'Sep', value: 10 },
        { label: 'Oct', value: 20 },
        { label: 'Nov', value: 5 },
      ]}
    />
  );
}
```

### solution
```tsx
export interface Datum {
  label: string;
  value: number;
}

const TOP = 8;
const BOTTOM = 24;

export function BarChart({ data, width = 300, height = 108, label }: { data: Datum[]; width?: number; height?: number; label: string }) {
  if (data.length === 0) return <p>No data</p>;

  const plotHeight = height - TOP - BOTTOM;
  const slot = width / data.length;
  const barWidth = slot * 0.6;
  const max = Math.max(0, ...data.map((d) => d.value));

  return (
    <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <title>{label}</title>
      {data.map((d, i) => {
        const barHeight = max === 0 ? 0 : (Math.max(0, d.value) / max) * plotHeight;
        const x = i * slot + (slot - barWidth) / 2;
        const y = TOP + plotHeight - barHeight;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={i * slot + slot / 2} y={height - 6} textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  return (
    <BarChart
      label="Won revenue by month"
      data={[
        { label: 'Sep', value: 10 },
        { label: 'Oct', value: 20 },
        { label: 'Nov', value: 5 },
      ]}
    />
  );
}
```

### tests
```tsx
const num = (el, attr) => parseFloat(el.getAttribute(attr));
const data = [
  { label: 'A', value: 10 },
  { label: 'B', value: 20 },
  { label: 'C', value: 0 },
];
const bars = (view) => view.$$('rect');

test('is an accessible image with a title', async () => {
  const view = await render(<user.BarChart data={data} width={300} height={108} label="Revenue" />);
  const svg = view.$('svg');
  expect(svg.getAttribute('role')).toBe('img');
  expect(svg.getAttribute('aria-label')).toBe('Revenue');
  expect(svg.getAttribute('viewBox')).toBe('0 0 300 108');
  expect(svg.querySelector(':scope > title').textContent).toBe('Revenue');
});

test('renders one rect per datum with per-bar tooltips', async () => {
  const view = await render(<user.BarChart data={data} width={300} height={108} label="Revenue" />);
  expect(bars(view)).toHaveLength(3);
  expect(bars(view).map((r) => r.querySelector('title').textContent)).toEqual(['A: 10', 'B: 20', 'C: 0']);
});

test('bar heights are proportional to the largest value', async () => {
  const view = await render(<user.BarChart data={data} width={300} height={108} label="x" />);
  const [a, b, c] = bars(view);
  expect(num(b, 'height')).toBeCloseTo(76, 1);
  expect(num(a, 'height')).toBeCloseTo(38, 1);
  expect(num(c, 'height')).toBeCloseTo(0, 1);
});

test('bars sit on the baseline (SVG y grows downwards)', async () => {
  const view = await render(<user.BarChart data={data} width={300} height={108} label="x" />);
  const [a, b, c] = bars(view);
  expect(num(b, 'y')).toBeCloseTo(8, 1);
  expect(num(a, 'y')).toBeCloseTo(46, 1);
  expect(num(c, 'y')).toBeCloseTo(84, 1);
  for (const bar of [a, b, c]) expect(num(bar, 'y') + num(bar, 'height')).toBeCloseTo(84, 1);
});

test('bars are 60% of an equal slot and centred in it', async () => {
  const view = await render(<user.BarChart data={data} width={300} height={108} label="x" />);
  const [a, b, c] = bars(view);
  expect(num(a, 'width')).toBeCloseTo(60, 1);
  expect(num(a, 'x')).toBeCloseTo(20, 1);
  expect(num(b, 'x')).toBeCloseTo(120, 1);
  expect(num(c, 'x')).toBeCloseTo(220, 1);
});

test('labels are centred under each bar', async () => {
  const view = await render(<user.BarChart data={data} width={300} height={108} label="x" />);
  const texts = view.$$('text');
  expect(texts.map((t) => t.textContent)).toEqual(['A', 'B', 'C']);
  expect(texts.map((t) => num(t, 'x'))).toEqual([50, 150, 250]);
  expect(texts.every((t) => num(t, 'y') === 102)).toBe(true);
  expect(texts[0].getAttribute('text-anchor')).toBe('middle');
});

test('an empty dataset shows a message instead of a chart', async () => {
  const view = await render(<user.BarChart data={[]} label="x" />);
  expect(view.$('p').textContent).toBe('No data');
  expect(view.$('svg')).toBeNull();
});

test('all zeros give zero-height bars (no NaN)', async () => {
  const view = await render(
    <user.BarChart data={[{ label: 'A', value: 0 }, { label: 'B', value: 0 }]} width={200} height={108} label="x" />,
  );
  for (const bar of bars(view)) {
    expect(num(bar, 'height')).toBe(0);
    expect(Number.isNaN(num(bar, 'y'))).toBe(false);
  }
});

test('negative values are drawn as zero-height bars', async () => {
  const view = await render(
    <user.BarChart data={[{ label: 'A', value: -5 }, { label: 'B', value: 10 }]} width={200} height={108} label="x" />,
  );
  expect(num(bars(view)[0], 'height')).toBe(0);
  expect(num(bars(view)[1], 'height')).toBeCloseTo(76, 1);
});

test('defaults to 300 by 108 and respects other sizes', async () => {
  const view = await render(<user.BarChart data={data} label="x" />);
  expect(view.$('svg').getAttribute('width')).toBe('300');
  const wide = await render(<user.BarChart data={data} width={600} height={208} label="x" />);
  expect(num(wide.$$('rect')[1], 'height')).toBeCloseTo(176, 1);
});
```

### typetests
```tsx
const ok = <BarChart label="x" data={[{ label: 'a', value: 1 }]} />;
// @ts-expect-error label is required
const bad1 = <BarChart data={[]} />;
// @ts-expect-error each datum needs a numeric value
const bad2 = <BarChart label="x" data={[{ label: 'a', value: '1' }]} />;
```

### explanation
Every chart is a set of **scales**: functions from data to pixels. Here the vertical scale is `value / max * plotHeight`, and the horizontal one divides the width into equal slots. The classic trap is SVG's coordinate system: `y` grows **downward** from the top-left, so a bar's top edge is `baseline - barHeight`, not `barHeight`. Guarding `max === 0` avoids `0 / 0 = NaN` attributes, and clamping negatives keeps the maths simple. For accessibility the `<svg>` is an `img` with an `aria-label`, and each `<rect>` has a `<title>` that browsers show as a tooltip and some screen readers announce. This is the whole idea behind libraries like Recharts, which do this arithmetic for you.

### hints
- `plotHeight = height - 8 - 24`, `slot = width / data.length`, `barWidth = slot * 0.6`.
- `max = Math.max(0, ...data.map((d) => d.value))`.
- `x = i * slot + (slot - barWidth) / 2`, `y = 8 + plotHeight - barHeight`.
- The label's `x` is `i * slot + slot / 2`; use `textAnchor="middle"`.
