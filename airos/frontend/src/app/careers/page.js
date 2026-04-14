'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const ROLES = [
  {
    title: 'Senior Full-Stack Engineer',
    team: 'Engineering', location: 'Remote (MENA)', type: 'Full-time',
    desc: 'Own end-to-end features across our Next.js frontend and Node.js backend. You\'ll work on AI pipelines, real-time WebSocket systems, and Meta API integrations.',
    skills: ['Node.js', 'React / Next.js', 'PostgreSQL', 'Redis', 'WebSockets'],
  },
  {
    title: 'AI / ML Engineer',
    team: 'AI', location: 'Remote (MENA)', type: 'Full-time',
    desc: 'Improve our intent detection models, lead scoring engine, and Arabic NLP pipeline. Work with GPT-4o, fine-tuning, and production inference at scale.',
    skills: ['Python', 'PyTorch', 'Arabic NLP', 'OpenAI API', 'LangChain'],
  },
  {
    title: 'Customer Success Manager',
    team: 'Growth', location: 'Egypt / Remote', type: 'Full-time',
    desc: 'Onboard new eCommerce clients, drive activation and retention, and serve as the voice of the customer internally. Arabic fluency required.',
    skills: ['Arabic (fluent)', 'eCommerce knowledge', 'CRM tools', 'Strong communication'],
  },
  {
    title: 'Sales Development Rep (SDR)',
    team: 'Sales', location: 'Egypt / Saudi Arabia', type: 'Full-time',
    desc: 'Identify and qualify leads across Egyptian and Gulf eCommerce markets. Run outbound sequences, qualify opportunities, and book demos.',
    skills: ['Arabic + English', 'eCommerce ecosystem', 'CRM / outbound tools', 'Target-driven'],
  },
];

export default function CareersPage() {
  const [open, setOpen] = useState(null);

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

      {/* Hero */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '72px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Careers</div>
        <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20 }}>
          Build the future of<br /><span style={{ background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arabic eCommerce AI</span>
        </h1>
        <p style={{ fontSize: 17, color: 'var(--t3)', lineHeight: 1.7 }}>
          We're a small team building software used daily by hundreds of eCommerce businesses across the Arab world. Every hire has a massive impact.
        </p>
      </div>

      {/* Perks */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 64 }}>
          {[
            { icon: '🌍', title: 'Fully Remote', body: 'Work from anywhere in the MENA region. Async-first culture.' },
            { icon: '💰', title: 'Competitive Pay', body: 'Top-of-market salaries + equity. We share the upside.' },
            { icon: '⚡', title: 'Move fast', body: 'Ship to production daily. No red tape, no committees.' },
            { icon: '🧠', title: 'Learn deeply', body: 'AI, Meta APIs, eCommerce — a uniquely rich technical domain.' },
          ].map((p, i) => (
            <div key={i} style={{ padding: '24px', borderRadius: 16, background: 'var(--bg3)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>{p.icon}</div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--t4)', lineHeight: 1.6 }}>{p.body}</p>
            </div>
          ))}
        </div>

        {/* Open roles */}
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28 }}>Open Roles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ROLES.map((role, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${open === i ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, background: open === i ? 'rgba(99,102,241,0.04)' : 'var(--bg3)', transition: 'all 0.2s' }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>{role.title}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[role.team, role.location, role.type].map((tag, j) => (
                      <span key={j} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: '#818cf8', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: '0 24px 24px' }}>
                  <p style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 16 }}>{role.desc}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {role.skills.map((s, j) => (
                      <span key={j} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t2)' }}>{s}</span>
                    ))}
                  </div>
                  <a href={`mailto:careers@chatorai.com?subject=Application: ${role.title}`} style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                    Apply for this role →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, padding: '28px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--t3)', marginBottom: 12 }}>Don't see your role? We hire exceptional people regardless.</p>
          <a href="mailto:careers@chatorai.com" style={{ color: '#818cf8', fontWeight: 600, fontSize: 14 }}>Send us your CV → careers@chatorai.com</a>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
      </footer>
    </div>
  );
}
