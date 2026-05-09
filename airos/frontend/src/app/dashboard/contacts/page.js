'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  MoreHorizontal,
  Download,
  Trash2,
  Edit2,
  History,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  FileJson as FileCsv,
  ChevronRight,
  ExternalLink,
  Users,
  RefreshCcw,
  Globe,
  MapPin,
  Smartphone,
  Camera,
  MessageCircle,
  Monitor,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { api } from '@/lib/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SectionHeader } from '@/components/ui/section-header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Constants ────────────────────────────────────────────────────────────── */
const CH_ICONS = { whatsapp: Smartphone, instagram: Camera, messenger: MessageCircle, livechat: Monitor };
const CH_COLORS = { whatsapp: '#25D366', instagram: '#E1306C', messenger: '#0099FF', livechat: '#ff5a1f' };
const EMPTY_FORM = { name:'', phone:'', email:'', channel:'whatsapp', country:'EG', tags:'', customFields:{} };
const PAGE_SIZE = 50;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function ChannelIcon({ channel, className = 'h-4 w-4' }) {
  const Icon = CH_ICONS[String(channel).toLowerCase()] || MessageCircle;
  const color = CH_COLORS[String(channel).toLowerCase()] || 'currentColor';
  return <Icon className={className} style={{ color }} />;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtRevenue(n, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Number(n).toLocaleString('en-US')}`;
  }
}

function relativeTimeLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  if (diffMinutes < 10080) return `${Math.round(diffMinutes / 1440)}d ago`;
  return `${Math.round(diffMinutes / 10080)}w ago`;
}

function normalizeContact(contact = {}) {
  return {
    ...contact,
    ch: contact.channel || contact.ch || 'whatsapp',
    lastSeenLabel: relativeTimeLabel(contact.lastSeen || contact.updated_at),
    customFields: contact.customFields || {},
    tags: Array.isArray(contact.tags) ? contact.tags : [],
    orders: contact.orders ?? 0,
    revenue: contact.revenue ?? 0,
  };
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ContactsPage() {
  const { currency } = useCurrency();
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [chFilter, setChFilter]   = useState('all');
  const [sort, setSort]           = useState({ col:'revenue', dir:'desc' });
  const [selected, setSelected]   = useState(new Set());
  
  // Modals
  const [addModal, setAddModal]   = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDelModal]= useState(false);
  
  const [activeContact, setActiveContact] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      const data = await api.get('/api/customers');
      setContacts(Array.isArray(data) ? data.map(normalizeContact) : []);
    } catch (err) {
      toast.error(err.message || 'Could not load contacts');
    } finally {
      setLoading(false);
    }
  }

  // Reset page when filters change
  React.useEffect(() => { setPage(0); }, [search, chFilter, sort]);

  const displayed = useMemo(() => {
    let list = contacts.filter(c => {
      if (chFilter !== 'all' && c.ch !== chFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
               c.email.toLowerCase().includes(q) ||
               c.phone.includes(q);
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const mul = sort.dir === 'asc' ? 1 : -1;
      if (sort.col === 'name')    return mul * a.name.localeCompare(b.name);
      if (sort.col === 'orders')  return mul * (a.orders - b.orders);
      if (sort.col === 'revenue') return mul * (a.revenue - b.revenue);
      return 0;
    });
    return list;
  }, [contacts, search, chFilter, sort]);

  const pageRows = useMemo(() => displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [displayed, page]);
  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));

  const stats = useMemo(() => ({
    total:   contacts.length,
    revenue: contacts.reduce((s, c) => s + c.revenue, 0),
    orders:  contacts.reduce((s, c) => s + c.orders, 0),
    vip:     contacts.filter(c => c.tags.includes('VIP')).length,
  }), [contacts]);

  /* ── Actions ──────────────────────────────────────────────────────────── */
  function handleOpenAdd() {
    setForm(EMPTY_FORM);
    setAddModal(true);
  }

  function handleOpenEdit(c) {
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      channel: c.ch,
      country: c.country || 'EG',
      tags: c.tags.join(', '),
      customFields: c.customFields || {},
    });
    setActiveContact(c);
    setEditModal(true);
  }

  function handleOpenView(c) {
    setActiveContact(c);
    setViewModal(true);
  }

  async function handleSaveContact(isNew) {
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.phone.trim()) return toast.error('Phone is required');
    
    setSubmitting(true);
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      tags: tagsArr,
    };

    try {
      if (isNew) {
        const created = await api.post('/api/customers', payload);
        const contactToAdd = created || {
          id: `demo-${Date.now()}`,
          ...payload,
          orders: 0,
          revenue: 0,
          lastSeen: new Date().toISOString(),
        };
        setContacts(prev => [normalizeContact(contactToAdd), ...prev]);
        setAddModal(false);
        toast.success('Contact created');
      } else {
        const updated = await api.patch(`/api/customers/${activeContact.id}`, payload);
        const contactToUpdate = updated || {
          ...activeContact,
          ...payload,
        };
        setContacts(prev => prev.map(c => c.id === activeContact.id ? normalizeContact(contactToUpdate) : c));
        setEditModal(false);
        toast.success('Contact updated');
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!activeContact) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/customers/${activeContact.id}`);
      setContacts(prev => prev.filter(c => c.id !== activeContact.id));
      setSelected(prev => { const n = new Set(prev); n.delete(activeContact.id); return n; });
      setDelModal(false);
      setViewModal(false);
      toast.success('Contact removed');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Export ───────────────────────────────────────────────────────────── */
  async function exportToCSV() {
    setExporting(true);
    try {
      const headers = ['Name', 'Phone', 'Email', 'Channel', 'Country', 'Tags', 'Orders', 'Revenue', 'Last Seen'];
      const rows = displayed.map(c => [
        c.name,
        c.phone,
        c.email,
        c.ch,
        c.country,
        c.tags.join('; '),
        c.orders,
        c.revenue,
        c.lastSeenLabel
      ]);

      const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success('CSV Exported');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function exportToExcel() {
    setExporting(true);
    try {
      const data = displayed.map(c => ({
        Name: c.name,
        Phone: c.phone,
        Email: c.email,
        Channel: c.ch,
        Country: c.country,
        Tags: c.tags.join(', '),
        Orders: c.orders,
        Revenue: c.revenue,
        'Last Seen': c.lastSeenLabel
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
      XLSX.writeFile(wb, `contacts_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Excel Exported');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="p-8 pb-12 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <SectionHeader 
        title="Contact Registry" 
        description="Manage your customer database, track spending patterns, and segment audiences."
      >
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm bg-background" disabled={exporting}>
                <Download className="h-3.5 w-3.5" />
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer font-medium">
                <FileCsv className="h-4 w-4 text-muted-foreground" />
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer font-medium">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Download Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleOpenAdd} size="sm" className="h-9 gap-2 bg-primary shadow-sm font-semibold">
            <Plus className="h-3.5 w-3.5" />
            Add Contact
          </Button>
        </div>
      </SectionHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Contacts', value:stats.total,               icon:Users, color:'#6366f1' },
          { label:'Total Revenue',  value:fmtRevenue(stats.revenue, currency), icon:Download, color:'#10b981' },
          { label:'Total Orders',   value:stats.orders,              icon:Filter, color:'#06b6d4' },
          { label:'VIP Contacts',   value:stats.vip,                 icon:History, color:'#f59e0b' },
        ].map(s => (
          <Card key={s.label} className="border bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${s.color}10`, border: `1px solid ${s.color}20` }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm bg-card overflow-hidden">
        <CardHeader className="bg-muted/5 border-b pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search database..." 
                className="pl-9 bg-background border-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {['all','whatsapp','instagram','messenger','livechat'].map(f => (
                <Button
                  key={f}
                  variant={chFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChFilter(f)}
                  className={cn(
                    "h-8 rounded-full text-[11px] font-medium transition-all",
                    chFilter === f ? "bg-primary shadow-sm" : "bg-background border-border"
                  )}
                >
                  {f === 'all' ? 'All Channels' : (
                    <span className="flex items-center gap-1.5 capitalize">
                      <ChannelIcon channel={f} className="h-3.5 w-3.5" /> {f}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/10">
                <TableHead className="w-[50px]">
                  <input 
                    type="checkbox" 
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    checked={selected.size === displayed.length && displayed.length > 0}
                    onChange={() => {
                      if (selected.size === displayed.length) setSelected(new Set());
                      else setSelected(new Set(displayed.map(c => c.id)));
                    }}
                  />
                </TableHead>
                <TableHead className="cursor-pointer group" onClick={() => setSort({ col:'name', dir: sort.dir === 'asc' ? 'desc' : 'asc' })}>
                  <div className="flex items-center gap-2">
                    Name
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-center">Channel</TableHead>
                <TableHead className="text-center cursor-pointer group" onClick={() => setSort({ col:'orders', dir: sort.dir === 'asc' ? 'desc' : 'asc' })}>
                  <div className="flex items-center justify-center gap-2">
                    Orders
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer group" onClick={() => setSort({ col:'revenue', dir: sort.dir === 'asc' ? 'desc' : 'asc' })}>
                  <div className="flex items-center justify-end gap-2">
                    Revenue
                    <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-16 opacity-70" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-3.5 w-32" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto rounded" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-3.5 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-3.5 w-16 ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic text-sm">
                    No contacts found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((c) => (
                  <TableRow 
                    key={c.id} 
                    className={cn(
                      "cursor-pointer transition-colors group",
                      selected.has(c.id) ? "bg-primary/5" : "hover:bg-muted/20"
                    )}
                    onClick={() => handleOpenView(c)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={selected.has(c.id)}
                        onChange={() => {
                          const n = new Set(selected);
                          if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
                          setSelected(n);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border">
                          <AvatarFallback className="bg-primary/5 text-primary text-[11px] font-semibold">
                            {c.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm truncate">{c.name}</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {c.country && <span className="font-medium">{c.country}</span>}
                            {c.lastSeenLabel}
                            {c.tags.includes('VIP') && <Badge className="h-3.5 px-1 text-[9px] bg-amber-500/10 text-amber-600 border-none font-medium">VIP</Badge>}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-[12px] max-w-[150px] truncate text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="text-center">
                      <span className="flex justify-center"><ChannelIcon channel={c.ch} className="h-4 w-4" /></span>
                    </TableCell>
                    <TableCell className="text-center font-medium text-sm">{c.orders}</TableCell>
                    <TableCell className="text-right font-semibold text-sm text-emerald-600">{fmtRevenue(c.revenue, currency)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenView(c)} className="gap-2 font-medium">
                            <ExternalLink className="h-3.5 w-3.5" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(c)} className="gap-2 font-medium">
                            <Edit2 className="h-3.5 w-3.5" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setActiveContact(c); setDelModal(true); }} className="gap-2 text-destructive font-medium">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t text-xs text-muted-foreground">
            <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, displayed.length)} of {displayed.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
              <span className="font-medium">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
      <Dialog open={addModal || editModal} onOpenChange={(o) => { if(!o) { setAddModal(false); setEditModal(false); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{addModal ? 'Add New Contact' : 'Edit Contact Profile'}</DialogTitle>
            <DialogDescription>
              {addModal 
                ? 'Register a new customer node in your workspace.' 
                : 'Modify identity and segmentation tags for this contact.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Ahmed Mohamed" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                className="h-10"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  placeholder="+20 100..." 
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="h-10 font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="name@company.com" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Primary Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
                  <SelectTrigger className="h-10 bg-background font-medium text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['whatsapp', 'instagram', 'messenger', 'livechat'].map((id) => (
                      <SelectItem key={id} value={id} className="capitalize">
                        <span className="flex items-center gap-2">
                          <ChannelIcon channel={id} className="h-3.5 w-3.5" />
                          {id}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Country/Region</Label>
                <Select value={form.country} onValueChange={v => setForm({...country, country: v})}>
                  <SelectTrigger className="h-10 bg-background font-medium text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EG">Egypt (EG)</SelectItem>
                    <SelectItem value="AE">UAE (AE)</SelectItem>
                    <SelectItem value="SA">Saudi Arabia (SA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">
                Tags <span className="font-normal italic opacity-50 ml-1">(comma separated)</span>
              </Label>
              <Input 
                id="tags" 
                placeholder="VIP, Loyal, Follow Up..." 
                value={form.tags} 
                onChange={e => setForm({...form, tags: e.target.value})}
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="bg-muted/10 p-6 -mx-6 -mb-6 mt-2 border-t">
            <Button variant="ghost" onClick={() => { setAddModal(false); setEditModal(false); }} className="font-medium">Cancel</Button>
            <Button 
              onClick={() => handleSaveContact(addModal)} 
              disabled={submitting} 
              className="bg-primary px-8 font-semibold"
            >
              {submitting ? 'Processing...' : (addModal ? 'Initialize Contact' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Modal ─────────────────────────────────────────────── */}
      <Dialog open={viewModal} onOpenChange={setViewModal}>
        <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
          {activeContact && (
            <div className="flex flex-col">
              <div className="p-8 bg-muted/5 border-b">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                    <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold uppercase">
                      {activeContact.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold truncate leading-tight">{activeContact.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-background text-[10px] font-medium py-0.5 px-2 flex items-center gap-1.5">
                        <ChannelIcon channel={activeContact.ch} className="h-3 w-3" />
                        {activeContact.ch}
                      </Badge>
                      {activeContact.country && (
                        <Badge variant="outline" className="bg-background text-[10px] font-medium py-0.5 px-2 flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          {activeContact.country}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {activeContact.tags.map(t => (
                        <Badge key={t} variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-medium py-0">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  {[
                    { label: 'Identity / Phone', value: activeContact.phone, icon: History },
                    { label: 'Contact / Email', value: activeContact.email || 'No email saved', icon: Search },
                    { label: 'System / Last Seen', value: activeContact.lastSeenLabel, icon: ChevronRight },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/30">
                      <span className="text-[11px] font-medium text-muted-foreground/60">{row.label}</span>
                      <span className="text-[13px] font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                    <p className="text-3xl font-bold text-indigo-600 tracking-tight">{activeContact.orders}</p>
                    <p className="text-[11px] font-medium text-indigo-500/60 mt-1 uppercase">Total Orders</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-2xl font-bold text-emerald-600 tracking-tight">{fmtRevenue(activeContact.revenue, currency)}</p>
                    <p className="text-[11px] font-medium text-emerald-500/60 mt-2 uppercase">Fiscal Lifetime</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/10 flex items-center gap-3 border-t">
                <Button variant="outline" className="flex-1 font-semibold h-11" onClick={() => setViewModal(false)}>Close</Button>
                <Button variant="outline" className="flex-1 font-semibold h-11 text-destructive hover:bg-destructive/5" onClick={() => setDelModal(true)}>Delete</Button>
                <Button className="flex-1 font-semibold h-11 bg-primary shadow-sm" onClick={() => handleOpenEdit(activeContact)}>Edit Profile</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      <Dialog open={deleteModal} onOpenChange={setDelModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Finalize Deletion?
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              This will permanently purge <strong className="text-foreground font-semibold">{activeContact?.name}</strong> from your production registry. This operation is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-muted/10 p-6 -mx-6 -mb-6 mt-4 border-t">
            <Button variant="ghost" onClick={() => setDelModal(false)} className="font-medium">Keep Contact</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className="font-semibold px-6">
              {submitting ? 'Purging...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
