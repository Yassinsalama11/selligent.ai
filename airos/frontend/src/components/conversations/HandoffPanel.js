'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

// Displayed inside the active conversation when a handoff is pending or to request one.
export default function HandoffPanel({ conversationId, handoff, agents, currentUser, onHandoffChange }) {
  const [reason, setReason] = useState('');
  const [requestedTo, setRequestedTo] = useState('');
  const [loading, setLoading] = useState(false);

  const isMine = handoff && String(handoff.requested_by) === String(currentUser?.id);
  const isTargeted = handoff?.requested_to && String(handoff.requested_to) !== String(currentUser?.id);
  const mayResolve = !isTargeted || ['owner', 'admin'].includes(currentUser?.role);

  async function requestHandoff() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const data = await api(`/api/conversations/${conversationId}/handoff`, {
        method: 'POST',
        body: JSON.stringify({ reason, requested_to: requestedTo || undefined }),
      });
      onHandoffChange(data.handoff);
      setReason('');
      setRequestedTo('');
    } catch (err) {
      console.error('Handoff request failed', err);
    } finally { setLoading(false); }
  }

  async function resolve(action) {
    setLoading(true);
    try {
      const data = await api(`/api/conversations/${conversationId}/handoff/${handoff.id}/${action}`, {
        method: 'POST',
      });
      onHandoffChange(data.handoff);
    } catch (err) {
      console.error(`Handoff ${action} failed`, err);
    } finally { setLoading(false); }
  }

  async function cancelHandoff() {
    setLoading(true);
    try {
      const data = await api(`/api/conversations/${conversationId}/handoff/${handoff.id}`, {
        method: 'DELETE',
      });
      onHandoffChange(data.handoff);
    } catch (err) {
      console.error('Handoff cancel failed', err);
    } finally { setLoading(false); }
  }

  // ── Pending handoff view ──────────────────────────────────────────────────
  if (handoff && handoff.status === 'pending') {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--inbox-ai)] shadow-[0_0_12px_rgba(0,229,255,0.6)]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-ai)]">Handoff pending</span>
          </div>
          {isMine && (
            <button
              onClick={cancelHandoff}
              disabled={loading}
              className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)]"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[12px] text-[var(--inbox-text-secondary)]">
            <span className="font-semibold text-[var(--inbox-text-primary)]">{handoff.requested_by_name || 'Agent'}</span>
            {' '}requested handoff
            {handoff.requested_to_name ? <> to <span className="font-semibold text-[var(--inbox-text-primary)]">{handoff.requested_to_name}</span></> : ' (open)'}
          </p>
          {handoff.reason && (
            <p className="text-[12px] italic text-[var(--inbox-text-secondary)]">"{handoff.reason}"</p>
          )}
          {handoff.ai_summary && (
            <div className="mt-2 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-surface)] p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-ai)]">AI summary</p>
              <p className="text-[12px] leading-5 text-[var(--inbox-text-secondary)]">{handoff.ai_summary}</p>
            </div>
          )}
        </div>

        {mayResolve && !isMine && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => resolve('accept')}
              disabled={loading}
              className="flex-1 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-primary)] transition hover:bg-[var(--inbox-surface)] disabled:opacity-40"
            >
              Accept
            </button>
            <button
              onClick={() => resolve('decline')}
              disabled={loading}
              className="flex-1 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)] disabled:opacity-40"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Request handoff form ──────────────────────────────────────────────────
  return (
    <div className="space-y-3 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-text-muted)]">Request handoff</p>
      <textarea
        className="h-16 w-full resize-none rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] text-[var(--inbox-text-primary)] outline-none placeholder:text-[var(--inbox-text-muted)] focus:border-[var(--inbox-border-strong)]"
        placeholder="Reason for handoff…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <select
        className="w-full rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] text-[var(--inbox-text-primary)] outline-none focus:border-[var(--inbox-border-strong)]"
        value={requestedTo}
        onChange={e => setRequestedTo(e.target.value)}
      >
        <option value="">Any available agent</option>
        {agents
          .filter(a => a.id !== currentUser?.id)
          .map(a => <option key={a.id} value={a.id}>{a.name || a.email}</option>)
        }
      </select>
      <button
        onClick={requestHandoff}
        disabled={loading || !reason.trim()}
        className="w-full rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(255,90,31,0.18)] transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Requesting…' : 'Request Handoff'}
      </button>
    </div>
  );
}
