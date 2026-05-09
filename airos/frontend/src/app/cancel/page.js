'use client';

import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
          <RotateCcw className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Payment Cancelled</h1>
        <p className="text-sm text-muted-foreground mb-8">
          No worries — you haven&apos;t been charged. Come back anytime to start your subscription.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/#pricing">
            <Button className="h-10 px-6 rounded-xl text-sm font-bold bg-primary text-white border-none shadow-md shadow-primary/15">
              View Plans
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="h-10 px-6 rounded-xl text-sm font-semibold">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
