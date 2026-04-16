import http from 'k6/http';
import { check } from 'k6';

export const API_BASE_URL = (__ENV.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
export const SOCKET_BASE_URL = (__ENV.SOCKET_BASE_URL || __ENV.API_BASE_URL || 'ws://localhost:3001').replace(/\/+$/, '');
export const TENANT_ID = __ENV.TENANT_ID || '11111111-1111-1111-1111-111111111111';
export const SOCKET_ORIGIN = __ENV.SOCKET_ORIGIN || 'http://localhost:3000';
export const TEST_RUN_ID = __ENV.TEST_RUN_ID || `loadtest-${Date.now()}`;

export function randomId(prefix = 'lt') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function jsonParams(extraHeaders = {}, tags = {}) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    tags,
  };
}

export function resolveAuthToken() {
  if (__ENV.LOADTEST_BEARER_TOKEN) {
    return __ENV.LOADTEST_BEARER_TOKEN;
  }

  const email = __ENV.LOADTEST_LOGIN_EMAIL;
  const password = __ENV.LOADTEST_LOGIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set LOADTEST_BEARER_TOKEN or LOADTEST_LOGIN_EMAIL/LOADTEST_LOGIN_PASSWORD before running authenticated load tests.');
  }

  const authPath = __ENV.LOADTEST_AUTH_PATH || '/login';
  const response = http.post(
    `${API_BASE_URL}${authPath}`,
    JSON.stringify({ email, password }),
    jsonParams({}, { endpoint: authPath, test_type: 'auth-setup' }),
  );

  check(response, {
    'loadtest auth setup returns 200': (res) => res.status === 200,
    'loadtest auth setup returns token': (res) => {
      try {
        return Boolean(res.json('token'));
      } catch {
        return false;
      }
    },
  });

  return response.json('token');
}
