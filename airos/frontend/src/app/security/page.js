'use client';
import Link from 'next/link';
import Image from 'next/image';

function PageShell({ title, subtitle, children }) {
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
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 32px 100px' }}>
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>{title}</h1>
          <p style={{ fontSize: 16, color: 'var(--t3)', lineHeight: 1.7 }}>{subtitle}</p>
        </div>
        {children}
      </div>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link> · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link>
      </footer>
    </div>
  );
}

const pillars = [
  {
    icon: '🔐', title: 'Encryption', color: '#6366f1',
    items: [
      'All data in transit encrypted with TLS 1.3',
      'Data at rest encrypted with AES-256',
      'JWT tokens signed with HS256 and rotated regularly',
      'API keys stored encrypted, never logged',
    ],
  },
  {
    icon: '🛡', title: 'Infrastructure', color: '#8b5cf6',
    items: [
      'Hosted on Railway with isolated containers',
      'CDN and DDoS protection via Cloudflare',
      'Automatic backups every 24 hours',
      'Zero-downtime deployments',
    ],
  },
  {
    icon: '🔑', title: 'Access Control', color: '#06b6d4',
    items: [
      'Role-based access control (RBAC) across all accounts',
      'Each client\'s data is tenant-isolated',
      'Admin access requires MFA',
      'All access events are logged and auditable',
    ],
  },
  {
    icon: '📋', title: 'Compliance', color: '#10b981',
    items: [
      'GDPR-aligned data handling practices',
      'Data Processing Agreements available on request',
      'Meta platform policies strictly followed',
      'Regular internal security reviews',
    ],
  },
  {
    icon: '🧪', title: 'Testing & Monitoring', color: '#f59e0b',
    items: [
      'Continuous monitoring for anomalies and threats',
      'Automated vulnerability scanning in CI/CD pipeline',
      'Incident response plan with <2h SLA',
      'Security patches applied within 24 hours of disclosure',
    ],
  },
  {
    icon: '👁', title: 'Transparency', color: '#ec4899',
    items: [
      'Public status page at chatorai.com/status',
      'Incident postmortems published within 48 hours',
      'Security changelog maintained',
      'Responsible disclosure program active',
    ],
  },
];

export default function SecurityPage() {
  return (
    <PageShell
      title="Security at ChatOrAI"
      subtitle="We take the security of your business data and your customers' conversations seriously. Here's how we protect everything entrusted to us."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 64 }}>
        {pillars.map((p, i) => (
          <div key={i} style={{ padding: '28px', borderRadius: 18, background: 'var(--bg3)', border: `1px solid ${p.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>{p.title}</h3>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.items.map((item, j) => (
                <li key={j} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--t3)' }}>
                  <span style={{ color: p.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ padding: '36px', borderRadius: 20, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>🔍 Responsible Disclosure</h2>
        <p style={{ fontSize: 15, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 16 }}>
          Found a security vulnerability? We appreciate responsible disclosure. Please email us at <strong style={{ color: '#a5b4fc' }}>security@chatorai.com</strong> with a description of the issue.
        </p>
        <p style={{ fontSize: 14, color: 'var(--t4)' }}>We commit to: acknowledging your report within 24 hours · providing a timeline for a fix within 72 hours · not pursuing legal action against good-faith researchers.</p>
      </div>

      <div style={{ fontSize: 14, color: 'var(--t4)', lineHeight: 1.8 }}>
        <p>For security concerns or questions, contact us at <strong>security@chatorai.com</strong>. For general privacy questions, see our <Link href="/privacy" style={{ color: '#818cf8' }}>Privacy Policy</Link>.</p>
      </div>
    </PageShell>
  );
}
