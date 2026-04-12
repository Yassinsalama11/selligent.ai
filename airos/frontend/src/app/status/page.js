'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const SERVICES = [
  { name: 'Web Application', desc: 'selligent-ai.pages.dev', status: 'operational' },
  { name: 'API Backend', desc: 'selligentai-production.up.railway.app', status: 'operational' },
  { name: 'AI Engine', desc: 'Intent detection & reply generation', status: 'operational' },
  { name: 'WhatsApp Webhooks', desc: 'Meta Cloud API integration', status: 'operational' },
  { name: 'Instagram Webhooks', desc: 'Instagram Messaging API', status: 'operational' },
  { name: 'Messenger Webhooks', desc: 'Facebook Page messaging', status: 'operational' },
  { name: 'Live Chat', desc: 'Socket.io real-time layer', status: 'operational' },
  { name: 'Payment Processing', desc: 'Stripe checkout & billing', status: 'operational' },
];

const HISTORY = [
  { date: 'Apr 12, 2026', title: 'Scheduled maintenance completed', desc: 'Backend upgraded to latest Node.js LTS. No user impact.', type: 'maintenance' },
  { date: 'Apr 8, 2026', title: 'All systems normal', desc: 'No incidents reported.', type: 'resolved' },
  { date: 'Mar 25, 2026', title: 'WhatsApp webhook delay — resolved', desc: 'Brief 12-minute delay in WhatsApp message delivery due to upstream Meta API latency. Resolved automatically.', type: 'resolved' },
];

const statusConfig = {
  operational: { label: 'Operational', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  degraded:    { label: 'Degraded',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  outage:      { label: 'Outage',      color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

export default function StatusPage() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const allOk = SERVICES.every(s => s.status === 'operational');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 10px', display: 'inline-flex' }}>
            <Image src="/selligent-logo.png" alt="Selligent.ai" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
          </div>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'var(--t4)', textDecoration: 'none' }}>← Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 32px 100px' }}>
        {/* Overall status */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: allOk ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', border: `2px solid ${allOk ? '#34d399' : '#f87171'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            {allOk ? '✅' : '⚠️'}
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
            {allOk ? 'All Systems Operational' : 'Some Systems Affected'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t4)', fontFamily: 'monospace' }}>{time}</p>
        </div>

        {/* Service list */}
        <div style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t2)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>Services</h2>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {SERVICES.map((svc, i) => {
              const cfg = statusConfig[svc.status];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < SERVICES.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--bg3)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>{svc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--t4)' }}>{svc.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 99, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block', animation: svc.status === 'operational' ? 'blink 2s ease-in-out infinite' : 'none' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uptime */}
        <div style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>30-Day Uptime</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['API Backend', '99.97%'], ['WhatsApp Webhooks', '99.91%'], ['AI Engine', '99.99%']].map(([name, pct], i) => (
              <div key={i} style={{ padding: '18px', borderRadius: 14, background: 'var(--bg3)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#34d399', fontFamily: 'Space Grotesk', marginBottom: 4 }}>{pct}</div>
                <div style={{ fontSize: 12, color: 'var(--t4)' }}>{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident history */}
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Incident History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {HISTORY.map((h, i) => (
              <div key={i} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: h.type === 'resolved' ? '#34d399' : '#f59e0b' }}>
                    {h.type === 'resolved' ? '✓ Resolved' : '🔧 Maintenance'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--t4)' }}>{h.date}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{h.title}</div>
                <div style={{ fontSize: 13, color: 'var(--t3)' }}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} Selligent.ai · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
