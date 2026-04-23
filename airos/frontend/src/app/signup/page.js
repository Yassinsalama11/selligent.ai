'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE, clearToken, setToken } from '@/lib/api';

const STEPS = [
  { n: 1, label: 'Account'  },
  { n: 2, label: 'Presence' },
  { n: 3, label: 'AI Scan'  },
  { n: 4, label: 'Review'   },
  { n: 5, label: 'Plan'     },
];

const FALLBACK_PLANS = [
  { name: 'Starter',    plan: 'starter',    price: 49,  desc: 'For small stores',          features: ['1 channel', '500 conversations/mo', 'AI intent detection', '1 agent seat'] },
  { name: 'Pro',        plan: 'pro',        price: 149, desc: 'For growing brands',         features: ['All 4 channels', '5,000 conversations/mo', 'AI replies + scoring', '5 agent seats'], popular: true },
  { name: 'Enterprise', plan: 'enterprise', price: 299, desc: 'For high-volume operations', features: ['Unlimited everything', 'Full AI engine', 'Unlimited agents', 'Priority support'] },
];

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--t1)', outline: 'none', boxSizing: 'border-box',
};

const chip = {
  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc',
};

const SCAN_STEPS = [
  { icon: '🌐', text: 'Fetching your website content…'     },
  { icon: '🎨', text: 'Detecting brand colors and logo…'   },
  { icon: '📦', text: 'Analyzing products and services…'   },
  { icon: '💬', text: 'Reading your brand voice and tone…' },
  { icon: '📱', text: 'Scanning social media profiles…'    },
  { icon: '✨', text: 'Building your AI profile…'          },
];

