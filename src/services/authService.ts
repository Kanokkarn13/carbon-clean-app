// src/services/authService.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ========= Base URL & helper ========= */
// ENV ไม่ต้องมี /api และไม่ควรมี / ท้าย
const RAW_ENV = process.env.EXPO_PUBLIC_API_URL?.trim();

// fallback สำหรับ dev: Android emulator ใช้ 10.0.2.2, iOS/Device ใช้ IP LAN
const RAW_FALLBACK =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://192.168.0.102:3000';

// ถ้าไม่มี ENV ให้ใช้ fallback; จากนั้นตัด / ท้าย
export const API_BASE = (RAW_ENV && RAW_ENV.length ? RAW_ENV : RAW_FALLBACK).replace(/\/+$/, '');

/**
 * ต่อ URL ปลายทางแบบปลอดภัย:
 * - ใส่ `/api` ให้อัตโนมัติ หาก path ไม่ได้ขึ้นต้นด้วย `/api`
 * - รองรับ path ที่มีหรือไม่มี `/` นำหน้า
 * - ตัวอย่าง:
 *    api('/set-goal')        => http://.../api/set-goal
 *    api('/api/set-goal')    => http://.../api/set-goal
 *    api('set-goal')         => http://.../api/set-goal
 */
const api = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  const withApi = p.startsWith('/api') ? p : `/api${p}`;
  return `${API_BASE}${withApi}`;
};

/* ========= Types ========= */
export type ApiUser = {
  user_id: number;
  fname: string;
  lname: string;
  email: string;
  phone: string;
  vehicle?: string | null;
  house_member?: number | null;
  walk_goal?: number | null;
  bic_goal?: number | null;
  role?: string;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: ApiUser | any; // บาง env ส่ง user ใน data
  user?: ApiUser | any; // เผื่อบางที่ส่งเป็น user ตรง ๆ
  token?: string;
};

export type BasicResponse<T = any> = {
  success?: boolean;
  message?: string;
  data?: T;
};

/* ========= Core request helper ========= */
async function request<TResp, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  init?: RequestInit
): Promise<TResp> {
  // รองรับทั้ง '/set-goal' และ '/api/set-goal'
  const url = api(endpoint);

  const finalInit: RequestInit = {
    method: init?.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  };

  // Debug logs
  console.log('🌐 [REQUEST]', {
    method: finalInit.method,
    url,
    headers: finalInit.headers,
    body,
  });

  try {
    const res = await fetch(url, finalInit);

    console.log('📥 [RESPONSE STATUS]', res.status);
    const contentType = res.headers.get('Content-Type') || '';
    console.log('📥 [RESPONSE HEADERS]', contentType);

    const isJson = contentType.toLowerCase().includes('application/json');
    const raw = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

    if (!res.ok) {
      const serverMsg =
        (raw && typeof raw === 'object' && (raw.message || raw.error)) ||
        (typeof raw === 'string' && raw) ||
        `HTTP ${res.status}`;
      console.error('❌ [SERVER ERROR]', raw);
      throw new Error(serverMsg);
    }

    if (!isJson) {
      console.warn('⚠️ [NON-JSON RESPONSE]', raw);
      return raw as TResp;
    }

    console.log('✅ [PARSED JSON]', raw);
    return raw as TResp;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    console.error('❌ [CATCH ERROR]', { message, error: err });
    throw new Error(message);
  }
}

/* ========= Public API functions ========= */

// 🔐 Login — backend ใช้ /api/check-user
export const login = (email: string, password: string) =>
  request<AuthResponse>('/check-user', { email, password });

// 📝 Register — ใช้ fname/lname
export const register = (
  fname: string,
  lname: string,
  email: string,
  password: string,
  phone: string
) =>
  request<AuthResponse>('/register', {
    fname,
    lname,
    email,
    password,
    phone,
  });

// 👤 Update user
export const updateUser = (userData: Record<string, unknown>) =>
  request<BasicResponse<ApiUser>>('/update-user', userData);

// 🎯 Set goal
export const setGoal = (payload: {
  user_id: number;
  goalType: 'walking' | 'bicycle' | string;
  value: number;
}) => request<BasicResponse<ApiUser>>('/set-goal', payload);

/* ========= Helper ========= */
export function pickUser(
  resp: AuthResponse | BasicResponse<ApiUser> | null | undefined
): ApiUser | null {
  if (!resp) return null;
  // @ts-ignore
  return (resp as any).data || (resp as any).user || null;
}

/* ========= Storage Helpers ========= */
const USER_KEY = 'user';
const TOKEN_KEY = 'token';

export async function saveUser(user: ApiUser | any, token?: string) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getUser(): Promise<ApiUser | any | null> {
  try {
    const json = await AsyncStorage.getItem(USER_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to load user from storage:', err);
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

export async function logout() {
  await AsyncStorage.multiRemove([USER_KEY, TOKEN_KEY]);
}
