'use client';

export default function AIStateBarV2({
  isAutoOn,
  aiTyping,
  aiConfigured,
  handoff,
  onToggleAuto,
}) {
  let title = 'Manual mode';
  let body = 'Composer is active. AI suggestions can appear when available.';

  if (!aiConfigured) {
    title = 'AI unavailable';
    body = 'AI is not configured for this workspace. Manual replies remain available.';
  } else if (handoff?.status === 'pending') {
    title = 'Handoff pending';
    body = 'A human handoff is in progress for this conversation.';
  } else if (aiTyping) {
    title = 'AI is composing';
    body = 'The assistant is preparing a response for the latest customer message.';
  } else if (isAutoOn) {
    title = 'AI is handling this conversation';
    body = 'Customer replies are eligible for automatic AI response. Take over to write manually.';
  }

  return (
    <div className="shrink-0 border-b border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-5 py-3">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--inbox-text-primary)]">{title}</p>
          <p className="mt-1 text-[12px] text-[var(--inbox-text-secondary)]">{body}</p>
        </div>
        <button
          type="button"
          onClick={onToggleAuto}
          disabled={!aiConfigured}
          className={`relative h-8 w-14 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${isAutoOn ? 'border-[#00E5FF]/40 bg-[#00E5FF]/15' : 'border-[var(--inbox-border)] bg-[var(--inbox-elevated)]'}`}
          aria-label="Toggle AI mode"
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full transition ${isAutoOn ? 'left-7 bg-[var(--inbox-ai)]' : 'left-1 bg-[var(--inbox-text-secondary)]'}`} />
        </button>
      </div>
    </div>
  );
}

