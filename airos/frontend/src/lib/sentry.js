'use client';

import { API_BASE } from '@/lib/api';

let initialized = false;

async function reportFrontendError(payload) {
  try {
    await fetch(`${API_BASE}/api/telemetry/frontend-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        source: 'frontend',
      }),
    });
  } catch {
    // Error reporting must not create user-facing failures.
  }
}

export function initFrontendErrorTracking() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    window.Sentry?.init?.({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
    });
  }

  window.addEventListener('error', (event) => {
    reportFrontendError({
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportFrontendError({
      message: reason?.message || String(reason || 'Unhandled promise rejection'),
      stack: reason?.stack,
    });
  });
}
