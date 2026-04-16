'use client';

import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
  timestamp: string;
  postgres?: string;
  redis?: string;
  ai?: {
    anthropic: boolean;
    openai: boolean;
  };
};

const STATUS_API = process.env.NEXT_PUBLIC_STATUS_API_URL || 'http://localhost:4000/health';

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch(STATUS_API)
      .then((response) => response.json())
      .then(setData)
      .catch((reason) => setError(reason.message));
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>ChatOrAI Status</h1>
      <p style={{ color: '#93c5fd', marginBottom: 28 }}>
        Live status page for the split `apps/api`, `apps/worker`, and `apps/web` deployment.
      </p>

      {error ? (
        <div style={{ padding: 20, borderRadius: 16, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.28)' }}>
          Failed to reach {STATUS_API}: {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {[
            ['Overall', data?.status || 'loading'],
            ['Postgres', data?.postgres || 'loading'],
            ['Redis', data?.redis || 'loading'],
            ['Anthropic', data?.ai?.anthropic ? 'configured' : 'not configured'],
            ['OpenAI', data?.ai?.openai ? 'configured' : 'not configured'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: 20, borderRadius: 16, background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: '#64748b', marginTop: 18 }}>
        {data?.timestamp ? `Last updated ${new Date(data.timestamp).toLocaleString()}` : 'Waiting for first poll...'}
      </p>
    </main>
  );
}