export default function SignupPage() {
  const [step, setStep]           = useState(1);
  const [payLoading, setPayLoading] = useState(null);
  const [planSeats, setPlanSeats] = useState(1);
  const [planCountry, setPlanCountry] = useState('EU');
  const [plans, setPlans] = useState(FALLBACK_PLANS);

  const [account, setAccount] = useState({ name: '', email: '', password: '', company: '', phone: '' });
  const [presence, setPresence] = useState({ website: '', whatsapp: '', instagram: '', facebook: '', other: '' });
  const [scanIdx, setScanIdx]   = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const [aiData, setAiData]     = useState({
    companyName: '', description: '', industry: '', country: '',
    language: 'Arabic + English', products: '', tone: 'Professional & friendly',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const seats = Number.parseInt(params.get('seats') || '1', 10);
    const country = (params.get('country') || '').trim().toUpperCase();
    if (plan) {
      setStep(5);
    }
    if (Number.isFinite(seats) && seats > 0) setPlanSeats(seats);
    if (country) setPlanCountry(country);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/stripe/plans?country=${encodeURIComponent(planCountry)}&seats=${encodeURIComponent(planSeats)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled) return;
        const nextPlans = Array.isArray(payload?.plans) && payload.plans.length
          ? payload.plans.map((plan) => ({
            name: plan.name,
            plan: plan.key,
            price: Number(plan.discountedSeatPrice ?? plan.seatPrice ?? 0),
            desc: plan.description || '',
            features: Array.isArray(plan.features) ? plan.features : [],
            popular: plan.metadata?.popular === true,
            currency: plan.currency || 'EUR',
            total: Number(plan.total || 0),
            seats: Number(plan.seats || plan.includedSeats || planSeats),
            offer: plan.offer || null,
            basePrice: Number(plan.seatPrice || 0),
          }))
          : FALLBACK_PLANS;
        setPlans(nextPlans);
      })
      .catch(() => {
        if (!cancelled) setPlans(FALLBACK_PLANS);
      });
    return () => {
      cancelled = true;
    };
  }, [planCountry, planSeats]);

  useEffect(() => {
    if (step !== 3) return;
    setScanIdx(0); setScanDone(false);

    // Animate scan steps while AI runs in background
    let i = 0;
    const t = setInterval(() => {
      i++;
      setScanIdx(i);
      if (i >= SCAN_STEPS.length) clearInterval(t);
    }, 900);

    // Call real AI scan
    fetch(`${API_BASE}/api/scan/brand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        website:   presence.website,
        instagram: presence.instagram,
        facebook:  presence.facebook,
        whatsapp:  presence.whatsapp,
        company:   account.company,
      }),
    })
      .then(r => r.json())
      .then(data => {
        clearInterval(t);
        setScanIdx(SCAN_STEPS.length);
        setAiData(d => ({ ...d, ...data, companyName: data.companyName || account.company }));
        setTimeout(() => { setScanDone(true); setTimeout(() => setStep(4), 800); }, 400);
      })
      .catch(() => {
        // Fallback if AI fails
        clearInterval(t);
        setScanIdx(SCAN_STEPS.length);
        setAiData(d => ({ ...d, companyName: account.company, industry: 'eCommerce', country: 'MENA Region' }));
        setTimeout(() => { setScanDone(true); setTimeout(() => setStep(4), 800); }, 400);
      });

    return () => clearInterval(t);
  }, [step]);

  function nextStep() {
    if (step === 1) {
      if (!account.name || !account.email || !account.password || !account.company)
        return alert('Please fill in all required fields');
      if (account.password.length < 8)
        return alert('Password must be at least 8 characters');
    }
    if (step === 2) {
      if (!presence.website && !presence.whatsapp && !presence.instagram)
        return alert('Please add at least your website or one social link');
    }
    setStep(s => s + 1);
  }

  async function handlePay(plan) {
    setPayLoading(plan);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: aiData.companyName || account.company,
          email: account.email,
          password: account.password,
          name: account.name,
          plan,
          seats: planSeats,
        }),
      });
      const data = await res.json();
      if (data.token) {
        clearToken();
        setToken(data.token);
        localStorage.setItem('airos_user', JSON.stringify(data.user));
        localStorage.removeItem('airos_trial_end');

        await fetch(`${API_BASE}/api/onboarding/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({
            account,
            presence,
            aiData,
            plan,
            seats: planSeats,
          }),
        }).catch(() => null);

        window.location.href = '/dashboard/onboarding';
      } else {
        alert(data.error || 'Registration failed');
        setPayLoading(null);
      }
    } catch {
      alert('Could not connect to server. Please try again.');
      setPayLoading(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '16px 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ display: 'inline-flex' }}>
          <Image src="/ChatOrAi.png" alt="ChatOrAI" width={110} height={28}
            style={{ height: 28, width: 'auto', objectFit: 'contain' }} priority />
        </div>
        <p style={{ fontSize: 13, color: 'var(--t4)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#818cf8', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>

      {/* Progress stepper */}
      <div style={{ padding: '28px 32px 0', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
                  background: step >= s.n ? '#6366f1' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${step >= s.n ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                  color: step >= s.n ? '#fff' : 'var(--t4)' }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 11, color: step >= s.n ? '#a5b4fc' : 'var(--t4)',
                  fontWeight: step === s.n ? 700 : 400 }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, marginBottom: 20,
                  background: step > s.n ? '#6366f1' : 'rgba(255,255,255,0.07)' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 32px 48px' }}>
        <div style={{ width: '100%', maxWidth: step === 5 ? 860 : 540 }}>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 6 }}>Create your account</h1>
              <p style={{ fontSize: 14, color: 'var(--t4)', marginBottom: 28 }}>No credit card needed yet</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Full Name *</label>
                    <input style={inputStyle} placeholder="Ahmed Hassan" value={account.name}
                      onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Company Name *</label>
                    <input style={inputStyle} placeholder="My Store" value={account.company}
                      onChange={e => setAccount(a => ({ ...a, company: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Email *</label>
                  <input style={inputStyle} type="email" placeholder="you@company.com" value={account.email}
                    onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Phone Number</label>
                  <input style={inputStyle} placeholder="+20 100 000 0000" value={account.phone}
                    onChange={e => setAccount(a => ({ ...a, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Password *</label>
                  <input style={inputStyle} type="password" placeholder="Min 8 characters" value={account.password}
                    onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} />
                </div>
                <button onClick={nextStep} style={{ padding: '13px', borderRadius: 12, border: 'none',
                  background: '#6366f1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 6 }}>Your online presence</h1>
              <p style={{ fontSize: 14, color: 'var(--t4)', marginBottom: 10 }}>Our AI will scan these to automatically set up your account</p>
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 22,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p style={{ fontSize: 12.5, color: '#a5b4fc' }}>
                  ✨ <strong>AI-powered setup</strong> — We'll read your website and social profiles to auto-fill your brand info, products, tone of voice, and channel settings.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'website',   label: '🌐 Website URL',                placeholder: 'https://mystore.com' },
                  { key: 'whatsapp',  label: '📱 WhatsApp Business Number',    placeholder: '+20 100 000 0000' },
                  { key: 'instagram', label: '📸 Instagram Profile URL',       placeholder: 'https://instagram.com/mybusiness' },
                  { key: 'facebook',  label: '💬 Facebook Page URL',           placeholder: 'https://facebook.com/mybusiness' },
                  { key: 'other',     label: '🔗 Other Links (TikTok, X…)',   placeholder: 'https://tiktok.com/@mybusiness' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>{f.label}</label>
                    <input style={inputStyle} placeholder={f.placeholder} value={presence[f.key]}
                      onChange={e => setPresence(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setStep(1)} style={{ padding: '13px 24px', borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--t3)', fontWeight: 600, fontSize: 14 }}>← Back</button>
                  <button onClick={nextStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                    background: '#6366f1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    Scan My Brand →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: AI Scan ── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                background: 'rgba(99,102,241,0.1)', border: '2px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                {scanDone ? '✨' : '🤖'}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 8 }}>
                {scanDone ? 'Brand profile ready!' : 'AI is scanning your brand…'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--t4)', marginBottom: 36 }}>
                {scanDone ? 'Taking you to review your details…' : 'This takes just a few seconds'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420, margin: '0 auto' }}>
                {SCAN_STEPS.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 10, transition: 'all 0.3s ease',
                    background: i < scanIdx ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${i < scanIdx ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span style={{ fontSize: 13, color: i < scanIdx ? '#34d399' : 'var(--t4)', flex: 1, textAlign: 'left' }}>{s.text}</span>
                    {i < scanIdx && <span style={{ color: '#34d399' }}>✓</span>}
                    {i === scanIdx && (
                      <span style={{ width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid #6366f1', borderTopColor: 'transparent',
                        display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 4 && (
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 6 }}>Review your brand profile</h1>
              <p style={{ fontSize: 14, color: 'var(--t4)', marginBottom: 24 }}>Our AI filled this in from your website. Edit anything before continuing.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Company Name</label>
                    <input style={inputStyle} value={aiData.companyName}
                      onChange={e => setAiData(d => ({ ...d, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Industry</label>
                    <input style={inputStyle} value={aiData.industry} placeholder="eCommerce, Fashion…"
                      onChange={e => setAiData(d => ({ ...d, industry: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Business Description</label>
                  <textarea style={{ ...inputStyle, resize: 'none' }} rows={3} value={aiData.description}
                    onChange={e => setAiData(d => ({ ...d, description: e.target.value }))} placeholder="What does your business do?" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Country / Region</label>
                    <input style={inputStyle} value={aiData.country} placeholder="Egypt, Saudi Arabia…"
                      onChange={e => setAiData(d => ({ ...d, country: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Language</label>
                    <input style={inputStyle} value={aiData.language} placeholder="Arabic, English…"
                      onChange={e => setAiData(d => ({ ...d, language: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>Main Products / Services</label>
                  <input style={inputStyle} value={aiData.products} placeholder="Clothing, Electronics…"
                    onChange={e => setAiData(d => ({ ...d, products: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t4)', marginBottom: 5 }}>AI Reply Tone</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={aiData.tone}
                    onChange={e => setAiData(d => ({ ...d, tone: e.target.value }))}>
                    {['Professional & friendly','Casual & fun','Formal','Direct & concise','Warm & personal'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>Detected channels</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {presence.website   && <span style={chip}>🌐 Website</span>}
                    {presence.whatsapp  && <span style={chip}>📱 WhatsApp</span>}
                    {presence.instagram && <span style={chip}>📸 Instagram</span>}
                    {presence.facebook  && <span style={chip}>💬 Facebook</span>}
                    {presence.other     && <span style={chip}>🔗 Other</span>}
                    {!presence.website && !presence.whatsapp && !presence.instagram && !presence.facebook &&
                      <span style={{ fontSize: 12, color: 'var(--t4)' }}>None added</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setStep(2)} style={{ padding: '13px 24px', borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--t3)', fontWeight: 600, fontSize: 14 }}>← Back</button>
                  <button onClick={() => setStep(5)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                    background: '#6366f1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    Choose Your Plan →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Plan & Pay ── */}
          {step === 5 && (
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', marginBottom: 6, textAlign: 'center' }}>Choose your plan</h1>
              <p style={{ fontSize: 14, color: 'var(--t4)', marginBottom: 18, textAlign: 'center' }}>7-day free trial · No credit card needed · Admin-managed pricing</p>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize:12.5, color:'var(--t4)', fontWeight:700 }}>Seats</span>
                  <input value={planSeats} min="1" max="500" type="number" onChange={(e) => setPlanSeats(Math.max(1, Number.parseInt(e.target.value || '1', 10)))} style={{ ...inputStyle, width:88, padding:'8px 10px' }} />
                  <span style={{ fontSize:12, color:'var(--t4)' }}>Region: {planCountry}</span>
                </div>
              </div>
              <p style={{ fontSize:12.5, color:'var(--t4)', textAlign:'center', marginBottom:18 }}>
                Local currency is shown for estimation. Checkout and platform billing remain in EUR.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(Math.max(plans.length, 1), 4)},1fr)`, gap: 16 }}>
                {plans.map(p => (
                  <div key={p.plan} style={{ borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    background: p.popular ? 'linear-gradient(160deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))' : 'var(--bg3)',
                    border: p.popular ? '1.5px solid rgba(99,102,241,0.45)' : '1px solid var(--b1)',
                    boxShadow: p.popular ? '0 0 40px rgba(99,102,241,0.12)' : 'none' }}>
                    {p.popular && (
                      <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 10,
                        fontWeight: 700, padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                        MOST POPULAR
                      </div>
                    )}
                    <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)', marginBottom: 3 }}>{p.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 16 }}>{p.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 20 }}>
                      <span style={{ fontSize: 42, fontWeight: 900, color: 'var(--t1)', letterSpacing: '-0.04em', lineHeight: 1 }}>{p.currency || 'EUR'} {p.price}</span>
                      <span style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 4 }}>/user</span>
                    </div>
                    {p.offer && p.basePrice && p.basePrice !== p.price && (
                      <p style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: -14, marginBottom: 14 }}>
                        <span style={{ textDecoration:'line-through' }}>{p.currency || 'EUR'} {p.basePrice}</span> · {p.offer.badgeLabel || p.offer.saleLabel || 'Offer active'}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color:'var(--t3)', marginBottom: 18 }}>
                      {p.seats || planSeats} seats total · {p.currency || 'EUR'} {p.total || p.price}
                    </p>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20 }}>
                      {p.features.map(f => (
                        <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--t2)' }}>
                          <span style={{ color: '#34d399', flexShrink: 0 }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => handlePay(p.plan)} disabled={!!payLoading}
                      style={{ padding: '11px', borderRadius: 10, border: 'none', cursor: payLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: 13, opacity: payLoading === p.plan ? 0.7 : 1,
                        background: p.popular ? '#6366f1' : 'rgba(255,255,255,0.07)',
                        color: p.popular ? '#fff' : 'var(--t2)' }}>
                      {payLoading === p.plan ? 'Redirecting…' : 'Start Free Trial →'}
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(4)} style={{ display: 'block', margin: '20px auto 0',
                padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
                background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t4)', fontSize: 13 }}>
                ← Back
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
