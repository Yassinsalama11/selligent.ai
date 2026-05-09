'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function PasswordRule({ met, label }) {
  return (
    <li className={cn('flex items-center gap-2 text-xs transition-colors', met ? 'text-emerald-500' : 'text-muted-foreground')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', met ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
      {label}
    </li>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing link. Please contact your administrator.');
  }, [token]);

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);
  const matches = password === confirm && confirm.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!allRulesMet) { setError('Password does not meet requirements.'); return; }
    if (!matches) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Link is invalid or has expired. Please contact your administrator.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px] space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo className="h-9" />
        </div>

        {done ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xl space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Password Set!</h2>
            <p className="text-sm text-muted-foreground">Your account is ready. Redirecting you to login…</p>
            <Link href="/login">
              <Button className="w-full h-10 mt-2">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
            <div className="space-y-1 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Set Your Password</h1>
              <p className="text-sm text-muted-foreground">
                Your workspace is ready. Create a secure password to get started.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Password</label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="h-11 pr-10"
                    required
                    disabled={!token || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <ul className="space-y-1 pt-1">
                    <PasswordRule met={rules.length} label="At least 8 characters" />
                    <PasswordRule met={rules.upper} label="One uppercase letter" />
                    <PasswordRule met={rules.lower} label="One lowercase letter" />
                    <PasswordRule met={rules.number} label="One number" />
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className={cn('h-11 pr-10', confirm && !matches && 'border-destructive focus-visible:ring-destructive')}
                    required
                    disabled={!token || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirm && !matches && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-bold"
                disabled={loading || !token || !allRulesMet || !matches}
              >
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting password…</> : 'Set Password & Continue'}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Already have a password?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
