'use client';

import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const POSTS = [
  {
    tag: 'Product', date: 'Apr 10, 2026',
    title: 'Introducing AI Brand Scan — auto-configure your account from your website',
    excerpt: 'New onboarding feature: paste your website URL and our AI reads your brand, products, tone, and channels in seconds. No manual setup needed.',
    readTime: '3 min', color: 'text-primary bg-primary/5 border-primary/15',
  },
  {
    tag: 'Guide', date: 'Apr 5, 2026',
    title: 'How to convert WhatsApp inquiries into sales: a playbook for eCommerce',
    excerpt: 'The average eCommerce store loses 60% of WhatsApp leads due to slow response times. Here\'s the framework our top clients use to close more deals.',
    readTime: '7 min', color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/15',
  },
  {
    tag: 'AI', date: 'Mar 28, 2026',
    title: 'Why multilingual NLP needs a different approach than English-only',
    excerpt: 'Dialectal variations, code-switching, and commerce-specific vocabulary make multilingual intent detection uniquely challenging. We explain our approach.',
    readTime: '5 min', color: 'text-violet-500 bg-violet-500/5 border-violet-500/15',
  },
  {
    tag: 'Guide', date: 'Mar 20, 2026',
    title: 'Lead scoring for eCommerce: how to rank 500 conversations by purchase likelihood',
    excerpt: 'A deep dive into the signals that predict purchase intent — and how ChatOrAI\'s 0-100 scoring engine works across real commerce data.',
    readTime: '6 min', color: 'text-amber-500 bg-amber-500/5 border-amber-500/15',
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
              Blog
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Product & Insights</h1>
            <p className="text-base text-muted-foreground">Product updates, eCommerce playbooks, and AI deep dives from the ChatOrAI team.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POSTS.map((post, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/20 transition-all cursor-pointer group">
                <div className="flex items-center gap-2.5 mb-4">
                  <Badge variant="outline" className={cn('text-[10px] h-5 px-2 font-bold', post.color)}>{post.tag}</Badge>
                  <span className="text-[11px] text-muted-foreground">{post.date}</span>
                </div>
                <h2 className="text-[15px] font-bold leading-snug mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {post.readTime}
                  </span>
                  <span className="text-[12px] text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-7 rounded-2xl bg-primary/5 border border-primary/15 text-center">
            <h3 className="text-base font-bold mb-2">Get new posts in your inbox</h3>
            <p className="text-[13px] text-muted-foreground mb-5">Weekly roundups of eCommerce AI insights and product updates.</p>
            <div className="flex gap-2.5 max-w-sm mx-auto">
              <input placeholder="your@email.com" className="input flex-1" />
              <Button className="h-9 px-5 rounded-lg text-[13px] font-bold bg-primary text-white border-none">Subscribe</Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
