import {
  HttpError,
  applyChaos,
  noContent,
  paginate,
  parseUrl,
  readJson,
  send,
  sortBy,
  type Req,
  type Res,
} from './http.ts';
import {
  getDb,
  newId,
  now,
  resetDb,
  type Activity,
  type ActivityType,
  type Company,
  type Contact,
  type ContactStatus,
  type Deal,
  type DealStage,
} from './store.ts';

const CONTACT_STATUSES: ContactStatus[] = ['lead', 'customer', 'churned'];
const DEAL_STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'meeting', 'note', 'task'];
const PROB: Record<DealStage, number> = { new: 10, qualified: 30, proposal: 50, negotiation: 75, won: 100, lost: 0 };

type Body = Record<string, unknown>;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireFields(errors: Record<string, string>) {
  if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed', errors);
}

// --- tokens (deliberately simple: this is a teaching API, not real auth) ----

const TOKEN_PREFIX = 'nimbus-token-';
function tokenFor(userId: string) {
  return `${TOKEN_PREFIX}${Buffer.from(userId).toString('base64url')}`;
}
function userFromAuth(req: Req) {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !match[1].startsWith(TOKEN_PREFIX)) return null;
  const userId = Buffer.from(match[1].slice(TOKEN_PREFIX.length), 'base64url').toString('utf8');
  const user = getDb().users.find((u) => u.id === userId);
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
}

// --- validators -------------------------------------------------------------

function validateContact(body: Body, partial = false): Partial<Contact> {
  const errors: Record<string, string> = {};
  const out: Partial<Contact> = {};
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => {
    out[k] = v;
  };

  if (!partial || 'firstName' in body) {
    const v = str(body.firstName);
    if (!v) errors.firstName = 'First name is required';
    else set('firstName', v);
  }
  if (!partial || 'lastName' in body) {
    const v = str(body.lastName);
    if (!v) errors.lastName = 'Last name is required';
    else set('lastName', v);
  }
  if (!partial || 'email' in body) {
    const v = str(body.email).toLowerCase();
    if (!v) errors.email = 'Email is required';
    else if (!EMAIL_RE.test(v)) errors.email = 'Email is not valid';
    else set('email', v);
  }
  if ('phone' in body) set('phone', str(body.phone));
  if ('title' in body) set('title', str(body.title));
  if ('companyId' in body) {
    const v = body.companyId;
    if (v === null || v === '') set('companyId', null);
    else if (typeof v === 'string' && getDb().companies.some((c) => c.id === v)) set('companyId', v);
    else errors.companyId = 'Company not found';
  }
  if (!partial || 'status' in body) {
    const v = (str(body.status) || 'lead') as ContactStatus;
    if (!CONTACT_STATUSES.includes(v)) errors.status = `Status must be one of ${CONTACT_STATUSES.join(', ')}`;
    else set('status', v);
  }
  if ('tags' in body) {
    const v = body.tags;
    if (!Array.isArray(v) || !v.every((t) => typeof t === 'string')) errors.tags = 'Tags must be an array of strings';
    else set('tags', v.map((t) => t.trim()).filter(Boolean));
  }
  requireFields(errors);
  return out;
}

function validateCompany(body: Body, partial = false): Partial<Company> {
  const errors: Record<string, string> = {};
  const out: Partial<Company> = {};
  if (!partial || 'name' in body) {
    const v = str(body.name);
    if (!v) errors.name = 'Name is required';
    else out.name = v;
  }
  if ('industry' in body) out.industry = str(body.industry);
  if ('website' in body) out.website = str(body.website);
  if ('city' in body) out.city = str(body.city);
  if ('country' in body) out.country = str(body.country);
  if ('size' in body) {
    const n = Number(body.size);
    if (!Number.isFinite(n) || n < 0) errors.size = 'Size must be a non-negative number';
    else out.size = Math.round(n);
  }
  requireFields(errors);
  return out;
}

