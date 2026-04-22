'use client';

import { CHANNEL_LABEL, INTENT_COLOR, formatAgo, initials } from './utils';

export default function ConversationItemV2({
  conversation,
  active,
  pendingHandoff,
  onSelect,
}) {
  const name = conversation.customerName || 'Unknown customer';
  const channel = conversation.channel || 'livechat';
  const intent = conversation.intent || 'inquiry';
  const unread = Number(conversation.unread || 0);
  const aiActive = conversation.ai_mode === 'auto';

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={[
        'group w-full border-b px-4 py-4 text-left transition',
        active
          ? 'border-[var(--inbox-border-strong)] bg-[var(--inbox-card)] shadow-[inset_3px_0_0_#00E5FF]'
          : 'border-[var(--inbox-border)] bg-transparent hover:bg-[var(--inbox-card)]',
      ].join(' ')}
    >
      <div className="flex gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[12px] font-bold text-[var(--inbox-text-primary)]">
          {initials(name)}
          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-1 text-[9px] font-bold text-[var(--inbox-text-primary)]">
            {CHANNEL_LABEL[channel] || 'CH'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[14px] font-semibold leading-5 text-[var(--inbox-text-primary)]">
              {name}
            </p>
            <span className="shrink-0 text-[12px] leading-5 text-[var(--inbox-text-muted)]">
              {formatAgo(conversation.updatedAt)}
            </span>
          </div>

          <p className="mt-1 truncate text-[12px] leading-5 text-[var(--inbox-text-secondary)]" dir="auto">
            {conversation.lastMessage || 'No messages yet'}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="max-w-[128px] truncate rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] font-medium capitalize"
                style={{ color: INTENT_COLOR[intent] || 'var(--inbox-text-secondary)' }}
              >
                {intent.replace(/_/g, ' ')}
              </span>
              {pendingHandoff?.status === 'pending' && (
                <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] text-[var(--inbox-text-secondary)]">
                  handoff
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {aiActive && (
                <span className="h-2 w-2 rounded-full bg-[var(--inbox-ai)] shadow-[0_0_12px_rgba(0,229,255,0.75)]" />
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

