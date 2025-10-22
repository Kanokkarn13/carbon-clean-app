// src/utils/trackingHelpers.ts
import { Platform } from 'react-native';

/** Let TS know we may set a custom flag on global. */
declare global {
  // e.g. somewhere you can do: global.useRealDevice = true
  // to force LAN base even in Android emulator during dev.
  // eslint-disable-next-line no-var
  var useRealDevice: boolean | undefined;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function resolveBase(): string {
  // ⚙️ CHANGE THIS to your machine's LAN IP when testing on real device
  const LAN = 'http://192.168.0.102:3000';

  // Use Android emulator loopback unless user explicitly forces real device
  const forceRealDevice = (globalThis as any).useRealDevice === true;

  if (__DEV__ && Platform.OS === 'android' && !forceRealDevice) {
    return 'http://10.0.2.2:3000';
  }
  return LAN;
}

export function buildSaveEndpoint(
  goalType: 'walking' | 'cycling',
  base = resolveBase()
) {
  const url =
    goalType === 'walking'
      ? `${base}/api/save-walking`
      : `${base}/api/save-cycling`;
  console.log('[buildSaveEndpoint]', { goalType, url });
  return url;
}

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

/** Optional: used by CarbonOffsetScreen for post-insert PATCH */
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