function validateDeal(body: Body, partial = false): Partial<Deal> {
  const errors: Record<string, string> = {};
  const out: Partial<Deal> = {};
  const db = getDb();
  if (!partial || 'title' in body) {
    const v = str(body.title);
    if (!v) errors.title = 'Title is required';
    else out.title = v;
  }
  if (!partial || 'contactId' in body) {
    const v = str(body.contactId);
    const contact = db.contacts.find((c) => c.id === v);
    if (!contact) errors.contactId = 'Contact not found';
    else {
      out.contactId = contact.id;
      out.companyId = contact.companyId;
    }
  }
  if (!partial || 'value' in body) {
    const n = Number(body.value);
    if (!Number.isFinite(n) || n < 0) errors.value = 'Value must be a non-negative number';
    else out.value = n;
  }
  if (!partial || 'stage' in body) {
    const v = (str(body.stage) || 'new') as DealStage;
    if (!DEAL_STAGES.includes(v)) errors.stage = `Stage must be one of ${DEAL_STAGES.join(', ')}`;
    else {
      out.stage = v;
      out.probability = PROB[v];
    }
  }
  if ('probability' in body) {
    const n = Number(body.probability);
    if (!Number.isFinite(n) || n < 0 || n > 100) errors.probability = 'Probability must be between 0 and 100';
    else out.probability = n;
  }
  if ('expectedCloseDate' in body) {
    const v = str(body.expectedCloseDate);
    if (v && Number.isNaN(Date.parse(v))) errors.expectedCloseDate = 'Expected close date must be a valid date';
    else out.expectedCloseDate = v;
  }
  requireFields(errors);
  return out;
}

function validateActivity(body: Body, partial = false): Partial<Activity> {
  const errors: Record<string, string> = {};
  const out: Partial<Activity> = {};
  const db = getDb();
  if (!partial || 'type' in body) {
    const v = str(body.type) as ActivityType;
    if (!ACTIVITY_TYPES.includes(v)) errors.type = `Type must be one of ${ACTIVITY_TYPES.join(', ')}`;
    else out.type = v;
  }
  if (!partial || 'contactId' in body) {
    const v = str(body.contactId);
    if (!db.contacts.some((c) => c.id === v)) errors.contactId = 'Contact not found';
    else out.contactId = v;
  }
  if ('dealId' in body) {
    const v = body.dealId;
    if (v === null || v === '') out.dealId = null;
    else if (typeof v === 'string' && db.deals.some((d) => d.id === v)) out.dealId = v;
    else errors.dealId = 'Deal not found';
  }
  if (!partial || 'subject' in body) {
    const v = str(body.subject);
    if (!v) errors.subject = 'Subject is required';
    else out.subject = v;
  }
  if ('body' in body) out.body = str(body.body);
  if ('dueAt' in body) {
    const v = body.dueAt;
    if (v === null || v === '') out.dueAt = null;
    else if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) out.dueAt = new Date(v).toISOString();
    else errors.dueAt = 'dueAt must be a valid date';
  }
  if ('done' in body) out.done = Boolean(body.done);
  requireFields(errors);
  return out;
}

// --- generic collection handler --------------------------------------------

interface Collection<T extends { id: string }> {
  prefix: string;
  list: () => T[];
  filter: (items: T[], q: URLSearchParams) => T[];
  validate: (body: Body, partial: boolean) => Partial<T>;
  create: (data: Partial<T>) => T;
  onDelete?: (item: T) => void;
}

async function handleCollection<T extends { id: string; updatedAt?: string }>(
  col: Collection<T>,
  req: Req,
  res: Res,
  idPart: string | undefined,
  query: URLSearchParams,
) {
  const method = (req.method ?? 'GET').toUpperCase();
  const items = col.list();

  if (!idPart) {
    if (method === 'GET') {
      const filtered = sortBy(col.filter(items, query) as unknown as Record<string, unknown>[], query.get('sort')) as unknown as T[];
      return send(res, 200, paginate(filtered, query));
    }
    if (method === 'POST') {
      const body = await readJson<Body>(req);
      const data = col.validate(body, false);
      const created = col.create(data);
      items.unshift(created);
      return send(res, 201, created);
    }
    throw new HttpError(405, `Method ${method} not allowed`);
  }

  const index = items.findIndex((i) => i.id === idPart);
  if (index === -1) throw new HttpError(404, `${col.prefix} '${idPart}' not found`);
  const existing = items[index];

  if (method === 'GET') return send(res, 200, existing);
  if (method === 'PUT' || method === 'PATCH') {
    const body = await readJson<Body>(req);
    const data = col.validate(body, method === 'PATCH');
    const updated = { ...existing, ...data, id: existing.id } as T;
    if ('updatedAt' in existing) (updated as T & { updatedAt: string }).updatedAt = now();
    items[index] = updated;
    return send(res, 200, updated);
  }
  if (method === 'DELETE') {
    items.splice(index, 1);
    col.onDelete?.(existing);
    return noContent(res);
  }
  throw new HttpError(405, `Method ${method} not allowed`);
}

const text = (v: unknown) => String(v ?? '').toLowerCase();

