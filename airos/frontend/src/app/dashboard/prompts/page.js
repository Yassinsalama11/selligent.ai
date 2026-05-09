'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Bot, 
  Settings, 
  History, 
  Play, 
  RotateCcw, 
  Save, 
  ShieldAlert, 
  Info, 
  Sparkles,
  ChevronRight,
  Terminal,
  Zap,
  Layout,
  Fingerprint,
  RefreshCcw,
  Clock
} from 'lucide-react';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionHeader } from '@/components/ui/section-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PROMPT_META = {
  'reply-system': {
    title: 'Autonomous Reply Logic',
    description: 'Defines the personality, tone, and operational boundaries of your AI agent.',
    icon: Bot,
    color: 'text-primary',
    bg: 'bg-primary/10',
    warning: 'Critical: Changing this significantly alters how the AI talks to real customers.',
    tags: ['Core', 'Personality', 'Safety']
  },
  'intent-detector': {
    title: 'Semantic Intent Parser',
    description: 'Controls how the AI categorizes customer requests into actionable goals.',
    icon: Zap,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    warning: 'Advanced: Modification may affect lead qualification and escalation accuracy.',
    tags: ['Logic', 'Categorization', 'Routing']
  }
};

export default function PromptsPage() {
  const { data, loading, error, reload } = usePollingResource(async () => {
    const prompts = await api.get('/api/prompts');
    return Array.isArray(prompts) ? prompts : [];
  }, [], { intervalMs: 60000, initialData: [] });

  const prompts = data || [];
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [testInput, setTestInput] = useState('How much does the premium plan cost and do you offer a refund?');
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const activePrompt = useMemo(() => (
    prompts.find((p) => p.id === selectedId) || prompts[0] || null
  ), [prompts, selectedId]);

  const meta = PROMPT_META[activePrompt?.id] || {
    title: activePrompt?.id || 'System Prompt',
    description: 'Internal AI system configuration baseline.',
    icon: Terminal,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    tags: ['Internal']
  };

  useEffect(() => {
    if (activePrompt) {
      const current = activePrompt.versions?.find((v) => v.version === activePrompt.pinnedVersion)
        || activePrompt.versions?.[0];
      setDraft(current?.content || '');
      setTestResult(null);
    }
  }, [activePrompt]);

  async function handleSave() {
    if (!activePrompt || saving) return;
    setSaving(true);
    try {
      await api.put(`/api/prompts/${activePrompt.id}`, { content: draft });
      toast.success('New version published and pinned');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!activePrompt || testing) return;
    setTesting(true);
    try {
      const result = await api.post(`/api/prompts/${activePrompt.id}/test`, {
        input: testInput,
        version: activePrompt.pinnedVersion,
        runModel: true,
      });
      setTestResult(result);
      setActiveTab('test');
    } catch (err) {
      toast.error(err.message || 'Test sequence failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleRollback(version) {
    if (!activePrompt) return;
    try {
      await api.post(`/api/prompts/${activePrompt.id}/rollback`, { version });
      toast.success(`Active version reverted to ${version}`);
      await reload();
    } catch (err) {
      toast.error(err.message || 'Rollback failed');
    }
  }

  if (loading && prompts.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-muted" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background animate-in fade-in duration-500 overflow-hidden">
      {/* Sidebar Nav */}
      <aside className="w-[300px] border-r bg-card flex flex-col shrink-0 hidden md:flex">
        <header className="h-16 border-b px-6 flex items-center shrink-0 bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-sm font-semibold">AI Control Center</h1>
          </div>
        </header>

        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-6">
            <div>
              <h3 className="px-4 text-[11px] font-medium text-muted-foreground/60 mb-2">Prompt Registry</h3>
              <div className="space-y-1">
                {prompts.map((p) => {
                  const pMeta = PROMPT_META[p.id] || { icon: Terminal };
                  const isActive = activePrompt?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <pMeta.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "opacity-50 group-hover:opacity-100")} />
                      <div className="text-left min-w-0">
                        <p className="truncate leading-none">{p.id}</p>
                        <p className={cn("text-[11px] mt-1 opacity-60", isActive ? "text-primary" : "text-muted-foreground")}>
                          v{p.pinnedVersion}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator className="mx-4 opacity-50" />

            <div className="px-4 py-4 space-y-4">
              <Card className="bg-primary/5 border-primary/10 shadow-none">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <Sparkles className="h-5 w-5 text-primary mb-2" />
                  <h4 className="text-xs font-semibold">Need assistance?</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Prompt engineering requires precision. Our team can help you tune these rules for maximum ROI.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <footer className="p-4 border-t bg-muted/5">
          <Button variant="outline" size="sm" onClick={() => reload()} className="w-full h-9 gap-2 text-xs font-medium border-dashed shadow-none bg-background">
            <RefreshCcw className={cn("h-3 w-3", loading && "animate-spin")} />
            Sync Registry
          </Button>
        </footer>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {!activePrompt ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center">
            <div className="max-w-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto opacity-20">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">No Registry Entries</h2>
              <p className="text-sm text-muted-foreground">This workspace does not have any system prompts registered yet.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="h-16 border-b px-8 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", meta.bg)}>
                  <meta.icon className={cn("h-5 w-5", meta.color)} />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold tracking-tight">{meta.title}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4 font-medium bg-background border-muted-foreground/10">
                      ID: {activePrompt.id}
                    </Badge>
                    <Badge className="text-[10px] h-4 font-medium bg-emerald-500/10 text-emerald-600 border-none">
                      Active: v{activePrompt.pinnedVersion}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setDraft(activePrompt.versions?.find((v) => v.version === activePrompt.pinnedVersion)?.content || '')} className="text-xs font-medium h-9">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary px-6 shadow-md h-9 font-semibold">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? 'Publishing...' : 'Publish Version'}
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden flex">
              <div className="flex-1 flex flex-col p-8 space-y-6 overflow-y-auto">
                <Alert className="bg-amber-500/5 border-amber-500/10 py-3">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-xs font-semibold uppercase tracking-widest text-amber-900 dark:text-amber-200">Safety Governance</AlertTitle>
                  <AlertDescription className="text-[12px] text-amber-800/70 dark:text-amber-300/60 font-medium">
                    {meta.warning || 'Edits take effect immediately for all new conversations. Test changes before publishing.'}
                  </AlertDescription>
                </Alert>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="bg-muted/50 mb-4 p-1">
                    <TabsTrigger value="editor" className="gap-2 px-6">Core Instructions</TabsTrigger>
                    <TabsTrigger value="test" className="gap-2 px-6">Validation Lab</TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 px-6">Version History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="mt-0 outline-none">
                    <Card className="border shadow-sm bg-card">
                      <CardHeader className="bg-muted/5 border-b p-4">
                        <div className="flex items-center justify-between">
                          <CardDescription className="text-[11px] font-medium uppercase tracking-tight">Instructions Baseline</CardDescription>
                          <Badge variant="outline" className="font-mono text-[9px] px-1.5 opacity-50">Markdown Supported</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Textarea 
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="min-h-[500px] border-none focus-visible:ring-0 font-mono text-[13px] leading-relaxed p-8 resize-none bg-transparent"
                          placeholder="# Instructions..."
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="test" className="mt-0 outline-none space-y-6">
                    <Card className="border bg-card shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Sample Simulation</CardTitle>
                        <CardDescription>Simulate a customer interaction using your draft instructions.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea 
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          placeholder="Type a customer message here..."
                          className="min-h-[100px] bg-muted/20 border-input"
                        />
                        <div className="flex justify-end">
                          <Button onClick={handleTest} disabled={testing} className="bg-indigo-600 hover:bg-indigo-700 font-semibold px-8 shadow-sm h-10">
                            <Play className="h-4 w-4 mr-2" />
                            {testing ? 'Running Model...' : 'Execute Lab Test'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {testResult && (
                      <div className="grid gap-6 animate-in slide-in-from-bottom-4">
                        <Card className="border bg-muted/5 shadow-none">
                          <CardHeader className="py-3 px-4 border-b">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Terminal className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-semibold uppercase tracking-widest">Model Input Pipeline</span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed opacity-60 max-h-[200px] overflow-y-auto">
                              {testResult.renderedPrompt}
                            </pre>
                          </CardContent>
                        </Card>

                        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm overflow-hidden">
                          <CardHeader className="py-3 px-4 border-b border-emerald-500/10 bg-emerald-500/5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-emerald-600">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-[11px] font-semibold uppercase tracking-tight">Generated Intelligence</span>
                              </div>
                              <Badge className="bg-emerald-500 text-white text-[9px] border-none font-bold">SUCCESS</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="text-[15px] font-medium leading-relaxed text-foreground antialiased">
                              {testResult.output || 'Agent did not return a valid response.'}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="mt-0 outline-none">
                    <Card className="border bg-card overflow-hidden shadow-sm">
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {activePrompt.versions?.map((v) => {
                            const isPinned = v.version === activePrompt.pinnedVersion;
                            return (
                              <div key={v.version} className={cn(
                                "flex items-center justify-between p-4 px-6 transition-colors",
                                isPinned ? "bg-primary/[0.02]" : "hover:bg-muted/20"
                              )}>
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center border",
                                    isPinned ? "bg-primary/10 border-primary/20" : "bg-muted/50 border-border"
                                  )}>
                                    <Fingerprint className={cn("h-4 w-4", isPinned ? "text-primary" : "text-muted-foreground opacity-40")} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm">Release v{v.version}</span>
                                      {isPinned && <Badge className="h-4 px-1.5 text-[8px] font-bold bg-primary text-white border-none">Active</Badge>}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 opacity-50" /> {new Date(v.createdAt).toLocaleDateString()}</span>
                                      <span className="opacity-30">•</span>
                                      <span className="font-mono opacity-60">HASH:{v.promptHash?.slice(0, 8)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setDraft(v.content)}
                                    className="h-8 text-[11px] font-medium"
                                  >
                                    Inspect
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={isPinned}
                                    onClick={() => handleRollback(v.version)}
                                    className="h-8 text-[11px] font-medium border-primary/20 text-primary hover:bg-primary/5 shadow-none"
                                  >
                                    Rollback
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Context Sidebar */}
              <aside className="w-[320px] border-l bg-card p-8 hidden xl:block shrink-0">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-medium text-muted-foreground/60 flex items-center gap-2">
                      <Info className="h-3 w-3 opacity-50" />
                      About this prompt
                    </h3>
                    <p className="text-sm font-medium leading-relaxed">{meta.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] font-medium px-2 py-0 border-none bg-muted text-muted-foreground">{t}</Badge>)}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-medium text-muted-foreground/60">Technical Metadata</h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground opacity-50 mb-1 tracking-wider">Fingerprint</p>
                        <p className="text-[11px] font-mono truncate opacity-70">{activePrompt.versions?.[0]?.promptHash}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground opacity-50 mb-1 tracking-wider">Architecture</p>
                        <p className="text-[11px] font-medium opacity-80">Dynamic Markdown Template</p>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
