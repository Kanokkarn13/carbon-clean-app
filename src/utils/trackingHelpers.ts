// src/utils/trackingHelpers.ts
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function buildSaveEndpoint(
  goalType: 'walking' | 'cycling',
  base = 'http://192.168.0.102:3000'
) {
  return goalType === 'walking'
    ? `${base}/api/save-walking`
    : `${base}/api/save-cycling`;
}

export async function saveActivity(payload: any, saveEndpoint: string) {
  try {
    const response = await fetch(saveEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { ok: response.ok, data };
    } else {
      const text = await response.text();
      return { ok: false, data: { message: text } };
    }
  } catch (e) {
    return { ok: false, data: { message: 'Network error' } };
  }
}