const collections = {
  companies: (): Collection<Company> => ({
    prefix: 'Company',
    list: () => getDb().companies,
    filter: (items, q) => {
      const search = text(q.get('search'));
      return items.filter((c) => !search || text(c.name).includes(search) || text(c.industry).includes(search) || text(c.city).includes(search));
    },
    validate: validateCompany,
    create: (d) => ({
      id: newId('co'),
      name: d.name ?? '',
      industry: d.industry ?? '',
      website: d.website ?? '',
      size: d.size ?? 0,
      city: d.city ?? '',
      country: d.country ?? '',
      createdAt: now(),
    }),
    onDelete: (company) => {
      const db = getDb();
      db.contacts.forEach((c) => {
        if (c.companyId === company.id) c.companyId = null;
      });
      db.deals.forEach((d) => {
        if (d.companyId === company.id) d.companyId = null;
      });
    },
  }),
  contacts: (): Collection<Contact> => ({
    prefix: 'Contact',
    list: () => getDb().contacts,
    filter: (items, q) => {
      const search = text(q.get('search'));
      const status = q.get('status');
      const companyId = q.get('companyId');
      const tag = q.get('tag');
      return items.filter(
        (c) =>
          (!search ||
            text(`${c.firstName} ${c.lastName}`).includes(search) ||
            text(c.email).includes(search) ||
            text(c.title).includes(search)) &&
          (!status || c.status === status) &&
          (!companyId || c.companyId === companyId) &&
          (!tag || c.tags.includes(tag)),
      );
    },
    validate: validateContact,
    create: (d) => ({
      id: newId('ct'),
      firstName: d.firstName ?? '',
      lastName: d.lastName ?? '',
      email: d.email ?? '',
      phone: d.phone ?? '',
      title: d.title ?? '',
      companyId: d.companyId ?? null,
      status: d.status ?? 'lead',
      tags: d.tags ?? [],
      createdAt: now(),
      updatedAt: now(),
    }),
    onDelete: (contact) => {
      const db = getDb();
      db.deals = db.deals.filter((d) => d.contactId !== contact.id);
      db.activities = db.activities.filter((a) => a.contactId !== contact.id);
    },
  }),
  deals: (): Collection<Deal> => ({
    prefix: 'Deal',
    list: () => getDb().deals,
    filter: (items, q) => {
      const stage = q.get('stage');
      const contactId = q.get('contactId');
      const companyId = q.get('companyId');
      const search = text(q.get('search'));
      return items.filter(
        (d) =>
          (!stage || d.stage === stage) &&
          (!contactId || d.contactId === contactId) &&
          (!companyId || d.companyId === companyId) &&
          (!search || text(d.title).includes(search)),
      );
    },
    validate: validateDeal,
    create: (d) => ({
      id: newId('dl'),
      title: d.title ?? '',
      contactId: d.contactId ?? '',
      companyId: d.companyId ?? null,
      value: d.value ?? 0,
      currency: 'AUD',
      stage: d.stage ?? 'new',
      probability: d.probability ?? PROB[d.stage ?? 'new'],
      expectedCloseDate: d.expectedCloseDate ?? '',
      createdAt: now(),
      updatedAt: now(),
    }),
    onDelete: (deal) => {
      const db = getDb();
      db.activities.forEach((a) => {
        if (a.dealId === deal.id) a.dealId = null;
      });
    },
  }),
  activities: (): Collection<Activity> => ({
    prefix: 'Activity',
    list: () => getDb().activities,
    filter: (items, q) => {
      const type = q.get('type');
      const contactId = q.get('contactId');
      const dealId = q.get('dealId');
      const done = q.get('done');
      return items.filter(
        (a) =>
          (!type || a.type === type) &&
          (!contactId || a.contactId === contactId) &&
          (!dealId || a.dealId === dealId) &&
          (done === null || String(a.done) === done),
      );
    },
    validate: validateActivity,
    create: (d) => ({
      id: newId('ac'),
      type: d.type ?? 'note',
      contactId: d.contactId ?? '',
      dealId: d.dealId ?? null,
      subject: d.subject ?? '',
      body: d.body ?? '',
      dueAt: d.dueAt ?? null,
      done: d.done ?? d.type !== 'task',
      createdAt: now(),
    }),
  }),
};

