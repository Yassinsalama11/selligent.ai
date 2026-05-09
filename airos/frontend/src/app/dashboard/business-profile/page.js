'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Building2, 
  Sparkles, 
  Save, 
  RefreshCcw, 
  Plus, 
  Trash2, 
  Edit2, 
  BookOpen, 
  MessageCircle, 
  Globe, 
  MapPin, 
  ShieldCheck,
  Layout,
  Mic2,
  Info,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function blankProfile() {
  return {
    businessName: '',
    businessCategory: '',
    businessModel: '',
    vertical: '',
    tone: '',
    primaryLanguage: '',
    primaryDialect: '',
    offerings: [],
    locations: [],
    faqCandidates: [],
    faqs: [],
    knowledge: [],
    policies: [],
    supportStyle: '',
    brandVoiceNotes: '',
  };
}

function toLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function fromLines(value) {
  return String(value || '').split('\n').map((entry) => entry.trim()).filter(Boolean);
}

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState(blankProfile());
  const [status, setStatus] = useState('empty');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Knowledge Base Modal State
  const [kbModal, setKbModal] = useState(false);
  const [activeKbItem, setActiveKbItem] = useState(null);
  const [kbForm, setKbForm] = useState({ topic: '', content: '', category: 'general' });

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await api.get('/api/business-profile');
      const p = { ...blankProfile(), ...(data.profile || {}) };
      // Ensure knowledge is always an array of objects
      if (Array.isArray(p.knowledge)) {
        p.knowledge = p.knowledge.map(k => typeof k === 'string' ? { topic: 'Note', content: k, category: 'legacy' } : k);
      }
      setProfile(p);
      setStatus(data.status || 'draft');
    } catch (err) {
      toast.error(err.message || 'Could not load business profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function update(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await api.put('/api/business-profile', { profile, status: 'reviewed' });
      setProfile({ ...blankProfile(), ...(saved.profile || {}) });
      setStatus(saved.status || 'reviewed');
      toast.success('Business profile published');
    } catch (err) {
      toast.error(err.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    setSaving(true);
    try {
      const data = await api.post('/api/business-profile/regenerate', {});
      setProfile({ ...blankProfile(), ...(data.profile || {}) });
      setStatus(data.status || 'draft');
      toast.success('Profile updated via AI analysis');
    } catch (err) {
      toast.error(err.message || 'Could not regenerate profile');
    } finally {
      setSaving(false);
    }
  }

  /* ── Knowledge Base Logic ─────────────────────────────────────────── */
  function openKbAdd() {
    setKbForm({ topic: '', content: '', category: 'general' });
    setActiveKbItem(null);
    setKbModal(true);
  }

  function openKbEdit(item, index) {
    setKbForm({ ...item });
    setActiveKbItem(index);
    setKbModal(true);
  }

  function saveKbItem() {
    if (!kbForm.topic.trim() || !kbForm.content.trim()) return toast.error('Topic and Content are required');
    
    const nextKnowledge = [...(profile.knowledge || [])];
    if (activeKbItem !== null) {
      nextKnowledge[activeKbItem] = kbForm;
    } else {
      nextKnowledge.push({ ...kbForm, active: true });
    }
    
    update('knowledge', nextKnowledge);
    setKbModal(false);
  }

  function removeKbItem(index) {
    const nextKnowledge = (profile.knowledge || []).filter((_, i) => i !== index);
    update('knowledge', nextKnowledge);
    toast.success('Knowledge item removed');
  }

  return (
    <div className="p-8 pb-20 flex flex-col gap-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <SectionHeader 
        title="Business Profile" 
        description="The core knowledge document defining your brand identity, operations, and AI constraints."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={regenerate} disabled={saving || loading} className="gap-2 h-9">
            <RefreshCcw className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
            AI Regenerate
          </Button>
          <Button size="sm" onClick={save} disabled={saving || loading} className="bg-primary gap-2 h-9 shadow-lg shadow-primary/20 font-bold">
            <Save className="h-3.5 w-3.5" />
            Publish Profile
          </Button>
        </div>
      </SectionHeader>

      <Card className={cn(
        "border shadow-sm overflow-hidden",
        status === 'reviewed' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-amber-500/5 border-amber-500/10"
      )}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              status === 'reviewed' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest leading-none">
                Status: <span className={status === 'reviewed' ? "text-emerald-600" : "text-amber-600"}>{status}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">This profile is injected into AI context on every reply.</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-background border-none font-black text-[9px] uppercase tracking-tighter">
            Last Sync: Just Now
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Main Profile Form */}
        <div className="xl:col-span-7 space-y-8">
          <Card className="border shadow-xl bg-card">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Brand Identity
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest opacity-60">Identity baseline for AI alignment</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key:'businessName', label:'Business Name', ph:'e.g. Selligent' },
                  { key:'businessCategory', label:'Category', ph:'e.g. Real Estate' },
                  { key:'businessModel', label:'Model', ph:'e.g. B2B Services' },
                  { key:'vertical', label:'Vertical', ph:'e.g. Luxury Properties' },
                ].map(f => (
                  <div key={f.key} className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">{f.label}</Label>
                    <Input 
                      value={profile[f.key] || ''} 
                      onChange={(e) => update(f.key, e.target.value)} 
                      placeholder={f.ph}
                      className="h-10 border-input"
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key:'tone', label:'Voice Tone', ph:'Helpful, Professional' },
                  { key:'primaryLanguage', label:'Language', ph:'Arabic' },
                  { key:'primaryDialect', label:'Dialect', ph:'Egyptian (AR-EG)' },
                ].map(f => (
                  <div key={f.key} className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">{f.label}</Label>
                    <Input 
                      value={profile[f.key] || ''} 
                      onChange={(e) => update(f.key, e.target.value)} 
                      placeholder={f.ph}
                      className="h-10 border-input"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Support Style</Label>
                <Input 
                  value={profile.supportStyle || ''} 
                  onChange={(e) => update('supportStyle', e.target.value)} 
                  placeholder="Concise, technical, empathetic..."
                  className="h-10 border-input"
                />
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-1.5">
                    <Layout className="h-3 w-3" /> Core Offerings
                  </Label>
                  <Textarea 
                    rows={4} 
                    value={toLines(profile.offerings)} 
                    onChange={(e) => update('offerings', fromLines(e.target.value))}
                    placeholder="List products or services, one per line..."
                    className="border-input text-sm leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Physical Locations
                  </Label>
                  <Textarea 
                    rows={3} 
                    value={toLines(profile.locations)} 
                    onChange={(e) => update('locations', fromLines(e.target.value))}
                    placeholder="Headquarters, branches, service areas..."
                    className="border-input text-sm leading-relaxed"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="border shadow-lg bg-card">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-500" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest opacity-60">Hand-curated Q&A for instant AI resolution</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                {(profile.faqs || []).map((faq, index) => (
                  <div key={index} className="p-4 rounded-xl border bg-muted/30 relative group">
                    <button 
                      onClick={() => update('faqs', profile.faqs.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <Input 
                      value={faq.question} 
                      onChange={(e) => {
                        const next = [...profile.faqs];
                        next[index].question = e.target.value;
                        update('faqs', next);
                      }}
                      className="border-none bg-transparent font-bold text-sm h-7 px-0 focus-visible:ring-0"
                      placeholder="Question..."
                    />
                    <Textarea 
                      value={faq.answer} 
                      onChange={(e) => {
                        const next = [...profile.faqs];
                        next[index].answer = e.target.value;
                        update('faqs', next);
                      }}
                      className="border-none bg-transparent text-[13px] p-0 min-h-0 h-auto focus-visible:ring-0 resize-none mt-1 opacity-70"
                      placeholder="Answer..."
                    />
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full border-dashed h-12 gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                  onClick={() => update('faqs', [...(profile.faqs || []), { question: '', answer: '' }])}
                >
                  <Plus className="h-4 w-4" />
                  Add New FAQ Row
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Base Sidebar */}
        <div className="xl:col-span-5 space-y-8">
          <Card className="border shadow-2xl bg-card border-primary/20 ring-4 ring-primary/5">
            <CardHeader className="border-b bg-primary/5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Knowledge Base
                  </CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">System-wide AI Knowledge Source</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={openKbAdd} className="h-8 gap-2 bg-background font-bold border-primary/20 text-primary shadow-sm hover:bg-primary/5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Topic
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-primary/80 font-medium leading-relaxed italic antialiased">
                  "Your AI agent uses this knowledge to answer customer questions and follow your business rules precisely."
                </p>
              </div>

              <div className="space-y-4">
                {(!profile.knowledge || profile.knowledge.length === 0) ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-30 italic">
                    <Zap className="h-8 w-8 mb-4 mx-auto" />
                    <p className="text-sm">No knowledge topics initialized.</p>
                  </div>
                ) : (
                  profile.knowledge.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50 group hover:border-primary/20 hover:bg-muted/60 transition-all cursor-pointer" onClick={() => openKbEdit(item, index)}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black truncate">{item.topic || 'Untitled Topic'}</h4>
                          <Badge variant="outline" className="text-[8px] font-black uppercase py-0 h-4 bg-background opacity-60">{item.category || 'general'}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 opacity-70 italic">"{item.content}"</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeKbItem(index); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 p-4 justify-center border-t">
              <p className="text-[10px] font-black uppercase text-muted-foreground/50 flex items-center gap-2 tracking-[0.1em]">
                <ShieldCheck className="h-3 w-3" /> Managed AI Context Source
              </p>
            </CardFooter>
          </Card>

          <Card className="bg-indigo-500/5 border-indigo-500/10 border-dashed shadow-none">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 opacity-70">
                <Mic2 className="h-3.5 w-3.5" />
                Brand Voice Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Textarea 
                rows={5} 
                value={profile.brandVoiceNotes || ''} 
                onChange={(e) => update('brandVoiceNotes', e.target.value)}
                placeholder="Specific instructions on how the agent should sound..."
                className="bg-transparent border-input text-[13px]"
              />
              <div className="flex items-center gap-2 text-[10px] text-indigo-500/60 font-bold uppercase antialiased">
                <Info className="h-3 w-3" />
                Affects autonomous reply generation
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Knowledge Base Modal ─────────────────────────────────────────── */}
      <Dialog open={kbModal} onOpenChange={setKbModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {activeKbItem !== null ? 'Edit Knowledge Node' : 'Initialize Knowledge Topic'}
            </DialogTitle>
            <DialogDescription>
              Detailed business rules or policy information used by the AI engine.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-xs font-black uppercase tracking-widest opacity-60">Title / Topic</Label>
              <Input 
                id="topic" 
                placeholder="e.g. Shipping Policy, Refund Rules" 
                value={kbForm.topic} 
                onChange={e => setKbForm({...kbForm, topic: e.target.value})}
                className="h-10 border-input font-bold"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest opacity-60">Category</Label>
              <Select value={kbForm.category} onValueChange={v => setKbForm({...kbForm, category: v})}>
                <SelectTrigger className="h-10 border-input bg-background font-bold text-xs uppercase tracking-tighter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (Default)</SelectItem>
                  <SelectItem value="policy">Policy / Legal</SelectItem>
                  <SelectItem value="logistics">Shipping / Logistics</SelectItem>
                  <SelectItem value="sales">Sales / Offers</SelectItem>
                  <SelectItem value="support">Technical Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content" className="text-xs font-black uppercase tracking-widest opacity-60">Content / Instruction</Label>
              <Textarea 
                id="content" 
                placeholder="The AI will follow this content when answering relevant customer queries..." 
                value={kbForm.content} 
                onChange={e => setKbForm({...kbForm, content: e.target.value})}
                className="min-h-[160px] border-input text-sm leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 mt-2 border-t">
            <Button variant="ghost" onClick={() => setKbModal(false)}>Cancel</Button>
            <Button 
              onClick={saveKbItem} 
              className="bg-primary px-8 font-bold"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {activeKbItem !== null ? 'Update Node' : 'Register Knowledge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
