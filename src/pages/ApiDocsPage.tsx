import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Markdown } from '../components/Markdown.tsx';

const ENDPOINTS: Array<{ method: string; path: string; body?: unknown; note: string }> = [
  { method: 'GET', path: '/api', note: 'Index: lists every endpoint and the demo login.' },
  { method: 'GET', path: '/api/health', note: 'Liveness check.' },
  { method: 'GET', path: '/api/stats', note: 'Aggregates for the dashboard: pipeline value, counts by stage and status.' },
  { method: 'GET', path: '/api/contacts?page=1&pageSize=5', note: 'Paginated contacts. Filters: search, status, companyId, tag. Sort with sort=lastName or sort=-createdAt.' },
  { method: 'GET', path: '/api/contacts/ct_013', note: 'One contact.' },
  { method: 'GET', path: '/api/contacts/ct_013/deals', note: 'Deals for a contact.' },
  { method: 'GET', path: '/api/contacts/ct_013/activities', note: 'Activity timeline for a contact.' },
  { method: 'POST', path: '/api/contacts', body: { firstName: 'Test', lastName: 'Person', email: 'test.person@example.com', status: 'lead' }, note: 'Create a contact. Returns 201 or 400 with a fields map.' },
  { method: 'PATCH', path: '/api/contacts/ct_013', body: { status: 'customer' }, note: 'Partial update.' },
  { method: 'GET', path: '/api/companies', note: 'Companies. Filter with search.' },
  { method: 'GET', path: '/api/deals?stage=proposal', note: 'Deals. Filters: stage, contactId, companyId, search.' },
  { method: 'GET', path: '/api/activities?type=task&done=false', note: 'Activities. Filters: type, contactId, dealId, done.' },
  { method: 'POST', path: '/api/auth/login', body: { email: 'admin@nimbus.test', password: 'password' }, note: 'Returns a bearer token and the user.' },
  { method: 'GET', path: '/api/contacts?delay=1500', note: 'Chaos: add latency (ms, max 8000).' },
  { method: 'GET', path: '/api/contacts?fail=1', note: 'Chaos: always fail with 503. Use fail=0.3 for a 30% failure rate.' },
  { method: 'POST', path: '/api/reset', note: 'Reset the in-memory data to the seed.' },
];

export function ApiDocsPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <div className="page narrow api-docs">
      <h1>Mock CRM API</h1>
      <p className="lede">
        A small REST API that ships with this site so your Nimbus CRM has real data to talk to from Day 14 onwards. Base URL: <code>{origin}/api</code>. It allows requests from any origin, so
        your local Vite app on <code>http://localhost:5173</code> can call it directly.
      </p>
      <Markdown>{`
> **Heads-up:** data lives in memory on the server. It resets whenever the serverless function restarts (and when anyone calls \`POST /api/reset\`). Treat it like a shared sandbox: fine for learning, not for anything precious.

### Conventions

- List endpoints return \`{ data, page, pageSize, total, totalPages }\`.
- Create returns \`201\` with the new record. Validation problems return \`400\` with \`{ error, fields }\`.
- Missing records return \`404\` with \`{ error }\`. Delete returns \`204\`.
- Authenticated routes expect \`Authorization: Bearer <token>\` (get a token from \`POST /api/auth/login\`).
- Add \`?delay=1500\` or \`?fail=0.3\` to any request to practise loading and error states.

### Example

\`\`\`ts
const res = await fetch('${origin}/api/contacts?status=lead&pageSize=10');
if (!res.ok) throw new Error(\`Request failed: \${res.status}\`);
const page = await res.json();
console.log(page.total, page.data[0].firstName);
\`\`\`
`}</Markdown>

      <h2>Endpoints</h2>
      <div className="endpoints">
        {ENDPOINTS.map((e) => (
          <Endpoint key={`${e.method} ${e.path}`} {...e} />
        ))}
      </div>
    </div>
  );
}

function Endpoint({ method, path, body, note }: { method: string; path: string; body?: unknown; note: string }) {
  const [out, setOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* not json */
      }
      setOut(`HTTP ${res.status}\n${pretty.slice(0, 4000)}${pretty.length > 4000 ? '\n…' : ''}`);
    } catch (err) {
      setOut(`Request failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="endpoint">
      <div className="endpoint-head">
        <span className={`method method-${method.toLowerCase()}`}>{method}</span>
        <code className="endpoint-path">{path}</code>
        <button type="button" className="btn btn-sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : <Play size={14} />} Try it
        </button>
      </div>
      <p className="muted small">{note}</p>
      {body !== undefined && <pre className="endpoint-body">{JSON.stringify(body, null, 2)}</pre>}
      {out && <pre className="endpoint-out">{out}</pre>}
    </div>
  );
}
