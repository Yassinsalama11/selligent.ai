'use client';

import * as React from 'react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import toast from 'react-hot-toast';
import { 
  Trophy, 
  RefreshCcw, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  DollarSign, 
  Target, 
  Clock, 
  ChevronRight, 
  Search,
  MessageSquare,
  AlertCircle,
  Filter,
  CheckCircle2,
  Users
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
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionHeader } from '@/components/ui/section-header';
import { Separator } from '@/components/ui/separator';

const STAGES = [
  { id: 'new_lead', label: 'New Leads', color: 'bg-indigo-500' },
  { id: 'engaged', label: 'Engaged', color: 'bg-purple-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
  { id: 'closing', label: 'Closing', color: 'bg-cyan-500' },
  { id: 'won', label: 'Won', color: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

function formatStageLabel(stage) {
  return String(stage || 'new_lead').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function DealCard({ deal, onMove, onRemove, moving }) {
  const { formatMoney } = useCurrency();
  return (
    <Card className="group border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing bg-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-[13px] font-semibold truncate leading-tight group-hover:text-primary transition-colors">{deal.customer_name}</h4>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-muted-foreground">
               <Clock className="h-3 w-3 opacity-40" />
               {new Date(deal.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="text-[13px] font-bold text-foreground tabular-nums">
            {formatMoney(deal.estimated_value || 0)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 bg-muted/50 text-muted-foreground/80 border-none">
            {deal.channel || 'direct'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onMove('won')} className="text-emerald-600 font-medium">Mark Won</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove('lost')} className="text-red-600 font-medium">Mark Lost</DropdownMenuItem>
              <Separator className="my-1" />
              {STAGES.slice(0, 4).map(s => (
                <DropdownMenuItem key={s.id} onClick={() => onMove(s.id)} disabled={deal.stage === s.id}>
                  Move to {s.label}
                </DropdownMenuItem>
              ))}
              <Separator className="my-1" />
              <DropdownMenuItem onClick={onRemove} className="text-destructive font-medium">Delete Deal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DealsPage() {
  const { currency, formatMoney } = useCurrency();
  const { data, loading, error, reload, setData } = usePollingResource(async () => {
    const deals = await api.get('/api/deals');
    return Array.isArray(deals) ? deals : [];
  }, [], { intervalMs: 90000, initialData: [] });

  const [isPending, startTransition] = useTransition();
  const [movingDealId, setMovingDealId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualLead, setManualLead] = useState({ customer_name: '', customer_phone: '', customer_email: '', estimated_value: '', currency: 'USD', notes: '' });
  // Sync new lead currency with global setting
  React.useEffect(() => { setManualLead(f => ({ ...f, currency })); }, [currency]);

  const stages = useMemo(() => {
    const groups = {};
    for (const s of STAGES) groups[s.id] = [];
    for (const d of data) {
      if (groups[d.stage]) groups[d.stage].push(d);
    }
    return groups;
  }, [data]);

  const totals = useMemo(() => ({
    count: data.filter(d => !['won', 'lost'].includes(d.stage)).length,
    pipeline: data.filter(d => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + Number(d.estimated_value || 0), 0),
    won: data.filter(d => d.stage === 'won').reduce((s, d) => s + Number(d.estimated_value || 0), 0),
  }), [data]);

  async function moveDeal(deal, stage) {
    if (movingDealId) return;
    setMovingDealId(deal.id);
    const previous = data;
    startTransition(() => {
      setData((current) => current.map((entry) => (
        entry.id === deal.id ? { ...entry, stage, updated_at: new Date().toISOString() } : entry
      )));
    });
    try {
      const result = await api.post(`/api/deals/${deal.id}/stage`, { stage });
      const updated = result || { ...deal, stage, updated_at: new Date().toISOString() };
      startTransition(() => {
        setData((current) => current.map((entry) => (entry.id === deal.id ? updated : entry)));
      });
      toast.success(`Moved to ${formatStageLabel(stage)}`);
    } catch (err) {
      startTransition(() => setData(previous));
      toast.error(err.message || 'Could not update deal stage');
    } finally {
      setMovingDealId(null);
    }
  }

  async function createManualLead(event) {
    event.preventDefault();
    if (!manualLead.customer_name.trim()) return;
    setCreating(true);
    try {
      const created = await api.post('/api/deals', {
        ...manualLead,
        channel: 'manual',
        stage: 'new_lead',
        intent: 'manual',
        lead_score: 0,
        estimated_value: Number(manualLead.estimated_value || 0),
      });

      const dealToAdd = created || {
        id: `demo-${Date.now()}`,
        ...manualLead,
        channel: 'manual',
        stage: 'new_lead',
        intent: 'manual',
        lead_score: 0,
        estimated_value: Number(manualLead.estimated_value || 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setData((current) => [
        { 
          ...dealToAdd, 
          customer_name: dealToAdd.customer_name || manualLead.customer_name, 
          channel: dealToAdd.channel || 'manual' 
        }, 
        ...(current || [])
      ]);
      setManualLead({ customer_name: '', customer_phone: '', customer_email: '', estimated_value: '', currency: 'USD', notes: '' });
      setShowAddForm(false);
      toast.success('Manual lead added');
    } catch (err) {
      toast.error(err.message || 'Could not create lead');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 overflow-hidden">
      <header className="h-16 border-b px-8 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
             <Trophy className="h-5 w-5 text-primary" />
          </div>
          <SectionHeader 
            title="Deal Pipeline" 
            description="Manage your sales funnel and track revenue progression across all lead stages."
            className="sm:flex-col sm:items-start gap-0"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)} className="h-9 font-medium shadow-sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Lead
          </Button>
          <Button variant="outline" size="sm" onClick={reload} className="h-9 font-medium shadow-sm">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Sync
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Metric Bar */}
        <div className="px-8 py-6 border-b bg-muted/5 flex items-center gap-12 shrink-0 overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center"><Target className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Pipeline</p>
                <p className="text-xl font-bold tracking-tight">{totals.count}</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Estimated Value</p>
                <p className="text-xl font-bold tracking-tight">{formatMoney(totals.pipeline)}</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Revenue Won</p>
                <p className="text-xl font-bold tracking-tight">{formatMoney(totals.won)}</p>
              </div>
           </div>
        </div>

        {/* Board */}
        <ScrollArea direction="horizontal" className="flex-1 h-full">
          <div className="flex p-8 gap-6 h-full min-w-max pb-12">
            {STAGES.map((stage) => (
              <div key={stage.id} className="w-[300px] flex flex-col gap-4 group">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                    <h3 className="text-[13px] font-semibold text-foreground/80">{stage.label}</h3>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-muted/50 border-none">
                      {stages[stage.id]?.length || 0}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-3 pr-4">
                    {stages[stage.id]?.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        moving={movingDealId === deal.id}
                        onMove={(next) => moveDeal(deal, next)}
                        onRemove={() => setData(d => d.filter(x => x.id !== deal.id))}
                      />
                    ))}
                    {stages[stage.id]?.length === 0 && (
                      <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/40 rounded-2xl">
                        <span className="text-xs font-medium text-muted-foreground/40">No deals here</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Manual Lead Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <Plus className="h-5 w-5 text-primary" />
               New Manual Lead
            </DialogTitle>
            <DialogDescription>Initialize a new deal in the conversion pipeline manually.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createManualLead} className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label>Client Display Name</Label>
              <Input 
                value={manualLead.customer_name} 
                onChange={e => setManualLead({...manualLead, customer_name: e.target.value})} 
                placeholder="e.g. Acme Corp" 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                  <Label>Estimated Value</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      type="number" 
                      value={manualLead.estimated_value} 
                      onChange={e => setManualLead({...manualLead, estimated_value: e.target.value})} 
                      className="pl-8" 
                    />
                  </div>
               </div>
               <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Select value={manualLead.currency} onValueChange={v => setManualLead({...manualLead, currency: v})}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EGP">EGP (LE)</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
            </div>
            <div className="grid gap-2">
               <Label>Contact Email</Label>
               <Input type="email" value={manualLead.customer_email} onChange={e => setManualLead({...manualLead, customer_email: e.target.value})} />
            </div>
            <div className="grid gap-2">
               <Label>Notes / Context</Label>
               <Textarea value={manualLead.notes} onChange={e => setManualLead({...manualLead, notes: e.target.value})} className="min-h-[80px]" />
            </div>
            <Button type="submit" disabled={creating} className="w-full bg-primary font-semibold h-11 shadow-lg mt-2">
               {creating ? 'Initializing Lead...' : 'Finalize Deal Entry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
