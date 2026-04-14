'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ── helpers ──────────────────────────────────────────────────────────────── */
function Orbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="orb w-[700px] h-[700px]" style={{ top: '-200px', left: '-200px', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)' }} />
      <div className="orb w-[500px] h-[500px]" style={{ top: '40%', right: '-150px', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)' }} />
      <div className="orb w-[400px] h-[400px]" style={{ bottom: '5%', left: '30%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)' }} />
    </div>
  );
}

function Counter({ to, suffix = '', prefix = '' }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        let v = 0;
        const step = to / 60;
        const t = setInterval(() => {
          v += step;
          if (v >= to) { setN(to); clearInterval(t); }
          else setN(Math.floor(v));
        }, 16);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

/* ── Nav ──────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass' : ''}`} style={{ padding: scrolled ? '12px 0' : '20px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '4px 12px', display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/chatorai-logo.svg" alt="ChatOrAI" width={180} height={48}
              style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }}
              priority />
          </div>
        </Link>

        <div style={{ display: 'flex', gap: 36 }} className="hide-sm">
          {[['Features','#features'],['How it works','#howitworks'],['Integrations','#integrations'],['Pricing','#pricing']].map(([l, href]) => (
            <a key={l} href={href} style={{ color: 'var(--t3)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--t1)'}
              onMouseLeave={e => e.target.style.color = 'var(--t3)'}>
              {l}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Start Free →</Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="grid-bg" style={{ paddingTop: 140, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Tag */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div className="section-tag">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#67e8f9', display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite' }} />
            Live · WhatsApp + Instagram + Messenger + Live Chat
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(48px,7vw,88px)', fontWeight: 900, lineHeight: 1.0, marginBottom: 28, letterSpacing: '-0.04em' }}>
          <span className="gt">AI Revenue</span>
          <br />
          <span style={{ color: 'var(--t1)' }}>Operating System</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--t2)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Turn every conversation into a deal. Unified inbox, intent AI, lead scoring and reply generation —
          built for <strong style={{ color: 'var(--t1)' }}>Arabic eCommerce</strong>.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Start Free Trial — No Card Needed
          </Link>
          <Link href="/demo" className="btn btn-ghost btn-lg">
            ▶ Watch Demo
          </Link>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t4)', marginTop: 16 }}>7-day free trial · No credit card · No setup fee</p>

        {/* Dashboard mockup */}
        <div style={{ marginTop: 72, position: 'relative' }}>
          {/* fade out bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)', zIndex: 10, pointerEvents: 'none' }} />
          <div style={{
            borderRadius: 20, overflow: 'hidden',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(99,102,241,0.15)',
            maxWidth: 940, margin: '0 auto',
          }}>
            <MockDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function MockDashboard() {
  return (
    <div style={{ background: '#08080f', minHeight: 340 }}>
      {/* Window bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444', opacity: 0.7, display: 'inline-block' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b', opacity: 0.7, display: 'inline-block' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981', opacity: 0.7, display: 'inline-block' }} />
        <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--t4)' }}>ChatOrAI — Revenue Control Center</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#67e8f9' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#67e8f9', display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite' }} />
          AI Active
        </div>
      </div>

      <div style={{ display: 'flex', height: 300 }}>
        {/* Sidebar */}
        <div style={{ width: 52, borderRight: '1px solid var(--border)', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {['▣','💬','🎯','📦','📊'].map((ic,i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer',
              background: i===0 ? 'rgba(99,102,241,0.2)' : 'transparent',
              border: i===0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}>{ic}</div>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Revenue', value: '$28,400', delta: '+24%', icon: '💰', color: '#10b981' },
              { label: 'Conversations', value: '945', delta: '+12%', icon: '💬', color: '#6366f1' },
              { label: 'Deals Won', value: '72', delta: '+8%', icon: '🎯', color: '#8b5cf6' },
              { label: 'AI Rate', value: '87%', delta: '+5%', icon: '🤖', color: '#06b6d4' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{k.icon}</span>
                  <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.12)', color: '#34d399', borderRadius: 99, padding: '2px 7px', fontWeight: 600 }}>{k.delta}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em' }}>{k.value}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Mini conversations */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--t3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🔥 Hot Leads</span><span style={{ color: '#f87171' }}>Live</span>
            </div>
            {[
              { name: 'Ahmed M.', msg: 'عايز أطلب اتنين', score: 91, ch: '📱', intent: 'ready_to_buy', c: '#10b981' },
              { name: 'Sara K.', msg: 'Is this in red?', score: 62, ch: '📸', intent: 'interested', c: '#6366f1' },
              { name: 'Omar H.', msg: 'السعر عالي', score: 38, ch: '💬', intent: 'price_objection', c: '#f59e0b' },
            ].map((r,i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i<2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{r.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, display: 'flex', gap: 6 }}>
                    {r.name} {r.ch}
                    <span style={{ fontSize: 9, background: `${r.c}18`, color: r.c, padding: '1px 6px', borderRadius: 99 }}>{r.intent.replace('_',' ')}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }} dir="auto">{r.msg}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: r.c, flexShrink: 0 }}>{r.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stats ────────────────────────────────────────────────────────────────── */
function Stats() {
  return (
    <section style={{ padding: '80px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {[
          { n: 3, suf: 'x', label: 'Average revenue lift', sub: 'First 100 clients' },
          { n: 87, suf: '%', label: 'AI suggestion adoption', sub: 'Agents prefer AI replies' },
          { n: 4, suf: ' channels', label: 'Fully unified', sub: 'One inbox, zero friction' },
          { n: 2, pre: '<', suf: 'min', label: 'Response time', sub: 'AI handles first reply instantly' },
        ].map((s,i) => (
          <div key={i} className="glass-card" style={{ padding: '28px 24px', textAlign: 'center' }}>
            <div className="gt" style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8, display: 'block' }}>
              <Counter to={s.n} suffix={s.suf} prefix={s.pre} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Features ─────────────────────────────────────────────────────────────── */
function Features() {
  const items = [
    { icon: '🧠', title: 'AI Intent Detection', body: 'Every inbound message is analyzed in real-time. Know if a customer is browsing, interested, or ready to buy before you reply.', color: '#6366f1' },
    { icon: '⚡', title: 'Instant Reply Generation', body: 'AI writes the perfect Arabic or English reply in your brand tone — with product prices, active offers, and shipping info already embedded.', color: '#8b5cf6' },
    { icon: '🎯', title: 'Lead Scoring Engine', body: 'Every lead gets a 0–100 score in real-time. Focus your team on the leads most likely to convert right now.', color: '#06b6d4' },
    { icon: '🔄', title: 'Unified Inbox', body: 'WhatsApp, Instagram DM, Facebook Messenger, and your website Live Chat — all in one frictionless workspace.', color: '#ec4899' },
    { icon: '📦', title: 'Product Catalog Sync', body: 'Connect WooCommerce, Shopify, or any REST API. Prices, stock, and offers sync automatically and power every AI reply.', color: '#10b981' },
    { icon: '📊', title: 'Revenue Reports', body: 'Live dashboards for deals, agent performance, AI accuracy, channel ROI, and full conversion funnels.', color: '#f59e0b' },
  ];

  return (
    <section id="features" style={{ padding: '100px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 72 }}>
        <div className="section-tag" style={{ marginBottom: 20 }}>Features</div>
        <h2 style={{ fontSize: 'clamp(36px,4vw,56px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
          Everything you need to<br /><span className="gt">close more deals</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
        {items.map((f,i) => (
          <div key={i} className="glass-card" style={{ padding: '32px 28px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20, border: `1px solid ${f.color}22` }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: 'var(--t1)' }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.7 }}>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Channels ─────────────────────────────────────────────────────────────── */
function Channels() {
  const chs = [
    { name: 'WhatsApp', icon: '📱', color: '#25D366', sub: 'Meta Cloud API · Tech Provider', stat: '420M+ users in MENA' },
    { name: 'Instagram', icon: '📸', color: '#E1306C', sub: 'DMs + Story replies', stat: '150M+ users in MENA' },
    { name: 'Messenger', icon: '💬', color: '#0099FF', sub: 'Facebook Page messages', stat: '300M+ daily users' },
    { name: 'Live Chat', icon: '⚡', color: '#6366f1', sub: 'Your website · 1 line of JS', stat: 'Full RTL support' },
  ];

  return (
    <section style={{ padding: '100px 32px', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(36px,4vw,56px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
            4 channels. <span className="gt">One inbox.</span>
          </h2>
          <p style={{ color: 'var(--t3)', fontSize: 17, marginTop: 14 }}>No more tab switching. No more missed leads.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {chs.map((ch,i) => (
            <div key={i} className="glass-card" style={{ padding: '36px 24px', textAlign: 'center', borderColor: `${ch.color}22` }}>
              <div className="anim-float" style={{ fontSize: 52, marginBottom: 20, display: 'block', animationDelay: `${i*0.4}s` }}>{ch.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: ch.color, marginBottom: 8 }}>{ch.name}</div>
              <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 10, lineHeight: 1.5 }}>{ch.sub}</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', background: `${ch.color}10`, border: `1px solid ${ch.color}20`, padding: '4px 10px', borderRadius: 99, display: 'inline-block' }}>{ch.stat}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ──────────────────────────────────────────────────────────────── */
function Pricing() {
  const plans = [
    { name: 'Starter',    price: 49,  plan: 'starter',    desc: 'For small stores starting out',      features: ['1 channel', '500 conversations/mo', 'AI intent detection', 'Basic reports', '1 agent seat'], popular: false },
    { name: 'Pro',        price: 149, plan: 'pro',        desc: 'For growing eCommerce brands',        features: ['All 4 channels', '5,000 conversations/mo', 'AI replies + lead scoring', 'Full reports suite', '5 agent seats', 'WooCommerce & Shopify sync'], popular: true },
    { name: 'Enterprise', price: 299, plan: 'enterprise', desc: 'For high-volume operations',          features: ['All 4 channels', 'Unlimited conversations', 'Full AI engine', 'Advanced analytics', 'Unlimited agents', 'Priority support', 'Custom AI tone'], popular: false },
  ];

  return (
    <section id="pricing" style={{ padding: '100px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div className="section-tag" style={{ marginBottom: 20 }}>Pricing</div>
        <h2 style={{ fontSize: 'clamp(36px,4vw,56px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
          Simple, <span className="gt">transparent pricing</span>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--t4)', marginTop: 12 }}>All prices in EUR · 7-day free trial · No credit card needed</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
        {plans.map((p,i) => (
          <div key={i} style={{
            borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column', position: 'relative',
            background: p.popular
              ? 'linear-gradient(160deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)'
              : 'var(--bg3)',
            border: p.popular ? '1.5px solid rgba(99,102,241,0.45)' : '1px solid var(--border)',
            boxShadow: p.popular ? '0 0 60px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.08)' : 'none',
          }}>
            {p.popular && (
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 16px', borderRadius: 99, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 20 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'Space Grotesk' }}>€{p.price}</span>
                <span style={{ fontSize: 14, color: 'var(--t4)', marginBottom: 6 }}>/month</span>
              </div>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, marginBottom: 28 }}>
              {p.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--t2)' }}>
                  <span style={{ color: '#34d399', fontSize: 16, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <Link href={`/signup?plan=${p.plan}`}
              className={`btn ${p.popular ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textAlign: 'center', width: '100%' }}>
              Start Free Trial →
            </Link>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: 'var(--t4)' }}>
        No credit card required to start · Upgrade or cancel anytime · Invoices in EUR
      </p>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n:'01', title:'Connect your channels', body:'Link WhatsApp, Instagram, Messenger, and your website Live Chat in minutes. No coding needed — follow the guided setup wizard.', icon:'🔌' },
    { n:'02', title:'AI scans your brand', body:'Our AI reads your website and social profiles to auto-configure your tone, products, pricing, and reply style. Your brand DNA in seconds.', icon:'🧠' },
    { n:'03', title:'Conversations come in', body:'Every message from every channel lands in one unified inbox. AI instantly scores the lead, detects intent, and drafts the perfect reply.', icon:'💬' },
    { n:'04', title:'Close deals & grow', body:'Your team reviews AI suggestions, sends replies in one click, and moves deals through the pipeline — all while reports track your revenue growth.', icon:'🎯' },
  ];

  return (
    <section id="howitworks" style={{ padding: '100px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 72 }}>
        <div className="section-tag" style={{ marginBottom: 20 }}>How It Works</div>
        <h2 style={{ fontSize: 'clamp(36px,4vw,56px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
          Up and running <span className="gt">in one day</span>
        </h2>
        <p style={{ color: 'var(--t3)', fontSize: 17, marginTop: 14, maxWidth: 560, margin: '14px auto 0' }}>
          No complex integrations. No IT team needed. Most clients send their first AI reply within an hour.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ padding: '32px 24px', borderRadius: 20, position: 'relative',
            background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', letterSpacing: '0.1em',
              marginBottom: 16, fontFamily: 'Space Grotesk' }}>{s.n}</div>
            <div style={{ fontSize: 34, marginBottom: 16 }}>{s.icon}</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 10 }}>{s.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.7 }}>{s.body}</p>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                color: '#6366f1', fontSize: 18, zIndex: 1 }}>→</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Integrations ─────────────────────────────────────────────────────────── */
function Integrations() {
  const integrations = [
    { name: 'Shopify',       icon: '🛍',  color: '#96bf48' },
    { name: 'WooCommerce',   icon: '🔵',  color: '#7f54b3' },
    { name: 'WhatsApp',      icon: '📱',  color: '#25D366' },
    { name: 'Instagram',     icon: '📸',  color: '#E1306C' },
    { name: 'Facebook',      icon: '💬',  color: '#0099FF' },
    { name: 'Stripe',        icon: '💳',  color: '#635bff' },
    { name: 'Zapier',        icon: '⚡',  color: '#ff4f00' },
    { name: 'REST API',      icon: '🔗',  color: '#06b6d4' },
  ];

  return (
    <section id="integrations" style={{ padding: '80px 32px', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div className="section-tag" style={{ marginBottom: 20 }}>Integrations</div>
        <h2 style={{ fontSize: 'clamp(32px,4vw,48px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12 }}>
          Connects with your <span className="gt">existing stack</span>
        </h2>
        <p style={{ color: 'var(--t3)', fontSize: 16, marginBottom: 52 }}>
          Plug into the tools you already use — no migration needed.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          {integrations.map((ig, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 22px', borderRadius: 14,
              background: 'var(--bg3)', border: `1px solid ${ig.color}22`,
              fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>
              <span style={{ fontSize: 22 }}>{ig.icon}</span>
              {ig.name}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 28, fontSize: 13, color: 'var(--t4)' }}>
          + REST API & Webhooks for any custom integration
        </p>
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = React.useState(null);
  const items = [
    { q: 'Do I need a WhatsApp Business API account?', a: 'No — ChatOrAI handles the WhatsApp Business API connection for you. Just connect through our guided setup and you\'re live in minutes.' },
    { q: 'Does the AI reply in Arabic?', a: 'Yes. Our AI is trained on Arabic eCommerce conversations and writes fluent, natural Arabic (Modern Standard or Egyptian dialect) as well as English. You can set your preferred language in settings.' },
    { q: 'What happens after the 7-day trial?', a: 'Your account locks (no data is deleted) until you subscribe. You can upgrade anytime within 30 days and keep all your contacts, conversations, and settings.' },
    { q: 'Can I connect my Shopify or WooCommerce store?', a: 'Yes. Connect your store in Settings → Channels and your product catalog, prices, and stock levels will sync automatically and power every AI reply.' },
    { q: 'How accurate is the AI intent detection?', a: 'Our intent model achieves over 91% accuracy on Arabic eCommerce conversations across ready_to_buy, interested, price_objection, and inquiry intents — verified on live client data.' },
    { q: 'Is there a setup fee?', a: 'No setup fees, ever. You pay the monthly plan price and nothing else. Cancel anytime from your dashboard — no contracts.' },
  ];

  return (
    <section style={{ padding: '100px 32px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <div className="section-tag" style={{ marginBottom: 20 }}>FAQ</div>
        <h2 style={{ fontSize: 'clamp(32px,4vw,48px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
          Questions? <span className="gt">We have answers.</span>
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ borderRadius: 16, overflow: 'hidden',
            border: `1px solid ${open === i ? 'rgba(99,102,241,0.35)' : 'var(--border)'}`,
            background: open === i ? 'rgba(99,102,241,0.04)' : 'var(--bg3)',
            transition: 'all 0.2s' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', padding: '18px 24px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{item.q}</span>
              <span style={{ fontSize: 18, color: '#818cf8', flexShrink: 0, marginLeft: 16,
                transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: '0 24px 18px', fontSize: 14, color: 'var(--t3)', lineHeight: 1.8 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Social proof ─────────────────────────────────────────────────────────── */
function Social() {
  const quotes = [
    { text: '"ChatOrAI tripled our WhatsApp conversions in 3 weeks. The AI replies in Arabic perfectly."', name: 'Ahmed Youssef', role: 'CEO, KairosFashion', avatar: 'A' },
    { text: '"Finally one inbox for all channels. Lead scoring alone saved us hours daily."', name: 'Sara Al-Rashid', role: 'Head of Sales, NileStore', avatar: 'S' },
    { text: '"The Shopify sync is seamless. AI knows our inventory and responds with exact prices."', name: 'Omar Khalil', role: 'Founder, DesertThreads', avatar: 'O' },
  ];

  return (
    <section style={{ padding: '100px 32px', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.04em' }}>Loved by eCommerce teams</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {quotes.map((q,i) => (
            <div key={i} className="glass-card" style={{ padding: '32px 28px' }}>
              <div style={{ fontSize: 36, marginBottom: 20, opacity: 0.6 }}>&ldquo;</div>
              <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 24 }}>{q.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{q.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{q.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t4)' }}>{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ──────────────────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section style={{ padding: '100px 32px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ borderRadius: 32, padding: '80px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 100px rgba(99,102,241,0.1)' }}>
          <div className="orb" style={{ width: 400, height: 400, top: -100, left: -100, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)' }} />
          <div className="orb" style={{ width: 300, height: 300, bottom: -80, right: -80, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)' }} />
          <h2 style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20, position: 'relative', zIndex: 1 }}>
            Ready to <span className="gt">10x</span> your<br />conversation revenue?
          </h2>
          <p style={{ fontSize: 17, color: 'var(--t3)', marginBottom: 40, position: 'relative', zIndex: 1 }}>
            Join Arabic eCommerce businesses already closing more deals with ChatOrAI.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <Link href="/signup" className="btn btn-primary btn-lg">Start Free Trial</Link>
            <Link href="/demo" className="btn btn-ghost btn-lg">Book a Demo</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '64px 32px 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 10px', display: 'inline-flex', alignItems: 'center' }}>
                <Image src="/chatorai-logo.svg" alt="ChatOrAI" width={150} height={36}
                  style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--t4)', lineHeight: 1.7, maxWidth: 260 }}>
              AI Revenue Operating System for Arabic eCommerce. Turn every conversation into revenue.
            </p>
          </div>

          {[
            { title: 'Product', links: [['Features','#features'],['Pricing','#pricing'],['Integrations','#integrations'],['Changelog','/changelog'],['Status','/status']] },
            { title: 'Company', links: [['About','/about'],['Blog','/blog'],['Careers','/careers'],['Contact','/contact'],['Press','/press']] },
            { title: 'Legal',   links: [['Privacy','/privacy'],['Terms','/terms'],['Security','/security'],['Cookies','/cookies']] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.title}</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(([l, href]) => (
                  <li key={l}><Link href={href} style={{ fontSize: 14, color: 'var(--t4)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e=>e.target.style.color='var(--t2)'}
                    onMouseLeave={e=>e.target.style.color='var(--t4)'}>{l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--t4)' }}>© {new Date().getFullYear()} ChatOrAI — All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'blink 2s ease-in-out infinite' }} />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <main>
      <Orbs />
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Channels />
      <Integrations />
      <Pricing />
      <Social />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
