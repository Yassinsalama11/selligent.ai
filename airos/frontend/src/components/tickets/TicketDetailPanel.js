'use client';

function formatDateTime(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function Badge({ children, tone = 'neutral' }) {
  const styles = {
    neutral: { background: 'rgba(99,102,241,0.1)', color: '#c7d2fe' },
    warm: { background: 'rgba(245,158,11,0.12)', color: '#fcd34d' },
    hot: { background: 'rgba(239,68,68,0.12)', color: '#fca5a5' },
    good: { background: 'rgba(16,185,129,0.1)', color: '#86efac' },
  }[tone];

  return (
    <span style={{
      ...styles,
      fontSize: 11,
      fontWeight: 700,
      padding: '4px 8px',
      borderRadius: 999,
    }}>
      {children}
    </span>
  );
}

export default function TicketDetailPanel({
  ticket,
  agents = [],
  onEdit,
  onDelete,
  onStatusChange,
  onEscalate,
  onAssign,
}) {
  if (!ticket) {
    return (
      <div style={{
        borderRadius: 18,
        border: '1px dashed var(--b2)',
        padding: 24,
        minHeight: 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--t4)',
        textAlign: 'center',
      }}>
        Select a ticket to inspect details and actions.
      </div>
    );
  }

  const openStatuses = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

  return (
    <div style={{
      borderRadius: 18,
      border: '1px solid var(--b1)',
      background: 'linear-gradient(180deg, rgba(17,24,39,0.96), rgba(9,12,22,0.96))',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <Badge tone={ticket.status === 'escalated' ? 'hot' : ticket.status === 'resolved' || ticket.status === 'closed' ? 'good' : 'neutral'}>
              {String(ticket.status || '').replace(/_/g, ' ')}
            </Badge>
            <Badge tone={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'hot' : ticket.priority === 'medium' ? 'warm' : 'neutral'}>
              {ticket.priority}
            </Badge>
            <Badge tone="neutral">{ticket.channel || 'manual'}</Badge>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)', marginBottom: 8, lineHeight: 1.2 }}>
            {ticket.title}
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--t3)', lineHeight: 1.6 }}>
            {ticket.description || 'No description provided yet.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(ticket)}>
            Edit
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(ticket)}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 5 }}>Customer</div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--t1)' }}>
            {ticket.customer_name || 'Unknown customer'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 4 }}>
            {ticket.customer_channel || 'manual'}
          </div>
        </div>
        <div className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 5 }}>Assignee</div>
          <select
            className="input"
            value={ticket.assignee_id || ''}
            onChange={(event) => onAssign(ticket, event.target.value || null)}
            style={{ width: '100%' }}
          >
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name || agent.email}
              </option>
            ))}
          </select>
        </div>
        <div className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 5 }}>Created</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>
            {formatDateTime(ticket.created_at)}
          </div>
        </div>
        <div className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 5 }}>Updated</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>
            {formatDateTime(ticket.updated_at)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 5 }}>Conversation</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>
            {ticket.conversation_id || 'No linked conversation'}
          </div>
        </div>
        <div className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 5 }}>Escalation reason</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>
            {ticket.escalation_reason || 'Not escalated yet'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {openStatuses.map((status) => (
          <button
            key={status}
            className={ticket.status === status ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => onStatusChange(ticket, status)}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onEscalate(ticket)}
          disabled={ticket.status === 'closed'}
        >
          Escalate
        </button>
      </div>
    </div>
  );
}
