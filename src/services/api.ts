// src/services/api.ts
export const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:3000';

export const api = (path: string) => `${API_ORIGIN}/api${path}`;
