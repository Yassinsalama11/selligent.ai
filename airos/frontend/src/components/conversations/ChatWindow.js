'use client';

import React from 'react';
import { CH_ICON } from './constants';
import AISuggestionBar from './AISuggestionBar';
import InputArea from './InputArea';

function parseMessageTime(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && String(value).trim() !== '') {
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMessageTime(message = {}) {
  const raw = message.timestamp;
  const parsed = parseMessageTime(raw);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function normalizeText(message = {}) {
  return message.content ?? '';
}

function MsgContent({ message }) {
  if (message.type === 'image') {
    return (
      <div className="flex flex-col gap-2">
        <a href={message.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[14px] border border-[var(--inbox-border)]">
          <img src={message.url} alt={message.fileName || 'image'} className="block max-h-[220px] max-w-[260px] object-cover" />
        </a>
        {message.content && <p className="break-words text-[14px] leading-6" dir="auto">{message.content}</p>}
        {message.fileName && <p className="text-[12px] text-[var(--inbox-text-muted)]">{message.fileName}</p>}
      </div>
    );
  }

  if (message.type === 'file') {
    return (
      <a href={message.url} download={message.fileName} className="flex items-center gap-3 text-inherit">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-surface)] text-[12px] font-bold">
          FILE
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{message.fileName || 'Attachment'}</span>
          {message.fileSize && <span className="block text-[12px] text-[var(--inbox-text-muted)]">{message.fileSize}</span>}
        </span>
      </a>
    );
  }

  return <span className="whitespace-pre-wrap break-words text-[14px] leading-6" dir="auto">{normalizeText(message)}</span>;
}

function MessageBubble({ message, contactName }) {
  const sentBy = message.sent_by;
  const isAi = sentBy === 'ai';
  const isOut = message.direction === 'outbound';
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  const time = formatMessageTime(message);

  return (
    <div className={`flex w-full gap-3 ${isOut ? 'justify-end' : 'justify-start'}`}>
      {!isOut && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[12px] font-bold text-[var(--inbox-text-secondary)]">
          {initials(contactName)}
        </div>
      )}

      <div className={`flex min-w-0 max-w-[65%] flex-col ${isOut ? 'items-end' : 'items-start'}`}>
        <div
          className={[
            'min-w-0 rounded-[14px] border px-4 py-3 shadow-sm',
            isOut
              ? 'border-[#FF7A18]/25 bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] text-white shadow-[0_12px_32px_rgba(255,90,31,0.18)]'
              : 'border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[var(--inbox-text-primary)]',
            isSending ? 'opacity-60' : '',
            isFailed ? 'ring-1 ring-red-400/70' : '',
          ].join(' ')}
        >
          <MsgContent message={message} />
        </div>
        <div className={`mt-2 flex items-center gap-2 text-[12px] text-[var(--inbox-text-muted)] ${isOut ? 'justify-end' : 'justify-start'}`}>
          {time && <span>{time}</span>}
          {isAi && <span className="text-[#00E5FF]">AI</span>}
          {!isAi && isOut && <span>Agent</span>}
          {isSending && <span>sending...</span>}
          {isFailed && <span className="text-red-300">failed</span>}
        </div>
      </div>

      {isOut && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[11px] font-bold text-[var(--inbox-text-primary)]">
          {isAi ? 'AI' : 'AG'}
        </div>
      )}
    </div>
  );
}

function TopBar({
  activeConv,
  isAutoOn,
  aiTyping,
  aiConfigured,
  onAssign,
  onClose,
  onTakeOver,
  onTogglePanel,
  showPanel,
  onBackToList,
}) {
  const name = activeConv.customerName || activeConv.name || 'Unknown customer';
  const channel = activeConv.channel || activeConv.ch || 'livechat';
  const intent = (activeConv.intent || 'inquiry').replace(/_/g, ' ');
  const aiState = aiTyping ? 'AI composing' : isAutoOn ? 'AI handling' : 'Manual mode';

  return (
    <header className="grid min-h-[72px] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBackToList}
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
              {CH_ICON[channel] || 'CH'}
            </span>
          </div>
          <p className="mt-1 truncate text-[12px] capitalize text-[var(--inbox-text-secondary)]">{intent}</p>
        </div>
      </div>

      <div className="col-span-2 flex min-w-0 shrink-0 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] xl:col-span-1">
        <span className={`mr-2 h-2 w-2 rounded-full ${isAutoOn ? 'bg-[var(--inbox-ai)] shadow-[0_0_12px_rgba(0,229,255,0.8)]' : 'bg-[var(--inbox-text-muted)]'}`} />
        {aiConfigured ? aiState : 'AI unavailable'}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button type="button" onClick={onAssign} className="hidden rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)] sm:inline-flex">
          Assign
        </button>
        <button type="button" onClick={onClose} className="hidden rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)] sm:inline-flex">
          Close
        </button>
        {isAutoOn && (
          <button type="button" onClick={onTakeOver} className="rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(255,90,31,0.22)]">
            Take Over
          </button>
        )}
        <button type="button" onClick={onTogglePanel} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)]">
          {showPanel ? 'Hide' : 'Context'}
        </button>
      </div>
    </header>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-[var(--inbox-main)] px-8">
      <div className="max-w-[420px] rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-surface)] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[12px] font-bold text-[var(--inbox-text-secondary)]">
          IN
        </div>
        <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--inbox-text-primary)]">Select a conversation</h2>
        <p className="mt-3 text-[14px] leading-6 text-[var(--inbox-text-secondary)]">
          Choose a thread from the inbox to view messages, manage ownership, and reply from a single workspace.
        </p>
      </div>
    </div>
  );
}

