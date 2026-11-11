# practice: Lift state up

### meta
minutes: 7
language: tsx

### prompt
`SearchInput` and `Results` are two sibling components. They must share the search text, so the state belongs in their parent `SearchPage`.

Make these changes:

1. `SearchInput` takes `value` and `onChange(value: string)` props and renders a controlled `<input>` with placeholder `Search`. It has **no state**.
2. `Results` takes `names: string[]` and `query: string` and renders a `<li>` for each name that contains the query (case-insensitive), or `<p>No matches</p>` when none match.
3. `SearchPage` owns `query` and wires the two together. Names to search: `Ava`, `Liam`, `Mia`, `Noah`, `Zoe`.

### starter
```tsx
import { useState } from 'react';

export function SearchInput(props: { value: string; onChange: (v: string) => void }) {
  // TODO: controlled input, no state here
  return <input placeholder="Search" />;
}

export function Results(props: { names: string[]; query: string }) {
  // TODO
  return null;
}

const NAMES = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe'];

export function SearchPage() {
  // TODO: own the query state here
  return (
    <div>
      <SearchInput value="" onChange={() => {}} />
      <Results names={NAMES} query="" />
    </div>
  );
}

export default SearchPage;
```

### solution
```tsx
import { useState } from 'react';

export function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input placeholder="Search" value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function Results({ names, query }: { names: string[]; query: string }) {
  const matches = names.filter((n) => n.toLowerCase().includes(query.toLowerCase()));
  if (matches.length === 0) return <p>No matches</p>;
  return (
    <ul>
      {matches.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

const NAMES = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe'];

export function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <SearchInput value={query} onChange={setQuery} />
      <Results names={NAMES} query={query} />
    </div>
  );
}

export default SearchPage;
```

### tests
```tsx
test('SearchInput is controlled by its props', async () => {
  const onChange = fn();
  const view = await render(<user.SearchInput value="abc" onChange={onChange} />);
  const input = view.$('input');
  expect(input.value).toBe('abc');
  await type(input, 'abcd');
  expect(onChange).toHaveBeenCalledWith('abcd');
});

test('Results filters case-insensitively', async () => {
  const view = await render(<user.Results names={['Ava', 'Liam', 'Mia']} query="IA" />);
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['Liam', 'Mia']);
});

test('Results shows an empty state', async () => {
  const view = await render(<user.Results names={['Ava']} query="zzz" />);
  expect(view.$('p').textContent).toBe('No matches');
  expect(view.$('ul')).toBeNull();
});

test('SearchPage connects them', async () => {
  const view = await render(<user.SearchPage />);
  expect(view.$$('li')).toHaveLength(5);
  await type(view.$('input'), 'm');
  expect(view.$$('li').map((li) => li.textContent)).toEqual(['Liam', 'Mia']);
  await type(view.$('input'), 'qq');
  expect(view.$('p').textContent).toBe('No matches');
});
```

### explanation
`SearchInput` and `Results` are siblings, so neither can hand data to the other directly. The state goes into their closest common parent, which passes the value *down* and a setter *down as a callback*. Because `SearchInput` stores nothing, it can never disagree with `Results`. Passing `setQuery` directly as `onChange` works because both have the shape `(value: string) => void`.

### hints
- `SearchInput`: `value={value}` and `onChange={(e) => onChange(e.target.value)}`.
- Put `const [query, setQuery] = useState('')` inside `SearchPage`.
- `<SearchInput value={query} onChange={setQuery} />`

# practice: Derive, don't store

### meta
minutes: 7
language: tsx

### prompt
`DealSummary` receives `deals` (each with `title`, `value`, `stage`, `probability`) via props and shows:

- `<p>Open deals: N</p>`: deals whose stage is not `won`/`lost`.
- `<p>Open value: $X</p>`: sum of open deal values formatted with thousands separators (e.g. `$12,500`).
- `<p>Weighted: $Y</p>`: sum of `value * probability / 100` for open deals, rounded to a whole dollar.
- `<p>Win rate: Z%</p>`: won / (won + lost) rounded to a whole percent, or `n/a` when no deals are closed.

