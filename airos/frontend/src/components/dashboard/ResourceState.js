'use client';

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ── StatusBanner ────────────────────────────────────────────────────────── */
const TONE_STYLES = {
  error:   { wrapper: 'bg-red-500/8 border border-red-500/20',   text: 'text-red-400',   icon: AlertCircle },
  success: { wrapper: 'bg-emerald-500/8 border border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
  info:    { wrapper: 'bg-indigo-500/8 border border-indigo-500/18',   text: 'text-indigo-300',  icon: Info },
};

export function StatusBanner({ title, description, tone = 'info', actionLabel, onAction }) {
  const style = TONE_STYLES[tone] || TONE_STYLES.info;
  const Icon = style.icon;
  return (
    <div className={cn('flex items-start justify-between gap-4 rounded-xl px-5 py-4', style.wrapper)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', style.text)} />
        <div>
          <p className={cn('text-sm font-semibold', style.text)}>{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="h-8 shrink-0 text-xs font-semibold">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* ── EmptyState ──────────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border/60',
      className
    )}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-4 border border-border/40">
          <Icon className="h-6 w-6 text-muted-foreground/50" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground/70 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-5 h-8 text-xs font-semibold bg-primary text-white hover:bg-primary/90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* ── LoadingGrid ─────────────────────────────────────────────────────────── */
export function LoadingGrid({ cards = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24 opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── TableSkeleton ───────────────────────────────────────────────────────── */
export function TableSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-card">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[38%]" />
            <Skeleton className="h-3 w-[22%] opacity-60" />
          </div>
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
