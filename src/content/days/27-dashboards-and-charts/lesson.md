## A dashboard answers a question

A good dashboard is not a wall of charts; it answers specific questions at a glance: *How is the pipeline doing? What closed this month? Which deals are at risk?* Before drawing anything, write the questions down. Each one becomes a **number** (a KPI tile), a **trend** (a line or bar chart over time) or a **breakdown** (a chart by category).

> **The thinking pattern:** *data → aggregate → format → draw.* Keep these four steps separate. Raw records come from the API; **pure functions** aggregate them into chart-ready series; **formatters** turn numbers into text people read; only then do components draw. Each step is independently testable, and the chart components stay dumb.

## Aggregation: from records to series

Charts want small, tidy arrays, not thousands of records.

```ts
// records → one value per month
interface Deal { stage: string; value: number; closedAt?: string }

function wonByMonth(deals: Deal[]): { month: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const d of deals) {
    if (d.stage !== 'won' || !d.closedAt) continue;
    const month = d.closedAt.slice(0, 7);                       // '2026-03'
    totals.set(month, (totals.get(month) ?? 0) + d.value);
  }
  return [...totals].map(([month, value]) => ({ month, value })).sort((a, b) => a.month.localeCompare(b.month));
}
```

Three habits for aggregation code:

1. **Fill the gaps.** A month with no deals should appear as `0`, not be missing, or the chart's x-axis lies. Generate the *expected* buckets first, then add data into them.
2. **Pass "now" in.** Functions that depend on the current date are untestable. `monthlyTotals(deals, { now })` is deterministic.
3. **Mind time zones.** `new Date('2026-03-31T23:30:00Z')` is April in Sydney. Decide whether you bucket by UTC or by the user's zone and be consistent (the exercise uses UTC).

Today's API gives you `GET /api/stats` (pre-aggregated counts and sums) and the raw lists; in real systems, prefer aggregating on the **server** for large data and send only the summary.

## Formatting is part of correctness

`1234567.891` is not a dollar amount. The platform gives you `Intl`, built-in and locale-aware:

```ts
new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(1234.5);   // "$1,234.50"
new Intl.NumberFormat('en-AU', { notation: 'compact' }).format(1_250_000);               // "1.3M"
new Intl.NumberFormat('en-AU', { style: 'percent', maximumFractionDigits: 1 }).format(0.1234);   // "12.3%"
new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);   // "5 Mar 2026"
```

Create each formatter **once** (they are relatively expensive to construct) and reuse it. Never hand-roll thousands separators or date strings.

## KPI tiles

A KPI tile shows one number and enough context to read it: label, value, change versus a previous period and, importantly, all of its **states**:

- **Loading:** a skeleton of the same size (avoid layout shift), marked `aria-busy`.
- **Error:** a short message with a *Retry* button, not a blank hole.
- **Empty / not applicable:** `—`, not `0` or `NaN`.
- **Ready:** the formatted value plus a delta (▲ up / ▼ down) that uses *more than colour* (an arrow and a sign), since many users cannot distinguish red from green.

## Drawing charts

Options, from most to least control:

| Approach | When |
| --- | --- |
| Hand-written **SVG** in React | simple bars, lines, sparklines; full control; tiny bundle; you learn how charts work (today's challenge) |
| **Recharts** (React components over SVG) | typical dashboard charts; declarative; good defaults |
| **visx**, **Nivo** | more customisation / more chart types |
| **Chart.js** / **ECharts** (canvas) | very large datasets, many series |

Recharts in one screen:

```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

<ResponsiveContainer width="100%" height={240}>
  <BarChart data={monthly}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="month" tickFormatter={formatMonth} />
    <YAxis tickFormatter={formatCompact} />
    <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={formatMonth} />
    <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

`ResponsiveContainer` makes the chart fill its parent; give the parent a **definite height** or the chart collapses to zero (the most common Recharts mistake). Code-split the chart library (`lazy`, Day 24): it is a heavy dependency.

### How a bar chart works (what you will build)

Everything in a chart is a **scale**: a function that maps a data value to a pixel position.

```text
plot height = chart height − top margin − bottom margin (room for labels)
bar height  = (value / max value) × plot height
bar y       = top margin + plot height − bar height         (SVG's y axis points DOWN)
bar x       = slot index × slot width + padding             (slot width = chart width / number of bars)
```

Two traps: SVG's origin is the **top-left** with `y` increasing downward, so bars are drawn from a baseline upward, and a maximum of `0` makes `value / max` divide by zero.

## Accessible charts

A chart is an image to a screen reader unless you help:

- Give the `<svg>` `role="img"` and a meaningful **`aria-label`** summarising the insight ("Won revenue by month, highest in March").
- Add `<title>` (and `<desc>`) children, and per-bar `<title>` elements for hover tooltips.
- **Don't rely on colour alone**: add labels, patterns or direct value labels. Check contrast in both themes.
- Offer the same data as a **table** (a "View as table" toggle) for people who need exact values.
- Use CSS variables for series colours (`--chart-1…`) so dark mode works (Day 9).

## Dashboard layout and state

- **CSS grid with `auto-fit`** makes tiles reflow without media queries: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`.
- Put the **date range** (and other filters) in the **URL** (Day 12) so a dashboard link reproduces the view.
- Each widget fetches independently with its own query, loading and error state, wrapped in its own error boundary (Day 24): one failing widget never blanks the page.
- Memoise expensive aggregations with `useMemo` (Day 21) keyed on the data; this is a legitimate use because the calculation scales with the number of records.
- Provide **export** (CSV) for tables people want to take into spreadsheets.

## Walkthrough: the pipeline dashboard

1. **Questions:** How much is open? What did we win each month? Where is the pipeline concentrated?
2. **Data:** `GET /api/stats` for the totals and by-stage counts; `GET /api/deals?pageSize=100&stage=won` for the monthly series.
3. **Aggregate:** `monthlyTotals(deals, { now, months: 6 })` fills gaps; `byStage` turns the stats object into an array for a chart.
4. **Format:** `formatCurrency`, `formatCompact`, `formatPercent` for the tiles and axes.
5. **Draw:** four `KpiTile`s (open value, weighted value, win rate, open deals), a bar chart of won revenue by month, and a horizontal bar of deals by stage.
6. **States:** each tile and chart has loading, error and empty UI, and its own boundary.
7. **Check accessibility:** labels on charts, a "view as table" option, readable in dark mode.

## CRM step: the dashboard

1. Create `src/lib/format.ts` (`formatCurrency`, `formatCompact`, `formatPercent`, `formatDate`) and `src/lib/aggregate.ts` (`monthlyTotals`, `countByStage`). Unit-test both.
2. Build `KpiTile` with loading, error and ready states and a delta indicator.
3. Install `recharts` (or build your own `BarChart` as in today's challenge) and create a **Won revenue by month** chart and a **Deals by stage** chart.
4. Assemble `DashboardPage`: a responsive grid of tiles plus the charts, each with its own query and error boundary, lazy-loading the chart code.
5. Put the date range (`?months=6|12`) in the URL.
6. Verify both themes, keyboard focus order and the screen-reader label of each chart.

- [ ] Aggregation and formatting are pure, tested functions
- [ ] Every widget handles loading, error and empty states
- [ ] Charts have `role="img"`, a label and per-bar tooltips
- [ ] The range filter lives in the URL