**Do not use `useState` or `useEffect`.** Everything is calculated in the component body.

### starter
```tsx
export interface Deal {
  title: string;
  value: number;
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
}

const money = (n: number) => '$' + n.toLocaleString('en-US');

export function DealSummary({ deals }: { deals: Deal[] }) {
  // TODO: derive everything from the deals prop
  return (
    <div>
      <p>Open deals: 0</p>
      <p>Open value: $0</p>
      <p>Weighted: $0</p>
      <p>Win rate: n/a</p>
    </div>
  );
}

export default function App() {
  return (
    <DealSummary
      deals={[
        { title: 'A', value: 10000, stage: 'proposal', probability: 50 },
        { title: 'B', value: 2500, stage: 'new', probability: 10 },
        { title: 'C', value: 4000, stage: 'won', probability: 100 },
        { title: 'D', value: 900, stage: 'lost', probability: 0 },
      ]}
    />
  );
}
```

### solution
```tsx
export interface Deal {
  title: string;
  value: number;
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
}

const money = (n: number) => '$' + n.toLocaleString('en-US');

export function DealSummary({ deals }: { deals: Deal[] }) {
  const open = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const openValue = open.reduce((sum, d) => sum + d.value, 0);
  const weighted = Math.round(open.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0));
  const won = deals.filter((d) => d.stage === 'won').length;
  const lost = deals.filter((d) => d.stage === 'lost').length;
  const winRate = won + lost === 0 ? 'n/a' : `${Math.round((won / (won + lost)) * 100)}%`;

  return (
    <div>
      <p>Open deals: {open.length}</p>
      <p>Open value: {money(openValue)}</p>
      <p>Weighted: {money(weighted)}</p>
      <p>Win rate: {winRate}</p>
    </div>
  );
}

export default function App() {
  return (
    <DealSummary
      deals={[
        { title: 'A', value: 10000, stage: 'proposal', probability: 50 },
        { title: 'B', value: 2500, stage: 'new', probability: 10 },
        { title: 'C', value: 4000, stage: 'won', probability: 100 },
        { title: 'D', value: 900, stage: 'lost', probability: 0 },
      ]}
    />
  );
}
```

### tests
```tsx
const deals = [
  { title: 'A', value: 10000, stage: 'proposal', probability: 50 },
  { title: 'B', value: 2500, stage: 'new', probability: 10 },
  { title: 'C', value: 4000, stage: 'won', probability: 100 },
  { title: 'D', value: 900, stage: 'lost', probability: 0 },
];
const lines = (view) => view.$$('p').map((p) => p.textContent);

test('summarises the sample deals', async () => {
  const view = await render(<user.DealSummary deals={deals} />);
  expect(lines(view)).toEqual(['Open deals: 2', 'Open value: $12,500', 'Weighted: $5,250', 'Win rate: 50%']);
});

test('updates when the props change (no stale state)', async () => {
  const view = await render(<user.DealSummary deals={deals} />);
  await view.rerender(<user.DealSummary deals={deals.slice(0, 1)} />);
  expect(lines(view)).toEqual(['Open deals: 1', 'Open value: $10,000', 'Weighted: $5,000', 'Win rate: n/a']);
});

test('handles an empty list', async () => {
  const view = await render(<user.DealSummary deals={[]} />);
  expect(lines(view)).toEqual(['Open deals: 0', 'Open value: $0', 'Weighted: $0', 'Win rate: n/a']);
});

test('rounds the win rate', async () => {
  const many = [
    { title: '1', value: 1, stage: 'won', probability: 100 },
    { title: '2', value: 1, stage: 'won', probability: 100 },
    { title: '3', value: 1, stage: 'lost', probability: 0 },
  ];
  const view = await render(<user.DealSummary deals={many} />);
  expect(lines(view)[3]).toBe('Win rate: 67%');
});
```

### explanation
Props are the single source of truth here. Because every number is computed during render, the display can never fall out of date: when the parent passes new deals, the component renders new numbers. The anti-pattern to avoid is `useState` plus `useEffect` that copies props into state and recalculates, which adds a render with stale values and a whole class of bugs. Plain variables in the component body are cheap and correct.

