'use client';

import { API_BASE } from '@/lib/api';

const LEGACY_ADMIN_TOKEN_KEY = 'chatorai_admin_token';
const ADMIN_PROFILE_KEY = 'chatorai_admin_profile';

async function adminRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (res.status === 401) {
    clearAdminSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new Error(data?.error || 'Admin session expired');
  }

  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export const adminApi = {
  get: (path) => adminRequest(path),
  post: (path, body) => adminRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => adminRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => adminRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export function setAdminSession({ admin }) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin));
}

export function getAdminProfile() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
}

export function hasAdminSession() {
  return Boolean(getAdminProfile());
}

export async function logoutAdmin() {
  try {
    await adminApi.post('/api/admin/auth/logout', {});
  } finally {
    clearAdminSession();
  }
}
