'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Zap, TrendingUp, Users, CheckCircle2, ArrowRight,
  BarChart3, Globe, Smartphone, ChevronDown, Bot, Target, Rocket,
  DollarSign, Layers, ShieldCheck, RefreshCcw, Sparkles, Play,
  LayoutDashboard, Package, Send, Minus, Plus, Users2,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import { CanonicalDefinitionSection } from '@/components/seo/AuthorityContentSections';
import { withCanonicalDefinition } from '@/lib/seo-authority';
import {
  buildBreadcrumbNode,
  buildFaqNode,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const cfg = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [0, 200]), cfg);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.5], [1, 0]), cfg);

  const [score, setScore] = useState(65);
  const [showMsg3, setShowMsg3] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [scoreUpdated, setScoreUpdated] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowMsg3(true), 2200);
    const t2 = setTimeout(() => setShowTyping(true), 3400);
    const t3 = setTimeout(() => { setShowTyping(false); setShowReply(true); }, 4900);
    const t4 = setTimeout(() => { setScore(87); setScoreUpdated(true); }, 5200);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const NAV_ITEMS = [
    { Icon: LayoutDashboard, active: false },
    { Icon: MessageSquare, active: true },
    { Icon: Users, active: false },
    { Icon: Target, active: false },
    { Icon: BarChart3, active: false },
    { Icon: Package, active: false },
  ];

  const THREADS = [
    { name: 'Sarah K.', initials: 'SK', preview: 'Do you ship to Berlin?', time: '2m', ch: 'wa', score: 87, active: true, gradient: 'from-violet-400 to-pink-400' },
    { name: 'Marco Rossi', initials: 'MR', preview: 'How much for 200 units?', time: '8m', ch: 'ig', score: 72, active: false, gradient: 'from-orange-400 to-rose-400' },
    { name: 'Priya M.', initials: 'PM', preview: 'Black Friday deal still on?', time: '15m', ch: 'fb', score: 45, active: false, gradient: 'from-blue-400 to-cyan-400' },
    { name: 'Ahmed S.', initials: 'AS', preview: 'Order #4821 status?', time: '1h', ch: 'wa', score: 31, active: false, gradient: 'from-emerald-400 to-teal-400' },
  ];

  return (
    <section ref={ref} className="relative pt-36 pb-28 md:pt-44 md:pb-36 overflow-hidden">
      {/* Ambient gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-primary/[0.06] blur-[180px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-violet-500/[0.04] blur-[160px] rounded-full" />
        <div className="absolute top-[30%] right-[30%] w-[300px] h-[300px] bg-blue-500/[0.03] blur-[120px] rounded-full" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      <motion.div style={{ y, opacity }} className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-muted/60 border border-border/60 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">Built for multilingual sales and support teams</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.92]"
          >
            Every conversation.{' '}
            <span className="relative">
              <span className="gt">Revenue.</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C40 2 80 2 100 4C120 6 160 6 199 3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            ChatorAI unifies WhatsApp, Instagram, Messenger and Live Chat into one
            AI-powered workspace. Detect intent, score leads, and close deals autonomously
            — in any language your customers speak.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.7 }}
            className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {withCanonicalDefinition('')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Button asChild className="h-12 px-8 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] border-none">
              <Link href="/signup">
                Start free trial
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8 text-sm font-semibold rounded-xl border-border/60 hover:bg-muted/50 transition-all group">
              <Link href="/demo">
                <Play className="h-3.5 w-3.5 mr-2 text-primary group-hover:scale-110 transition-transform" />
                Book demo
              </Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[11px] text-muted-foreground/60 font-medium"
          >
            No credit card required &middot; 7-day free trial &middot; Cancel anytime
          </motion.p>
        </div>

        {/* ── Dashboard Preview ── */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 md:mt-28 relative max-w-[1160px] mx-auto px-4 md:px-0"
        >
          {/* ── Floating toast: WhatsApp incoming ── */}
          <motion.div
            initial={{ opacity: 0, x: -24, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 1.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ rotate: -2 }}
            className="absolute -top-7 left-[2%] z-30 hidden md:flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl bg-card/95 border border-border/50 shadow-2xl shadow-black/10 backdrop-blur-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold leading-none">New · WhatsApp</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Sarah K. — 2 messages</p>
            </div>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </motion.div>

          {/* ── Floating badge: score update ── */}
          <AnimatePresence>
            {scoreUpdated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.75, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ rotate: 2 }}
                className="absolute -top-6 right-[6%] z-30 hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 shadow-2xl shadow-emerald-500/40"
              >
                <TrendingUp className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-bold text-white">Lead score ↑ 87</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Floating badge: AI replied ── */}
          <AnimatePresence>
            {showReply && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ rotate: -1 }}
                className="absolute -bottom-6 left-[10%] z-30 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary shadow-2xl shadow-primary/35"
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-bold text-white">AI replied · 1.2 s</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Outer gradient-border frame ── */}
          <div
            className="relative rounded-[20px] md:rounded-[28px] p-[1px] shadow-[0_48px_120px_-24px_rgba(0,0,0,0.22)] dark:shadow-[0_48px_120px_-24px_rgba(0,0,0,0.65)]"
            style={{ background: 'linear-gradient(135deg, hsl(var(--border)/0.8) 0%, hsl(var(--border)/0.2) 40%, hsl(var(--border)/0.8) 100%)' }}
          >
            <div className="rounded-[19px] md:rounded-[27px] overflow-hidden bg-card/80 backdrop-blur-sm">

              {/* Browser chrome */}
              <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border/20">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-6 w-60 bg-background/60 rounded-lg border border-border/30 flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-muted-foreground/50 font-medium tracking-tight">app.chatorai.com</span>
                  </div>
                </div>
                <div className="w-[52px]" />
              </div>

              {/* App shell */}
              <div className="h-[520px] flex bg-background">

                {/* ── Icon sidebar ── */}
                <div className="w-14 border-r border-border/15 bg-muted/20 flex flex-col items-center py-4 gap-1 shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  {NAV_ITEMS.map(({ Icon, active }, i) => (
                    <div key={i} className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground/25 hover:text-muted-foreground/50',
                    )}>
                      <Icon className="h-[15px] w-[15px]" />
                    </div>
                  ))}
                  <div className="flex-1" />
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-md shrink-0" />
                </div>

                {/* ── Thread list ── */}
                <div className="w-[220px] border-r border-border/15 flex-col hidden sm:flex shrink-0">
                  <div className="px-4 py-4 border-b border-border/15">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">Inbox</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">4</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/55 mt-0.5">2 need attention</p>
                  </div>
                  <div className="flex-1 overflow-hidden py-1">
                    {THREADS.map((t, i) => (
                      <motion.div
                        key={t.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className={cn(
                          'mx-2 my-0.5 px-3 py-2.5 rounded-xl cursor-default flex gap-2.5 items-center transition-colors',
                          t.active ? 'bg-primary/8 ring-1 ring-primary/15' : 'hover:bg-muted/40',
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm', t.gradient)}>
                          {t.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12px] font-semibold truncate leading-none">{t.name}</span>
                            <span className="text-[10px] text-muted-foreground/40 shrink-0">{t.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', t.ch === 'wa' ? 'bg-emerald-500' : t.ch === 'ig' ? 'bg-pink-400' : 'bg-blue-400')} />
                            <p className="text-[11px] text-muted-foreground/50 truncate">{t.preview}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* ── Chat area ── */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="px-5 py-3.5 border-b border-border/15 flex items-center gap-3 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md">SK</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-none">Sarah K.</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500/60 border border-emerald-500/30" />
                        <span className="text-[11px] text-muted-foreground/60">WhatsApp · Score:</span>
                        <motion.span
                          animate={{ color: scoreUpdated ? '#10b981' : '#f59e0b' }}
                          transition={{ duration: 0.5 }}
                          className="text-[11px] font-black"
                        >{score}</motion.span>
                      </div>
                    </div>
                    <Badge className={cn(
                      'text-[11px] h-6 px-2.5 font-semibold border transition-all duration-500 shrink-0',
                      scoreUpdated
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/25',
                    )}>
                      {scoreUpdated ? 'ready to buy' : 'interested'}
                    </Badge>
                  </div>

                  <div className="flex-1 px-5 py-4 space-y-3.5 overflow-hidden flex flex-col justify-end">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex gap-2.5 max-w-[76%]">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">SK</div>
                      <div className="bg-muted/50 border border-border/25 rounded-2xl rounded-tl-md px-4 py-2.5 text-xs leading-relaxed">
                        Hi, I&apos;m interested in bulk pricing for the premium plan
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }} className="flex gap-2 max-w-[76%] ml-auto justify-end items-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 text-xs leading-relaxed shadow-md shadow-primary/15">
                        Absolutely! For 50+ units we offer 15% off. Let me send you the full catalog.
                      </div>
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mb-0.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {showMsg3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 max-w-[76%]">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">SK</div>
                          <div className="bg-muted/50 border border-border/25 rounded-2xl rounded-tl-md px-4 py-2.5 text-xs leading-relaxed">
                            That&apos;s perfect! Do you ship to Berlin?
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showTyping && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2 max-w-[76%] ml-auto justify-end items-center">
                          <div className="bg-muted/40 border border-border/25 rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                            {[0, 1, 2].map(j => (
                              <motion.div key={j} animate={{ y: [0, -5, 0] }} transition={{ delay: j * 0.15, repeat: Infinity, duration: 0.55 }} className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                            ))}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                            <Sparkles className="h-3 w-3 text-primary/70" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {showReply && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 max-w-[76%] ml-auto justify-end items-end">
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 text-xs leading-relaxed shadow-md shadow-primary/15">
                            Yes! We ship to Germany in 3–5 business days. Ready to place your order?
                          </div>
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mb-0.5">
                            <Sparkles className="h-3 w-3 text-primary" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="px-4 py-3 border-t border-border/15 shrink-0">
                    <div className="h-10 bg-muted/25 border border-border/25 rounded-xl px-4 flex items-center gap-2.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary/50 shrink-0" />
                      <span className="text-xs text-muted-foreground/30 flex-1 italic">AI is drafting a reply…</span>
                      <Send className="h-3.5 w-3.5 text-muted-foreground/20" />
                    </div>
                  </div>
                </div>

                {/* ── AI Insights panel ── */}
                <motion.div
                  initial={{ x: 32, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[200px] border-l border-border/15 flex-col hidden xl:flex shrink-0 bg-muted/[0.03]"
                >
                  <div className="px-4 py-3.5 border-b border-border/15 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/12 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-bold">AI Insights</span>
                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">Score</span>
                        <motion.span animate={{ color: scoreUpdated ? '#10b981' : '#f59e0b' }} transition={{ duration: 0.5 }} className="text-2xl font-black leading-none tabular-nums">{score}</motion.span>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${score}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} className={cn('h-full rounded-full', scoreUpdated ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500')} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45 block mb-2">Intent</span>
                      <Badge className={cn('text-[10px] h-5 px-2 font-semibold border', scoreUpdated ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>
                        {scoreUpdated ? 'ready_to_buy' : 'interested'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45 block mb-2">Suggestion</span>
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[11px] text-muted-foreground leading-relaxed">
                        <AnimatePresence mode="wait">
                          {scoreUpdated
                            ? <motion.span key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Lead is hot — send the order link now.</motion.span>
                            : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Ask about volume and timeline.</motion.span>
                          }
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Ambient glow */}
          <div className="absolute -inset-16 bg-primary/[0.07] dark:bg-primary/[0.04] blur-[120px] rounded-full -z-10" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGO MARQUEE
   ═══════════════════════════════════════════════════════════════════════════ */

function IntegrationPill({ item }) {
  return (
    <div
      className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card/70 backdrop-blur-sm shrink-0 select-none"
      style={{ borderColor: `${item.color}28` }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
        style={{ backgroundColor: `${item.color}20`, color: item.color }}
      >
        {item.letter.charAt(0)}
      </div>
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: item.color }}>{item.name}</span>
      <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap hidden sm:inline">{item.sub}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRUSTED BY
   ═══════════════════════════════════════════════════════════════════════════ */

const PARTNERS = [
  {
    name: 'Bedouin Moon Hotel',
    src: '/partners/bedouin-moon.png',
    width: 100,
    // Pure black logo — needs invert in dark mode; handled via card bg
  },
  {
    name: 'SinaiTaxi',
    src: '/partners/sinai-taxi.png',
    width: 148,
  },
  {
    name: 'TAXIQo',
    src: '/partners/taxiqo.png',
    width: 130,
  },
  {
    name: 'Tu Tours',
    src: '/partners/tu-tours.png',
    width: 150,
  },
];

function TrustedBy() {
  return (
    <section className="py-14 px-6 md:px-10 border-b border-border/30">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground/60 mb-10">
          Trusted by growing businesses
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="group flex items-center justify-center rounded-2xl bg-white border border-black/6 shadow-sm dark:border-white/10 dark:shadow-md px-6 py-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.03]"
              style={{ minWidth: 140 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partner.src}
                alt={partner.name}
                width={partner.width}
                height={48}
                style={{ width: partner.width, height: 'auto', maxHeight: 44, objectFit: 'contain' }}
                className="grayscale opacity-55 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LogoMarquee() {
  const INTEGRATIONS = [
    { name: 'WhatsApp', sub: 'Business API', color: '#25D366', letter: 'WA' },
    { name: 'Instagram', sub: 'DM API', color: '#E1306C', letter: 'IG' },
    { name: 'Messenger', sub: 'Facebook Pages', color: '#0084FF', letter: 'M' },
    { name: 'Shopify', sub: 'eCommerce', color: '#96BF48', letter: 'S' },
    { name: 'WooCommerce', sub: 'WordPress', color: '#7F54B3', letter: 'WC' },
    { name: 'Salla', sub: 'Arabic eCommerce', color: '#FF6B00', letter: 'SA' },
    { name: 'Zid', sub: 'Saudi Commerce', color: '#3E5BA9', letter: 'Z' },
    { name: 'OpenAI', sub: 'GPT-4o', color: '#10a37f', letter: 'AI' },
    { name: 'Stripe', sub: 'Payments', color: '#635BFF', letter: '$' },
    { name: 'Live Chat', sub: 'Web Widget', color: '#FF5A5F', letter: 'LC' },
    { name: 'Zid', sub: 'Saudi Commerce', color: '#3E5BA9', letter: 'Z' },
  ];

  const row1 = [...INTEGRATIONS, ...INTEGRATIONS];
  const row2 = [...INTEGRATIONS.slice(4), ...INTEGRATIONS.slice(0, 4), ...INTEGRATIONS.slice(4), ...INTEGRATIONS.slice(0, 4)];

  return (
    <section id="integrations" className="py-14 border-y border-border/25 overflow-hidden relative bg-muted/[0.03]">
      {/* Subtle top/bottom fade */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      <p className="text-center text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground/35 mb-8">
        Connects with everything you already use
      </p>

      <div className="relative space-y-3">
        <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
          style={{ width: 'max-content' }}
          className="flex gap-2.5 px-2.5"
        >
          {row1.map((item, i) => <IntegrationPill key={i} item={item} />)}
        </motion.div>

        <motion.div
          animate={{ x: ['-50%', '0%'] }}
          transition={{ duration: 48, ease: 'linear', repeat: Infinity }}
          style={{ width: 'max-content' }}
          className="flex gap-2.5 px-2.5"
        >
          {row2.map((item, i) => <IntegrationPill key={i} item={item} />)}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROBLEM → SOLUTION
   ═══════════════════════════════════════════════════════════════════════════ */

function ProblemSolution() {
  const problems = [
    { icon: Zap, label: '01', title: 'Slow response = lost sale', desc: 'A 30-minute delay hands the lead to your competitor. Customers buy from whoever answers first — always.' },
    { icon: Layers, label: '02', title: 'Fragmented inboxes', desc: 'Your team juggles 4+ apps, losing context, history, and deal value with every tab switch.' },
    { icon: Target, label: '03', title: 'No lead prioritization', desc: 'High-value buyers are buried under routine FAQs. Your best opportunities go cold unnoticed.' },
  ];

  const solutions = [
    { icon: MessageSquare, title: 'Unified omnichannel inbox', desc: 'WhatsApp, Instagram, Messenger, Live Chat — one clean workspace.' },
    { icon: Bot, title: 'Autonomous AI agent', desc: 'Handles inbound, qualifies leads, and replies 24/7 in 50+ languages.' },
    { icon: TrendingUp, title: 'Real-time intent scoring', desc: 'Know who is ready to buy before your team even opens the thread.' },
    { icon: DollarSign, title: 'Visual deal pipeline', desc: 'From first message to closed deal — tracked, prioritised, converted.' },
  ];

  return (
    <section id="features" className="py-28 md:py-36 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10">

        {/* ── Header ── */}
        <div className="text-center max-w-xl mx-auto mb-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mb-4">Why teams switch to ChatorAI</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Built for revenue,<br />not just chat.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

          {/* ── Problem panel (dark) ── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl overflow-hidden p-8 md:p-10 flex flex-col gap-8 bg-foreground/[0.96] dark:bg-card border border-border/40"
            style={{ background: 'linear-gradient(145deg, hsl(0 0% 8%) 0%, hsl(0 0% 5%) 100%)' }}
          >
            {/* Subtle red glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/[0.08] blur-[80px] rounded-full pointer-events-none" />

            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest text-red-400 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                The problem
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-white leading-[1.1]">
                Manual replies are<br />
                <span className="text-red-400">costing you deals.</span>
              </h3>
            </div>

            <div className="space-y-3 flex-1">
              {problems.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  className="flex gap-4 items-start p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                    <p.icon className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">{p.label}</span>
                      <h4 className="text-sm font-bold text-white/90">{p.title}</h4>
                    </div>
                    <p className="text-[12px] text-white/40 leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Solution panel (light) ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl overflow-hidden p-8 md:p-10 flex flex-col gap-8 bg-card border border-primary/15"
          >
            {/* Subtle primary glow */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-primary/[0.06] blur-[100px] rounded-full pointer-events-none" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                The solution
              </span>
              <h3 className="text-3xl md:text-4xl font-bold leading-[1.1]">
                One AI brain for<br />
                <span className="text-primary">your entire team.</span>
              </h3>
            </div>

            <div className="space-y-3 flex-1 relative">
              {solutions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-primary/[0.03] border border-primary/8 hover:bg-primary/[0.07] hover:border-primary/15 transition-all duration-200 group cursor-default"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary/25 group-hover:text-primary/60 transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>

            <Button asChild className="relative w-full h-12 text-sm font-bold bg-primary text-white rounded-xl shadow-xl shadow-primary/25 border-none transition-all hover:shadow-2xl hover:shadow-primary/35 hover:bg-primary/90 group">
              <Link href="/signup">
                Start for free
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE GRID
   ═══════════════════════════════════════════════════════════════════════════ */

const FEATURES = [
  { icon: Smartphone, title: 'Omnichannel sync', desc: 'Connect WhatsApp API, Instagram DM, Messenger, and Live Chat — one unified workspace.' },
  { icon: Bot, title: 'AI auto-replies', desc: 'Autonomous responses in your brand voice. Handles support and sales 24/7 in 50+ languages.' },
  { icon: TrendingUp, title: 'Lead scoring', desc: 'Real-time intent and sentiment scoring surfaces who is ready to buy — automatically.' },
  { icon: Layers, title: 'Deal pipeline', desc: 'Drag-and-drop CRM stages. Move leads from a chat thread to a closed deal in seconds.' },
  { icon: RefreshCcw, title: 'Catalog sync', desc: 'Connect Shopify, Salla, WooCommerce, or WordPress. AI sells from your real inventory.' },
  { icon: Globe, title: 'Multilingual AI', desc: 'Native understanding of Arabic, English, French, Spanish, Turkish, and more.' },
  { icon: ShieldCheck, title: 'Human takeover', desc: 'Jump into any AI conversation when a human touch is needed. Seamless handover.' },
  { icon: BarChart3, title: 'Revenue analytics', desc: 'Track LTV, AOV, conversion rates, and agent performance across every channel.' },
];

function FeatureGrid() {
  return (
    <section className="py-28 md:py-36 px-6 md:px-10 bg-muted/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16 md:mb-20">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6">
            Platform
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Everything you need to <span className="text-primary">sell more.</span>
          </h2>
          <p className="text-base text-muted-foreground">
            A complete revenue operating system — from first message to closed deal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/5 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-bold mb-2">{f.title}</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Connect your channels', desc: 'Link WhatsApp Business API, Instagram, Facebook Page, and Live Chat in minutes.' },
    { n: '02', title: 'AI learns your business', desc: 'Our AI scans your website and product catalog to understand your brand, pricing, and tone.' },
    { n: '03', title: 'Every lead gets scored', desc: 'Intent detection and sentiment analysis score each conversation in real time.' },
    { n: '04', title: 'Close deals faster', desc: 'Your team uses AI-drafted replies and deal pipelines to convert in half the time.' },
  ];

  return (
    <section id="howitworks" className="py-28 md:py-36 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 space-y-6">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6">
              How it works
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Setup to first sale <br /><span className="text-primary">in 30 minutes.</span>
            </h2>
            <div className="space-y-8 pt-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative group">
                  <span className="text-2xl font-black text-primary/15 group-hover:text-primary/40 transition-colors select-none">{step.n}</span>
                  <div>
                    <h4 className="text-base font-bold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-[15px] top-10 bottom-[-32px] w-px bg-border/40" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative p-6 md:p-10 rounded-3xl bg-card border border-border/40 shadow-xl">
              <div className="aspect-[4/3] rounded-2xl bg-muted/10 border border-border/30 flex flex-col items-center justify-center gap-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.02]" style={{
                  backgroundImage: 'radial-gradient(var(--foreground) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </motion.div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">System Active</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    AI is processing conversations across all connected channels autonomously.
                  </p>
                </div>
                <div className="flex gap-4">
                    {[
                    { label: 'Channels', value: '4' },
                    { label: 'AI status', value: 'Live' },
                    { label: 'Sync', value: 'Active' },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-lg font-bold text-primary">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOCIAL PROOF
   ═══════════════════════════════════════════════════════════════════════════ */

function SocialProof() {
  const stats = [
    { icon: Globe, value: '50+', label: 'Languages supported natively', color: '#3b82f6' },
    { icon: Zap, value: '< 30s', label: 'Average AI first response', color: '#f59e0b' },
    { icon: Smartphone, value: '4', label: 'Channels in one workspace', color: '#10b981' },
    { icon: Bot, value: '24/7', label: 'Autonomous AI coverage', color: '#8b5cf6' },
  ];

  return (
    <section className="py-0 border-y border-border/25 relative overflow-hidden">
      {/* Mesh gradient behind */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.35]" style={{
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, #3b82f620 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, #8b5cf620 0%, transparent 55%)',
      }} />

      <div className="max-w-5xl mx-auto px-6 md:px-10 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/25">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center px-6 py-10 gap-3 group"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-1 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${s.color}14`, border: `1px solid ${s.color}22` }}
              >
                <s.icon className="h-4.5 w-4.5" style={{ color: s.color }} />
              </div>
              <p className="text-4xl md:text-5xl font-black tracking-tight tabular-nums" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground/60 font-medium leading-snug max-w-[100px]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════════════════════════════ */

const COUNTRY_CONFIG = {
  EU: { label: 'Europe',         currency: 'EUR', flag: '🇪🇺' },
  US: { label: 'United States',  currency: 'USD', flag: '🇺🇸' },
  GB: { label: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  SA: { label: 'Saudi Arabia',   currency: 'SAR', flag: '🇸🇦' },
  AE: { label: 'UAE',            currency: 'AED', flag: '🇦🇪' },
  EG: { label: 'Egypt',          currency: 'EGP', flag: '🇪🇬' },
};

const PRICING_FALLBACK = [
  { key: 'starter',    name: 'Starter',    desc: 'For small teams launching their first AI inbox.',         seatPrice: 19, currency: 'EUR', includedSeats: 1,  popular: false, features: ['1 channel', '500 conversations / mo', 'AI replies included', '1 agent seat'] },
  { key: 'growth',     name: 'Growth',     desc: 'For brands scaling channels and operators.',              seatPrice: 29, currency: 'EUR', includedSeats: 3,  popular: false, features: ['3 channels', '2,500 conversations / mo', 'AI scoring + routing', '3 agent seats'] },
  { key: 'pro',        name: 'Pro',        desc: 'For revenue teams running AI-led support and sales.',     seatPrice: 49, currency: 'EUR', includedSeats: 5,  popular: true,  features: ['All 4 channels', '10,000 conversations / mo', 'AI suggestions + handoff', '5 agent seats'] },
  { key: 'enterprise', name: 'Enterprise', desc: 'For multi-team operations with custom AI governance.',    seatPrice: 89, currency: 'EUR', includedSeats: 10, popular: false, features: ['Unlimited channels', 'Unlimited conversations', 'Dedicated AI controls', '10 agent seats'] },
];

function formatPrice(amount, currency) {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatPriceParts(amount, currency) {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).formatToParts(amount);
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency;
    const number = parts.filter((p) => ['integer', 'group', 'decimal', 'fraction'].includes(p.type)).map((p) => p.value).join('');
    const isSymbolFirst = parts[0]?.type === 'currency';
    return { symbol, number, isSymbolFirst };
  } catch {
    return { symbol: currency, number: String(amount), isSymbolFirst: false };
  }
}

function priceFontClass(number) {
  const digits = number.replace(/\D/g, '').length;
  if (digits >= 5) return 'text-3xl';
  if (digits >= 4) return 'text-[2.25rem]';
  return 'text-4xl';
}

function Pricing() {
  const [country, setCountry]         = useState('EU');
  const [seats, setSeats]             = useState(1);
  const [plans, setPlans]             = useState(PRICING_FALLBACK);
  const [loading, setLoading]         = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Auto-detect country from IP on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/stripe/location`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        if (payload?.country && COUNTRY_CONFIG[payload.country]) {
          setCountry(payload.country);
        }
      })
      .catch(() => {});
  }, []);

  // Re-fetch plans whenever country or seats changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/stripe/plans?country=${encodeURIComponent(country)}&seats=${encodeURIComponent(seats)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        if (cancelled) return;
        if (Array.isArray(payload?.plans) && payload.plans.length) {
          setPlans(payload.plans.map((p) => ({
            key: p.key,
            name: p.name,
            desc: p.description || '',
            seatPrice: Number(p.discountedSeatPrice ?? p.seatPrice ?? 0),
            basePrice: Number(p.seatPrice ?? 0),
            total: Number(p.total ?? 0),
            currency: p.currency || 'EUR',
            includedSeats: Number(p.includedSeats ?? 1),
            seats: Number(p.seats ?? seats),
            popular: p.metadata?.popular === true,
            features: Array.isArray(p.features) ? p.features : [],
            offer: p.offer || null,
            discountLabel: p.discountLabel || '',
          })));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [country, seats]);

  const selectedCountry = COUNTRY_CONFIG[country] || COUNTRY_CONFIG.EU;

  return (
    <section id="pricing" className="py-28 md:py-36 px-6 md:px-10 relative overflow-hidden">
      {/* Subtle mesh background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.3]" style={{
        backgroundImage: 'radial-gradient(ellipse at 60% 0%, hsl(var(--primary)/0.08) 0%, transparent 60%)',
      }} />

      <div className="max-w-7xl mx-auto relative">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-5">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Simple, per-agent <span className="text-primary">pricing.</span>
          </h2>
          <p className="text-base text-muted-foreground">
            Pay only for the agents you need. Every plan includes full AI — no add-on fees.
          </p>
        </div>

        {/* Controls: country + agent count */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">

          {/* Country selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2.5 h-10 px-4 rounded-xl border border-border/50 bg-card hover:border-border transition-colors text-sm font-medium"
            >
              <span>{selectedCountry.flag}</span>
              <span>{selectedCountry.label}</span>
              <span className="text-muted-foreground/50 text-xs ml-1">{selectedCountry.currency}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/50 ml-1 transition-transform', showDropdown && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-52 rounded-xl border border-border/50 bg-card shadow-xl shadow-black/10 overflow-hidden z-50"
                >
                  {Object.entries(COUNTRY_CONFIG).map(([code, cfg]) => (
                    <button
                      key={code}
                      onClick={() => { setCountry(code); setShowDropdown(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left',
                        country === code && 'bg-primary/5 text-primary font-semibold',
                      )}
                    >
                      <span>{cfg.flag}</span>
                      <span className="flex-1">{cfg.label}</span>
                      <span className="text-xs text-muted-foreground/50">{cfg.currency}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agent count */}
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border/50 bg-card">
            <Users2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/60 font-medium mr-1">Agents</span>
            <button
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-sm font-bold tabular-nums">{seats}</span>
            <button
              onClick={() => setSeats((s) => Math.min(100, s + 1))}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Plan grid */}
        <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto transition-opacity duration-300', loading && 'opacity-60 pointer-events-none')}>
          {plans.map((plan) => {
            const isEnterprise = plan.key === 'enterprise';
            const billableSeats = Math.max(seats, plan.includedSeats);
            const total = plan.seatPrice * billableSeats;
            const hasDiscount = plan.offer && plan.basePrice && plan.seatPrice < plan.basePrice;

            return (
              <motion.div
                key={plan.key}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-card overflow-visible transition-shadow duration-300',
                  plan.popular
                    ? 'border-primary/30 shadow-2xl shadow-primary/10 ring-1 ring-primary/20'
                    : 'border-border/40 hover:shadow-lg hover:border-border/70',
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/30">
                      <Sparkles className="h-2.5 w-2.5" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Discount badge */}
                {hasDiscount && (
                  <div className="absolute -top-3.5 right-4 z-10">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-500/30">
                      {plan.discountLabel || 'Sale'}
                    </span>
                  </div>
                )}

                <div className={cn('p-6 flex flex-col flex-1', plan.popular && 'pt-7')}>
                  {/* Plan name + desc */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">{plan.name}</h3>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-snug">{plan.desc}</p>
                  </div>

                  {/* Price */}
                  {isEnterprise ? (
                    <>
                      <div className="mb-1">
                        <span className="text-4xl font-black tracking-tight">Custom</span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 mb-5">Tailored for your team size</p>
                    </>
                  ) : (() => {
                    const parts = formatPriceParts(plan.seatPrice, plan.currency);
                    const baseParts = hasDiscount ? formatPriceParts(plan.basePrice, plan.currency) : null;
                    const fontCls = priceFontClass(parts.number);
                    return (
                      <>
                        {hasDiscount && baseParts && (
                          <p className="text-xs text-muted-foreground/40 line-through mb-0.5">
                            {baseParts.isSymbolFirst ? `${baseParts.symbol}${baseParts.number}` : `${baseParts.number} ${baseParts.symbol}`}
                          </p>
                        )}
                        <div className={cn('flex items-baseline gap-1 mb-0.5', plan.popular ? 'text-primary' : '')}>
                          {parts.isSymbolFirst ? (
                            <>
                              <span className="text-base font-bold opacity-70">{parts.symbol}</span>
                              <span className={cn('font-black tracking-tight leading-none', fontCls)}>{parts.number}</span>
                            </>
                          ) : (
                            <>
                              <span className={cn('font-black tracking-tight leading-none', fontCls)}>{parts.number}</span>
                              <span className="text-base font-bold opacity-70">{parts.symbol}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/55 mb-4">per agent / month</p>

                        {/* Total box */}
                        <div className="mb-5 p-3 rounded-xl bg-muted/30 border border-border/30 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Users2 className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            <span className="text-[11px] text-muted-foreground/55">
                              {billableSeats} {billableSeats === 1 ? 'agent' : 'agents'} / month
                            </span>
                          </div>
                          <p className={cn('text-sm font-bold pl-[18px]', plan.popular ? 'text-primary' : 'text-foreground')}>
                            {formatPrice(total, plan.currency)}
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* Features */}
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px]">
                        <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', plan.popular ? 'text-primary' : 'text-emerald-500/70')} />
                        <span className="text-muted-foreground leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA — never pass ?plan= to avoid signup jumping straight to plan step */}
                  <Link
                    href={isEnterprise ? '/demo' : `/signup?seats=${seats}&country=${country}`}
                    className="block"
                  >
                    <Button className={cn(
                      'w-full h-11 rounded-xl text-sm font-bold border-none transition-all',
                      plan.popular
                        ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                        : 'bg-muted/60 hover:bg-muted text-foreground',
                    )}>
                      {isEnterprise ? 'Talk to sales' : 'Start free trial'}
                      <ArrowRight className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 mt-8">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Compare all features
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="text-center text-xs text-muted-foreground/45">
            7-day free trial on all plans · No credit card required · Cancel anytime · Prices auto-detected from your location
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════════════════════ */

const LANDING_FAQS = [
  { q: 'Do I need a WhatsApp Business API account?', a: 'Yes, ChatOrAI works with the official WhatsApp Business Platform (API). We can help you apply during onboarding if you don\'t have one yet.' },
  { q: 'Which languages does the AI support?', a: 'Our AI natively understands Arabic (all dialects), English, French, Spanish, Turkish, Hindi, and 40+ more. It automatically detects and responds in the customer\'s language.' },
  { q: 'Can my agents take over AI conversations?', a: 'Absolutely. The AI is designed to assist, not replace. Your team can jump into any thread with one click, and the AI will pause until they leave.' },
  { q: 'How long does setup take?', a: 'Most teams are fully operational within 30 minutes. Connect your channels, let the AI scan your website and catalog, and you\'re live.' },
  { q: 'Is my data secure?', a: 'Yes. ChatorAI is built with encrypted transport, controlled access, and workspace-level operational controls. Review the Security page and your own internal requirements before production rollout.' },
  { q: 'Can I integrate with my eCommerce platform?', a: 'Yes — we integrate with Shopify, WooCommerce, Salla, Zid, and any platform with a REST API. Catalog and order data sync in real time.' },
];

function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="py-24 px-6 md:px-10 bg-muted/5 border-y border-border/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          <p className="text-sm text-muted-foreground">
            Can&apos;t find what you need? <Link href="/contact" className="text-primary hover:underline font-medium">Get in touch</Link>
          </p>
        </div>
        <div className="space-y-2">
          {LANDING_FAQS.map((item, i) => (
            <div key={i} className="border border-border/40 rounded-xl bg-card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm font-semibold hover:bg-muted/20 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open === i && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════════════════════ */

function FinalCTA() {
  return (
    <section className="py-28 md:py-36 px-6 md:px-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/[0.06] blur-[160px] rounded-full" />
      </div>
      <div className="max-w-3xl mx-auto relative z-10 text-center space-y-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
          <Rocket className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[0.95]">
          Ready to turn chats <br />into <span className="text-primary">closed deals?</span>
        </h2>
        <p className="text-base text-muted-foreground max-w-lg mx-auto">
          Launch a unified AI inbox for your team and move from first response to closed deal with less manual work.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild className="h-12 px-10 text-sm font-bold bg-primary text-white rounded-xl shadow-xl shadow-primary/20 border-none transition-all hover:shadow-2xl hover:shadow-primary/30">
            <Link href="/signup">
              Start your free trial
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-12 px-8 text-sm font-semibold">
            <Link href="/demo">
              Book a demo
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const pagePath = '/';
  const graph = buildJsonLdGraph([
    buildBreadcrumbNode([{ name: 'Home', href: '/' }], pagePath),
    buildWebPageNode({
      path: pagePath,
      name: 'ChatorAI — AI Revenue Operating System',
      description:
        'Unify WhatsApp, Instagram, Messenger, and live chat into one AI-powered revenue workspace.',
      mainEntityId: 'https://chatorai.com/#software',
      aboutIds: ['https://chatorai.com/#organization', 'https://chatorai.com/#software', 'https://chatorai.com/#product'],
    }),
    buildFaqNode(
      LANDING_FAQS.map((item) => ({ question: item.q, answer: item.a })),
      pagePath,
    ),
  ]);

  return (
    <main className="min-h-screen bg-background antialiased selection:bg-primary/20 selection:text-primary">
      <StructuredData id="landing-page-schema" data={graph} />
      <PublicNav transparent />
      <Hero />
      <TrustedBy />
      <CanonicalDefinitionSection />
      <LogoMarquee />
      <ProblemSolution />
      <FeatureGrid />
      <HowItWorks />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <PublicFooter />
    </main>
  );
}
