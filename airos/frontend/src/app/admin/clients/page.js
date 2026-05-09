'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  RefreshCcw,
  Globe,
  UserPlus,
  Pencil,
  X,
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const PLANS = ['starter', 'growth', 'pro', 'enterprise'];
const LIFECYCLES = ['trialing', 'payment_due', 'active', 'overdue', 'suspended', 'cancelled'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'SAR', 'AED', 'EGP'];

const EMPTY_FORM = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  password: '',
  plan: 'starter',
  status: 'active',
  subscriptionStatus: 'trialing',
  purchasedSeats: 1,
  country: '',
  domain: '',
  phone: '',
  notes: '',
};

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'No activity';
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusColor(s) {
  if (s === 'active') return 'bg-emerald-500/10 text-emerald-500';
  if (s === 'trialing') return 'bg-sky-500/10 text-sky-500';
  if (s === 'payment_due' || s === 'overdue') return 'bg-amber-500/10 text-amber-500';
  return 'bg-red-500/10 text-red-500';
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-[12px] font-bold uppercase tracking-wider rounded-lg transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [clients, setClients] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Edit modal state
  const [editClient, setEditClient] = useState(null);
  const [editTab, setEditTab] = useState('profile');
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [actionSaving, setActionSaving] = useState('');
  const [trialDays, setTrialDays] = useState('7');
  const [adjustSeats, setAdjustSeats] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [forceUpgradePlan, setForceUpgradePlan] = useState('pro');
  const [overrideCurrency, setOverrideCurrency] = useState('EUR');
  const [overrideCycle, setOverrideCycle] = useState('monthly');

  const loadClients = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.get('/api/admin/clients');
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  function openEdit(client) {
    setEditClient(client);
    setEditForm({
      name: client.name || '',
      domain: client.domain || '',
      country: client.country || '',
      phone: client.phone || '',
      notes: client.notes || '',
      plan: client.plan || 'starter',
      subscriptionStatus: client.subscriptionStatus || 'trialing',
      billingCycle: client.billingCycle || 'monthly',
      billingCurrency: client.billingCurrency || 'EUR',
      purchasedSeats: client.purchasedSeats || 1,
    });
    setForceUpgradePlan(client.plan || 'pro');
    setOverrideCurrency(client.billingCurrency || 'EUR');
    setOverrideCycle(client.billingCycle || 'monthly');
    setTrialDays('7');
    setAdjustSeats(String(client.purchasedSeats || 1));
    setDiscountPct('');
    setEditTab('profile');
  }

  function patchLocal(clientId, patch) {
    setClients(curr => curr.map(c => c.id === clientId ? { ...c, ...patch } : c));
    setEditClient(curr => curr?.id === clientId ? { ...curr, ...patch } : curr);
  }

  async function handleSaveProfile() {
    setEditSaving(true);
    try {
      const data = await adminApi.patch(`/api/admin/clients/${editClient.id}`, editForm);
      patchLocal(editClient.id, data.client);
      toast.success('Client profile saved');
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSaveBilling() {
    setEditSaving(true);
    try {
      const data = await adminApi.patch(`/api/admin/clients/${editClient.id}`, editForm);
      patchLocal(editClient.id, data.client);
      toast.success('Billing settings saved');
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setEditSaving(false);
    }
  }

  async function billingAction(action, payload = {}) {
    setActionSaving(action);
    try {
      const data = await adminApi.post(`/api/admin/billing/${editClient.id}/actions`, { action, ...payload });
      const s = data.summary || {};
      patchLocal(editClient.id, {
        subscriptionStatus: s.subscriptionStatus || editClient.subscriptionStatus,
        purchasedSeats: s.seatCount || editClient.purchasedSeats,
        status: s.status || editClient.status,
        plan: s.plan || editClient.plan,
        billingCycle: s.billingCycle || editClient.billingCycle,
        billingCurrency: s.billingCurrency || editClient.billingCurrency,
      });
      toast.success('Action applied');
    } catch (err) {
      toast.error(err.message || 'Could not apply action');
    } finally {
      setActionSaving('');
    }
  }

  async function handleCreateClient() {
    if (!form.name.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      toast.error('Company name, owner name, and owner email are required');
      return;
    }
    setSaving(true);
    try {
      const data = await adminApi.post('/api/admin/clients', form);
      setClients(curr => [data.client, ...curr]);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success(`${data.client.name} created — set-password email sent to owner`);
    } catch (err) {
      toast.error(err.message || 'Could not create client');
    } finally {
      setSaving(false);
    }
  }

  const visibleClients = useMemo(() => clients.filter(c => {
    if (statusFilter !== 'all' && c.subscriptionStatus !== statusFilter) return false;
    if (planFilter !== 'all' && c.plan !== planFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.owner?.email || c.email || '').toLowerCase().includes(q) ||
      String(c.domain || '').toLowerCase().includes(q)
    );
  }), [clients, planFilter, search, statusFilter]);

  const stats = useMemo(() => visibleClients.reduce((acc, c) => {
    acc.total += 1;
    acc.active += c.subscriptionStatus === 'active' ? 1 : 0;
    acc.mrr += c.subscriptionStatus === 'active' ? Number(c.monthlyValue || 0) : 0;
    return acc;
  }, { total: 0, active: 0, mrr: 0 }), [visibleClients]);

  return (
    <div className="p-8 pb-12 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Tenant Management</h1>
          <p className="text-sm text-muted-foreground">Direct access to production workspace provisioning and status control.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary gap-2 h-10 shadow-lg"><UserPlus className="h-4 w-4" /> Provision Client</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>New Client Workspace</DialogTitle>
              <DialogDescription>Manually create a new tenant with owner account.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Company Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Acme Inc" /></div>
                <div className="space-y-2"><Label>Domain (optional)</Label><Input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="acme.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Owner Name</Label><Input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="John Doe" /></div>
                <div className="space-y-2"><Label>Owner Email</Label><Input value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} placeholder="john@acme.com" /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLANS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lifecycle</Label>
                  <Select value={form.subscriptionStatus} onValueChange={v => setForm({ ...form, subscriptionStatus: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LIFECYCLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Seats</Label><Input type="number" min="1" value={form.purchasedSeats} onChange={e => setForm({ ...form, purchasedSeats: parseInt(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="IE" /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateClient} disabled={saving}>{saving ? 'Creating...' : 'Create Client'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Filtered Clients', value: stats.total, color: '' },
          { label: 'Active Units', value: stats.active, color: 'text-emerald-500' },
          { label: 'Subset MRR', value: formatMoney(stats.mrr), color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="bg-muted/30 border-none shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
              <span className={cn('text-xl font-black', s.color)}>{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm bg-card/50">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, owner, or domain..." className="pl-10 bg-background/50 border-none h-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-background/50 border-none h-10"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lifecycles</SelectItem>
              {LIFECYCLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[160px] bg-background/50 border-none h-10"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              {PLANS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={loadClients} className="h-10 w-10">
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-xl overflow-hidden bg-card/50">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-[240px] font-black uppercase tracking-tighter text-[10px]">Client</TableHead>
              <TableHead className="font-black uppercase tracking-tighter text-[10px]">Owner</TableHead>
              <TableHead className="text-right font-black uppercase tracking-tighter text-[10px]">Tier</TableHead>
              <TableHead className="text-right font-black uppercase tracking-tighter text-[10px]">Usage</TableHead>
              <TableHead className="text-center font-black uppercase tracking-tighter text-[10px]">Status</TableHead>
              <TableHead className="text-right font-black uppercase tracking-tighter text-[10px]">Last Seen</TableHead>
              <TableHead className="text-right font-black uppercase tracking-tighter text-[10px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground animate-pulse">Synchronizing live data...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-destructive">{error}</TableCell></TableRow>
            ) : visibleClients.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">No matching units found.</TableCell></TableRow>
            ) : visibleClients.map(client => (
              <TableRow key={client.id} className="group transition-colors hover:bg-muted/30">
                <TableCell>
                  <div className="font-bold text-sm">{client.name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Globe className="h-2.5 w-2.5" />{client.domain || 'no-domain'}{client.country && <span>• {client.country}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-xs text-foreground/80">{client.owner?.name || 'Incomplete Profile'}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{client.owner?.email || client.email}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-black text-xs uppercase text-indigo-500">{client.plan}</div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-0.5">{formatMoney(client.monthlyValue)}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-black text-xs text-foreground/70">{Number(client.messagesCount || 0).toLocaleString()} <span className="text-[9px] font-medium opacity-50 uppercase">msg</span></div>
                  <div className="text-[10px] font-medium text-muted-foreground mt-0.5">{client.channelsConnected} channels</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn('text-[9px] font-black uppercase tracking-widest border-none', statusColor(client.subscriptionStatus))}>
                    {client.subscriptionStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                  {formatDate(client.lastSeen || client.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px] font-bold" onClick={() => openEdit(client)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
      {editClient && (
        <Dialog open={Boolean(editClient)} onOpenChange={open => { if (!open) setEditClient(null); }}>
          <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-lg font-black">{editClient.name}</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">{editClient.owner?.email || editClient.email} · ID: {editClient.id}</DialogDescription>
                </div>
                <Badge className={cn('text-[9px] font-black uppercase tracking-widest border-none mt-1', statusColor(editClient.subscriptionStatus))}>
                  {editClient.subscriptionStatus}
                </Badge>
              </div>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-3 mb-4">
              <TabBtn active={editTab === 'profile'} onClick={() => setEditTab('profile')}>Profile</TabBtn>
              <TabBtn active={editTab === 'billing'} onClick={() => setEditTab('billing')}>Billing & Plan</TabBtn>
              <TabBtn active={editTab === 'actions'} onClick={() => setEditTab('actions')}>Quick Actions</TabBtn>
            </div>

            {/* ── PROFILE TAB ── */}
            {editTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Company Name">
                    <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </FieldRow>
                  <FieldRow label="Domain">
                    <Input value={editForm.domain} onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))} placeholder="acme.com" />
                  </FieldRow>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Country Code">
                    <Input value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} placeholder="IE / SA / EG" />
                  </FieldRow>
                  <FieldRow label="Phone">
                    <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                  </FieldRow>
                </div>
                <FieldRow label="Owner Email (read-only)">
                  <Input value={editClient.owner?.email || editClient.email || ''} disabled className="opacity-50" />
                </FieldRow>
                <FieldRow label="Internal Notes">
                  <Textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Private admin notes about this client..." />
                </FieldRow>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={editSaving} className="h-9 px-8">
                    {editSaving ? 'Saving…' : 'Save Profile'}
                  </Button>
                </div>
              </div>
            )}

            {/* ── BILLING TAB ── */}
            {editTab === 'billing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Plan">
                    <Select value={editForm.plan} onValueChange={v => setEditForm(f => ({ ...f, plan: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PLANS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Subscription Status">
                    <Select value={editForm.subscriptionStatus} onValueChange={v => setEditForm(f => ({ ...f, subscriptionStatus: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LIFECYCLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </FieldRow>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FieldRow label="Billing Cycle">
                    <Select value={editForm.billingCycle} onValueChange={v => setEditForm(f => ({ ...f, billingCycle: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Currency">
                    <Select value={editForm.billingCurrency} onValueChange={v => setEditForm(f => ({ ...f, billingCurrency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Purchased Seats">
                    <Input type="number" min="1" value={editForm.purchasedSeats} onChange={e => setEditForm(f => ({ ...f, purchasedSeats: parseInt(e.target.value) || 1 }))} />
                  </FieldRow>
                </div>
                {/* Read-only stats */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/30 text-center">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seat Usage</div>
                    <div className="text-lg font-black mt-1">{editClient.activeUsers}/{editClient.purchasedSeats}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Messages</div>
                    <div className="text-lg font-black mt-1">{Number(editClient.messagesCount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MRR</div>
                    <div className="text-lg font-black mt-1">{formatMoney(editClient.monthlyValue)}</div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveBilling} disabled={editSaving} className="h-9 px-8">
                    {editSaving ? 'Saving…' : 'Save Billing'}
                  </Button>
                </div>
              </div>
            )}

            {/* ── QUICK ACTIONS TAB ── */}
            {editTab === 'actions' && (
              <div className="space-y-5">

                {/* Suspend / Reactivate */}
                <div className="p-4 rounded-lg border space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Account Status</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-emerald-500 hover:bg-emerald-500/10 font-bold text-xs"
                      disabled={actionSaving === 'reactivate_account' || editClient.subscriptionStatus === 'active'}
                      onClick={() => billingAction('reactivate_account', { subscriptionStatus: 'active' })}
                    >
                      {actionSaving === 'reactivate_account' ? 'Working…' : '✓ Reactivate'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-red-500 hover:bg-red-500/10 font-bold text-xs"
                      disabled={actionSaving === 'suspend_account' || editClient.subscriptionStatus === 'suspended'}
                      onClick={() => billingAction('suspend_account')}
                    >
                      {actionSaving === 'suspend_account' ? 'Working…' : '⊘ Suspend'}
                    </Button>
                  </div>
                </div>

                {/* Force Upgrade */}
                <div className="p-4 rounded-lg border space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Force Plan Upgrade</p>
                  <div className="flex gap-3">
                    <Select value={forceUpgradePlan} onValueChange={setForceUpgradePlan}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{PLANS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button
                      className="h-9 px-6 font-bold text-xs"
                      disabled={actionSaving === 'force_upgrade'}
                      onClick={() => billingAction('force_upgrade', { plan: forceUpgradePlan })}
                    >
                      {actionSaving === 'force_upgrade' ? 'Working…' : 'Apply'}
                    </Button>
                  </div>
                </div>

                {/* Extend Trial */}
                <div className="p-4 rounded-lg border space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Extend / Shorten Trial</p>
                  <div className="flex gap-2">
                    {['7', '14', '30'].map(d => (
                      <Button
                        key={d}
                        variant={trialDays === d ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs font-bold"
                        onClick={() => setTrialDays(d)}
                      >
                        +{d}d
                      </Button>
                    ))}
                    <Input
                      type="number"
                      min="1"
                      value={trialDays}
                      onChange={e => setTrialDays(e.target.value)}
                      className="w-20 h-8 text-xs"
                      placeholder="Days"
                    />
                    <Button
                      className="h-8 px-4 font-bold text-xs"
                      disabled={actionSaving === 'extend_trial'}
                      onClick={() => billingAction('extend_trial', { days: parseInt(trialDays) || 7 })}
                    >
                      {actionSaving === 'extend_trial' ? '…' : 'Extend'}
                    </Button>
                  </div>
                </div>

                {/* Adjust Seats */}
                <div className="p-4 rounded-lg border space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Adjust Seats</p>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="1"
                      value={adjustSeats}
                      onChange={e => setAdjustSeats(e.target.value)}
                      className="flex-1 h-9 text-sm"
                      placeholder="New seat count"
                    />
                    <Button
                      className="h-9 px-6 font-bold text-xs"
                      disabled={actionSaving === 'adjust_seats' || !adjustSeats}
                      onClick={() => billingAction('adjust_seats', { seatCount: parseInt(adjustSeats) })}
                    >
                      {actionSaving === 'adjust_seats' ? 'Working…' : 'Apply'}
                    </Button>
                  </div>
                </div>

                {/* Apply Discount */}
                <div className="p-4 rounded-lg border space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Apply Discount</p>
                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPct}
                        onChange={e => setDiscountPct(e.target.value)}
                        className="h-9 pr-8 text-sm"
                        placeholder="e.g. 20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <Button
                      className="h-9 px-6 font-bold text-xs"
                      disabled={actionSaving === 'apply_discount' || discountPct === ''}
                      onClick={() => billingAction('apply_discount', { discountPercent: parseFloat(discountPct) || 0 })}
                    >
                      {actionSaving === 'apply_discount' ? 'Working…' : 'Apply'}
                    </Button>
                  </div>
                </div>

                {/* Override Currency */}
                <div className="p-4 rounded-lg border space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Override Currency</p>
                  <div className="flex gap-3">
                    <Select value={overrideCurrency} onValueChange={setOverrideCurrency}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button
                      className="h-9 px-6 font-bold text-xs"
                      disabled={actionSaving === 'override_currency'}
                      onClick={() => billingAction('override_currency', { currency: overrideCurrency })}
                    >
                      {actionSaving === 'override_currency' ? 'Working…' : 'Apply'}
                    </Button>
                  </div>
                </div>

                {/* Change Billing Cycle */}
                <div className="p-4 rounded-lg border space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Change Billing Cycle</p>
                  <div className="flex gap-3">
                    <Select value={overrideCycle} onValueChange={setOverrideCycle}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="h-9 px-6 font-bold text-xs"
                      disabled={actionSaving === 'change_billing_cycle'}
                      onClick={() => billingAction('change_billing_cycle', { billingCycle: overrideCycle })}
                    >
                      {actionSaving === 'change_billing_cycle' ? 'Working…' : 'Apply'}
                    </Button>
                  </div>
                </div>

              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
