'use client';

import React from 'react';
import { IC_COLOR, CH_COLOR, CH_ICON } from './constants';

export default function CustomerProfilePanel({
  activeConv,
  isAutoOn,
  onToggleAuto,
  tags,
  currentAgent,
  onManageCanned,
  onAddTag,
  onViewHistory
}) {
  if (!activeConv) return null;

  const isLive = !!activeConv.customerName;
  const name = isLive ? activeConv.customerName : activeConv.name;
  const channel = isLive ? (activeConv.channel || 'whatsapp') : activeConv.ch;
  const score = activeConv.score || 0;
  const intent = activeConv.intent || 'inquiry';
  const autoOn = isAutoOn;
  const scoreColor = score > 70 ? '#34d399' : score > 40 ? '#fcd34d' : '#fca5a5';
  const safeName = name || 'Unknown customer';

  return (
    <div className="w-full flex-shrink-0 bg-[#0b1120] p-5 overflow-y-auto flex flex-col gap-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center shadow-xl">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center font-extrabold text-[22px] border ${
          isLive 
            ? 'bg-gradient-to-br from-[#25D366]/25 to-[#10B981]/20 border-[#25D366]/25' 
            : 'bg-gradient-to-br from-indigo-500/25 to-violet-500/20 border-indigo-500/20'
        }`}>
          {safeName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
        </div>
        <p className="font-bold text-[16px] text-slate-100 leading-tight">{safeName}</p>
        <div className="mt-3 flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{
              color: isLive ? '#25D366' : CH_COLOR[channel],
              borderColor: `${isLive ? '#25D366' : CH_COLOR[channel] || '#64748b'}33`,
              background: `${isLive ? '#25D366' : CH_COLOR[channel] || '#64748b'}14`,
            }}
          >
            {isLive ? '📱' : CH_ICON[channel]} {channel}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-slate-400">Lead score</span>
          <span className="text-[13px] font-extrabold" style={{ color: scoreColor }}>{score}/100</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreColor }} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 flex flex-col gap-3">
        {[
          { l: 'Intent', v: intent.replace(/_/g, ' '), c: IC_COLOR[intent] || 'var(--t1)' },
          { l: 'Assigned', v: currentAgent || 'Unassigned', c: 'var(--t1)' },
          { l: 'AI Mode', v: autoOn ? 'Auto reply' : 'Manual', c: autoOn ? '#67e8f9' : 'var(--t3)' },
        ].map(row => (
          <div key={row.l} className="flex justify-between items-center gap-4">
            <span className="text-[12px] text-slate-500">{row.l}</span>
            <span className="text-[12px] font-semibold text-right capitalize" style={{ color: row.c }}>{row.v}</span>
          </div>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/12 text-indigo-300 border border-indigo-500/20">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-3">
        <div className={`flex items-center justify-between p-2.5 px-3 rounded-[var(--r)] border transition-all ${
          autoOn ? 'bg-cyan-500/5 border-cyan-500/25' : 'bg-[var(--s1)] border-[var(--b1)]'
        }`}>
          <span className={`text-[12.5px] font-semibold ${autoOn ? 'text-cyan-300' : 'text-[var(--t3)]'}`}>AI Auto-Reply</span>
          <div 
            className={`toggle transition-transform scale-[0.75] ${autoOn ? 'on' : ''}`} 
            onClick={onToggleAuto} 
          />
        </div>
        <button className="btn btn-ghost btn-sm w-full justify-center" onClick={onManageCanned}>💬 Canned Replies</button>
        <button className="btn btn-ghost btn-sm w-full justify-center" onClick={onAddTag}>+ Add Tag</button>
        <button className="btn btn-ghost btn-sm w-full justify-center" onClick={onViewHistory}>View History</button>
      </div>
    </div>
  );
}
