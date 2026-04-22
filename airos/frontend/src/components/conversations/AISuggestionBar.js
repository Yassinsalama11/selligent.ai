'use client';

import React from 'react';

export default function AISuggestionBar({
  suggestion,
  aiTyping,
  aiConfigured,
  activeConv,
  onUse,
  onSend,
  onDismiss,
  onTestAI
}) {
  if (!suggestion && !aiTyping && !aiConfigured) return null;

  const score = suggestion?.score || suggestion?.conf * 100 || 0;
  const scoreLabel = score > 0 ? `${Math.round(score)}% confident` : 'confidence pending';

  return (
    <div className={`mx-4 mb-2 rounded-xl border bg-[var(--inbox-card)] p-3 transition ${
      suggestion ? 'border-[#00E5FF]/30 shadow-[0_12px_32px_rgba(0,229,255,0.08)]' : 'border-[var(--inbox-border)]'
    }`}>
      <div className={`flex items-center justify-between gap-4 ${suggestion ? 'mb-3' : ''}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--inbox-ai)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--inbox-ai)] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--inbox-ai)]"></span>
            </span>
            AI Suggestion
          </span>
          {suggestion && (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--inbox-ai)]" />
                <span className="text-[11px] font-semibold text-[var(--inbox-text-secondary)]">{scoreLabel}</span>
              </div>
              <span className="truncate rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[11px] font-medium text-[var(--inbox-text-muted)]">
                {suggestion.intent?.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          {!suggestion && !aiTyping && aiConfigured && onTestAI && (
            <button
              onClick={onTestAI}
              className="cursor-pointer rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--inbox-ai)] transition hover:bg-[var(--inbox-elevated)]"
            >
              Test AI
            </button>
          )}
        </div>
        
        {suggestion && (
          <div className="flex shrink-0 gap-2">
            <button 
              onClick={() => onUse(suggestion.text)}
              className="cursor-pointer rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--inbox-ai)] transition hover:bg-[var(--inbox-elevated)]"
            >
              Use
            </button>
            <button 
              onClick={() => onSend(suggestion.text)}
              className="cursor-pointer rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-3 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(255,90,31,0.18)] transition"
            >
              Send now
            </button>
            <button 
              onClick={onDismiss}
              className="cursor-pointer rounded-[10px] border border-[var(--inbox-border)] bg-transparent px-2 py-1 text-[12px] text-[var(--inbox-text-muted)] transition hover:bg-[var(--inbox-surface)]"
            >
              x
            </button>
          </div>
        )}
      </div>

      {suggestion ? (
        <div className="relative">
          <div className="absolute bottom-0 left-0 top-0 w-0.5 rounded-full bg-[#00E5FF]/40" />
          <p className="pl-3 text-[13px] leading-6 text-[var(--inbox-text-primary)]" dir="auto">
            {suggestion.text}
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 pl-1 text-[12px] text-[var(--inbox-text-secondary)]">
          {aiTyping ? (
            <>
              <span className="flex items-center gap-1">
                AI is thinking
                <span className="animate-bounce delay-75">.</span>
                <span className="animate-bounce delay-150">.</span>
                <span className="animate-bounce delay-300">.</span>
              </span>
            </>
          ) : aiConfigured ? (
            'Waiting for customer message…'
          ) : (
            <span className="text-[var(--inbox-text-secondary)]">AI configuration is unavailable.</span>
          )}
        </p>
      )}
    </div>
  );
}
