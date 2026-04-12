'use client';
import Link from 'next/link';
import Image from 'next/image';

const RELEASES = [
  {
    version: 'v1.3.0', date: 'April 12, 2026', type: 'major',
    changes: [
      { tag: 'new', text: 'AI Brand Scan — auto-configure account from website URL during onboarding' },
      { tag: 'new', text: '7-day free trial — start immediately, no credit card required' },
      { tag: 'new', text: 'Trial expiry overlay with one-click upgrade flow' },
      { tag: 'new', text: 'User profile card in sidebar with company name' },
      { tag: 'improved', text: 'Signup flow redesigned to 5 steps: Account → Presence → AI Scan → Review → Plan' },
      { tag: 'improved', text: 'Dashboard title now shows company name from registration' },
      { tag: 'improved', text: 'Settings profile pre-filled from JWT data' },
      { tag: 'fixed', text: 'Pricing page buttons now route through trial signup instead of direct Stripe' },
    ],
  },
  {
    version: 'v1.2.0', date: 'March 28, 2026', type: 'major',
    changes: [
      { tag: 'new', text: 'Stripe payment integration — EUR subscriptions for Starter, Pro, Enterprise plans' },
      { tag: 'new', text: 'OpenAI GPT-4o-mini brand scan API (/api/scan/brand)' },
      { tag: 'new', text: 'Admin team management — add, edit, suspend Selligent.ai team members' },
      { tag: 'new', text: 'Admin login page with role-based access (Super Admin, Admin, Support, Developer)' },
      { tag: 'improved', text: 'CORS updated to allow all Cloudflare Pages deployments' },
      { tag: 'fixed', text: 'Admin client modals not opening (missing open prop)' },
    ],
  },
  {
    version: 'v1.1.0', date: 'March 10, 2026', type: 'minor',
    changes: [
      { tag: 'new', text: 'Live Chat channel integration with Socket.io' },
      { tag: 'new', text: 'Broadcast messaging — send bulk messages to contact segments' },
      { tag: 'new', text: 'Deal pipeline Kanban board with 5 stages' },
      { tag: 'new', text: 'Support ticket system with priority and SLA tracking' },
      { tag: 'improved', text: 'Conversations page — AI suggestion panel with canned replies' },
      { tag: 'improved', text: 'Revenue reports — conversion funnel and AI performance metrics' },
    ],
  },
  {
    version: 'v1.0.0', date: 'February 20, 2026', type: 'major',
    changes: [
      { tag: 'new', text: 'Initial release — unified inbox for WhatsApp, Instagram, Messenger' },
      { tag: 'new', text: 'AI intent detection (ready_to_buy, interested, price_objection, inquiry)' },
      { tag: 'new', text: 'Lead scoring engine 0–100' },
      { tag: 'new', text: 'Contact CRM with tags, filters, and bulk operations' },
      { tag: 'new', text: 'Product catalog management' },
      { tag: 'new', text: 'Admin platform dashboard' },
      { tag: 'new', text: 'Cloudflare Pages frontend + Railway backend deployment' },
    ],
  },
];

const tagColor = { new: '#10b981', improved: '#6366f1', fixed: '#f59e0b', deprecated: '#ef4444' };

export default function ChangelogPage() {
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

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 32px 100px' }}>
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Changelog</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 14 }}>What's New</h1>
          <p style={{ fontSize: 16, color: 'var(--t3)' }}>Every release, every fix, every improvement — documented.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {RELEASES.map((rel, i) => (
            <div key={i} style={{ display: 'flex', gap: 0 }}>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 28, flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: rel.type === 'major' ? '#6366f1' : '#8b5cf6', border: '2px solid var(--bg)', boxShadow: `0 0 0 3px ${rel.type === 'major' ? 'rgba(99,102,241,0.3)' : 'rgba(139,92,246,0.2)'}`, flexShrink: 0, marginTop: 6 }} />
                {i < RELEASES.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 40, marginTop: 8 }} />}
              </div>
              {/* Content */}
              <div style={{ paddingBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', fontFamily: 'Space Grotesk' }}>{rel.version}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: rel.type === 'major' ? 'rgba(99,102,241,0.15)' : 'rgba(139,92,246,0.1)', color: rel.type === 'major' ? '#a5b4fc' : '#c4b5fd' }}>
                    {rel.type}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--t4)' }}>{rel.date}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rel.changes.map((ch, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${tagColor[ch.tag]}18`, color: tagColor[ch.tag], border: `1px solid ${tagColor[ch.tag]}25`, flexShrink: 0, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ch.tag}</span>
                      <span style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6 }}>{ch.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} Selligent.ai · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
