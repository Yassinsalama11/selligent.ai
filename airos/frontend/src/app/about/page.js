'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-flex' }}>
            <Image src="/ChatOrAi.png" alt="ChatOrAI" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ fontSize: 13, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Start Free →</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 32px 60px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>About Us</div>
        <h1 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 24 }}>
          Built for the <span style={{ background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arabic internet economy</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--t3)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
          ChatOrAI was born from a simple frustration: Arabic eCommerce businesses were losing sales every day because they couldn't keep up with the volume of WhatsApp and Instagram messages pouring in.
        </p>
      </div>

      {/* Story */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 32px 80px', fontSize: 16, color: 'var(--t2)', lineHeight: 1.9 }}>
        <div style={{ borderLeft: '3px solid #6366f1', paddingLeft: 28, marginBottom: 40 }}>
          <p style={{ fontSize: 20, fontStyle: 'italic', color: 'var(--t1)', lineHeight: 1.7 }}>
            "Every morning, store owners woke up to 200+ unanswered messages. Deals were dying in their inboxes. We knew AI could fix this — if it actually understood Arabic commerce."
          </p>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--t4)' }}>— Yassin, Founder</p>
        </div>

        <p style={{ marginBottom: 20 }}>We started by interviewing 50+ eCommerce founders across Egypt, Saudi Arabia, UAE, and Jordan. The problem was universal: customers message on WhatsApp at 2am asking about prices, stock, and shipping. By morning, the lead is cold. The sale is gone.</p>
        <p style={{ marginBottom: 20 }}>Existing tools were built for English-speaking markets with different buying behaviors. They didn't understand Arabic dialects, didn't know how to handle price haggling, and had no concept of the MENA eCommerce buying journey.</p>
        <p style={{ marginBottom: 20 }}>So we built ChatOrAI — an AI that actually speaks Arabic, understands the intent behind every message, and helps sales teams close deals in real-time across WhatsApp, Instagram, Messenger, and Live Chat from one unified workspace.</p>

        {/* Values */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, margin: '48px 0' }}>
          {[
            { icon: '🌍', title: 'MENA-first', body: 'Everything we build is designed for Arabic eCommerce first — language, culture, buying behavior.' },
            { icon: '🧠', title: 'AI with context', body: 'Our AI understands conversation history, product catalogs, and brand voice — not just keywords.' },
            { icon: '⚡', title: 'Speed above all', body: 'Every second of delay costs deals. We obsess over response time at every layer of the stack.' },
          ].map((v, i) => (
            <div key={i} style={{ padding: '24px', borderRadius: 16, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{v.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{v.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.7 }}>{v.body}</p>
            </div>
          ))}
        </div>

        <div style={{ padding: '32px', borderRadius: 20, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center', marginTop: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Join us on the mission</h2>
          <p style={{ color: 'var(--t3)', marginBottom: 24 }}>We're a small, focused team. If you're passionate about AI and the Arabic internet economy, we'd love to hear from you.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/careers" style={{ padding: '11px 24px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>View Open Roles</Link>
            <Link href="/contact" style={{ padding: '11px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t2)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>Get in Touch</Link>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
