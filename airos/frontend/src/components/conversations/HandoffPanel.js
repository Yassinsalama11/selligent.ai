'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

// Displayed inside the active conversation when a handoff is pending or to request one.
export default function HandoffPanel({ conversationId, handoff, agents, currentUser, onHandoffChange }) {
  const [reason, setReason] = useState('');
  const [requestedTo, setRequestedTo] = useState('');
  const [loading, setLoading] = useState(false);

  const isMine = handoff && String(handoff.requested_by) === String(currentUser?.id);
  const canResolve = handoff && !isMine || ['owner', 'admin'].includes(currentUser?.role);
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
      <div className="border border-amber-500/30 rounded-xl bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[12px] font-bold text-amber-300 uppercase tracking-widest">Handoff Pending</span>
          </div>
          {isMine && (
            <button
              onClick={cancelHandoff}
              disabled={loading}
              className="text-[11px] text-[var(--t4)] hover:text-red-400 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[12px] text-[var(--t3)]">
            <span className="text-[var(--t1)] font-medium">{handoff.requested_by_name || 'Agent'}</span>
            {' '}requested handoff
            {handoff.requested_to_name ? <> to <span className="text-[var(--t1)] font-medium">{handoff.requested_to_name}</span></> : ' (open)'}
          </p>
          {handoff.reason && (
            <p className="text-[12px] text-[var(--t3)] italic">"{handoff.reason}"</p>
          )}
          {handoff.ai_summary && (
            <div className="mt-2 p-2.5 rounded-lg bg-[var(--s2)] border border-[var(--b1)]">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">AI Summary</p>
              <p className="text-[12px] text-[var(--t2)] leading-relaxed">{handoff.ai_summary}</p>
            </div>
          )}
        </div>

        {mayResolve && !isMine && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => resolve('accept')}
              disabled={loading}
              className="flex-1 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[12px] font-semibold hover:bg-indigo-500/30 transition-colors border border-indigo-500/30"
            >
              Accept
            </button>
            <button
              onClick={() => resolve('decline')}
              disabled={loading}
              className="flex-1 py-1.5 rounded-lg bg-[var(--s2)] text-[var(--t3)] text-[12px] font-semibold hover:bg-[var(--s3)] transition-colors border border-[var(--b1)]"
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
    <div className="border border-[var(--b1)] rounded-xl bg-[var(--bg3)] p-4 space-y-3">
      <p className="text-[11px] font-bold text-[var(--t4)] uppercase tracking-widest">Request Handoff</p>
      <textarea
        className="input text-[12px] w-full resize-none h-16"
        placeholder="Reason for handoff…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <select
        className="input text-[12px] w-full"
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
        className="w-full py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[12px] font-semibold hover:bg-indigo-500/30 transition-colors border border-indigo-500/30 disabled:opacity-40"
      >
        {loading ? 'Requesting…' : 'Request Handoff'}
      </button>
    </div>
  );
}
