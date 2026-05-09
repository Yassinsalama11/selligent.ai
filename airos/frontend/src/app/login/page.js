'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, TrendingUp, Target, Zap, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, setToken } from '@/lib/api';

const DEMO = { email: 'preview@demo.chatorai.local', password: 'preview1234' };

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('airos_token');
    if (token) router.replace('/dashboard');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (form.email === DEMO.email && form.password === DEMO.password) {
      localStorage.setItem('airos_token', 'demo_token');
      localStorage.setItem('airos_demo', '1');
      router.push('/dashboard');
      return;
    }

    try {
      const data = await api.post('/api/auth/login', form);
      setToken(data.token);
      if (data.user) localStorage.setItem('airos_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(
        err.message?.includes('fetch') || err.message?.includes('Network')
          ? 'Cannot reach server. Use the preview account to explore the dashboard.'
          : err.message || 'Invalid credentials.',
      );
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setForm(DEMO);
    setError('');
  }

  const features = [
    { icon: Bot, text: 'AI detects intent on every message' },
    { icon: Target, text: 'Leads scored 0-100 automatically' },
    { icon: Zap, text: 'Reply suggestions in under 1 second' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex w-[44%] flex-col justify-between p-12 relative overflow-hidden border-r border-border/40 bg-muted/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-primary/[0.04] blur-[150px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-violet-500/[0.03] blur-[130px] rounded-full" />
        </div>

        <Logo href="/" size="xl" className="relative z-10" />

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Your AI-powered <br /><span className="gt">revenue team</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Unify WhatsApp, Instagram, Messenger, and Live Chat.
              Let AI handle intent detection, lead scoring, and reply generation — in any language.
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3 p-3.5 rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm">
                <f.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-[13px] font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/50 relative z-10">
          Trusted by 2,500+ businesses in 30+ countries
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-[400px]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="lg:hidden flex justify-center mb-10">
              <Logo size="xl" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-center mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground text-center mb-8">Sign in to your ChatOrAI dashboard</p>

            {/* Preview workspace entry */}
            <button
              onClick={fillDemo}
              className="w-full p-3.5 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/20 hover:bg-muted/60 transition-colors mb-6 group flex items-center justify-between"
            >
              <span className="text-[12px] font-medium text-muted-foreground">Explore the preview workspace</span>
              <span className="text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">→</span>
            </button>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground block mb-1.5">Email</label>
                <input type="email" className="input" placeholder="you@company.com"
                  value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-semibold text-muted-foreground">Password</label>
                  <Link href="/reset-password" className="text-[12px] text-primary hover:underline font-medium">Forgot?</Link>
                </div>
                <input type="password" className="input" placeholder="Enter your password"
                  value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-sm font-bold bg-primary text-white border-none shadow-md shadow-primary/15">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>

            <p className="text-center text-[13px] text-muted-foreground mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary font-semibold hover:underline">Start free trial</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
