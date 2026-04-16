'use client';

import { useEffect } from 'react';
import { initFrontendErrorTracking } from '@/lib/sentry';

export default function FrontendErrorTracking() {
  useEffect(() => {
    initFrontendErrorTracking();
  }, []);

  return null;
}
