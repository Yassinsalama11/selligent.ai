'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', subject: 'General inquiry', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--t1)', outline: 'none', boxSizing: 'border-box',
  };

  const channels = [
    { icon: '📧', label: 'General', value: 'hello@chatorai.com', desc: 'General inquiries and partnerships' },
    { icon: '🛠', label: 'Support', value: 'support@chatorai.com', desc: 'Platform issues and technical help' },
    { icon: '💼', label: 'Sales', value: 'sales@chatorai.com', desc: 'Pricing, plans, and enterprise' },
    { icon: '🔒', label: 'Security', value: 'security@chatorai.com', desc: 'Vulnerabilities and security reports' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 10px', display: 'inline-flex' }}>
            <Image src="/chatorai-logo.svg" alt="ChatOrAI" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
          </div>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'var(--t4)', textDecoration: 'none' }}>← Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Contact</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 14 }}>Get in touch</h1>
          <p style={{ fontSize: 16, color: 'var(--t3)' }}>We typically reply within a few hours during business days (Sun–Thu, Cairo time).</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40 }}>
          {/* Left: info */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
              {channels.map((ch, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 14, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22 }}>{ch.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{ch.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#818cf8', marginBottom: 2 }}>{ch.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--t4)' }}>{ch.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>All systems operational</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--t4)' }}>Check our <Link href="/status" style={{ color: '#818cf8' }}>Status page</Link> for real-time uptime.</p>
            </div>
          </div>

          {/* Right: form */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>✅</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Message sent!</h3>
                <p style={{ color: 'var(--t3)', marginBottom: 24 }}>We'll get back to you at <strong>{form.email}</strong> within a few hours.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', company: '', subject: 'General inquiry', message: '' }); }}
                  style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t2)', cursor: 'pointer', fontSize: 14 }}>
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Send us a message</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Name *</label>
                    <input style={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmed Hassan" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Email *</label>
                    <input style={inp} type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Company</label>
                  <input style={inp} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="My Store" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Subject</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                    {['General inquiry', 'Sales & pricing', 'Technical support', 'Partnership', 'Press & media', 'Security report'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Message *</label>
                  <textarea style={{ ...inp, resize: 'vertical' }} rows={5} required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us how we can help…" />
                </div>
                <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
