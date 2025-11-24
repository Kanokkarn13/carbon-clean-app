// src/services/totalsService.ts
/** Base URL from ENV (no /api, no trailing slash) */
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';
const API_BASE = RAW_BASE.replace(/\/+$/, '');
const api = (p: string) => `${API_BASE}/api${p}`;

async function getJson(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? JSON.parse(text) : {};
}

function coerceNumber(v: any) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeListPayload(json: any): any[] {
  if (Array.isArray(json)) return json;
  const buckets = ['items', 'data', 'records', 'rows', 'list', 'result'];
  for (const b of buckets) if (Array.isArray(json?.[b])) return json[b];
  return [];
}

/** Try very hard to find a date-like field from any shape. */
function pickDateLike(obj: any): any {
  if (!obj || typeof obj !== 'object') return undefined;

  // High-confidence explicit keys first
  const priority = [
    'record_date',
    'reduction_date',
    'reduce_date',
    'created_at',
    'createdAt',
    'date',
    'updated_at',
    'updatedAt',
    'timestamp',
    'time',
    'saved_at',
    'savedAt',
  ];
  for (const k of priority) {
    if (obj[k] != null) return obj[k];
  }

  // Fallback: scan any key that contains 'date' or 'time'
  for (const key of Object.keys(obj)) {
    const lk = key.toLowerCase();
    if (lk.includes('date') || lk.includes('time')) {
      return obj[key];
    }
  }
  return undefined;
}

function pickNumberLike(obj: any): number {
  // accept a lot of common number fields
  const keys = [
    'point_value',
    'pointValue',
    'value',
    'points',
    'total',
    'co2e',
    'co2',
    'amount',
    'kg',
  ];
  for (const k of keys) {
    if (obj?.[k] != null) return coerceNumber(obj[k]);
  }
  // last resort: try to coerce any numeric-looking fields
  for (const k of Object.keys(obj ?? {})) {
    const v = coerceNumber(obj[k]);
    if (v !== 0) return v;
  }
  return 0;
}

export async function fetchEmissionItems(uid: string | number) {
  const json = await getJson(api(`/saved/${encodeURIComponent(String(uid))}`));
  const rawList = normalizeListPayload(json);

  if (__DEV__) console.log('[emission] items sample:', rawList.slice(0, 2));

  return rawList.map((it: any) => ({
    point_value: pickNumberLike(it),
    record_date: pickDateLike(it),
  }));
}

export async function fetchReductionItems(uid: string | number) {
  const json = await getJson(api(`/reduction/saved/${encodeURIComponent(String(uid))}`));
  const rawList = normalizeListPayload(json);

  if (__DEV__) console.log('[reduction] items sample:', rawList.slice(0, 2));

  return rawList.map((it: any) => ({
    point_value: pickNumberLike(it),
    record_date: pickDateLike(it),
  }));
}

/* Optional: simple “total” helpers */
export async function fetchEmissionTotal(uid: string | number) {
  const items = await fetchEmissionItems(uid);
  return items.reduce((s, it) => s + coerceNumber(it.point_value), 0);
}
export async function fetchReductionTotal(uid: string | number) {
  const items = await fetchReductionItems(uid);
  return items.reduce((s, it) => s + coerceNumber(it.point_value), 0);
}

export type CarbonLeaderboardEntry = {
  user_id: number;
  name: string;
  value: number;
};

export async function fetchCarbonLeaderboard(params: {
  start?: string;
  end?: string;
  days?: number;
  limit?: number;
  metric?: 'carbon' | 'distance';
}): Promise<CarbonLeaderboardEntry[]> {
  const search = new URLSearchParams();
  if (params.days) search.append('days', String(params.days));
  if (params.limit) search.append('limit', String(params.limit));
  if (params.start) search.append('start', params.start);
  if (params.end) search.append('end', params.end);
  search.append('metric', params.metric || 'carbon');

  const url = api(`/leaderboard/carbon?${search.toString()}`);
  const json = await getJson(url);
  return normalizeListPayload(json).map((it: any) => ({
    user_id: coerceNumber(it.user_id),
    name: it?.name || 'User',
    value: Number(it?.total_value ?? it?.carbon_kg ?? it?.value) || 0,
  }));
}
