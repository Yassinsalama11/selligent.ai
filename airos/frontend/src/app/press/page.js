'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function PressPage() {
  const facts = [
    'AI Revenue Operating System for Arabic eCommerce',
    'Unified inbox: WhatsApp, Instagram, Messenger, Live Chat',
    'AI intent detection, lead scoring 0–100, reply generation',
    'Built for the MENA market — Arabic-first AI',
    'Plans from €49/month, 7-day free trial',
    'Shopify and WooCommerce catalog sync',
  ];

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

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 32px 100px' }}>
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Press & Media</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>Press Kit</h1>
          <p style={{ fontSize: 16, color: 'var(--t3)', lineHeight: 1.7 }}>
            Resources for journalists, analysts, and media partners covering ChatOrAI and the Arabic eCommerce AI space.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Boilerplate */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>📋 Company Boilerplate</h2>
            <p style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 16 }}>
              ChatOrAI is an AI Revenue Operating System built for Arabic eCommerce businesses. The platform unifies WhatsApp, Instagram, Messenger, and Live Chat into a single inbox, using AI to detect customer intent, score leads in real-time, and generate replies in Arabic and English. Founded in Egypt, ChatOrAI serves eCommerce businesses across the MENA region.
            </p>
            <button onClick={() => navigator.clipboard?.writeText('ChatOrAI is an AI Revenue Operating System built for Arabic eCommerce businesses. The platform unifies WhatsApp, Instagram, Messenger, and Live Chat into a single inbox, using AI to detect customer intent, score leads in real-time, and generate replies in Arabic and English.')}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Copy boilerplate
            </button>
          </div>

          {/* Key facts */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>📊 Key Facts</h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {facts.map((f, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--t2)' }}>
                  <span style={{ color: '#34d399', flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Logo download */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>🎨 Logo & Brand Assets</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '24px', borderRadius: 12, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image src="/ChatOrAi.png" alt="ChatOrAI" width={180} height={46} style={{ height: 46, width: 'auto', objectFit: 'contain' }} />
              </div>
              <div style={{ padding: '24px', borderRadius: 12, background: '#08080f', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image src="/ChatOrAi.png" alt="ChatOrAI" width={180} height={46} style={{ height: 46, width: 'auto', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--t4)' }}>Logo files available on request. Please contact press@chatorai.com.</p>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>📬 Media Contact</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Press Inquiries</div>
                <a href="mailto:press@chatorai.com" style={{ color: '#818cf8', fontWeight: 600 }}>press@chatorai.com</a>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Partnerships</div>
                <a href="mailto:partnerships@chatorai.com" style={{ color: '#818cf8', fontWeight: 600 }}>partnerships@chatorai.com</a>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Response Time</div>
                <div style={{ color: 'var(--t3)' }}>Within 24 hours on business days</div>
              </div>
              <div style={{ marginTop: 4 }}>
                <Link href="/contact" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>
                  Send a message →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
