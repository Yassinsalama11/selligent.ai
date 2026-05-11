'use client';

import * as React from 'react';
import Link from 'next/link';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Megaphone,
  Mail,
  Target,
  Ticket,
  Package,
  BarChart3,
  Brain,
  Store,
  ArrowLeftRight,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  Lock,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { api, API_BASE, clearToken, isDemo } from '@/lib/api';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const NAV = [
  { href: '/dashboard',               icon: LayoutDashboard,  label: 'Overview',       exact: true },
  { href: '/dashboard/conversations', icon: MessageSquare,    label: 'Conversations'               },
  { href: '/dashboard/contacts',       icon: Users,           label: 'Contacts'                    },
  { href: '/dashboard/broadcast',      icon: Megaphone,       label: 'Broadcast'                   },
  { href: '/dashboard/campaigns',      icon: Mail,            label: 'Campaigns'                  },
  { href: '/dashboard/deals',         icon: Target,          label: 'Deal Pipeline'               },
  { href: '/dashboard/tickets',       icon: Ticket,          label: 'Tickets'                     },
  { href: '/dashboard/products',      icon: Package,         label: 'Products'                    },
  { href: '/dashboard/reports',       icon: BarChart3,       label: 'Reports'                     },
  { href: '/dashboard/billing',       icon: CreditCard,      label: 'Billing'                     },
  { href: '/dashboard/prompts',       icon: Brain,           label: 'Prompts'                     },
  { href: '/dashboard/business-profile', icon: Store,         label: 'Business Profile'          },
  { href: '/dashboard/migrations',    icon: ArrowLeftRight,  label: 'Migrations'                  },
  { href: '/dashboard/settings',      icon: Settings,        label: 'Settings'                    },
];

