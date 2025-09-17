// src/services/authService.ts
import { Platform } from 'react-native';

/**
 * ตั้งค่า BASE_URL
 * - แนะนำให้ตั้งไฟล์ .env: EXPO_PUBLIC_API_URL=http://<YOUR_PC_IP>:3000
 * - ถ้าไม่มี .env และอยู่ในโหมด dev:
 *   - Android Emulator ➜ http://10.0.2.2:3000
 *   - อื่น ๆ ➜ http://192.168.0.100:3000  (แก้ให้ตรง IP พีซีของคุณ)
 * - โปรดแก้ 'https://your-prod-domain.com' สำหรับ production
 */
const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/$/, ''); // ตัด / ท้าย
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      // ใช้ได้เฉพาะ Android Emulator
      return 'http://10.0.2.2:3000';
    }
    // iOS Simulator / อุปกรณ์จริงใน LAN เดียวกัน — แก้ IP ให้ตรงเครื่องคุณ
    return 'http://192.168.0.100:3000';
  }

  return 'https://your-prod-domain.com';
};

const BASE_URL = getBaseUrl();

/** Generic API request (POST by default) */
async function request<TResp, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  init?: RequestInit
): Promise<TResp> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const finalInit: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  };

  // Log สำหรับดีบัก
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

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('❌ [SERVER ERROR RESPONSE TEXT]', errText);
      throw new Error(`Server responded ${res.status}: ${errText}`);
    }

    // บาง endpoint อาจไม่คืน JSON
    if (!contentType.toLowerCase().includes('application/json')) {
      const text = await res.text();
      // @ts-expect-error - ในกรณี API ไม่ใช่ JSON จริง ๆ
      return text;
    }

    const json = (await res.json()) as TResp;
    console.log('✅ [PARSED JSON]', json);
    return json;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    console.error('❌ [CATCH ERROR]', { message, error: err });
    throw new Error(message);
  }
}

// ---------- Public APIs ----------

// 🔐 Login API
export const login = (email: string, password: string) =>
  request<{ token?: string; user?: any; message?: string }>('/api/check-user', {
    email,
    password,
  });

// 📝 Register API
export const register = (
  name: string,
  lname: string,
  email: string,
  password: string,
  phone: string
) =>
  request<{ user?: any; message?: string }>('/api/register', {
    name,
    lname,
    email,
    password,
    phone,
  });

// 👤 Update user
export const updateUser = (userData: Record<string, unknown>) =>
  request<{ success: boolean; user?: any; message?: string }>('/api/update-user', userData);
