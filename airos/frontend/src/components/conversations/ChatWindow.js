'use client';

import React from 'react';
import { IC_COLOR, CH_COLOR, CH_ICON } from './constants';
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
  const raw = message.timestamp || message.created_at || message.createdAt || message.sent_at || message.updated_at || message.updatedAt;
  const parsed = parseMessageTime(raw);
  if (parsed) {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(parsed);
  }
  if (typeof message.at === 'string' && message.at.trim()) return message.at.trim();
  return '';
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function MsgContent({ m }) {
  if (m.type === 'image') {
    return (
      <div className="flex flex-col">
        <a href={m.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-white/10 transition-transform active:scale-95">
          <img src={m.url} alt={m.fileName || 'image'} className="max-w-[240px] max-h-[200px] object-cover block" />
        </a>
        {m.text && <p className="mt-1.5 text-[13px]" dir="auto">{m.text}</p>}
        <p className="text-[10px] text-[var(--t4)] mt-1">{m.fileName}</p>
      </div>
    );
  }
  if (m.type === 'file') {
    return (
      <a href={m.url} download={m.fileName} className="flex items-center gap-2.5 p-1 px-0.5 no-underline text-inherit group">
        <div className="w-9 h-9 rounded-[9px] bg-indigo-500/15 flex items-center justify-center flex-shrink-0 text-[18px] group-hover:bg-indigo-500/25 transition-colors">
          📄
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{m.fileName}</p>
          {m.fileSize && <p className="text-[11px] text-[var(--t4)] mt-0.5">{m.fileSize}</p>}
        </div>
        <span className="text-[16px] text-indigo-400 flex-shrink-0 transition-transform group-hover:translate-y-0.5">↓</span>
      </a>
    );
  }
  return <span dir="auto" className="whitespace-pre-wrap">{m.content || m.text}</span>;
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
  layoutPrefs,
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
  imageInputRef
}) {
  if (!activeConv) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,#38bdf8_0,transparent_32%),radial-gradient(circle_at_70%_75%,#818cf8_0,transparent_30%)]" />
        <div className="relative max-w-[360px] text-center px-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-2xl">
            💬
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-100">Select a conversation</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-slate-400">
            Choose a customer from the inbox to view messages, manage assignment, and respond from one workspace.
          </p>
        </div>
      </div>
    );
  }

  const isLive = !!activeConv.customerName;
  const name = isLive ? activeConv.customerName : activeConv.name;
  const channel = isLive ? (activeConv.channel || 'whatsapp') : activeConv.ch;
  const score = activeConv.score || 0;
  const intent = activeConv.intent || 'inquiry';
  const bubbleRadius = layoutPrefs.bubbleStyle === 'sharp' ? '10px' : layoutPrefs.bubbleStyle === 'pill' ? '24px' : '18px';
  const messageGap = layoutPrefs.density === 'compact' ? 'gap-3' : layoutPrefs.density === 'expanded' ? 'gap-6' : 'gap-4';
  const contactInitials = initials(name);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#0f172a] transition-colors duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-5 border-b border-white/10 flex-shrink-0 bg-[#111827]/95 min-h-[64px] gap-3 flex-wrap py-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] text-slate-100 border ${
            isLive ? 'bg-gradient-to-br from-[#25D366]/25 to-[#10B981]/20' : 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20'
          } border-white/10`}>
            {contactInitials}
          </div>
          <div>
            <p className="font-bold text-[14.5px] text-slate-100 leading-tight">{name}</p>
            <p className="text-[11.5px] mt-0.5 text-slate-400">
              <span style={{ color: isLive ? '#25D366' : CH_COLOR[channel] }}>{isLive ? '📱' : CH_ICON[channel]} {channel}</span>
              {activeConv.customerPhone && ` · ${activeConv.customerPhone}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          {isLive && (
            aiConfigured ? (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 cursor-default" title="AI configured — using your API key from Settings">
                ✓ AI Ready
              </span>
            ) : (
              <a href="/dashboard/settings#ai_config" className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/25 no-underline cursor-pointer" title="Click to configure AI in Settings">
                ⚠ AI not set up
              </a>
            )
          )}
          
          <div 
            onClick={onToggleAuto}
            className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer border transition-colors ${
              isAutoOn ? 'bg-cyan-500/10 border-cyan-500/35' : 'bg-[var(--s1)] border-[var(--b1)]'
            }`}
          >
            <span className={`text-[11.5px] font-semibold ${isAutoOn ? 'text-cyan-300' : 'text-[var(--t4)]'}`}>
              {isAutoOn ? '🤖 Bot Active' : '👤 Manual'}
            </span>
            <div className={`toggle transition-transform scale-[0.8] ${isAutoOn ? 'on' : ''}`} />
          </div>

          <span 
            className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: `${IC_COLOR[intent] || '#64748b'}12`,
              color: IC_COLOR[intent] || '#64748b',
              borderColor: `${IC_COLOR[intent] || '#64748b'}20`
            }}
          >
            {intent.replace(/_/g, ' ')}
          </span>

          <span className={`text-[11px] font-bold bg-[var(--s2)] border border-[var(--b1)] px-2 py-0.5 rounded-full ${
            score > 70 ? 'text-green-400' : score > 40 ? 'text-amber-300' : 'text-red-300'
          }`}>
            {score}
          </span>

          <button className="btn btn-ghost btn-xs" onClick={onAssign}>Assign</button>
          <button className="btn btn-primary btn-xs" onClick={onClose}>✓ Close</button>
          <button onClick={onTogglePanel} className="btn btn-ghost btn-xs">{showPanel ? '→' : '←'}</button>
        </div>
      </div>

      {/* Bot active banner */}
      {aiConfigured && isAutoOn && (
        <div className="bg-cyan-500/5 border-b border-cyan-500/15 px-5 py-1.5 flex items-center justify-between text-[12px] flex-shrink-0 animate-fade-in">
          <span className="text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 inline-block animate-pulse" />
            <strong>🤖 Bot is handling this conversation</strong> — replying automatically
          </span>
          <button 
            onClick={onTakeOver}
            className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md cursor-pointer font-semibold hover:bg-red-500/20 transition-colors"
          >
            ✋ Take Over
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={msgsContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto px-6 py-6 flex flex-col ${messageGap} bg-[linear-gradient(180deg,#0f172a_0%,#0b1120_100%)]`}
      >
        {messages.length === 0 ? (
          <div className="flex-1 min-h-[360px] flex items-center justify-center">
            <div className="max-w-[360px] rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-7 text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl">
                ✦
              </div>
              <h3 className="text-[17px] font-bold text-slate-100">No messages yet</h3>
              <p className="mt-2 text-[13px] leading-6 text-slate-400">
                New customer messages will appear here in real time once this conversation receives activity.
              </p>
            </div>
          </div>
        ) : messages.map((m) => {
          const isOut = m.direction === 'outbound' || (m.dir === 'out') || (m.sent_by === 'agent' || m.sent_by === 'ai');
          const isSending = m.status === 'sending';
          const isAI = m.sent_by === 'ai' || m.by === 'ai' || m.auto;
          const time = formatMessageTime(m);
          
          return (
            <div 
              key={m.id} 
              className={`flex items-end gap-3 ${isOut ? 'justify-end' : 'justify-start'}`}
            >
              {!isOut && (
                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-[11px] text-cyan-200 shadow-lg">
                  {contactInitials}
                </div>
              )}
              <div className={`max-w-[min(72%,680px)] flex flex-col ${isOut ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`${isOut ? 'bubble-out' : 'bubble-in'} shadow-lg transition-opacity duration-200 ${isSending ? 'opacity-60' : 'opacity-100'}`}
                  style={{ 
                    borderRadius: bubbleRadius,
                    ...(isAI && isOut ? { border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.1)' } : {})
                  }}
                >
                  <MsgContent m={m} />
                </div>
                {layoutPrefs.showTimestamp && (
                  <p className={`text-[10.5px] text-slate-500 mt-1.5 flex items-center gap-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
                    {time && <span>{time}</span>}
                    {isOut && isSending && <span className="text-slate-400">· sending…</span>}
                    {isOut && !isSending && (isAI ? <span className="text-cyan-400">· 🤖 AI ✓</span> : <span>· Agent ✓</span>)}
                  </p>
                )}
              </div>
              {isOut && (
                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-indigo-500/20 border border-indigo-300/20 flex items-center justify-center font-bold text-[11px] text-indigo-100 shadow-lg">
                  {isAI ? 'AI' : 'AG'}
                </div>
              )}
            </div>
          );
        })}

        {aiTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="w-[26px] h-[26px] rounded-full flex-shrink-0 bg-cyan-500/15 flex items-center justify-center text-[12px]">🤖</div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2">
              <span className="text-cyan-300 text-[12px] font-semibold">AI is thinking</span>
              <span className="text-cyan-300 text-[16px] animate-pulse tracking-widest">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* AI Suggestion Bar */}
      {!isAutoOn && (
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

      {/* Input Area */}
      <InputArea
        reply={reply}
        setReply={setReply}
        onSend={onSend}
        isAutoOn={isAutoOn}
        showCannedPicker={showCannedPicker}
        setShowCannedPicker={setShowCannedPicker}
        cannedSearch={cannedSearch}
        setCannedSearch={setCannedSearch}
        filteredCanned={filteredCanned}
        onInsertCanned={onInsertCanned}
        onManageCanned={onManageCanned}
        fileInputRef={fileInputRef}
        imageInputRef={imageInputRef}
      />
    </div>
  );
}
