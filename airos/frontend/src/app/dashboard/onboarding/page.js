'use client';

import * as React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  CheckCircle2, 
  Circle, 
  RefreshCcw, 
  Rocket, 
  Building2, 
  Database, 
  FileText, 
  Zap, 
  History,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

import { api } from '@/lib/api';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SectionHeader } from '@/components/ui/section-header';

const FIELDS = [
  ['businessName', 'Business Name'],
  ['vertical', 'Vertical'],
  ['primaryLanguage', 'Primary Language'],
  ['primaryDialect', 'Primary Dialect'],
  ['tone', 'Reply Tone'],
  ['openingHours', 'Opening Hours'],
];

function emptyProfile() {
  return {
    businessName: '',
    vertical: '',
    offerings: [],
    policies: [],
    tone: '',
    primaryLanguage: '',
    primaryDialect: '',
    openingHours: '',
    locations: [],
    faqCandidates: [],
    brandVoiceNotes: '',
  };
}

function lines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function parseLines(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function Step({ label, done }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
      done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/50 opacity-60"
    )}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm",
        done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
      )}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
      </div>
      <span className={cn(
        "text-xs font-semibold uppercase tracking-widest",
        done ? "text-emerald-600" : "text-muted-foreground"
      )}>{label}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [profile, setProfile] = useState(emptyProfile());

  async function load() {
    setLoading(true);
    try {
      const data = await api.get('/api/onboarding/progress');
      const nextOnboarding = data?.onboarding || {};
      setOnboarding(nextOnboarding);
      setProfile({
        ...emptyProfile(),
        ...(nextOnboarding.profile?.profile || {}),
      });
    } catch (err) {
      toast.error(err.message || 'Could not load onboarding');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const status = onboarding?.latestJob?.status;
    if (!['queued', 'running'].includes(status)) return undefined;

    const timer = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(timer);
  }, [onboarding?.latestJob?.status]);

  function updateProfile(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(status = 'reviewed') {
    setSaving(true);
    try {
      const saved = await api.put('/api/business-profile', { profile, status });
      setProfile({ ...emptyProfile(), ...(saved.profile || {}) });
      toast.success('Configuration persisted');
    } catch (err) {
      toast.error(err.message || 'Network persistence failed');
    } finally {
      setSaving(false);
    }
  }

  async function regenerateProfile() {
    setSaving(true);
    try {
      const regenerated = await api.post('/api/business-profile/regenerate', {});
      setProfile({ ...emptyProfile(), ...(regenerated.profile || {}) });
      toast.success('AI intelligence refreshed');
    } catch (err) {
      toast.error(err.message || 'Regeneration sequence failed');
    } finally {
      setSaving(false);
    }
  }

  async function launchWorkspace() {
    setSaving(true);
    try {
      await api.post('/api/onboarding/complete', { profile });
      toast.success('Workspace published live 🚀');
      await load();
    } catch (err) {
      toast.error(err.message || 'Launch sequence failed');
    } finally {
      setSaving(false);
    }
  }

  const steps = onboarding?.steps || {};
  const job = onboarding?.latestJob;
  const launched = onboarding?.status === 'completed' || steps.launch;

  if (loading && !onboarding) {
     return <div className="p-12 flex flex-col items-center gap-4 animate-pulse"><RefreshCcw className="h-8 w-8 animate-spin opacity-20" /></div>;
  }

  return (
    <div className="p-8 pb-20 flex flex-col gap-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <SectionHeader 
        title="Review & Launch" 
        description="Finalize the AI intelligence baseline before publishing your workspace to production channels."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading || saving} className="h-9 gap-2">
            <RefreshCcw className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
            Sync Progress
          </Button>
          <Link href="/dashboard/migrations">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Database className="h-3.5 w-3.5" />
              Import History
            </Button>
          </Link>
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Step label="Account" done={steps.account} />
        <Step label="Presence" done={steps.presence} />
        <Step label="Knowledge" done={steps.ingestion} />
        <Step label="Profile" done={steps.profile} />
        <Step label="Launch" done={steps.launch} />
      </div>

      {job && (
        <Card className="bg-primary/5 border-primary/10 shadow-none overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                 <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-none">Automated Knowledge Ingestion</p>
                <p className="text-[12px] text-muted-foreground mt-1.5 truncate opacity-70">{job.source_url}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">{job.status}</p>
                 <p className="text-[11px] text-muted-foreground mt-1 font-medium">{job.pages_seen || 0} pages processed</p>
              </div>
              <Badge variant="outline" className="bg-background font-bold border-primary/20 text-primary">{job.chunks_stored || 0} knowledge nodes</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8 space-y-8">
          <Card className="border shadow-xl bg-card">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Business Understanding
                  </CardTitle>
                  <CardDescription>Refine the profile utilized for AI instruction and semantic retrieval.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={regenerateProfile} disabled={saving || loading} className="h-9 font-semibold text-primary hover:bg-primary/5">
                  <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {FIELDS.map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label className="ml-1">{label}</Label>
                    <Input value={profile[key] || ''} onChange={(e) => updateProfile(key, e.target.value)} className="h-11 border-input" />
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="ml-1">Product & Service Offerings (One per line)</Label>
                  <Textarea rows={5} value={lines(profile.offerings)} onChange={(e) => updateProfile('offerings', parseLines(e.target.value))} className="border-input text-sm leading-relaxed" />
                </div>
                <div className="space-y-2">
                  <Label className="ml-1">FAQ Baseline (One per line)</Label>
                  <Textarea rows={4} value={lines(profile.faqCandidates)} onChange={(e) => updateProfile('faqCandidates', parseLines(e.target.value))} className="border-input text-sm leading-relaxed" />
                </div>
                <div className="space-y-2">
                  <Label className="ml-1">Strategic Brand Voice Notes</Label>
                  <Textarea rows={4} value={profile.brandVoiceNotes || ''} onChange={(e) => updateProfile('brandVoiceNotes', e.target.value)} className="border-input text-sm leading-relaxed" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 p-6 flex justify-end border-t">
               <Button onClick={() => saveProfile('reviewed')} disabled={saving || loading} className="bg-primary px-8 font-semibold shadow-lg shadow-primary/20">
                 Save Draft Baseline
               </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card className={cn(
            "border shadow-2xl overflow-hidden relative group",
            launched ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 bg-white/10 blur-3xl rounded-full" />
            <CardHeader>
               <Badge className={cn(
                 "w-fit mb-2 text-[10px] font-bold uppercase tracking-widest px-3 border-none",
                 launched ? "bg-emerald-500 text-white" : "bg-primary text-white"
               )}>
                 {launched ? 'Active System' : 'Draft Environment'}
               </Badge>
               <CardTitle className="text-3xl font-bold tracking-tight">{launched ? 'Live' : 'Draft'}</CardTitle>
               <CardDescription className="font-medium">
                  {launched 
                    ? 'Your AI workspace is live and responding to customers.' 
                    : 'Finalize your intelligence baseline and publish to go live.'}
               </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
               <div className="p-4 rounded-xl bg-background border border-white/20 backdrop-blur-sm space-y-3">
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", launched ? "bg-emerald-500" : "bg-amber-500")} />
                    {launched ? 'Nodes synchronized' : 'Awaiting publication'}
                  </div>
                  <Separator className="bg-white/10" />
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {launched 
                      ? 'Production metrics will begin populating in your Revenue Control Center.' 
                      : 'Saving the profile locks in your brand identity for all incoming traffic.'}
                  </p>
               </div>
            </CardContent>
            <CardFooter className="pb-8 pt-4 px-6 flex flex-col gap-3">
               <Button onClick={launchWorkspace} disabled={saving || loading || launched} className="w-full bg-primary h-12 font-bold shadow-xl shadow-primary/30 group">
                 {launched ? 'Already Published' : 'Initialize Production'}
                 {!launched && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />}
               </Button>
               <Link href="/dashboard/overview" className="w-full">
                 <Button variant="ghost" className="w-full h-11 font-semibold text-muted-foreground hover:text-foreground">
                   Skip to Dashboard
                 </Button>
               </Link>
            </CardFooter>
          </Card>

          <Card className="border-dashed bg-transparent shadow-none">
            <CardContent className="p-6">
              <div className="flex gap-4">
                 <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                 <div className="space-y-1">
                    <p className="text-[13px] font-semibold">Governance Note</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Changes made here affect the global system prompt. New conversations will reflect these updates immediately upon publication.</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
