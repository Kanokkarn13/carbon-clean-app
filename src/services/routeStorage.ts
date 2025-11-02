import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredLatLng = { latitude: number; longitude: number };
type ActivityKind = 'walking' | 'cycling';

const KEY_PREFIX = 'route';

function buildKey(kind: ActivityKind, id: number | string) {
  return `${KEY_PREFIX}:${kind}:${id}`;
}

export async function saveRoutePoints(
  kind: ActivityKind,
  id: number | string | null | undefined,
  points: StoredLatLng[]
) {
  if (!id || !points?.length) return;
  const key = buildKey(kind, id);
  try {
    const payload = points.map((p) => [Number(p.latitude), Number(p.longitude)]);
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[routeStorage] saveRoutePoints failed', err);
  }
}

export async function loadRoutePoints(
  kind: ActivityKind,
  id: number | string | null | undefined
): Promise<StoredLatLng[] | null> {
  if (!id) return null;
  const key = buildKey(kind, id);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((pair: any) => {
        if (!pair) return null;
        const [lat, lng] = Array.isArray(pair) ? pair : [pair?.latitude, pair?.longitude];
        const latitude = Number(lat);
        const longitude = Number(lng);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return { latitude, longitude };
      })
      .filter(Boolean) as StoredLatLng[];
  } catch (err) {
    console.warn('[routeStorage] loadRoutePoints failed', err);
    return null;
  }
}

export async function deleteRoutePoints(
  kind: ActivityKind,
  id: number | string | null | undefined
) {
  if (!id) return;
  const key = buildKey(kind, id);
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn('[routeStorage] deleteRoutePoints failed', err);
  }
}
