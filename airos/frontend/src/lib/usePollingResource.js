'use client';

import { useEffect, useRef, useState } from 'react';

export function usePollingResource(loader, deps = [], options = {}) {
  const { intervalMs = 30000, initialData = null } = options;
  const loaderRef = useRef(loader);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  loaderRef.current = loader;

  useEffect(() => {
    let active = true;

    async function load({ silent = false } = {}) {
      if (!silent) setLoading(true);

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
        if (active && !silent) {
          setLoading(false);
        }
      }
    }

    load();

    if (intervalMs > 0) {
      const timer = setInterval(() => {
        load({ silent: true });
      }, intervalMs);

      return () => {
        active = false;
        clearInterval(timer);
      };
    }

    return () => {
      active = false;
    };
  }, [...deps, intervalMs, reloadKey]);

  return {
    data,
    error,
    loading,
    lastUpdated,
    reload: () => setReloadKey((current) => current + 1),
    setData,
  };
}
