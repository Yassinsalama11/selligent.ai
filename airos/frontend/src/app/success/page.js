'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get('plan') || 'Pro';
  const [count, setCount] = useState(5);

  useEffect(() => {
    const t = setInterval(() => setCount((c) => {
      if (c <= 1) { clearInterval(t); router.replace('/login'); }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Payment Successful!</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Welcome to ChatOrAI <span className="font-semibold text-emerald-500">{plan}</span> plan. Your subscription is now active.
        </p>
        <p className="text-xs text-muted-foreground/50 mb-6">
          Redirecting to login in {count}s...
        </p>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mb-6 space-y-1.5">
          {['Account activated', 'All channels ready to connect', '14-day money-back guarantee'].map((item) => (
            <p key={item} className="text-[13px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" /> {item}
            </p>
          ))}
        </div>

        <Link href="/login">
          <Button className="h-11 px-8 rounded-xl text-sm font-bold bg-primary text-white border-none shadow-md shadow-primary/15">
            Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
