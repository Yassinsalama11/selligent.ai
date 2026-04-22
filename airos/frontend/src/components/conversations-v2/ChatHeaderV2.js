'use client';

import { CHANNEL_LABEL, initials } from './utils';

export default function ChatHeaderV2({
  conversation,
  isAutoOn,
  aiTyping,
  aiConfigured,
  onBack,
  onAssign,
  onClose,
  onToggleContext,
  contextOpen,
}) {
  const name = conversation.customerName || 'Unknown customer';
  const channel = conversation.channel || 'livechat';
  const intent = (conversation.intent || 'inquiry').replace(/_/g, ' ');
  const stateLabel = !aiConfigured ? 'AI unavailable' : aiTyping ? 'AI composing' : isAutoOn ? 'AI handling' : 'Manual mode';

  return (
    <header className="grid min-h-[72px] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[14px] text-[var(--inbox-text-primary)] md:hidden"
          aria-label="Back to conversations"
        >
          ←
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[12px] font-bold text-[var(--inbox-text-primary)]">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-[var(--inbox-text-primary)]">{name}</p>
            <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-2 py-1 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
              {CHANNEL_LABEL[channel] || 'CH'}
            </span>
          </div>
          <p className="mt-1 truncate text-[12px] capitalize text-[var(--inbox-text-secondary)]">{intent}</p>
        </div>
      </div>

      <div className="col-span-2 flex min-w-0 shrink-0 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] xl:col-span-1">
        <span className={`mr-2 h-2 w-2 rounded-full ${isAutoOn ? 'bg-[var(--inbox-ai)] shadow-[0_0_12px_rgba(0,229,255,0.8)]' : 'bg-[var(--inbox-text-muted)]'}`} />
        {stateLabel}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button type="button" onClick={onAssign} className="hidden rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)] sm:inline-flex">
          Assign
        </button>
        <button type="button" onClick={onClose} className="hidden rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)] sm:inline-flex">
          Close
        </button>
        <button type="button" onClick={onToggleContext} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)]">
          {contextOpen ? 'Hide' : 'Context'}
        </button>
      </div>
    </header>
  );
}

