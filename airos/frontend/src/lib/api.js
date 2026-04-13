export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function isDemo() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('airos_demo') === '1';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('airos_token');
}

async function request(path, options = {}) {
  // Demo mode — never hit the network
  if (isDemo()) return null;

  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach server. Make sure the backend is running.');
  }

  if (res.status === 401) {
    localStorage.removeItem('airos_token');
    window.location.href = '/login';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  post:   (path, body) => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  get:    (path)       => request(path),
  put:    (path, body) => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body) => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};

export function setToken(token) {
  localStorage.setItem('airos_token', token);
}

export function clearToken() {
  localStorage.removeItem('airos_token');
  localStorage.removeItem('airos_demo');
}