function stats() {
  const db = getDb();
  const open = db.deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const won = db.deals.filter((d) => d.stage === 'won');
  const byStage = Object.fromEntries(
    DEAL_STAGES.map((s) => [s, { count: db.deals.filter((d) => d.stage === s).length, value: db.deals.filter((d) => d.stage === s).reduce((sum, d) => sum + d.value, 0) }]),
  );
  const byStatus = Object.fromEntries(CONTACT_STATUSES.map((s) => [s, db.contacts.filter((c) => c.status === s).length]));
  return {
    contacts: { total: db.contacts.length, byStatus },
    companies: { total: db.companies.length },
    deals: {
      total: db.deals.length,
      open: open.length,
      pipelineValue: open.reduce((s, d) => s + d.value, 0),
      weightedPipeline: Math.round(open.reduce((s, d) => s + (d.value * d.probability) / 100, 0)),
      wonValue: won.reduce((s, d) => s + d.value, 0),
      byStage,
    },
    activities: {
      total: db.activities.length,
      openTasks: db.activities.filter((a) => a.type === 'task' && !a.done).length,
    },
    generatedAt: now(),
  };
}

const INDEX = {
  name: 'Nimbus CRM mock API',
  version: 1,
  docs: '/api-docs',
  note: 'Data lives in memory and resets on cold start or POST /api/reset. Add ?delay=1500 to simulate latency, ?fail=1 or ?fail=0.3 to simulate failures.',
  endpoints: [
    'GET /api/health',
    'GET /api/stats',
    'GET|POST /api/companies, GET|PUT|PATCH|DELETE /api/companies/:id',
    'GET|POST /api/contacts, GET|PUT|PATCH|DELETE /api/contacts/:id',
    'GET|POST /api/deals, GET|PUT|PATCH|DELETE /api/deals/:id',
    'GET|POST /api/activities, GET|PUT|PATCH|DELETE /api/activities/:id',
    'POST /api/auth/login { email, password }, GET /api/auth/me (Bearer token)',
    'POST /api/reset',
  ],
  demoLogin: { email: 'admin@nimbus.test', password: 'password' },
};

export async function handleApiRequest(req: Req, res: Res): Promise<void> {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'OPTIONS') return noContent(res);
  const { path, query } = parseUrl(req);
  const [resource, idPart] = path;

  try {
    await applyChaos(query);

    if (!resource) return send(res, 200, INDEX);
    if (resource === 'health') return send(res, 200, { ok: true, time: now() });
    if (resource === 'stats') return send(res, 200, stats());
    if (resource === 'reset') {
      if (method !== 'POST') throw new HttpError(405, 'Use POST /api/reset');
      const db = resetDb();
      return send(res, 200, { ok: true, counts: { companies: db.companies.length, contacts: db.contacts.length, deals: db.deals.length, activities: db.activities.length } });
    }
    if (resource === 'auth') {
      if (idPart === 'login' && method === 'POST') {
        const body = await readJson<Body>(req);
        const email = str(body.email).toLowerCase();
        const password = str(body.password);
        const user = getDb().users.find((u) => u.email === email && u.password === password);
        if (!user) throw new HttpError(401, 'Invalid email or password');
        return send(res, 200, { token: tokenFor(user.id), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      }
      if (idPart === 'me' && method === 'GET') {
        const user = userFromAuth(req);
        if (!user) throw new HttpError(401, 'Missing or invalid token');
        return send(res, 200, user);
      }
      throw new HttpError(404, 'Unknown auth route');
    }
    if (resource === 'contacts' && idPart && path[2] === 'activities' && method === 'GET') {
      const db = getDb();
      if (!db.contacts.some((c) => c.id === idPart)) throw new HttpError(404, `Contact '${idPart}' not found`);
      return send(res, 200, paginate(db.activities.filter((a) => a.contactId === idPart), query));
    }
    if (resource === 'contacts' && idPart && path[2] === 'deals' && method === 'GET') {
      const db = getDb();
      if (!db.contacts.some((c) => c.id === idPart)) throw new HttpError(404, `Contact '${idPart}' not found`);
      return send(res, 200, paginate(db.deals.filter((d) => d.contactId === idPart), query));
    }

    const factory = (collections as unknown as Record<string, (() => Collection<{ id: string }>) | undefined>)[resource];
    if (!factory) throw new HttpError(404, `Unknown resource '${resource}'`);
    if (path.length > 2) throw new HttpError(404, 'Route not found');
    return await handleCollection(factory(), req, res, idPart, query);
  } catch (err) {
    if (err instanceof HttpError) {
      return send(res, err.status, { error: err.message, ...(err.fields ? { fields: err.fields } : {}) });
    }
    console.error(err);
    return send(res, 500, { error: 'Internal server error' });
  }
}
