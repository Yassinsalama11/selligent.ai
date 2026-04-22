'use client';
import Link from 'next/link';
import Image from 'next/image';

function PageShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-flex' }}>
            <Image src="/ChatOrAi.png" alt="ChatOrAI" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
          </div>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'var(--t4)', textDecoration: 'none' }}>← Back to Home</Link>
      </nav>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 32px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>{title}</h1>
          <p style={{ fontSize: 15, color: 'var(--t3)' }}>{subtitle}</p>
        </div>
        <div style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.85 }}>{children}</div>
      </div>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link> · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/cookies" style={{ color: 'var(--t4)' }}>Cookies</Link>
      </footer>
    </div>
  );
}

const cookieTypes = [
  { name: 'Essential', color: '#10b981', required: true, desc: 'Required for the platform to function. Cannot be disabled.', examples: ['Session token (airos_token)', 'User preferences', 'CSRF protection'] },
  { name: 'Functional', color: '#6366f1', required: false, desc: 'Remember your settings and personalize your experience.', examples: ['Sidebar collapsed state', 'Dashboard time range', 'Theme preferences'] },
  { name: 'Analytics', color: '#f59e0b', required: false, desc: 'Help us understand how the platform is used to improve it.', examples: ['Page views', 'Feature usage', 'Session duration'] },
  { name: 'Marketing', color: '#ec4899', required: false, desc: 'Used to show relevant ads and measure campaign effectiveness.', examples: ['Ad conversion tracking', 'Retargeting pixels'] },
];

export default function CookiesPage() {
  return (
    <PageShell title="Cookie Policy" subtitle={`Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>

      <p style={{ marginBottom: 16 }}>This Cookie Policy explains how ChatOrAI uses cookies and similar tracking technologies on our website and platform. By using ChatOrAI, you consent to the use of cookies as described in this policy.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 12 }}>What Are Cookies?</h2>
      <p style={{ marginBottom: 16 }}>Cookies are small text files placed on your device when you visit a website. They help websites remember your preferences, keep you logged in, and collect analytics data. We also use localStorage (similar technology) to store session and preference data in your browser.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 20 }}>Types of Cookies We Use</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {cookieTypes.map((ct, i) => (
          <div key={i} style={{ padding: '20px 24px', borderRadius: 14, background: 'var(--bg3)', border: `1px solid ${ct.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{ct.name} Cookies</h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${ct.color}18`, color: ct.color }}>
                {ct.required ? 'Always Active' : 'Optional'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 10 }}>{ct.desc}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ct.examples.map((ex, j) => (
                <span key={j} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--t4)' }}>{ex}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 12 }}>Third-Party Cookies</h2>
      <p style={{ marginBottom: 16 }}>Some features on our platform involve third-party services that may set their own cookies:</p>
      <ul style={{ marginBottom: 16, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'Stripe — for secure payment processing',
          'Cloudflare — for CDN, security, and performance',
          'Meta (Facebook/Instagram) — when using social channel integrations',
        ].map((item, i) => <li key={i} style={{ listStyle: 'disc' }}>{item}</li>)}
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 12 }}>How to Control Cookies</h2>
      <p style={{ marginBottom: 16 }}>You can control cookies through your browser settings. Most browsers allow you to refuse cookies or delete existing ones. Note that disabling essential cookies will prevent you from using the platform.</p>
      <ul style={{ marginBottom: 16, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'Chrome: Settings → Privacy and Security → Cookies',
          'Firefox: Settings → Privacy & Security → Cookies and Site Data',
          'Safari: Preferences → Privacy → Manage Website Data',
          'Edge: Settings → Cookies and Site Permissions',
        ].map((item, i) => <li key={i} style={{ listStyle: 'disc' }}>{item}</li>)}
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 12 }}>Contact</h2>
      <p style={{ marginBottom: 16 }}>For questions about our use of cookies, email us at <strong>privacy@chatorai.com</strong>. See also our <Link href="/privacy" style={{ color: '#818cf8' }}>Privacy Policy</Link>.</p>

    </PageShell>
  );
}
