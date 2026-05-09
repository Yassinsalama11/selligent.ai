'use client';

import * as React from 'react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  Ticket as TicketIcon, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Inbox,
  Filter,
  Users
} from 'lucide-react';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import { EmptyState, LoadingGrid, StatusBanner } from '@/components/dashboard/ResourceState';
import TicketDetailPanel from '@/components/tickets/TicketDetailPanel';
import TicketEditorModal from '@/components/tickets/TicketEditorModal';
import TicketList from '@/components/tickets/TicketList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'waiting', 'resolved', 'closed', 'escalated'];
const PRIORITY_FILTERS = ['all', 'low', 'medium', 'high', 'urgent'];
const CHANNEL_FILTERS = ['all', 'manual', 'whatsapp', 'instagram', 'messenger', 'livechat', 'email'];

export default function TicketsPage() {
  const { data, error, loading, reload, setData } = usePollingResource(async () => {
    const tickets = await api.get('/api/tickets');
    return Array.isArray(tickets) ? tickets : [];
  }, [], { initialData: [] });

  const [agents, setAgents] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editorTicket, setEditorTicket] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAgents() {
      setLoadingAgents(true);
      try {
        const team = await api.get('/api/auth/team');
        if (!active) return;
        setAgents(Array.isArray(team) ? team : []);
      } catch {
        if (!active) return;
        setAgents([]);
      } finally {
        if (active) setLoadingAgents(false);
      }
    }
    loadAgents();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedTicketId && data?.length) {
      setSelectedTicketId(data[0].id);
    }
  }, [data, selectedTicketId]);

  const tickets = Array.isArray(data) ? data : [];

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (query) {
        const haystack = [
          ticket.ticket_code,
          ticket.title,
          ticket.customer_name,
          ticket.description,
          ticket.assignee_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (channelFilter !== 'all' && ticket.channel !== channelFilter) return false;
      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter, channelFilter]);

  const selectedTicket = useMemo(() => (
    tickets.find((ticket) => ticket.id === selectedTicketId)
    || filteredTickets[0]
    || tickets[0]
    || null
  ), [tickets, filteredTickets, selectedTicketId]);

  const stats = useMemo(() => ({
    open: tickets.filter((t) => t.status === 'open').length,
    active: tickets.filter((t) => ['open', 'in_progress', 'waiting'].includes(t.status)).length,
    escalated: tickets.filter((t) => t.status === 'escalated').length,
    resolved: tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
    urgent: tickets.filter((t) => t.priority === 'urgent').length,
  }), [tickets]);

  async function submitTicket(form) {
    setSavingId(editorMode === 'edit' ? editorTicket?.id : 'new');
    try {
      let result;
      if (editorMode === 'edit' && editorTicket) {
        result = await api.patch(`/api/tickets/${editorTicket.id}`, form);
        const updated = result || { ...editorTicket, ...form };
        setData((current) => current.map((t) => (t.id === updated.id ? updated : t)));
        toast.success('Ticket updated');
        setSelectedTicketId(updated.id);
      } else {
        result = await api.post('/api/tickets', form);
        const created = result || {
          id: `demo-${Date.now()}`,
          ...form,
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setData((current) => [created, ...current]);
        toast.success('Ticket created');
        setSelectedTicketId(created.id);
      }
      setEditorOpen(false);
    } catch (err) {
      toast.error(err.message || 'Could not save ticket');
    } finally {
      setSavingId(null);
    }
  }

  const handleStatusChange = async (ticket, status) => {
    try {
      const result = await api.patch(`/api/tickets/${ticket.id}`, { status });
      const updated = result || { ...ticket, status };
      setData((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(`Marked ${status.replace(/_/g, ' ')}`);
    } catch (err) { toast.error(err.message || 'Update failed'); }
  };

  const handleAssign = async (ticket, assigneeId) => {
    try {
      const updated = await api.patch(`/api/tickets/${ticket.id}`, { assignee_id: assigneeId });
      setData((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(assigneeId ? 'Assigned' : 'Unassigned');
    } catch (err) { toast.error(err.message || 'Assignment failed'); }
  };

  const handleEscalate = async (ticket) => {
    try {
      const updated = await api.post(`/api/tickets/${ticket.id}/escalate`, {
        priority: ticket.priority,
        assignee_id: ticket.assignee_id,
        reason: ticket.title,
      });
      setData((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Escalated');
    } catch (err) { toast.error(err.message || 'Escalation failed'); }
  };

  const handleDelete = async (ticket) => {
    if (!window.confirm('Delete this ticket?')) return;
    try {
      await api.delete(`/api/tickets/${ticket.id}`);
      setData((current) => current.filter((t) => t.id !== ticket.id));
      if (selectedTicketId === ticket.id) setSelectedTicketId(null);
      toast.success('Deleted');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <header className="px-8 h-20 border-b flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Service Desk
            <Badge variant="secondary" className="text-xs font-bold tracking-wide bg-primary/10 text-primary border-none">
              OPS
            </Badge>
          </h1>
          <p className="text-[13px] text-muted-foreground font-medium mt-0.5">
            Manage high-priority support tickets and escalations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reload} className="h-9 gap-2">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Sync
          </Button>
          <Button size="sm" onClick={() => { setEditorMode('create'); setEditorTicket(null); setEditorOpen(true); }} className="h-9 gap-2 bg-primary">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left List Pane */}
        <div className="w-[440px] border-r bg-card flex flex-col shrink-0">
          <div className="p-4 space-y-4 border-b shrink-0">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search tickets..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/40" 
              />
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-xs font-semibold w-auto border-none bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map(f => <SelectItem key={f} value={f} className="text-xs">{f.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-7 text-xs font-semibold w-auto border-none bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_FILTERS.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse text-xs font-medium uppercase tracking-wide">
                  Loading tickets...
                </div>
              ) : filteredTickets.length === 0 ? (
                <EmptyState title="No tickets" description="Try adjusting filters." />
              ) : (
                <TicketList
                  tickets={filteredTickets}
                  selectedId={selectedTicket?.id}
                  onSelect={setSelectedTicketId}
                />
              )}
            </div>
          </ScrollArea>
          
          <footer className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs font-medium text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Inbox className="h-3.5 w-3.5" />
              {filteredTickets.length} Visible
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {agents.length} Agents
            </div>
          </footer>
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 bg-muted/10 p-6 overflow-hidden">
          <TicketDetailPanel
            ticket={selectedTicket}
            agents={agents}
            onEdit={(t) => { setEditorMode('edit'); setEditorTicket(t); setEditorOpen(true); }}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onEscalate={handleEscalate}
            onAssign={handleAssign}
          />
        </div>
      </div>

      <TicketEditorModal
        open={editorOpen}
        mode={editorMode}
        ticket={editorTicket}
        agents={agents}
        onClose={() => setEditorOpen(false)}
        onSubmit={submitTicket}
        saving={Boolean(savingId)}
      />
    </div>
  );
}
