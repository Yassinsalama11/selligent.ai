'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import { EmptyState, LoadingGrid, StatusBanner } from '@/components/dashboard/ResourceState';
import TicketDetailPanel from '@/components/tickets/TicketDetailPanel';
import TicketEditorModal from '@/components/tickets/TicketEditorModal';
import TicketList from '@/components/tickets/TicketList';

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'waiting', 'resolved', 'closed', 'escalated'];
const PRIORITY_FILTERS = ['all', 'low', 'medium', 'high', 'urgent'];
const CHANNEL_FILTERS = ['all', 'manual', 'whatsapp', 'instagram', 'messenger', 'livechat', 'email'];

function metricColor(label) {
  if (label === 'urgent' || label === 'escalated') return '#ef4444';
  if (label === 'resolved') return '#10b981';
  if (label === 'open' || label === 'in_progress') return '#6366f1';
  return '#f59e0b';
}

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
    return () => {
      active = false;
    };
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
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

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

  useEffect(() => {
    if (!selectedTicket && tickets.length) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [selectedTicket, tickets]);

  const stats = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    active: tickets.filter((ticket) => ['open', 'in_progress', 'waiting'].includes(ticket.status)).length,
    escalated: tickets.filter((ticket) => ticket.status === 'escalated').length,
    resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    urgent: tickets.filter((ticket) => ticket.priority === 'urgent').length,
  }), [tickets]);

  function openCreateModal() {
    setEditorMode('create');
    setEditorTicket(null);
    setEditorOpen(true);
  }

  function openEditModal(ticket) {
    setEditorMode('edit');
    setEditorTicket(ticket);
    setEditorOpen(true);
  }

  function syncTicket(updatedTicket) {
    startTransition(() => {
      setData((current) => current.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket)));
    });
  }

  async function submitTicket(form) {
    setSavingId(editorMode === 'edit' ? editorTicket?.id : 'new');
    const payload = {
      title: form.title,
      customer_name: form.customer_name,
      description: form.description,
      category: form.category,
      channel: form.channel,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id,
      conversation_id: form.conversation_id,
    };

    try {
      if (editorMode === 'edit' && editorTicket) {
        const updated = await api.patch(`/api/tickets/${editorTicket.id}`, payload);
        startTransition(() => {
          setData((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
        });
        setSelectedTicketId(updated.id);
        toast.success('Ticket updated');
      } else {
        const created = await api.post('/api/tickets', payload);
        startTransition(() => {
          setData((current) => [created, ...current]);
        });
        setSelectedTicketId(created.id);
        toast.success('Ticket created');
      }
      setEditorOpen(false);
    } catch (err) {
      toast.error(err.message || 'Could not save ticket');
    } finally {
      setSavingId(null);
    }
  }

  async function handleStatusChange(ticket, status) {
    const previous = tickets;
    const optimistic = tickets.map((entry) => (
      entry.id === ticket.id ? { ...entry, status } : entry
    ));

    startTransition(() => setData(optimistic));

    try {
      const updated = await api.patch(`/api/tickets/${ticket.id}`, { status });
      syncTicket(updated);
      toast.success(`Marked ${status.replace(/_/g, ' ')}`);
    } catch (err) {
      startTransition(() => setData(previous));
      toast.error(err.message || 'Could not update ticket');
    }
  }

  async function handleAssign(ticket, assigneeId) {
    const previous = tickets;
    const optimistic = tickets.map((entry) => (
      entry.id === ticket.id ? { ...entry, assignee_id: assigneeId, assignee_name: assigneeId ? (agents.find((agent) => agent.id === assigneeId)?.name || agents.find((agent) => agent.id === assigneeId)?.email || 'Assigned') : null } : entry
    ));

    startTransition(() => setData(optimistic));

    try {
      const updated = await api.patch(`/api/tickets/${ticket.id}`, { assignee_id: assigneeId });
      syncTicket(updated);
      toast.success(assigneeId ? 'Ticket assigned' : 'Assignment cleared');
    } catch (err) {
      startTransition(() => setData(previous));
      toast.error(err.message || 'Could not update assignee');
    }
  }

  async function handleEscalate(ticket) {
    const previous = tickets;
    const optimistic = tickets.map((entry) => (
      entry.id === ticket.id
        ? { ...entry, status: 'escalated', escalation_reason: ticket.title, escalated_at: new Date().toISOString() }
        : entry
    ));

    startTransition(() => setData(optimistic));

    try {
      const updated = await api.post(`/api/tickets/${ticket.id}/escalate`, {
        priority: ticket.priority,
        assignee_id: ticket.assignee_id,
        reason: ticket.title,
      });
      syncTicket(updated);
      toast.success('Ticket escalated');
    } catch (err) {
      startTransition(() => setData(previous));
      toast.error(err.message || 'Could not escalate ticket');
    }
  }

  async function handleDelete(ticket) {
    if (!window.confirm(`Delete ticket ${ticket.ticket_code || ticket.id}?`)) return;
    const previous = tickets;

    startTransition(() => {
      setData((current) => current.filter((entry) => entry.id !== ticket.id));
    });

    try {
      await api.delete(`/api/tickets/${ticket.id}`);
      if (selectedTicketId === ticket.id) {
        const remaining = previous.filter((entry) => entry.id !== ticket.id);
        setSelectedTicketId(remaining[0]?.id || null);
      }
      toast.success('Ticket deleted');
    } catch (err) {
      startTransition(() => setData(previous));
      toast.error(err.message || 'Could not delete ticket');
    }
  }

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{
        borderRadius: 24,
        border: '1px solid rgba(99,102,241,0.16)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(17,24,39,0.92))',
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#818cf8', marginBottom: 10 }}>
            Support Operations
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, lineHeight: 1.1 }}>
            Tickets
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--t3)', lineHeight: 1.6 }}>
            Real backend tickets with create, assign, update, escalate, and delete flows. Escalated conversations create ticket records automatically.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          + New Ticket
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Open', value: stats.open },
          { label: 'Active', value: stats.active },
          { label: 'Escalated', value: stats.escalated },
          { label: 'Resolved', value: stats.resolved },
          { label: 'Urgent', value: stats.urgent },
        ].map((metric) => (
          <div key={metric.label} className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 6 }}>{metric.label}</div>
              <div style={{ fontSize: 23, fontWeight: 900, color: metricColor(metric.label.toLowerCase()) }}>
                {metric.value}
              </div>
            </div>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: metricColor(metric.label.toLowerCase()),
              boxShadow: `0 0 0 6px ${metricColor(metric.label.toLowerCase())}15`,
            }} />
          </div>
        ))}
      </div>

      {error && (
        <StatusBanner
          tone="error"
          title="Tickets could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input"
          placeholder="Search tickets by title, customer, assignee, or code"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
              onClick={() => setStatusFilter(status)}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRIORITY_FILTERS.map((priority) => (
            <button
              key={priority}
              type="button"
              className={priorityFilter === priority ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
              onClick={() => setPriorityFilter(priority)}
            >
              {priority}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CHANNEL_FILTERS.map((channel) => (
            <button
              key={channel}
              type="button"
              className={channelFilter === channel ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
              onClick={() => setChannelFilter(channel)}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingGrid cards={4} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="Create the first ticket manually, or let ticket.escalate create one from a conversation."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span>{filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'}</span>
              <span>{loadingAgents ? 'Loading team...' : `${agents.length} team member${agents.length === 1 ? '' : 's'}`}</span>
            </div>
            {filteredTickets.length === 0 ? (
              <EmptyState
                title="No matching tickets"
                description="Adjust the search or filters to find tickets."
              />
            ) : (
              <TicketList
                tickets={filteredTickets}
                selectedId={selectedTicket?.id}
                onSelect={setSelectedTicketId}
              />
            )}
          </div>

          <TicketDetailPanel
            ticket={selectedTicket}
            agents={agents}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onEscalate={handleEscalate}
            onAssign={handleAssign}
          />
        </div>
      )}

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