### hints
- `open = deals.filter(...)` then reuse it for count, value and weighted.
- `Math.round(won / (won + lost) * 100)`
- Guard the division: `won + lost === 0 ? 'n/a' : ...`

# practice: Inverse data flow

### meta
minutes: 8
language: tsx

### prompt
Build a small pipeline with state lifted into the parent.

- `DealRow({ deal, onMove })` renders `<li>` with the title, the stage in a `<span class="stage">`, and a button **Next stage** that calls `onMove(deal.id)`. The button is disabled when the stage is `won` or `lost`.
- `Pipeline({ initialDeals })` owns the deals in state. `onMove` advances a deal to the next stage in the order `new → qualified → proposal → negotiation → won` (negotiation moves to `won`).
- Above the list show `<p>Open: N</p>`, the number of deals not yet won or lost (derived).

### starter
```tsx
import { useState } from 'react';

export type Stage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export interface Deal {
  id: number;
  title: string;
  stage: Stage;
}

const ORDER: Stage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won'];

export function DealRow({ deal, onMove }: { deal: Deal; onMove: (id: number) => void }) {
  // TODO
  return null;
}

export function Pipeline({ initialDeals }: { initialDeals: Deal[] }) {
  // TODO: own the deals state and the move handler
  return null;
}

export default function App() {
  return (
    <Pipeline
      initialDeals={[
        { id: 1, title: 'Annual plan', stage: 'new' },
        { id: 2, title: 'Onboarding', stage: 'negotiation' },
        { id: 3, title: 'Support', stage: 'lost' },
      ]}
    />
  );
}
```

### solution
```tsx
import { useState } from 'react';

export type Stage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export interface Deal {
  id: number;
  title: string;
  stage: Stage;
}

const ORDER: Stage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won'];

export function DealRow({ deal, onMove }: { deal: Deal; onMove: (id: number) => void }) {
  const closed = deal.stage === 'won' || deal.stage === 'lost';
  return (
    <li>
      {deal.title} <span className="stage">{deal.stage}</span>
      <button onClick={() => onMove(deal.id)} disabled={closed}>
        Next stage
      </button>
    </li>
  );
}

export function Pipeline({ initialDeals }: { initialDeals: Deal[] }) {
  const [deals, setDeals] = useState(initialDeals);

  const move = (id: number) =>
    setDeals((list) =>
      list.map((d) => {
        const i = ORDER.indexOf(d.stage);
        return d.id === id && i !== -1 && i < ORDER.length - 1 ? { ...d, stage: ORDER[i + 1] } : d;
      }),
    );

  const open = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').length;

  return (
    <div>
      <p>Open: {open}</p>
      <ul>
        {deals.map((d) => (
          <DealRow key={d.id} deal={d} onMove={move} />
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <Pipeline
      initialDeals={[
        { id: 1, title: 'Annual plan', stage: 'new' },
        { id: 2, title: 'Onboarding', stage: 'negotiation' },
        { id: 3, title: 'Support', stage: 'lost' },
      ]}
    />
  );
}
```

