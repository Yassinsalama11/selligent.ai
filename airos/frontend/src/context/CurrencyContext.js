'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CurrencyContext = createContext({ currency: 'USD', formatMoney: (v) => String(v) });

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    api.get('/api/settings')
      .then((s) => {
        const c = s?.global?.currency || s?.company?.currency || 'USD';
        if (c) setCurrency(c);
      })
      .catch(() => {});
  }, []);

  function formatMoney(value, overrideCurrency) {
    const amount = Number(value || 0);
    const cur = overrideCurrency || currency;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${cur} ${amount.toLocaleString('en-US')}`;
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, formatMoney }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
