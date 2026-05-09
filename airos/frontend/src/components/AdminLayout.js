'use client';

import Link from 'next/link';
import {
  Activity,
  Bot,
  BrainCircuit,
  Building2,
  CircleDot,
  CreditCard,
  FileSearch,
  Globe2,
  LayoutDashboard,
  LogOut,
  Package2,
  ReceiptText,
  Shield,
  Sparkles,
  Users2,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { adminApi, getAdminProfile, logoutAdmin, setAdminSession } from '@/lib/adminApi';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    label: 'Command',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
      { href: '/admin/clients', icon: Building2, label: 'Clients' },
      { href: '/admin/billing', icon: CreditCard, label: 'Billing' },
      { href: '/admin/pricing', icon: Package2, label: 'Plans' },
    ],
  },
  {
    label: 'AI Operations',
    items: [
      { href: '/admin/ai', icon: Bot, label: 'AI Control' },
      { href: '/admin/agents', icon: BrainCircuit, label: 'AI Agents' },
      { href: '/admin/ingestion', icon: Globe2, label: 'Ingestion' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/admin/logs', icon: ReceiptText, label: 'Logs' },
      { href: '/admin/system', icon: Activity, label: 'System' },
      { href: '/admin/team', icon: Users2, label: 'Team' },
      { href: '/admin/offers', icon: Sparkles, label: 'Offers' },
    ],
  },
];

const ROLE_LABELS = {
  platform_admin: 'Platform Admin',
  super_admin: 'Super Admin',
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState('');
  const [me, setMe] = useState(() => getAdminProfile());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
      if (pathname === '/admin/login') {
        setReady(true);
        return;
      }

      try {
        const data = await adminApi.get('/api/admin/auth/me');
        if (cancelled) return;
        setMe(data.admin);
        setAdminSession({ admin: data.admin });
      } catch {
        if (cancelled) return;
        router.replace('/admin/login');
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    loadAdmin();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const flatNav = useMemo(
    () => NAV_SECTIONS.flatMap((section) => section.items),
    [],
  );

  async function handleLogout() {
    await logoutAdmin();
    router.replace('/admin/login');
  }

  if (pathname === '/admin/login') return <>{children}</>;

  if (!ready || !me) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl border bg-card/80 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Admin control plane</p>
              <p className="text-xs text-muted-foreground">Validating session</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-5/6 rounded-full bg-muted animate-pulse" />
            <div className="h-28 rounded-2xl bg-muted/60 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const activeItem = flatNav.find((item) => isActive(item));
  const pageLabel = activeItem?.label || 'Admin';
  const roleLabel = ROLE_LABELS[me.role] || 'Platform Admin';
  const initials = String(me.name || 'A')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden xl:flex xl:w-[300px] xl:flex-col xl:border-r xl:bg-card/60 xl:backdrop-blur">
          <div className="border-b px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <Logo size="md" href="/admin" />
              <div className="rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Control
              </div>
            </div>
            <div className="mt-6 rounded-2xl border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground">
                  {initials || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{me.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{me.email}</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    <CircleDot className="h-3 w-3" />
                    {roleLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-6">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {section.label}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                              active
                                ? 'border-primary-foreground/20 bg-primary-foreground/10'
                                : 'border-border bg-background/70 group-hover:bg-background',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard"
                className="flex items-center justify-center rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Back to app
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur">
            <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-5 py-4 md:px-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <span>Platform</span>
                  <span className="opacity-40">/</span>
                  <span className="text-primary">Admin</span>
                </div>
                <h1 className="mt-1 truncate text-xl font-black tracking-tight md:text-2xl">{pageLabel}</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border bg-card px-4 py-2 md:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
                  <p className="mt-1 text-sm font-semibold">{time}</p>
                </div>
                <div className="hidden rounded-2xl border bg-card px-4 py-2 lg:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session</p>
                  <p className="mt-1 text-sm font-semibold">{roleLabel}</p>
                </div>
                <Link
                  href="/admin/system"
                  className="hidden items-center gap-2 rounded-2xl border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:flex"
                >
                  <FileSearch className="h-4 w-4" />
                  System
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto border-t xl:hidden">
              <div className="flex min-w-max gap-2 px-4 py-3">
                {flatNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors',
                        active
                          ? 'border-primary/20 bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