export default function ChatWindow({
  activeConv,
  messages,
  reply,
  setReply,
  onSend,
  isAutoOn,
  onToggleAuto,
  aiTyping,
  aiConfigured,
  suggestion,
  onUseSuggestion,
  onSendSuggestion,
  onDismissSuggestion,
  onTestAI,
  onTakeOver,
  onAssign,
  onClose,
  onTogglePanel,
  showPanel,
  msgsContainerRef,
  bottomRef,
  showCannedPicker,
  setShowCannedPicker,
  cannedSearch,
  setCannedSearch,
  filteredCanned,
  onInsertCanned,
  onManageCanned,
  fileInputRef,
  imageInputRef,
  onFileSelect,
  onBackToList,
}) {
  if (!activeConv) return <EmptyChat />;

  const name = activeConv.customerName || activeConv.name || 'Unknown customer';

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--inbox-main)]">
      <TopBar
        activeConv={activeConv}
        isAutoOn={isAutoOn}
        aiTyping={aiTyping}
        aiConfigured={aiConfigured}
        onAssign={onAssign}
        onClose={onClose}
        onTakeOver={onTakeOver}
        onTogglePanel={onTogglePanel}
        showPanel={showPanel}
        onBackToList={onBackToList}
      />

      <div className="border-b border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-5 py-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[var(--inbox-text-primary)]">
              {isAutoOn ? 'AI is handling this conversation' : 'Manual response mode'}
            </p>
            <p className="mt-1 text-[12px] text-[var(--inbox-text-secondary)]">
              {isAutoOn ? 'Customer replies are eligible for automatic AI response. Use Take Over to write manually.' : 'Composer is active. AI suggestions remain available when configured.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAuto}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition ${isAutoOn ? 'border-[#00E5FF]/40 bg-[#00E5FF]/15' : 'border-[var(--inbox-border)] bg-[var(--inbox-elevated)]'}`}
            aria-label="Toggle AI mode"
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full transition ${isAutoOn ? 'left-7 bg-[var(--inbox-ai)]' : 'left-1 bg-[var(--inbox-text-secondary)]'}`} />
          </button>
        </div>
      </div>

      <div ref={msgsContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[var(--inbox-main)] px-5 py-6">
        {messages.length === 0 ? (
          <div className="flex min-h-full items-center justify-center">
            <div className="max-w-[420px] rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-surface)] p-8 text-center">
              <p className="text-[16px] font-semibold text-[var(--inbox-text-primary)]">No messages yet</p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--inbox-text-secondary)]">
                New messages for this conversation will appear here immediately.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} contactName={name} />
            ))}

            {aiTyping && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[11px] font-bold text-[var(--inbox-ai)]">AI</div>
                <div className="rounded-[14px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3 text-[12px] font-semibold text-[var(--inbox-ai)]">
                  AI is composing...
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!isAutoOn && (suggestion || aiTyping || aiConfigured) && (
        <AISuggestionBar
          suggestion={suggestion}
          aiTyping={aiTyping}
          aiConfigured={aiConfigured}
          activeConv={activeConv}
          onUse={onUseSuggestion}
          onSend={onSendSuggestion}
          onDismiss={onDismissSuggestion}
          onTestAI={onTestAI}
        />
      )}

      <InputArea
        reply={reply}
        setReply={setReply}
        onSend={onSend}
        isAutoOn={isAutoOn}
        onTakeOver={onTakeOver}
        showCannedPicker={showCannedPicker}
        setShowCannedPicker={setShowCannedPicker}
        cannedSearch={cannedSearch}
        setCannedSearch={setCannedSearch}
        filteredCanned={filteredCanned}
        onInsertCanned={onInsertCanned}
        onManageCanned={onManageCanned}
        fileInputRef={fileInputRef}
        imageInputRef={imageInputRef}
        onFileSelect={onFileSelect}
      />
    </main>
  );
}
