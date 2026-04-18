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
  const scoreColor = score > 80 ? 'text-green-400' : score > 60 ? 'text-cyan-400' : 'text-amber-400';
  const scoreBg = score > 80 ? 'bg-green-500/20' : score > 60 ? 'bg-cyan-500/20' : 'bg-amber-500/20';

  return (
    <div className={`mx-4 mb-2 bg-cyan-500/5 border rounded-[10px] p-2.5 transition-all duration-300 ${
      suggestion ? 'border-cyan-500/30 shadow-lg shadow-cyan-500/5' : 'border-cyan-500/12'
    }`}>
      <div className={`flex items-center justify-between ${suggestion ? 'mb-2.5' : ''}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-bold text-[#67e8f9] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            AI Suggestion
          </span>
          {suggestion && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${scoreBg} border border-white/5`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current" style={{ color: score > 80 ? '#4ade80' : score > 60 ? '#22d3ee' : '#fbbf24' }} />
                <span className={`text-[10px] font-bold ${scoreColor}`}>{Math.round(score)}% confident</span>
              </div>
              <span className="text-[11px] text-[var(--t4)] font-medium bg-white/5 px-2 py-0.5 rounded-full">
                {suggestion.intent?.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          {!suggestion && !aiTyping && aiConfigured && onTestAI && (
            <button
              onClick={onTestAI}
              className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-md cursor-pointer bg-cyan-500/12 text-[#67e8f9] border border-cyan-500/25 hover:bg-cyan-500/20 transition-all active:scale-95"
            >
              ⚡ Test AI
            </button>
          )}
        </div>
        
        {suggestion && (
          <div className="flex gap-1.5">
            <button 
              onClick={() => onUse(suggestion.text)}
              className="text-[11px] font-semibold px-3 py-1 rounded-md cursor-pointer bg-cyan-500/15 text-[#67e8f9] border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors active:scale-95"
            >
              Use ↑
            </button>
            <button 
              onClick={() => onSend(suggestion.text)}
              className="text-[11px] px-3 py-1 rounded-md cursor-pointer bg-indigo-500 text-white border-none font-bold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              Send Now ↑
            </button>
            <button 
              onClick={onDismiss}
              className="text-[12px] px-2 py-1 rounded-md cursor-pointer bg-transparent text-[var(--t4)] border border-[var(--b1)] hover:bg-[var(--s1)] transition-colors active:scale-95"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {suggestion ? (
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500/30 rounded-full" />
          <p className="text-[13px] text-[var(--t1)] leading-relaxed pl-3" dir="auto">
            {suggestion.text}
          </p>
        </div>
      ) : (
        <p className="text-[12px] text-[var(--t4)] italic pl-1 flex items-center gap-2">
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
            <span className="text-amber-400/80">⚠ No AI key configured — go to Settings → AI Configuration</span>
          )}
        </p>
      )}
    </div>
  );
}
