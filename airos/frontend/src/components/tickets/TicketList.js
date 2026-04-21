'use client';

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

export default function TicketList({ tickets, selectedId, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tickets.map((ticket) => {
        const selected = ticket.id === selectedId;

        return (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onSelect(ticket.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              borderRadius: 16,
              border: selected ? '1px solid rgba(99,102,241,0.34)' : '1px solid var(--b1)',
              background: selected ? 'rgba(99,102,241,0.08)' : 'var(--bg3)',
              padding: '15px 16px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11.5,
                  fontFamily: 'monospace',
                  color: 'var(--t4)',
                  background: 'var(--s2)',
                  padding: '2px 7px',
                  borderRadius: 8,
                }}>
                  {ticket.ticket_code || `#${ticket.ticket_number}`}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: ticket.priority === 'urgent'
                    ? 'rgba(220,38,38,0.14)'
                    : ticket.priority === 'high'
                      ? 'rgba(239,68,68,0.1)'
                      : ticket.priority === 'medium'
                        ? 'rgba(245,158,11,0.12)'
                        : 'rgba(100,116,139,0.12)',
                  color: ticket.priority === 'urgent'
                    ? '#fecaca'
                    : ticket.priority === 'high'
                      ? '#fca5a5'
                      : ticket.priority === 'medium'
                        ? '#fcd34d'
                        : '#cbd5e1',
                }}>
                  {ticket.priority}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: ticket.status === 'escalated'
                    ? 'rgba(239,68,68,0.12)'
                    : ticket.status === 'resolved' || ticket.status === 'closed'
                      ? 'rgba(16,185,129,0.1)'
                      : ticket.status === 'waiting'
                        ? 'rgba(245,158,11,0.1)'
                        : 'rgba(99,102,241,0.1)',
                  color: ticket.status === 'escalated'
                    ? '#fca5a5'
                    : ticket.status === 'resolved' || ticket.status === 'closed'
                      ? '#86efac'
                      : ticket.status === 'waiting'
                        ? '#fcd34d'
                        : '#c7d2fe',
                }}>
                  {String(ticket.status || '').replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{
                fontSize: 14.5,
                fontWeight: 800,
                color: 'var(--t1)',
                marginBottom: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {ticket.title}
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 12.2,
                color: 'var(--t4)',
              }}>
                <span>{ticket.customer_name || 'Unknown customer'}</span>
                <span>•</span>
                <span>{ticket.channel || 'manual'}</span>
                <span>•</span>
                <span>{formatDate(ticket.created_at)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>
                {ticket.assignee_name || 'Unassigned'}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'rgba(99,102,241,0.12)',
                color: '#c7d2fe',
              }}>
                {Number(ticket.message_count || 0)} msg{Number(ticket.message_count || 0) === 1 ? '' : 's'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
