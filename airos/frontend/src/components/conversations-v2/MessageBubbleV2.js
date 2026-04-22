'use client';

import { formatTime, initials } from './utils';

export default function MessageBubbleV2({
  message,
  contactName,
  grouped,
  showMeta,
  onRetry,
}) {
  const isSystem = message.sent_by === 'system';
  const isOut = message.direction === 'outbound';
  const isAi = message.sent_by === 'ai';
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-1 text-[12px] text-[var(--inbox-text-muted)]">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex w-full gap-3 ${isOut ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-4'}`}>
      {!isOut && !grouped && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[12px] font-bold text-[var(--inbox-text-secondary)]">
          {initials(contactName)}
        </div>
      )}
      {!isOut && grouped && <div className="w-8 shrink-0" />}

      <div className={`flex min-w-0 max-w-[65%] flex-col ${isOut ? 'items-end' : 'items-start'}`}>
        <div
          title={message.timestamp ? new Date(message.timestamp).toLocaleString() : undefined}
          className={[
            'min-w-0 rounded-[14px] border px-4 py-3 shadow-sm',
            isOut
              ? 'border-[#FF7A18]/25 bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] text-white shadow-[0_12px_32px_rgba(255,90,31,0.18)]'
              : 'border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[var(--inbox-text-primary)]',
            isFailed ? 'ring-1 ring-red-400/70' : '',
            isSending ? 'opacity-60' : '',
          ].join(' ')}
        >
          <span className="whitespace-pre-wrap break-words text-[14px] leading-6" dir="auto">
            {message.content}
          </span>
        </div>

        {showMeta && (
          <div className={`mt-2 flex items-center gap-2 text-[12px] text-[var(--inbox-text-muted)] ${isOut ? 'justify-end' : 'justify-start'}`}>
            {message.timestamp && <span>{formatTime(message.timestamp)}</span>}
            {isAi && <span className="text-[var(--inbox-ai)]">AI</span>}
            {!isAi && isOut && <span>Agent</span>}
            {isSending && <span>sending...</span>}
            {isFailed && (
              <button type="button" onClick={() => onRetry?.(message)} className="text-red-300 underline decoration-red-300/40">
                failed · retry
              </button>
            )}
          </div>
        )}
      </div>

      {isOut && !grouped && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[11px] font-bold text-[var(--inbox-text-primary)]">
          {isAi ? 'AI' : 'AG'}
        </div>
      )}
      {isOut && grouped && <div className="w-8 shrink-0" />}
    </div>
  );
}

