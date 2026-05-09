'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Globe, Palette, Package, MessageSquare, Smartphone } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { API_BASE, clearToken, setToken } from '@/lib/api';

const STEPS = [
  { n: 1, label: 'Account' },
  { n: 2, label: 'Channels' },
  { n: 3, label: 'AI Scan' },
  { n: 4, label: 'Review' },
  { n: 5, label: 'Plan' },
];

const FALLBACK_PLANS = [
  { name: 'Starter', plan: 'starter', price: 49, desc: 'For small teams', features: ['1 channel', '500 conversations/mo', 'AI intent detection', '1 agent seat'] },
  { name: 'Pro', plan: 'pro', price: 149, desc: 'For growing brands', features: ['All 4 channels', '5,000 conversations/mo', 'AI replies + scoring', '5 agent seats'], popular: true },
  { name: 'Enterprise', plan: 'enterprise', price: 299, desc: 'For high-volume ops', features: ['Unlimited everything', 'Full AI engine', 'Unlimited agents', 'Priority support'] },
];

const SCAN_STEPS = [
  { icon: Globe, text: 'Fetching your website content...' },
  { icon: Palette, text: 'Detecting brand colors and logo...' },
  { icon: Package, text: 'Analyzing products and services...' },
  { icon: MessageSquare, text: 'Reading your brand voice and tone...' },
  { icon: Smartphone, text: 'Scanning social media profiles...' },
  { icon: Sparkles, text: 'Building your AI profile...' },
];

const TONE_OPTIONS = [
  'Professional & friendly',
  'Casual & fun',
  'Formal',
  'Direct & concise',
  'Warm & personal',
];

