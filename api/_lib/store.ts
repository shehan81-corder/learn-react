/**
 * In-memory data store for the Nimbus CRM mock API.
 *
 * Data is generated deterministically from a seed so every fresh instance
 * starts with the same records. Writes are kept in memory only: on Vercel a
 * cold start resets the data, which is fine for a learning API. Use
 * POST /api/reset to reset it on demand.
 */

export type ContactStatus = 'lead' | 'customer' | 'churned';
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task';

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  size: number;
  city: string;
  country: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string | null;
  status: ContactStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  companyId: string | null;
  value: number;
  currency: 'AUD';
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  contactId: string;
  dealId: string | null;
  subject: string;
  body: string;
  dueAt: string | null;
  done: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'rep';
}

export interface Db {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  users: User[];
}

// --- deterministic pseudo random ------------------------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  'Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Isla', 'Lucas', 'Chloe', 'Oliver',
  'Amelia', 'Jack', 'Grace', 'Leo', 'Ruby', 'Henry', 'Ella', 'Oscar', 'Harper', 'Finn',
  'Priya', 'Arjun', 'Mei', 'Kenji', 'Sofia', 'Mateo', 'Aisha', 'Omar', 'Nia', 'Tomas',
];
const LAST = [
  'Nguyen', 'Smith', 'Patel', 'Brown', 'Wilson', 'Chen', 'Taylor', 'Singh', 'Martin', 'Walker',
  'Kumar', 'Lee', 'White', 'Harris', 'Thompson', 'Robinson', 'Lewis', 'Young', 'King', 'Wright',
];
const TITLES = [
  'Operations Manager', 'Head of Sales', 'Founder', 'Product Manager', 'CTO', 'Office Manager',
  'Marketing Lead', 'Procurement Officer', 'Finance Director', 'Customer Success Lead',
];
const COMPANIES: Array<[string, string, string, string]> = [
  ['Southbank Roasters', 'Hospitality', 'Melbourne', 'Australia'],
  ['Harbour Logistics', 'Logistics', 'Sydney', 'Australia'],
  ['Pixel & Co Studio', 'Design', 'Brisbane', 'Australia'],
  ['Greenline Energy', 'Energy', 'Adelaide', 'Australia'],
  ['Northstar Health', 'Healthcare', 'Perth', 'Australia'],
  ['Kōwhai Software', 'Technology', 'Auckland', 'New Zealand'],
  ['Blue Gum Builders', 'Construction', 'Hobart', 'Australia'],
  ['Marigold Events', 'Events', 'Melbourne', 'Australia'],
  ['Quokka Pet Supplies', 'Retail', 'Perth', 'Australia'],
  ['Silverfern Legal', 'Legal', 'Wellington', 'New Zealand'],
  ['Outback Adventures', 'Tourism', 'Alice Springs', 'Australia'],
  ['Coral Bay Fitness', 'Fitness', 'Cairns', 'Australia'],
];
const TAGS = ['vip', 'newsletter', 'referral', 'enterprise', 'smb', 'trial', 'renewal', 'partner'];
const DEAL_TITLES = [
  'Annual subscription', 'Onboarding package', 'Team licence (10 seats)', 'Enterprise rollout',
  'Consulting retainer', 'Hardware refresh', 'Support plan upgrade', 'Website redesign',
  'Data migration', 'Training workshop', 'Pilot programme', 'Multi-year renewal',
];
const SUBJECTS: Record<ActivityType, string[]> = {
  call: ['Intro call', 'Follow-up call', 'Pricing discussion', 'Check-in call'],
  email: ['Sent proposal', 'Shared case study', 'Contract draft', 'Meeting recap'],
  meeting: ['Discovery meeting', 'Product demo', 'Quarterly review', 'Kick-off'],
  note: ['Budget approved internally', 'Prefers email contact', 'Decision maker identified', 'Competitor mentioned'],
  task: ['Send revised quote', 'Book demo', 'Update CRM record', 'Prepare contract'],
};

const STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const PROB: Record<DealStage, number> = {
  new: 10,
  qualified: 30,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
}

function isoDaysAgo(base: number, days: number): string {
  return new Date(base - days * 86_400_000).toISOString();
}