### tests
```tsx
const initial = () => [
  { id: 1, title: 'Annual plan', stage: 'new' },
  { id: 2, title: 'Onboarding', stage: 'negotiation' },
  { id: 3, title: 'Support', stage: 'lost' },
];
const stages = (view) => view.$$('li').map((li) => li.querySelector('.stage').textContent);

test('DealRow reports which deal to move', async () => {
  const onMove = fn();
  const view = await render(<user.DealRow deal={{ id: 7, title: 'X', stage: 'new' }} onMove={onMove} />);
  await click(view.getByRole('button', { name: 'Next stage' }));
  expect(onMove).toHaveBeenCalledWith(7);
});

test('DealRow disables the button for closed deals', async () => {
  const won = await render(<user.DealRow deal={{ id: 1, title: 'X', stage: 'won' }} onMove={() => {}} />);
  expect(won.getByRole('button').disabled).toBe(true);
  const lost = await render(<user.DealRow deal={{ id: 2, title: 'Y', stage: 'lost' }} onMove={() => {}} />);
  expect(lost.getByRole('button').disabled).toBe(true);
});

test('Pipeline renders every deal and the open count', async () => {
  const view = await render(<user.Pipeline initialDeals={initial()} />);
  expect(stages(view)).toEqual(['new', 'negotiation', 'lost']);
  expect(view.$('p').textContent).toBe('Open: 2');
});

test('moving advances only that deal', async () => {
  const view = await render(<user.Pipeline initialDeals={initial()} />);
  await click(view.$$('li')[0].querySelector('button'));
  expect(stages(view)).toEqual(['qualified', 'negotiation', 'lost']);
});

test('negotiation moves to won and the open count drops', async () => {
  const view = await render(<user.Pipeline initialDeals={initial()} />);
  await click(view.$$('li')[1].querySelector('button'));
  expect(stages(view)).toEqual(['new', 'won', 'lost']);
  expect(view.$('p').textContent).toBe('Open: 1');
  expect(view.$$('li')[1].querySelector('button').disabled).toBe(true);
});
```

### explanation
This is the full loop of "thinking in React": state (`deals`) lives in the parent because the parent renders both the list and the count; the child receives data plus a callback; the callback reports an *intent* ("move deal 7") and the parent decides how state changes. `open` is derived, never stored. `DealRow` stays dumb and reusable, with no knowledge of how stages advance.

### hints
- `useState(initialDeals)` in `Pipeline`.
- `onMove={move}`, and in `DealRow`: `onClick={() => onMove(deal.id)}`.
- `ORDER.indexOf(stage)` gives the position; the next stage is `ORDER[i + 1]`.
- `open` is just `deals.filter(...).length`.

# challenge: Filterable pipeline

### meta
minutes: 10
language: tsx

### prompt
Combine filtering, derived data and lifted state.

Build `DealBoard({ deals })` with these pieces:

- `StageFilter({ value, onChange })`: a `<select>` (accessible name **Stage**) with options `all`, `open`, `won`, `lost`. Controlled; no internal state.
- `DealBoard` owns the selected filter (default `all`) and the search text. It shows an input (placeholder `Search deals`) and the `StageFilter`.
- Visible deals match **both** the filter (`open` = not won/lost) and the search (case-insensitive on `title`).
- Show `<p>Showing X of Y deals · $V</p>` where `V` is the total value of the visible deals with thousands separators.
- Render a `<li>` per visible deal: `Title (stage)`. When nothing matches render `<p>No deals found</p>` instead of the list.

### starter
```tsx
import { useState } from 'react';

export interface Deal {
  id: number;
  title: string;
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
}
export type Filter = 'all' | 'open' | 'won' | 'lost';

export function StageFilter({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  // TODO
  return null;
}

export function DealBoard({ deals }: { deals: Deal[] }) {
  // TODO
  return null;
}

export default function App() {
  return (
    <DealBoard
      deals={[
        { id: 1, title: 'Annual plan', stage: 'proposal', value: 12000 },
        { id: 2, title: 'Onboarding', stage: 'won', value: 3000 },
        { id: 3, title: 'Support plan', stage: 'lost', value: 900 },
        { id: 4, title: 'Annual renewal', stage: 'new', value: 5000 },
      ]}
    />
  );
}
```

### solution
```tsx
import { useState } from 'react';

export interface Deal {
  id: number;
  title: string;
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
}
export type Filter = 'all' | 'open' | 'won' | 'lost';

export function StageFilter({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  return (
    <label>
      Stage
      <select value={value} onChange={(e) => onChange(e.target.value as Filter)}>
        <option value="all">all</option>
        <option value="open">open</option>
        <option value="won">won</option>
        <option value="lost">lost</option>
      </select>
    </label>
  );
}

const matchesFilter = (d: Deal, f: Filter) => {
  if (f === 'all') return true;
  if (f === 'open') return d.stage !== 'won' && d.stage !== 'lost';
  return d.stage === f;
};

export function DealBoard({ deals }: { deals: Deal[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const visible = deals.filter((d) => matchesFilter(d, filter) && d.title.toLowerCase().includes(search.toLowerCase()));
  const total = visible.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals" />
      <StageFilter value={filter} onChange={setFilter} />
      <p>
        Showing {visible.length} of {deals.length} deals · ${total.toLocaleString('en-US')}
      </p>
      {visible.length === 0 ? (
        <p>No deals found</p>
      ) : (
        <ul>
          {visible.map((d) => (
            <li key={d.id}>
              {d.title} ({d.stage})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  return (
    <DealBoard
      deals={[
        { id: 1, title: 'Annual plan', stage: 'proposal', value: 12000 },
        { id: 2, title: 'Onboarding', stage: 'won', value: 3000 },
        { id: 3, title: 'Support plan', stage: 'lost', value: 900 },
        { id: 4, title: 'Annual renewal', stage: 'new', value: 5000 },
      ]}
    />
  );
}
```