function emptyAiData(companyName = '') {
  return {
    companyName,
    description: '',
    industry: '',
    country: '',
    language: '',
    products: '',
    tone: '',
    sourceStats: null,
  };
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [trialLaunchLoading, setTrialLaunchLoading] = useState(null);
  const [planSeats, setPlanSeats] = useState(1);
  const [planCountry, setPlanCountry] = useState('EU');
  const [planBillingCycle, setPlanBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState(FALLBACK_PLANS);

  const [account, setAccount] = useState({ name: '', email: '', password: '', company: '', phone: '' });
  const [presence, setPresence] = useState({ website: '', whatsapp: '', instagram: '', facebook: '', other: '' });
  const [scanIdx, setScanIdx] = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [scanRunId, setScanRunId] = useState(0);
  const [aiData, setAiData] = useState(() => emptyAiData());
  const toneOptions = aiData.tone && !TONE_OPTIONS.includes(aiData.tone)
    ? [aiData.tone, ...TONE_OPTIONS]
    : TONE_OPTIONS;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const seats = Number.parseInt(params.get('seats') || '1', 10);
    const country = (params.get('country') || '').trim().toUpperCase();
    const cycle = (params.get('billingCycle') || '').trim().toLowerCase();
    if (Number.isFinite(seats) && seats > 0) setPlanSeats(seats);
    if (country) setPlanCountry(country);
    if (['monthly', 'yearly'].includes(cycle)) setPlanBillingCycle(cycle);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (planCountry && planCountry !== 'EU') return undefined;
    fetch(`${API_BASE}/api/stripe/location`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        if (!cancelled && payload?.country) setPlanCountry(String(payload.country).trim().toUpperCase());
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [planCountry]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/stripe/plans?country=${encodeURIComponent(planCountry)}&seats=${encodeURIComponent(planSeats)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        if (cancelled) return;
        const next = Array.isArray(payload?.plans) && payload.plans.length
          ? payload.plans.map((p) => ({
            name: p.name, plan: p.key,
            price: Number(p.discountedSeatPrice ?? p.seatPrice ?? 0),
            desc: p.description || '', features: Array.isArray(p.features) ? p.features : [],
            popular: p.metadata?.popular === true, currency: p.currency || 'EUR',
            total: Number(p.total || 0), seats: Number(p.seats || p.includedSeats || planSeats),
            offer: p.offer || null, basePrice: Number(p.seatPrice || 0),
          }))
          : FALLBACK_PLANS;
        setPlans(next);
      })
      .catch(() => { if (!cancelled) setPlans(FALLBACK_PLANS); });
    return () => { cancelled = true; };
  }, [planCountry, planSeats]);

  useEffect(() => {
    if (step !== 3) return;
    let active = true;
    setScanIdx(0);
    setScanDone(false);
    setScanError('');
    setScanWarning('');
    setAiData(emptyAiData(account.company));
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (!active) return;
      setScanIdx(Math.min(i, SCAN_STEPS.length));
      if (i >= SCAN_STEPS.length) clearInterval(t);
    }, 900);

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/scan/brand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website: presence.website,
            instagram: presence.instagram,
            facebook: presence.facebook,
            whatsapp: presence.whatsapp,
            company: account.company,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'AI scan failed');
        }
        if (!active) return;
        clearInterval(t);
        setScanIdx(SCAN_STEPS.length);
        const warnings = Array.isArray(data?.sourceStats?.warnings)
          ? data.sourceStats.warnings.filter(Boolean)
          : [];
        const degraded = data?.sourceStats?.analysisStatus === 'failed'
          || data?.sourceStats?.crawlStatus === 'blocked'
          || data?.sourceStats?.crawlStatus === 'failed'
          || data?.sourceStats?.mode === 'blocked'
          || data?.sourceStats?.mode === 'no_content';
        setAiData({
          ...emptyAiData(account.company),
          ...data,
          companyName: data.companyName || account.company,
        });
        setScanWarning(degraded ? (warnings[0] || 'AI enrichment unavailable. Review the extracted profile before continuing.') : '');
        setTimeout(() => {
          if (!active) return;
          setScanDone(true);
          setTimeout(() => {
            if (active) setStep(4);
          }, 800);
        }, 400);
      } catch (err) {
        if (!active) return;
        clearInterval(t);
        setScanDone(false);
        setScanError(err.message || 'AI scan failed');
      }
    })();

    return () => {
      active = false;
      clearInterval(t);
    };
  }, [step, scanRunId, account.company, presence.website, presence.instagram, presence.facebook, presence.whatsapp]);

  function nextStep() {
    if (step === 1) {
      if (!account.name || !account.email || !account.password || !account.company)
        return alert('Please fill in all required fields');
      if (account.password.length < 8) return alert('Password must be at least 8 characters');
    }
    if (step === 2) {
      if (!presence.website && !presence.whatsapp && !presence.instagram)
        return alert('Please add at least your website or one social link');
    }
    setStep((s) => s + 1);
  }

  async function handleStartTrial(plan) {
    setTrialLaunchLoading(plan);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: aiData.companyName || account.company,
          email: account.email, password: account.password,
          name: account.name, plan, seats: planSeats, billingCycle: planBillingCycle,
        }),
      });
      const data = await res.json();
      if (data.token) {
        clearToken();
        setToken(data.token);
        localStorage.setItem('airos_user', JSON.stringify(data.user));
        const onboardingRes = await fetch(`${API_BASE}/api/onboarding/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
          body: JSON.stringify({ account, presence, aiData, plan, seats: planSeats, billingCycle: planBillingCycle }),
        }).catch(() => null);
        if (!onboardingRes?.ok) {
          const payload = onboardingRes ? await onboardingRes.json().catch(() => ({})) : null;
          alert(payload?.error || 'Workspace created, but onboarding initialization did not complete. You can continue from onboarding.');
        }
        window.location.href = '/dashboard/onboarding';
      } else {
        alert(data.error || 'Registration failed');
        setTrialLaunchLoading(null);
      }
    } catch {
      alert('Could not connect to server. Please try again.');
      setTrialLaunchLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="px-6 md:px-10 py-4 flex items-center justify-between border-b border-border/40">
        <Logo href="/" size="md" />
        <p className="text-[13px] text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      {/* Stepper */}
      <div className="px-6 md:px-10 pt-8 max-w-[640px] mx-auto w-full">
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step > s.n ? 'bg-primary text-white' : step === s.n ? 'bg-primary text-white ring-4 ring-primary/15' : 'bg-muted text-muted-foreground border border-border/40',
                )}>
                  {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                </div>
                <span className={cn('text-[10px] font-medium', step >= s.n ? 'text-primary' : 'text-muted-foreground/50')}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mb-5 rounded-full transition-colors', step > s.n ? 'bg-primary' : 'bg-border/40')} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex justify-center px-6 md:px-10 pb-16">
        <div className={cn('w-full', step === 5 ? 'max-w-[900px]' : 'max-w-[520px]')}>

          {/* Step 1: Account */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight mb-1">Create your account</h1>
              <p className="text-sm text-muted-foreground mb-7">No credit card required</p>
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Full Name *</label>
                    <input className="input" placeholder="Your name" value={account.name}
                      onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Company Name *</label>
                    <input className="input" placeholder="My Company" value={account.company}
                      onChange={(e) => setAccount((a) => ({ ...a, company: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Email *</label>
                  <input className="input" type="email" placeholder="you@company.com" value={account.email}
                    onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Phone Number</label>
                  <input className="input" placeholder="+1 234 567 8900" value={account.phone}
                    onChange={(e) => setAccount((a) => ({ ...a, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Password *</label>
                  <input className="input" type="password" placeholder="Min 8 characters" value={account.password}
                    onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))} />
                </div>
                <Button onClick={nextStep} className="w-full h-11 rounded-xl text-sm font-bold bg-primary text-white border-none mt-1">
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Online Presence */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight mb-1">Your online presence</h1>
              <p className="text-sm text-muted-foreground mb-4">Our AI will scan these to automatically set up your account</p>
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 mb-6">
                <p className="text-[12px] text-primary font-medium flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <strong>AI-powered setup</strong> — We&apos;ll read your website and socials to auto-fill brand info, products, and tone.
                </p>
              </div>
              <div className="space-y-3.5">
                {[
                  { key: 'website', label: 'Website URL', placeholder: 'https://mystore.com' },
                  { key: 'whatsapp', label: 'WhatsApp Business Number', placeholder: '+1 234 567 8900' },
                  { key: 'instagram', label: 'Instagram Profile URL', placeholder: 'https://instagram.com/mybusiness' },
                  { key: 'facebook', label: 'Facebook Page URL', placeholder: 'https://facebook.com/mybusiness' },
                  { key: 'other', label: 'Other Links (TikTok, X...)', placeholder: 'https://tiktok.com/@mybusiness' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">{f.label}</label>
                    <input className="input" placeholder={f.placeholder} value={presence[f.key]}
                      onChange={(e) => setPresence((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex gap-3 mt-1">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-11 px-6 rounded-xl text-sm font-semibold">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button onClick={nextStep} className="flex-1 h-11 rounded-xl text-sm font-bold bg-primary text-white border-none">
                    Scan My Brand <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: AI Scan */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-6">
              <div className={cn(
                'w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-colors border',
                scanDone ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/10 border-primary/20',
              )}>
                {scanDone
                  ? <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  : <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                }
              </div>
              <h2 className="text-xl font-bold mb-2">
                {scanDone ? (scanWarning ? 'Partial brand profile ready' : 'Brand profile ready!') : 'AI is scanning your brand...'}
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                {scanDone
                  ? (scanWarning ? 'We extracted what we could. Review the details before continuing.' : 'Taking you to review your details...')
                  : scanError ? 'Resolve the scan issue to continue.' : 'This takes just a few seconds'}
              </p>
              {scanError && (
                <div className="max-w-[420px] mx-auto mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                  {scanError}
                </div>
              )}
              {!scanError && scanWarning && (
                <div className="max-w-[480px] mx-auto mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  {scanWarning}
                </div>
              )}
              <div className="space-y-2.5 max-w-[380px] mx-auto">
                {SCAN_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      i < scanIdx ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-card border-border/30',
                    )}>
                      <Icon className={cn('h-4 w-4 shrink-0', i < scanIdx ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                      <span className={cn('text-[12px] flex-1', i < scanIdx ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60')}>
                        {s.text}
                      </span>
                      {i < scanIdx && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {i === scanIdx && (
                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                    </div>
                  );
                })}
              </div>
              {scanError && (
                <div className="flex gap-3 justify-center mt-6">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-11 px-6 rounded-xl text-sm font-semibold">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setScanRunId((value) => value + 1)} className="h-11 px-6 rounded-xl text-sm font-bold bg-primary text-white border-none">
                    Retry Scan
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight mb-1">Review your brand profile</h1>
              <p className="text-sm text-muted-foreground mb-6">Review the extracted profile before continuing.</p>
              {scanWarning && (
                <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-semibold">AI enrichment unavailable</p>
                  <p className="mt-1">{scanWarning}</p>
                  {aiData?.sourceStats?.websiteTitle && (
                    <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-200/80">
                      Detected website title: {aiData.sourceStats.websiteTitle}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Company Name</label>
                    <input className="input" value={aiData.companyName}
                      onChange={(e) => setAiData((d) => ({ ...d, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Industry</label>
                    <input className="input" value={aiData.industry} placeholder="eCommerce, Fashion..."
                      onChange={(e) => setAiData((d) => ({ ...d, industry: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Business Description</label>
                  <textarea className="input resize-none" rows={3} value={aiData.description}
                    onChange={(e) => setAiData((d) => ({ ...d, description: e.target.value }))} placeholder="What does your business do?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Country / Region</label>
                    <input className="input" value={aiData.country} placeholder="United States, Germany..."
                      onChange={(e) => setAiData((d) => ({ ...d, country: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Language</label>
                    <input className="input" value={aiData.language} placeholder="English, Arabic..."
                      onChange={(e) => setAiData((d) => ({ ...d, language: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Main Products / Services</label>
                  <input className="input" value={aiData.products} placeholder="Clothing, Electronics..."
                    onChange={(e) => setAiData((d) => ({ ...d, products: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">AI Reply Tone</label>
                  <select className="input cursor-pointer" value={aiData.tone}
                    onChange={(e) => setAiData((d) => ({ ...d, tone: e.target.value }))}>
                    <option value="">Select manually</option>
                    {toneOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2.5">Detected channels</p>
                  <div className="flex gap-2 flex-wrap">
                    {presence.website && <Badge variant="outline" className="text-[11px] h-6 px-2.5">Website</Badge>}
                    {presence.whatsapp && <Badge variant="outline" className="text-[11px] h-6 px-2.5">WhatsApp</Badge>}
                    {presence.instagram && <Badge variant="outline" className="text-[11px] h-6 px-2.5">Instagram</Badge>}
                    {presence.facebook && <Badge variant="outline" className="text-[11px] h-6 px-2.5">Facebook</Badge>}
                    {presence.other && <Badge variant="outline" className="text-[11px] h-6 px-2.5">Other</Badge>}
                    {!presence.website && !presence.whatsapp && !presence.instagram && !presence.facebook && (
                      <span className="text-xs text-muted-foreground/50">None added</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-1">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-11 px-6 rounded-xl text-sm font-semibold">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(5)} className="flex-1 h-11 rounded-xl text-sm font-bold bg-primary text-white border-none">
                    Choose Your Plan <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Plan & Trial Setup */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight mb-1">Choose your plan</h1>
                <p className="text-sm text-muted-foreground">7-day free trial &middot; No credit card needed</p>
              </div>
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[11px] font-bold text-muted-foreground">Seats</span>
                  <input
                    type="number" min="1" max="500"
                    value={planSeats}
                    onChange={(e) => setPlanSeats(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                    className="input w-20 h-8 text-center text-sm"
                  />
                  <select
                    value={planBillingCycle}
                    onChange={(e) => setPlanBillingCycle(e.target.value)}
                    className="input h-8 text-sm pr-8 min-w-[120px]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <span className="text-[11px] text-muted-foreground">Region: {planCountry}</span>
                </div>
              </div>
              <p className="text-[11px] text-center text-muted-foreground/50 mb-6">
                Local currency shown for estimation. Billing settles in EUR.
              </p>
              <div className={cn('grid gap-4', `grid-cols-${Math.min(Math.max(plans.length, 1), 4)}`)}>
                {plans.map((p) => (
                  <Card key={p.plan} className={cn(
                    'relative rounded-2xl flex flex-col transition-all',
                    p.popular ? 'border-primary/30 shadow-lg ring-4 ring-primary/5' : 'border-border/40',
                  )}>
                    {p.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-white border-none font-bold text-[9px] uppercase tracking-widest px-3 h-5 shadow-md">Most Popular</Badge>
                      </div>
                    )}
                    <CardContent className="p-6 flex flex-col flex-1">
                      <h3 className="text-sm font-bold">{p.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight">{p.currency || 'EUR'} {p.price}</span>
                        <span className="text-xs text-muted-foreground">/user</span>
                      </div>
                      {p.offer && p.basePrice && p.basePrice !== p.price && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          <span className="line-through">{p.currency || 'EUR'} {p.basePrice}</span> &middot; {p.offer.badgeLabel || p.offer.saleLabel || 'Offer active'}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {p.seats || planSeats} seats total &middot; {p.currency || 'EUR'} {p.total || p.price}
                      </p>
                      <Separator className="my-4 opacity-30" />
                      <ul className="space-y-2 flex-1">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[12px]">
                            <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', p.popular ? 'text-primary' : 'text-muted-foreground/40')} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleStartTrial(p.plan)}
                        disabled={!!trialLaunchLoading}
                        className={cn(
                          'w-full h-10 rounded-xl text-[13px] font-bold mt-5 border-none transition-all',
                          p.popular ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/15' : 'bg-muted hover:bg-muted/80 text-foreground',
                        )}
                      >
                        {trialLaunchLoading === p.plan ? 'Launching...' : 'Start Free Trial'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setStep(4)} className="mx-auto mt-5 text-[13px] text-muted-foreground block">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
