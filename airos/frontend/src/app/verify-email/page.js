'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [status, setStatus] = useState(token ? 'loading' : 'idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not verify email');
        if (!cancelled) setStatus('done');
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('idle');
          setError(err.message || 'Could not verify email');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-background px-6 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight">Verify email</h1>
        <p className="mt-3 text-sm text-muted-foreground">Confirm your email address for your ChatorAI account.</p>
        <div className="mt-8 space-y-4">
          {status === 'loading' ? <p className="text-sm text-muted-foreground">Verifying your email...</p> : null}
          {status === 'done' ? (
            <>
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
                Your email has been verified.
              </p>
              <Link href="/login">
                <Button className="w-full">Continue to login</Button>
              </Link>
            </>
          ) : null}
          {status !== 'loading' && error ? (
            <>
              <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
              <Link href="/login">
                <Button className="w-full" variant="outline">Back to login</Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