### tests
```tsx
const deals = [
  { id: 1, title: 'Annual plan', stage: 'proposal', value: 12000 },
  { id: 2, title: 'Onboarding', stage: 'won', value: 3000 },
  { id: 3, title: 'Support plan', stage: 'lost', value: 900 },
  { id: 4, title: 'Annual renewal', stage: 'new', value: 5000 },
];
const items = (view) => view.$$('li').map((li) => li.textContent);
const status = (view) => view.$('p').textContent;

test('StageFilter is a controlled select labelled Stage', async () => {
  const onChange = fn();
  const view = await render(<user.StageFilter value="won" onChange={onChange} />);
  const select = view.getByRole('combobox', { name: 'Stage' });
  expect(select.value).toBe('won');
  expect(Array.from(select.options).map((o) => o.value)).toEqual(['all', 'open', 'won', 'lost']);
  await select_(select, 'lost');
  expect(onChange).toHaveBeenCalledWith('lost');
});

async function select_(el, value) {
  await type(el, value);
}

test('shows everything by default', async () => {
  const view = await render(<user.DealBoard deals={deals} />);
  expect(items(view)).toHaveLength(4);
  expect(status(view)).toBe('Showing 4 of 4 deals · $20,900');
});

test('the open filter hides won and lost deals', async () => {
  const view = await render(<user.DealBoard deals={deals} />);
  await type(view.getByRole('combobox', { name: 'Stage' }), 'open');
  expect(items(view)).toEqual(['Annual plan (proposal)', 'Annual renewal (new)']);
  expect(status(view)).toBe('Showing 2 of 4 deals · $17,000');
});

test('search is case-insensitive and combines with the filter', async () => {
  const view = await render(<user.DealBoard deals={deals} />);
  await type(view.getByRole('textbox'), 'ANNUAL');
  expect(items(view)).toHaveLength(2);
  await type(view.getByRole('combobox', { name: 'Stage' }), 'won');
  expect(view.$('ul')).toBeNull();
  expect(view.$$('p')[1].textContent).toBe('No deals found');
  expect(status(view)).toBe('Showing 0 of 4 deals · $0');
});

test('the lost filter', async () => {
  const view = await render(<user.DealBoard deals={deals} />);
  await type(view.getByRole('combobox', { name: 'Stage' }), 'lost');
  expect(items(view)).toEqual(['Support plan (lost)']);
});
```

### typetests
```tsx
const el = <StageFilter value="all" onChange={(v) => v.toUpperCase()} />;
// @ts-expect-error not a valid Filter
const bad = <StageFilter value="pending" onChange={() => {}} />;
```

### explanation
Two pieces of state (`filter`, `search`) live in `DealBoard`; the visible list, the count and the total are all derived from them in a few lines. `StageFilter` is a pure controlled component. The cast `e.target.value as Filter` is the one place TypeScript needs help: DOM values are plain strings, but we know the options are limited to the `Filter` union. Because `visible` is calculated, adding a third condition later means editing one expression.

### hints
- Two `useState` calls: filter (typed `Filter`) and search text.
- Write a small `matchesFilter(deal, filter)` function and combine it with the search test.
- `visible.reduce(...)` for the total; `toLocaleString('en-US')` for the commas.
- Use a ternary for the empty state.