function NavItems({ collapsed = false, onNavigate }) {
  const pathname = usePathname();
  const isActive = (item) => item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {!collapsed && (
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Main Menu
        </div>
      )}
      {NAV.map((item) => {
        const ActiveIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
              isActive(item)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center"
            )}
            title={collapsed ? item.label : undefined}
          >
            <ActiveIcon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive(item) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </>
            )}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [demo, setDemo]               = useState(false);
  const [billingSummary, setBillingSummary] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [currentUser, setCurrentUser] = useState({});
  // null = loading | false = disabled | 'auto' = auto-reply | 'suggest' = suggest-only
  const [aiStatus, setAiStatus]       = useState(null);

  useEffect(() => {
    setDemo(isDemo());

    try {
      const u = JSON.parse(localStorage.getItem('airos_user') || '{}');
      setCurrentUser(u);
    } catch {}

    // Serve billing from sessionStorage if fresh (< 5 min), else fetch in background
    try {
      const cached = JSON.parse(sessionStorage.getItem('airos_billing') || 'null');
      if (cached && Date.now() - cached._at < 300_000) {
        setBillingSummary(cached.summary);
      } else {
        api.get('/api/billing').then((payload) => {
          if (payload?.summary) {
            setBillingSummary(payload.summary);
            sessionStorage.setItem('airos_billing', JSON.stringify({ summary: payload.summary, _at: Date.now() }));
          }
        }).catch(() => {});
      }
    } catch {
      api.get('/api/billing').then((payload) => {
        if (payload?.summary) setBillingSummary(payload.summary);
      }).catch(() => {});
    }

    // AI status — sessionStorage cache (< 2 min)
    try {
      const cachedAi = JSON.parse(sessionStorage.getItem('airos_ai_status') || 'null');
      if (cachedAi && Date.now() - cachedAi._at < 120_000) {
        setAiStatus(cachedAi.status);
        return;
      }
    } catch {}

    api.get('/api/settings/ai').then((config) => {
      let status = false;
      if (config?.autoReply) status = 'auto';
      else if (config?.suggestOnly !== false) status = 'suggest';
      setAiStatus(status);
      try { sessionStorage.setItem('airos_ai_status', JSON.stringify({ status, _at: Date.now() })); } catch {}
    }).catch(() => setAiStatus(false));
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleUpgrade(plan) {
    setUpgradeLoading(plan);
    try {
      const data = await api.post('/api/billing/checkout-session', {
        plan,
        seatCount: billingSummary?.seatCount || 1,
        billingCycle: billingSummary?.billingCycle || 'monthly',
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Something went wrong with payment.');
        setUpgradeLoading(null);
      }
    } catch {
      toast.error('Could not connect to the payment server. Please try again.');
      setUpgradeLoading(null);
    }
  }

  const pageLabel = NAV.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href)
  )?.label ?? 'Dashboard';
  const userInitial = currentUser?.name?.[0]?.toUpperCase() || 'U';
  const isConversationsPage = pathname.startsWith('/dashboard/conversations');
  const billingBanner = billingSummary?.trialBanner || null;
  const restrictionMode = billingSummary?.restrictions?.mode || 'full';
  const showBillingOverlay = ['restricted', 'frozen'].includes(restrictionMode) && !pathname.startsWith('/dashboard/billing');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card border-r transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b shrink-0 gap-2">
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white font-extrabold text-sm tracking-tighter">
              C
            </div>
          ) : (
            <Logo href="/" size="lg" />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
          <NavItems collapsed={collapsed} />
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t flex flex-col gap-1">
          {!collapsed && currentUser?.name && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full shrink-0 bg-primary flex items-center justify-center text-white font-bold text-xs">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{currentUser.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{currentUser.company || currentUser.email}</div>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-3 px-3", collapsed && "justify-center")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-3 px-3 text-destructive hover:text-destructive hover:bg-destructive/10", collapsed && "justify-center")}
            onClick={() => {
              clearToken();
              localStorage.removeItem('airos_user');
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Logo href="/" size="lg" />
          </SheetHeader>
          <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </nav>
          <div className="p-2 border-t flex flex-col gap-1">
            {currentUser?.name && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full shrink-0 bg-primary flex items-center justify-center text-white font-bold text-xs">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{currentUser.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{currentUser.company || currentUser.email}</div>
                  </div>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                clearToken();
                localStorage.removeItem('airos_user');
                router.push('/login');
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b shrink-0 bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger — hidden on desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-muted-foreground hidden sm:inline">ChatOrAI</span>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <span className="text-foreground font-semibold">{pageLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {aiStatus && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-500">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="hidden sm:inline">{aiStatus === 'auto' ? 'AI Auto' : 'AI Suggest'}</span>
              </div>
            )}

            <ThemeToggle />

            <Button variant="outline" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary border-2 border-card" />
            </Button>

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all shrink-0">
              {userInitial}
            </div>
          </div>
        </header>

        {demo && (
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-2.5 flex items-center justify-between shrink-0 text-[13px] shadow-sm relative z-40">
            <span className="text-foreground font-medium flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">!</span>
              <strong className="text-primary font-bold uppercase tracking-wide">Demo Environment</strong>
              <span className="opacity-30 hidden sm:inline">|</span>
              <span className="opacity-80 hidden sm:inline">You are exploring with sample data.</span>
              <Link href="/signup" className="text-primary hover:text-primary/80 underline font-bold transition-colors">
                Create a production workspace
              </Link>
            </span>
            <Badge variant="outline" className="font-mono text-xs bg-background border-primary/20 text-primary px-2 py-0.5 shrink-0">
              PREVIEW
            </Badge>
          </div>
        )}

        {billingBanner && (
          <div className={cn(
            "border-b px-6 py-3 flex items-center justify-between shrink-0 text-xs gap-3",
            billingBanner.tone === 'critical'
              ? 'bg-red-500/10 border-red-500/20'
              : billingBanner.tone === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-primary/10 border-primary/20',
          )}>
            <span className={cn(
              "flex items-center gap-2",
              billingBanner.tone === 'critical'
                ? 'text-red-500'
                : billingBanner.tone === 'warning'
                  ? 'text-amber-500'
                  : 'text-primary',
            )}>
              {billingBanner.tone === 'critical' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />}
              <strong>{billingBanner.headline}</strong>
              <span className="hidden sm:inline">{billingBanner.body}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href="/dashboard/billing">Open Billing</Link>
              </Button>
              <Button
                size="sm"
                className="h-8 bg-primary hover:bg-primary/90 text-white font-bold px-4"
                onClick={() => handleUpgrade(billingSummary?.plan || 'pro')}
                disabled={!!upgradeLoading}
              >
                {upgradeLoading ? 'Loading…' : billingSummary?.upgradeCta?.label || 'Pay now'}
              </Button>
            </div>
          </div>
        )}

        <main className={cn(
          "flex-1 relative overflow-x-hidden",
          isConversationsPage ? "overflow-y-hidden" : "overflow-y-auto"
        )}>
          {/* Trial expired overlay */}
          {showBillingOverlay && (
            <div className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="text-center max-w-md w-full space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-muted border flex items-center justify-center mx-auto">
                  <Lock className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {billingSummary?.subscriptionStatus === 'payment_due' && 'Trial ended. Billing required.'}
                    {billingSummary?.subscriptionStatus === 'overdue' && 'Payment retry required.'}
                    {billingSummary?.subscriptionStatus === 'suspended' && 'Workspace suspended.'}
                    {billingSummary?.subscriptionStatus === 'cancelled' && 'Workspace cancelled.'}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {billingSummary?.restrictions?.reason || 'Billing action is required to restore operational access.'}
                  </p>
                </div>

                <div className="grid gap-2">
                  {[
                    { plan: 'starter',    label: 'Starter',    price: '€49/mo',  desc: '1 channel · 500 conv/mo' },
                    { plan: 'pro',        label: 'Pro',        price: '€149/mo', desc: 'All channels · 5,000 conv/mo', popular: true },
                    { plan: 'enterprise', label: 'Enterprise', price: '€299/mo', desc: 'Unlimited everything' },
                  ].map((p) => (
                    <Button
                      key={p.plan}
                      variant={p.popular ? 'default' : 'outline'}
                      className="h-auto p-4 justify-between"
                      onClick={() => handleUpgrade(p.plan)}
                      disabled={!!upgradeLoading}
                    >
                      <div className="text-left">
                        <div className="font-bold flex items-center gap-2 text-sm">
                          {p.label}
                          {p.popular && (
                            <Badge variant="secondary" className="text-xs h-4 bg-primary/20 text-primary border-primary/10">
                              POPULAR
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">{p.desc}</div>
                      </div>
                      <div className="text-right font-bold text-sm">{p.price}</div>
                    </Button>
                  ))}
                </div>

                <div className="flex justify-center gap-3">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/billing">Open Billing Center</Link>
                  </Button>
                  <a href="mailto:support@chatorai.com" className="text-xs text-primary hover:underline self-center">
                    Contact support
                  </a>
                </div>
              </div>
            </div>
          )}
          <CurrencyProvider>{children}</CurrencyProvider>
        </main>
      </div>
    </div>
  );
}
