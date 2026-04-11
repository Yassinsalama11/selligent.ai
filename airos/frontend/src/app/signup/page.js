'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', form);
      setToken(data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left visual panel */}
      <div className="hide-sm" style={{ width: '42%', background: 'linear-gradient(160deg,rgba(139,92,246,0.12) 0%,rgba(99,102,241,0.08) 100%)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 56px', position: 'relative', overflow: 'hidden' }}>
        <div className="orb" style={{ width: 450, height: 450, top: -120, right: -120, background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)' }} />

        <Link href="/" style={{ textDecoration: 'none', marginBottom: 52, position: 'relative', zIndex: 1, display: 'inline-flex' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '5px 14px', display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/selligent-logo.png" alt="Selligent.ai" width={180} height={46}
              style={{ height: 46, width: 'auto', objectFit: 'contain', display: 'block' }}
              priority />
          </div>
        </Link>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Start turning conversations<br /><span className="gt">into revenue today</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--t3)', lineHeight: 1.7, marginBottom: 40 }}>
            14-day free trial. No credit card needed. Full access to all features.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { n: '2 min', d: 'Setup time' },
              { n: '4', d: 'Channels unified immediately' },
              { n: '87%', d: 'AI suggestion adoption rate' },
            ].map(s => (
              <div key={s.d} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="gt" style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Space Grotesk', minWidth: 52 }}>{s.n}</span>
                <span style={{ fontSize: 14, color: 'var(--t3)' }}>{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="anim-up">
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8, textAlign: 'center' }}>Create your account</h1>
          <p style={{ color: 'var(--t3)', fontSize: 14, textAlign: 'center', marginBottom: 36 }}>14-day free trial · No credit card required</p>

          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'name', label: 'Full Name', type: 'text', ph: 'Ahmed Mohamed' },
              { key: 'company', label: 'Company / Store Name', type: 'text', ph: 'My Store' },
              { key: 'email', label: 'Work Email', type: 'email', ph: 'you@store.com' },
              { key: 'password', label: 'Password', type: 'password', ph: 'Min 8 characters' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>{f.label}</label>
                <input type={f.type} className="input" placeholder={f.ph}
                  value={form[f.key]} onChange={update(f.key)} required minLength={f.key === 'password' ? 8 : undefined} />
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 8, padding: '13px', fontSize: 15, justifyContent: 'center', borderRadius: 14 }}>
              {loading ? 'Creating account...' : 'Create Free Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t4)', marginTop: 16 }}>
            By signing up you agree to our{' '}
            <a href="#" style={{ color: '#818cf8', textDecoration: 'none' }}>Terms</a> and{' '}
            <a href="#" style={{ color: '#818cf8', textDecoration: 'none' }}>Privacy Policy</a>.
          </p>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--t4)', marginTop: 24 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
