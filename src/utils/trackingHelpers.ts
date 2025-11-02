// src/utils/trackingHelpers.ts
import { Platform } from 'react-native';

/** Let TS know we may set a custom flag on global. */
declare global {
  var useRealDevice: boolean | undefined;
}

/** Format seconds -> mm:ss */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Resolve base URL safely from ENV or fallback */
function resolveBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const forceRealDevice = (globalThis as any).useRealDevice === true;

  // ตัด / ท้ายออกถ้ามี
  if (env && env.length > 0) return env.replace(/\/+$/, '');

  // ⚙️ fallback สำหรับ dev
  if (__DEV__) {
    if (Platform.OS === 'android' && !forceRealDevice) return 'http://10.0.2.2:3000';
    return 'http://192.168.0.102:3000'; // ✅ ปรับเป็น IP LAN ของเครื่องคุณ
  }
  return 'https://your-prod-domain.com';
}

/** ✅ Reusable function to build save endpoints */
export function buildSaveEndpoint(goalType: 'walking' | 'cycling', base = resolveBase()) {
  const url = `${base}/api/${goalType === 'walking' ? 'save-walking' : 'save-cycling'}`;
  return url;
}

/** ✅ Save activity data */
export async function saveActivity(payload: any, saveEndpoint: string) {
  try {
    console.log('📡 saveActivity ->', { saveEndpoint, payload });
    const response = await fetch(saveEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const data = isJson && text ? JSON.parse(text) : { message: text };

    console.log('📡 saveActivity <-', { status: response.status, ok: response.ok, data });
    return { ok: response.ok, data };
  } catch (e: any) {
    console.log('❌ saveActivity error:', e?.message || String(e));
    return { ok: false, data: { message: e?.message || 'Network error' } };
  }
}

/** ✅ Patch carbon reduce for walking/cycling */
export async function patchCarbonReduce(
  goalType: 'walking' | 'cycling',
  id: number,
  carbonReduce: number,
  base = resolveBase()
) {
  const url = `${base}/api/${goalType}/${id}/carbon`;
  try {
    console.log('📡 patchCarbonReduce ->', { url, carbonReduce });
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carbonReduce }),
    });

    const text = await res.text();
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson && text ? JSON.parse(text) : { message: text };

    console.log('📡 patchCarbonReduce <-', { status: res.status, ok: res.ok, data });
    return { ok: res.ok, data };
  } catch (e: any) {
    console.log('❌ patchCarbonReduce error:', e?.message || String(e));
    return { ok: false, data: { message: e?.message || 'Network error' } };
  }
}
