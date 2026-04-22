'use client';

import MessageBubbleV2 from './MessageBubbleV2';
import { formatDate, parseTs } from './utils';

function shouldSeparateDate(current, previous) {
  if (!previous) return true;
  const a = new Date(parseTs(current.timestamp));
  const b = new Date(parseTs(previous.timestamp));
  return a.toDateString() !== b.toDateString();
}

function isGrouped(current, previous) {
  if (!previous) return false;
  if (current.sent_by !== previous.sent_by || current.direction !== previous.direction) return false;
  const diff = Math.abs(parseTs(current.timestamp) - parseTs(previous.timestamp));
  return diff <= 2 * 60 * 1000;
}

export default function MessageListV2({
  messages,
  contactName,
  aiTyping,
  loading,
  messagesRef,
  bottomRef,
  showNewMessages,
  onJumpToBottom,
  onRetry,
}) {
  return (
    <div ref={messagesRef} className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--inbox-main)] px-5 py-6">
      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-14 animate-pulse rounded-[14px] bg-[var(--inbox-card)] ${i % 2 ? 'ml-auto w-[42%]' : 'w-[48%]'}`} />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex min-h-full items-center justify-center">
          <div className="max-w-[420px] rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-surface)] p-8 text-center">
            <p className="text-[16px] font-semibold text-[var(--inbox-text-primary)]">No messages yet</p>
            <p className="mt-2 text-[14px] leading-6 text-[var(--inbox-text-secondary)]">
              New messages for this conversation will appear here immediately.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const grouped = isGrouped(message, previous);
            const showMeta = !isGrouped(next || {}, message);
            return (
              <div key={message.id}>
                {shouldSeparateDate(message, previous) && (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-1 text-[12px] text-[var(--inbox-text-muted)]">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                )}
                <MessageBubbleV2
                  message={message}
                  contactName={contactName}
                  grouped={grouped}
                  showMeta={showMeta}
                  onRetry={onRetry}
                />
              </div>
            );
          })}

          {aiTyping && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[11px] font-bold text-[var(--inbox-ai)]">AI</div>
              <div className="rounded-[14px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3 text-[12px] font-semibold text-[var(--inbox-ai)]">
                AI is composing...
              </div>
            </div>
          )}
        </div>
      )}

      {showNewMessages && (
        <button
          type="button"
          onClick={onJumpToBottom}
          className="sticky bottom-4 left-1/2 z-10 mx-auto mt-4 block rounded-full bg-[var(--inbox-ai)] px-4 py-2 text-[12px] font-bold text-[#050816] shadow-[0_10px_24px_rgba(0,229,255,0.22)]"
        >
          New messages
        </button>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

