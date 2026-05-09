'use client';

import { useEffect, useRef, useState } from 'react';

export function usePollingResource(loader, deps = [], options = {}) {
  const { intervalMs = 30000, initialData = null } = options;
  const loaderRef = useRef(loader);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    let timer = null;

    async function load({ silent = false } = {}) {
      if (!active) return;
      // Skip polling when tab is hidden — resume on next visibility change
      if (silent && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      try {
        const next = await loaderRef.current();
        if (!active) return;
        setData(next);
        setError('');
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Could not load data');
      } finally {
        if (active && !silent) setLoading(false);
        if (active && silent) setRefreshing(false);
      }
    }

    function scheduleTimer() {
      if (intervalMs > 0 && active) {
        timer = setInterval(() => load({ silent: true }), intervalMs);
      }
    }

    function handleVisibilityChange() {
      if (!active) return;
      if (document.visibilityState === 'visible') {
        // Reload immediately when tab becomes visible again
        load({ silent: true });
        clearInterval(timer);
        scheduleTimer();
      }
    }

    load();
    scheduleTimer();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      active = false;
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [...deps, intervalMs, reloadKey]);

  return {
    data,
    error,
    loading,
    refreshing,
    lastUpdated,
    reload: () => setReloadKey((current) => current + 1),
    setData,
  };
}
