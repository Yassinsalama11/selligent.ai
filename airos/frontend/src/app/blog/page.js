'use client';
import Link from 'next/link';
import Image from 'next/image';

const POSTS = [
  {
    tag: 'Product', date: 'Apr 10, 2026', title: 'Introducing AI Brand Scan — Auto-configure your account from your website',
    excerpt: 'New onboarding feature: paste your website URL and our AI reads your brand, products, tone, and channels in seconds. No manual setup needed.',
    readTime: '3 min read', color: '#6366f1',
  },
  {
    tag: 'Guide', date: 'Apr 5, 2026', title: 'How to convert WhatsApp inquiries into sales: a playbook for Arabic eCommerce',
    excerpt: 'The average Arabic eCommerce store loses 60% of WhatsApp leads due to slow response times. Here\'s the exact framework our top clients use to close more deals.',
    readTime: '7 min read', color: '#10b981',
  },
  {
    tag: 'AI', date: 'Mar 28, 2026', title: 'Why Arabic NLP needs a different approach than English',
    excerpt: 'Dialectal Arabic, code-switching, and eCommerce-specific vocabulary make Arabic intent detection uniquely challenging. We explain what we do differently.',
    readTime: '5 min read', color: '#8b5cf6',
  },
  {
    tag: 'Guide', date: 'Mar 20, 2026', title: 'Lead scoring for eCommerce: how to rank 500 conversations by purchase likelihood',
    excerpt: 'A deep dive into the signals that predict purchase intent — and how Selligent.ai\'s 0–100 scoring engine is calibrated on real Arabic eCommerce data.',
    readTime: '6 min read', color: '#f59e0b',
  },
];

export default function BlogPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 10px', display: 'inline-flex' }}>
            <Image src="/selligent-logo.png" alt="Selligent.ai" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ fontSize: 13, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Start Free →</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 32px 100px' }}>
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Blog</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 14 }}>Product & Insights</h1>
          <p style={{ fontSize: 16, color: 'var(--t3)' }}>Product updates, eCommerce playbooks, and AI deep dives from the Selligent.ai team.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
          {POSTS.map((post, i) => (
            <div key={i} style={{ padding: '28px', borderRadius: 18, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${post.color}15`, color: post.color, border: `1px solid ${post.color}25` }}>{post.tag}</span>
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>{post.date}</span>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.4, marginBottom: 12 }}>{post.title}</h2>
              <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.7, marginBottom: 16 }}>{post.excerpt}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>⏱ {post.readTime}</span>
                <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 600 }}>Read more →</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, padding: '28px', borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Get new posts in your inbox</h3>
          <p style={{ fontSize: 14, color: 'var(--t3)', marginBottom: 20 }}>Weekly roundups of eCommerce AI insights and product updates.</p>
          <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
            <input placeholder="your@email.com" style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t1)', fontSize: 14, outline: 'none' }} />
            <button style={{ padding: '10px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Subscribe</button>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} Selligent.ai · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
