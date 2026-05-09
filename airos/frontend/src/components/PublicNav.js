'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { 
    label: 'Product', 
    dropdown: [
      { label: 'Omnichannel AI Inbox', href: '/features/omnichannel-ai-inbox' },
      { label: 'AI Customer Support', href: '/features/ai-customer-support-platform' },
      { label: 'AI Sales Agent', href: '/features/ai-sales-agent-platform' },
      { label: 'WhatsApp Automation', href: '/features/whatsapp-ai-automation' },
    ]
  },
  { 
    label: 'Solutions', 
    dropdown: [
      { label: 'E-commerce', href: '/solutions/ecommerce' },
      { label: 'SaaS', href: '/solutions/saas' },
      { label: 'Real Estate', href: '/solutions/real-estate' },
      { label: 'Marketing Agencies', href: '/solutions/agencies' },
    ]
  },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Demo', href: '/demo' },
];

export default function PublicNav({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 md:px-10',
        scrolled
          ? 'py-3 bg-background/80 backdrop-blur-2xl border-b border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : cn('py-5', transparent ? 'bg-transparent' : 'bg-background'),
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo href="/" size="lg" />

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href, dropdown }) => (
              dropdown ? (
                <DropdownMenu key={label}>
                  <DropdownMenuTrigger className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors flex items-center gap-1 outline-none">
                    {label} <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background/95 backdrop-blur-xl border-border/50 rounded-xl shadow-2xl p-2">
                    {dropdown.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link
                          href={item.href}
                          className="w-full px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all cursor-pointer outline-none"
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={label}
                  href={href}
                  className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                  {label}
                </Link>
              )
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:inline-flex text-[13px] font-semibold text-foreground hover:text-primary transition-colors px-3 py-2">
              Sign In
            </Link>
            <Button asChild className="h-9 px-5 text-[13px] font-bold rounded-xl bg-primary hover:bg-primary/90 text-white border-none shadow-md shadow-primary/15 transition-all hover:shadow-lg hover:shadow-primary/25">
              <Link href="/signup">
                Start Free
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-xl p-8 flex flex-col gap-2 lg:hidden"
          >
            {NAV_LINKS.map(({ label, href, dropdown }) => (
              dropdown ? (
                <div key={label} className="border-b border-border/50 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    {label}
                  </div>
                  <div className="flex flex-col">
                    {dropdown.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="py-2 text-base font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold py-4 border-b border-border/50 text-foreground hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              )
            ))}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button asChild variant="outline" className="w-full h-12 text-base font-semibold rounded-xl">
                <Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
              </Button>
              <Button asChild className="w-full h-12 text-base font-bold rounded-xl bg-primary text-white border-none">
                <Link href="/signup" onClick={() => setMobileOpen(false)}>Start Free</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
