export type Activity = {
  type: 'Walking' | 'Cycling' | string;
  title?: string;
  distance_km?: number;
  record_date?: string | null;
  created_at?: string | null;
};

/** API base from ENV (no /api, no trailing slash) */
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';
const API_BASE = RAW_BASE.replace(/\/+$/, '');
const api = (p: string) => `${API_BASE}/api${p}`;

export async function fetchRecentActivities(userId: number | string) {
  const url = api(`/recent-activity/${encodeURIComponent(String(userId))}`);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json?.activities) ? (json.activities as Activity[]) : [];
}
