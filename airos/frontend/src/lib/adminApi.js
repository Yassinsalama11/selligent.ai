'use client';

import { API_BASE } from '@/lib/api';

const ADMIN_TOKEN_KEY = 'chatorai_admin_token';
const ADMIN_PROFILE_KEY = 'chatorai_admin_profile';

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

async function adminRequest(path, options = {}) {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  patch: (path, body) => adminRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export function setAdminSession({ token, admin }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
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
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
}

export function hasAdminSession() {
  return Boolean(getAdminToken());
}
