'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { API_BASE, setToken } from '@/lib/api';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!token) {
      setError('Missing invitation token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not accept invitation');
      if (payload.token) setToken(payload.token);
      if (payload.user) localStorage.setItem('airos_user', JSON.stringify(payload.user));
      router.push('/dashboard');
    } catch (err) {
      setStatus('idle');
      setError(err.message || 'Could not accept invitation');
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight">Join workspace</h1>
        <p className="mt-3 text-sm text-muted-foreground">Set your password to accept the ChatorAI workspace invitation.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          <div>
            <label className="mb-2 block text-sm font-medium">Your name</label>
            <input type="text" className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input type="password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Confirm password</label>
            <input type="password" className="input" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </div>
          <Button type="submit" disabled={status === 'loading'} className="w-full">
            {status === 'loading' ? 'Joining...' : 'Join Workspace'}
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
