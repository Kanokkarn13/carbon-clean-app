// src/services/api.ts
/** ✅ Use ENV for backend origin (no /api, no trailing slash) */
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.102:3000';
export const API_ORIGIN = RAW_BASE.replace(/\/+$/, '');

/** Helper to build full endpoint path */
export const api = (path: string) => `${API_ORIGIN}/api${path}`;
