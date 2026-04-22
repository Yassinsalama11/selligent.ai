'use client';

import React, { forwardRef } from 'react';
import { CH_ICON, IC_COLOR } from './constants';

function formatAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - Number(ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(Number(ts)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function ConversationItem({
  conversation,
  active,
  layoutPrefs,
  aiAutoReply,
  pendingHandoff,
  onSelect,
}) {
  const displayName = conversation.customerName || conversation.name || 'Unknown customer';
  const displayChannel = conversation.channel || conversation.ch || 'livechat';
  const displayLast = conversation.lastMessage || conversation.last || '';
  const displayIntent = conversation.intent || 'inquiry';
  const displayScore = Number(conversation.score || 0);
  const displayStatus = conversation.status || 'open';
  const unread = Number(conversation.unread || 0);
  const activeAi = conversation.ai_mode === 'auto' || aiAutoReply[conversation.id];

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={[
        'w-full text-left border-b transition-colors',
        'px-4 py-4',
        active
          ? 'border-[var(--inbox-border-strong)] bg-[var(--inbox-card)] shadow-[inset_3px_0_0_var(--inbox-ai)]'
          : 'border-[var(--inbox-border)] bg-transparent hover:bg-[var(--inbox-card)]',
      ].join(' ')}
    >
      <div className="flex gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[12px] font-bold text-[var(--inbox-text-primary)]">
          {initials(displayName)}
          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-1 text-[9px] font-bold text-[var(--inbox-text-primary)]">
            {CH_ICON[displayChannel] || 'CH'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[14px] font-semibold leading-5 text-[var(--inbox-text-primary)]">
              {displayName}
            </p>
            <span className="shrink-0 text-[12px] leading-5 text-[var(--inbox-text-muted)]">
              {formatAgo(conversation.updatedAt)}
            </span>
          </div>

          <p className="mt-1 truncate text-[12px] leading-5 text-[var(--inbox-text-secondary)]" dir="auto">
            {displayLast || 'No messages yet'}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="max-w-[128px] truncate rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] font-medium capitalize"
                style={{ color: IC_COLOR[displayIntent] || 'var(--inbox-text-secondary)' }}
              >
                {displayIntent.replace(/_/g, ' ')}
              </span>
              <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] font-medium capitalize text-[var(--inbox-text-muted)]">
                {displayStatus}
              </span>
              {activeAi && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--inbox-ai)] shadow-[0_0_12px_rgba(0,229,255,0.7)]" />
              )}
              {pendingHandoff?.status === 'pending' && (
                <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] text-[var(--inbox-text-secondary)]">
                  handoff
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {layoutPrefs.showScore && (
                <span className="text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
                  {displayScore}
                </span>
              )}
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--inbox-ai)] px-1.5 text-[12px] font-bold text-[#050816]">
                  {unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

const ConversationList = forwardRef(({
  search,
  setSearch,
  filters,
  setFilters,
  agents,
  liveConvs,
  filtered,
  activeId,
  activeLiveId,
  openLiveConv,
  selectConv,
  layoutPrefs,
  aiAutoReply,
  pendingHandoffs = {},
}, ref) => {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-[var(--inbox-border)] bg-[var(--inbox-surface)] md:w-[320px]">
      <div className="border-b border-[var(--inbox-border)] px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-text-muted)]">Inbox</p>
            <p className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[var(--inbox-text-primary)]">Conversations</p>
          </div>
          <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-1 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
            {filtered.length}
          </span>
        </div>

        <input
          ref={ref}
          className="h-10 w-full rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-3 text-[14px] text-[var(--inbox-text-primary)] outline-none transition placeholder:text-[var(--inbox-text-muted)] focus:border-[var(--inbox-border-strong)]"
          placeholder="Search conversations… (Ctrl+K)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {['all','whatsapp','instagram','messenger','livechat'].map(f => (
            <button 
              type="button"
              key={f} 
              onClick={() => setFilters(current => ({ ...current, channel: f }))}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                filters.channel === f
                  ? 'border-[var(--inbox-border-strong)] bg-[var(--inbox-elevated)] text-[var(--inbox-text-primary)]'
                  : 'border-[var(--inbox-border)] bg-transparent text-[var(--inbox-text-secondary)] hover:bg-[var(--inbox-card)]'
              }`}
            >
              {f === 'all' ? 'All' : CH_ICON[f]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-2 text-[12px] text-[var(--inbox-text-secondary)] outline-none"
            value={filters.status}
            onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}
          >
            {['all', 'open', 'pending', 'closed'].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            className="h-9 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-2 text-[12px] text-[var(--inbox-text-secondary)] outline-none"
            value={filters.assigned_to}
            onChange={e => setFilters(current => ({ ...current, assigned_to: e.target.value }))}
          >
            <option value="all">all agents</option>
            <option value="unassigned">unassigned</option>
            {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>)}
          </select>
          <select
            className="col-span-2 h-9 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-2 text-[12px] text-[var(--inbox-text-secondary)] outline-none"
            value={filters.priority}
            onChange={e => setFilters(current => ({ ...current, priority: e.target.value }))}
          >
            {['all', 'low', 'medium', 'high', 'urgent'].map(value => <option key={value} value={value}>{value} priority</option>)}
          </select>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[14px] font-bold text-[var(--inbox-text-secondary)]">
              IN
            </div>
            <p className="mt-4 text-[14px] font-semibold text-[var(--inbox-text-primary)]">No conversations</p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--inbox-text-secondary)]">Adjust filters or wait for incoming messages.</p>
          </div>
        )}
        {filtered.map(c => (
          <ConversationItem
            key={c.id}
            conversation={c}
            active={activeId === c.id || activeLiveId === c.id}
            layoutPrefs={layoutPrefs}
            aiAutoReply={aiAutoReply}
            pendingHandoff={pendingHandoffs[c.id]}
            onSelect={selectConv || openLiveConv}
          />
        ))}
      </div>
    </aside>
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList;
