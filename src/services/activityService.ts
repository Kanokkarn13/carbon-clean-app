export type Activity = {
  type: 'Walking' | 'Cycling' | string;
  title?: string;
  distance_km?: number;
  record_date?: string | null;
  created_at?: string | null;
};

export async function fetchRecentActivities(userId: number | string) {
  const res = await fetch(`http://192.168.0.102:3000/api/recent-activity/${userId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.activities) ? (json.activities as Activity[]) : [];
}
