'use client';

import * as React from 'react';
import { 
  Rocket, 
  Sparkles, 
  CheckCircle2, 
  Zap,
  Layout,
  TrendingUp,
  Clock,
  MousePointer2,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/ui/section-header';
import { Separator } from '@/components/ui/separator';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CAMPAIGNS HUB (COMING SOON)
 * 
 * Note: This module is currently in development.
 * Future integration will utilize:
 * - /api/campaigns (list, create)
 * - /api/campaigns/preview (audience estimation)
 * - /api/campaigns/:id/send (dispatching)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default function CampaignsPage() {
  return (
    <div className="p-8 pb-12 flex flex-col gap-8 max-w-[1200px] mx-auto animate-in fade-in duration-700">
      <SectionHeader 
        title="Campaigns Hub" 
        description="Advanced outbound campaigns, customer journeys, and automated engagement flows are currently in development."
      >
        <Badge variant="outline" className="h-7 px-3 bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">
          Priority Roadmap
        </Badge>
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
        {/* Main Hero Card */}
        <Card className="lg:col-span-8 border shadow-2xl bg-card overflow-hidden relative group">
          {/* Animated Background Element */}
          <div className="absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 bg-primary/5 blur-3xl rounded-full transition-all group-hover:bg-primary/10" />
          
          <CardContent className="p-12 flex flex-col items-center text-center relative z-10">
            <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 shadow-xl shadow-primary/5 border border-primary/20 -rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <Rocket className="h-10 w-10 text-primary" />
            </div>

            <Badge className="bg-primary text-white border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 mb-4 shadow-lg shadow-primary/20">
              Coming Soon
            </Badge>
            
            <h2 className="text-3xl font-black tracking-tight mb-4 leading-tight">
              Automate your customer <br />
              <span className="text-primary">growth cycles.</span>
            </h2>
            
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed mb-10 text-[15px]">
              We're architecting a comprehensive campaign orchestrator designed to transform passive leads into loyal customers through multi-step journeys and intelligent automation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl text-left mb-12">
              {[
                { title: "Multi-Channel Orchestration", desc: "WhatsApp, Email, and SMS in one flow.", icon: Layout },
                { title: "Customer Journeys", desc: "Automated logic based on user behavior.", icon: Layers },
                { title: "Intelligent Segmentation", desc: "Target specific high-value customer tags.", icon: Users },
                { title: "Behavioral Triggers", desc: "Auto-send when a deal stage changes.", icon: MousePointer2 }
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm border border-border/50">
                    <feature.icon className="h-5 w-5 text-primary/70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{feature.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
              <Button className="flex-1 bg-primary font-black uppercase tracking-widest text-[11px] h-11 shadow-xl shadow-primary/30">
                Notify me on launch
              </Button>
              <Button variant="outline" className="flex-1 font-black uppercase tracking-widest text-[11px] h-11 bg-background shadow-sm">
                View Feature Roadmap
              </Button>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/30 p-6 flex items-center justify-center border-t">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 opacity-60">
              <Sparkles className="h-3 w-3 text-primary" />
              Targeted release: Q3 2026
            </p>
          </CardFooter>
        </Card>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Growth Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlock higher LTV by moving beyond one-off messages. Campaigns Hub will enable full-lifecycle marketing automation.
              </p>
              <Separator className="bg-primary/10" />
              <div className="space-y-3">
                {[
                  "Visual journey builder",
                  "A/B split testing",
                  "Conversion attribution",
                  "Global frequency capping"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed bg-transparent shadow-none">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-bold mb-2">Planned Next Release</h4>
              <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                Our engineering team is finalizing the core workflow engine. Sign up for early beta access.
              </p>
              <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest hover:text-primary">
                Learn more <ArrowRight className="h-3 w-3 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
