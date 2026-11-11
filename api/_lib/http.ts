import type { IncomingMessage, ServerResponse } from 'node:http';

export type Req = IncomingMessage;
export type Res = ServerResponse;

export class HttpError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function send(res: Res, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(body === undefined ? '' : JSON.stringify(body, null, 2));
}

export function noContent(res: Res): void {
  res.statusCode = 204;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end();
}

export async function readJson<T = Record<string, unknown>>(req: Req): Promise<T> {
  // Vercel may have already parsed the body for us.
  const pre = (req as Req & { body?: unknown }).body;
  if (pre !== undefined && pre !== null && typeof pre === 'object') return pre as T;
  if (typeof pre === 'string') {
    try {
      return JSON.parse(pre) as T;
    } catch {
      throw new HttpError(400, 'Request body is not valid JSON');
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON');
  }
}

export function parseUrl(req: Req): { path: string[]; query: URLSearchParams } {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // On Vercel every /api/* request is rewritten to the single index function, with the
  // original path passed as `__path` (see vercel.json). In dev the path is used directly.
  const rewritten = url.searchParams.get('__path');
  url.searchParams.delete('__path');
  const raw = rewritten !== null ? rewritten : url.pathname.replace(/^\/api\/?/, '');
  const path = raw
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  return { path, query: url.searchParams };
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Teaching aids: `?delay=1500` adds latency, `?fail=1` always fails,
 * `?fail=0.3` fails 30% of the time. Useful for practising loading
 * states, error handling and retries.
 */
export async function applyChaos(query: URLSearchParams): Promise<void> {
  const delay = Number(query.get('delay'));
  if (Number.isFinite(delay) && delay > 0) await sleep(Math.min(delay, 8000));
  const fail = query.get('fail');
  if (fail !== null) {
    const p = fail === '' || fail === 'true' || fail === '1' ? 1 : Number(fail);
    if (Number.isFinite(p) && Math.random() < p) {
      throw new HttpError(503, 'Simulated server failure (requested with ?fail)');
    }
  }
}

export function paginate<T>(items: T[], query: URLSearchParams) {
  const page = Math.max(1, Number(query.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize')) || 20));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), page, pageSize, total, totalPages };
}

export function sortBy<T extends Record<string, unknown>>(items: T[], sort: string | null): T[] {
  if (!sort) return items;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    const cmp = av < bv ? -1 : 1;
    return desc ? -cmp : cmp;
  });
}
