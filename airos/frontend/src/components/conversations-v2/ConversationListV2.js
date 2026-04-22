'use client';

import { forwardRef } from 'react';
import ConversationItemV2 from './ConversationItemV2';
import { CHANNEL_LABEL } from './utils';

const ConversationListV2 = forwardRef(function ConversationListV2({
  search,
  setSearch,
  filters,
  setFilters,
  agents,
  conversations,
  activeId,
  onSelect,
  pendingHandoffs = {},
}, ref) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-[var(--inbox-border)] bg-[var(--inbox-surface)] md:w-[320px]">
      <div className="shrink-0 border-b border-[var(--inbox-border)] px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-text-muted)]">Inbox</p>
            <p className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[var(--inbox-text-primary)]">Conversations</p>
          </div>
          <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-1 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
            {conversations.length}
          </span>
        </div>

        <input
          ref={ref}
          className="h-10 w-full rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-3 text-[14px] text-[var(--inbox-text-primary)] outline-none transition placeholder:text-[var(--inbox-text-muted)] focus:border-[var(--inbox-border-strong)]"
          placeholder="Search conversations... (Ctrl+K)"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {['all', 'whatsapp', 'instagram', 'messenger', 'livechat'].map(channel => (
            <button
              type="button"
              key={channel}
              onClick={() => setFilters(current => ({ ...current, channel }))}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                filters.channel === channel
                  ? 'border-[var(--inbox-border-strong)] bg-[var(--inbox-elevated)] text-[var(--inbox-text-primary)]'
                  : 'border-[var(--inbox-border)] bg-transparent text-[var(--inbox-text-secondary)] hover:bg-[var(--inbox-card)]'
              }`}
            >
              {channel === 'all' ? 'All' : CHANNEL_LABEL[channel]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-2 text-[12px] text-[var(--inbox-text-secondary)] outline-none"
            value={filters.status}
            onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}
          >
            {['all', 'open', 'pending', 'closed'].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            className="h-9 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-2 text-[12px] text-[var(--inbox-text-secondary)] outline-none"
            value={filters.assigned_to}
            onChange={event => setFilters(current => ({ ...current, assigned_to: event.target.value }))}
          >
            <option value="all">all agents</option>
            <option value="unassigned">unassigned</option>
            {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>)}
          </select>
          <select
            className="col-span-2 h-9 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-main)] px-2 text-[12px] text-[var(--inbox-text-secondary)] outline-none"
            value={filters.priority}
            onChange={event => setFilters(current => ({ ...current, priority: event.target.value }))}
          >
            {['all', 'low', 'medium', 'high', 'urgent'].map(value => <option key={value} value={value}>{value} priority</option>)}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[14px] font-bold text-[var(--inbox-text-secondary)]">
              IN
            </div>
            <p className="mt-4 text-[14px] font-semibold text-[var(--inbox-text-primary)]">No conversations</p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--inbox-text-secondary)]">Adjust filters or wait for incoming messages.</p>
          </div>
        ) : conversations.map(conversation => (
          <ConversationItemV2
            key={conversation.id}
            conversation={conversation}
            active={activeId === conversation.id}
            pendingHandoff={pendingHandoffs[conversation.id]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
});

export default ConversationListV2;