export function seed(): Db {
  const rand = mulberry32(20261111);
  const base = Date.UTC(2026, 10, 1); // fixed "now" so data is stable
  let n = 1;
  const id = (prefix: string) => `${prefix}_${String(n++).padStart(3, '0')}`;

  const companies: Company[] = COMPANIES.map(([name, industry, city, country]) => ({
    id: id('co'),
    name,
    industry,
    website: `https://${slug(name)}.example.com`,
    size: pick(rand, [5, 12, 25, 60, 120, 300, 800]),
    city,
    country,
    createdAt: isoDaysAgo(base, 200 + Math.floor(rand() * 400)),
  }));

  const contacts: Contact[] = [];
  const usedEmails = new Set<string>();
  for (let i = 0; i < 42; i++) {
    const firstName = pick(rand, FIRST);
    const lastName = pick(rand, LAST);
    let email = `${firstName}.${lastName}@example.com`.toLowerCase();
    if (usedEmails.has(email)) email = `${firstName}.${lastName}${i}@example.com`.toLowerCase();
    usedEmails.add(email);
    const company = rand() < 0.85 ? pick(rand, companies) : null;
    const created = 5 + Math.floor(rand() * 360);
    const status: ContactStatus = rand() < 0.5 ? 'lead' : rand() < 0.8 ? 'customer' : 'churned';
    const tags = Array.from(new Set([pick(rand, TAGS), rand() < 0.4 ? pick(rand, TAGS) : null].filter(Boolean))) as string[];
    contacts.push({
      id: id('ct'),
      firstName,
      lastName,
      email,
      phone: `+61 4${Math.floor(10_000_000 + rand() * 89_999_999)}`,
      title: pick(rand, TITLES),
      companyId: company ? company.id : null,
      status,
      tags,
      createdAt: isoDaysAgo(base, created),
      updatedAt: isoDaysAgo(base, Math.floor(rand() * created)),
    });
  }

  const deals: Deal[] = [];
  for (let i = 0; i < 28; i++) {
    const contact = pick(rand, contacts);
    const stage = pick(rand, STAGES);
    const created = 2 + Math.floor(rand() * 180);
    deals.push({
      id: id('dl'),
      title: pick(rand, DEAL_TITLES),
      contactId: contact.id,
      companyId: contact.companyId,
      value: Math.round((500 + rand() * 60_000) / 50) * 50,
      currency: 'AUD',
      stage,
      probability: PROB[stage],
      expectedCloseDate: isoDaysAgo(base, -Math.floor(rand() * 90)).slice(0, 10),
      createdAt: isoDaysAgo(base, created),
      updatedAt: isoDaysAgo(base, Math.floor(rand() * created)),
    });
  }

  const activities: Activity[] = [];
  const types: ActivityType[] = ['call', 'email', 'meeting', 'note', 'task'];
  for (let i = 0; i < 70; i++) {
    const type = pick(rand, types);
    const contact = pick(rand, contacts);
    const relatedDeals = deals.filter((d) => d.contactId === contact.id);
    const deal = relatedDeals.length && rand() < 0.7 ? pick(rand, relatedDeals) : null;
    const created = Math.floor(rand() * 120);
    const isTask = type === 'task';
    activities.push({
      id: id('ac'),
      type,
      contactId: contact.id,
      dealId: deal ? deal.id : null,
      subject: pick(rand, SUBJECTS[type]),
      body: `Logged ${type} with ${contact.firstName} ${contact.lastName}.`,
      dueAt: isTask ? isoDaysAgo(base, -Math.floor(rand() * 14) + 3) : null,
      done: isTask ? rand() < 0.4 : true,
      createdAt: isoDaysAgo(base, created),
    });
  }

  const users: User[] = [
    { id: 'us_001', name: 'Demo Admin', email: 'admin@nimbus.test', password: 'password', role: 'admin' },
    { id: 'us_002', name: 'Sam Rep', email: 'sam@nimbus.test', password: 'password', role: 'rep' },
  ];

  const byDate = <T extends { createdAt: string }>(a: T, b: T) => (a.createdAt < b.createdAt ? 1 : -1);
  contacts.sort(byDate);
  deals.sort(byDate);
  activities.sort(byDate);

  return { companies, contacts, deals, activities, users };
}

// A single store per process. Serverless instances each get their own copy.
let db: Db = seed();

export function getDb(): Db {
  return db;
}

export function resetDb(): Db {
  db = seed();
  return db;
}

let counter = 1000;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export const now = () => new Date().toISOString();
