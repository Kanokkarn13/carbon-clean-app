// src/services/authService.ts
import { Platform } from 'react-native';

/* ========= Base URL ========= */
const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, ''); // strip trailing slashes
  }
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000'; // Android emulator -> host
    return 'http://192.168.0.102:3000'; // iOS sim / device on LAN (adjust to your PC IP)
  }
  return 'https://your-prod-domain.com';
};

const BASE_URL = getBaseUrl();
export const API_BASE = BASE_URL; // for debugging

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
  data?: ApiUser | any; // your backend returns user in data
  user?: ApiUser | any; // just in case another env returns user directly
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
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

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
      return raw;
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

/* ========= Public API functions (match your server) ========= */

// 🔐 Login — your server uses /api/check-user (NOT /api/login)
export const login = (email: string, password: string) =>
  request<AuthResponse>('/api/check-user', { email, password });

// 📝 Register — expects fname (not "name")
export const register = (
  fname: string,
  lname: string,
  email: string,
  password: string,
  phone: string
) =>
  request<AuthResponse>('/api/register', {
    fname,
    lname,
    email,
    password,
    phone,
  });

// 👤 Update user
export const updateUser = (userData: Record<string, unknown>) =>
  request<BasicResponse<ApiUser>>('/api/update-user', userData);

// 🎯 Set goal
export const setGoal = (payload: { user_id: number; goalType: 'walking' | 'bicycle' | string; value: number }) =>
  request<BasicResponse<ApiUser>>('/api/set-goal', payload);

/* ========= Helper ========= */
export function pickUser(resp: AuthResponse | BasicResponse<ApiUser> | null | undefined): ApiUser | null {
  if (!resp) return null;
  // @ts-ignore
  return (resp as any).data || (resp as any).user || null;
}
