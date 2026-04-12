'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

/* Demo credentials — pre-fill on click */
const DEMO = { email: 'demo@selligent.ai', password: 'demo1234' };

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in (trial JWT or regular token), go to dashboard
  useEffect(() => {
    const token = localStorage.getItem('airos_token');
    if (token) router.replace('/dashboard');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ── Demo bypass — works with no backend ──────────────────────────────
    if ((form.email === DEMO.email || form.email === 'demo@airos.io') && form.password === DEMO.password) {
      localStorage.setItem('airos_token', 'demo_token');
      localStorage.setItem('airos_demo', '1');
      router.push('/dashboard');
      return;
    }

    try {
      const data = await api.post('/api/auth/login', form);
      setToken(data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err.message?.includes('fetch') || err.message?.includes('Network')
          ? 'Cannot reach server. Use the demo account to explore the dashboard.'
          : err.message || 'Invalid credentials.'
      );
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setForm(DEMO);
    setError('');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="hide-sm" style={{ width: '44%', background: 'linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', position: 'relative', overflow: 'hidden' }}>
        <div className="orb" style={{ width: 400, height: 400, top: -100, left: -100, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)' }} />
        <div className="orb" style={{ width: 300, height: 300, bottom: -60, right: -80, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)' }} />

        <Link href="/" style={{ textDecoration: 'none', position: 'relative', zIndex: 1, display: 'inline-flex' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '5px 14px', display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/selligent-logo.png" alt="Selligent.ai" width={180} height={46}
              style={{ height: 46, width: 'auto', objectFit: 'contain', display: 'block' }}
              priority />
          </div>
        </Link>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>
            Your AI-powered<br /><span className="gt">revenue team</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--t3)', lineHeight: 1.7, marginBottom: 40 }}>
            Unify WhatsApp, Instagram, Messenger, and Live Chat. Let AI handle intent detection, lead scoring, and reply generation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '🧠', text: 'AI detects intent on every message' },
              { icon: '🎯', text: 'Lead scored 0–100 automatically' },
              { icon: '⚡', text: 'Reply suggestion ready in <1 second' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--t2)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--t4)', position: 'relative', zIndex: 1 }}>
          Trusted by 200+ Arabic eCommerce businesses
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="anim-up" style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '5px 16px', display: 'inline-flex', alignItems: 'center' }}>
              <Image src="/selligent-logo.png" alt="Selligent.ai" width={200} height={50}
                style={{ height: 50, width: 'auto', objectFit: 'contain', display: 'block' }}
                priority />
            </div>
          </div>

          <div className="anim-up" style={{ animationDelay: '0.05s' }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8, textAlign: 'center' }}>Welcome back</h1>
            <p style={{ color: 'var(--t3)', fontSize: 14, textAlign: 'center', marginBottom: 36 }}>Sign in to your Selligent.ai dashboard</p>
          </div>

          {/* Demo credentials banner */}
          <div className="anim-up" style={{ animationDelay: '0.1s', marginBottom: 24 }}>
            <button onClick={fillDemo} style={{
              width: '100%', padding: '14px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'border-color 0.2s',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>🚀 Try the Live Demo Account</div>
                <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>Email: <span style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>demo@selligent.ai</span></span>
                  <span>Password: <span style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>demo1234</span></span>
                </div>
              </div>
              <span style={{ fontSize: 13, color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '5px 12px', borderRadius: 8, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>Fill →</span>
            </button>
          </div>

          <div className="anim-up" style={{ animationDelay: '0.15s' }}>
            {error && (
              <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Email</label>
                <input type="email" className="input" placeholder="you@company.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>Password</label>
                  <a href="#" style={{ fontSize: 13, color: '#818cf8', textDecoration: 'none' }}>Forgot?</a>
                </div>
                <input type="password" className="input" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center', borderRadius: 14 }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg style={{ animation: 'anim-spin 1s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
                      </svg>
                      Signing in...
                    </span>
                  : 'Sign In →'
                }
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--t4)', marginTop: 24 }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                Start free trial
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
