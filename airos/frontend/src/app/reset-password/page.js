'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}${token ? '/api/auth/reset-password' : '/api/auth/forgot-password'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            token
              ? { token, newPassword: password }
              : { email },
          ),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not process request');
      if (token) {
        setStatus('done');
      } else {
        setStatus('idle');
        setRequested(true);
      }
    } catch (err) {
      setStatus('idle');
      setError(err.message || 'Could not process request');
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-3 text-sm text-muted-foreground">Set a new password for your ChatorAI account.</p>
        {token && status === 'done' ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
              Your password has been updated.
            </p>
            <Link href="/login">
              <Button className="w-full">Go to login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
            {!token ? (
              <>
                {requested ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
                    If the email exists, a reset link has been sent.
                  </div>
                ) : null}
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">New password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Confirm password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <Button type="submit" disabled={status === 'loading'} className="w-full">
              {status === 'loading' ? 'Processing...' : token ? 'Reset Password' : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
