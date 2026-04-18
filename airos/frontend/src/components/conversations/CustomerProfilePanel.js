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

  return (
    <div className="w-[230px] flex-shrink-0 border-l border-[var(--b1)] bg-[var(--bg2)] p-5 px-4 overflow-y-auto flex flex-col gap-[18px] hide-sm">
      <div className="text-center">
        <div className={`w-[58px] h-[58px] rounded-full mx-auto mb-3 flex items-center justify-center font-extrabold text-[22px] border-2 ${
          isLive 
            ? 'bg-gradient-to-br from-[#25D366]/25 to-[#10B981]/20 border-[#25D366]/25' 
            : 'bg-gradient-to-br from-indigo-500/25 to-violet-500/20 border-indigo-500/20'
        }`}>
          {name[0]}
        </div>
        <p className="font-bold text-[14px] text-[var(--t1)]">{name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: isLive ? '#25D366' : CH_COLOR[channel] }}>
          {isLive ? '📱' : CH_ICON[channel]} {channel}
        </p>
      </div>

      <div className="flex flex-col">
        {[
          { l: 'Lead Score', v: `${score}/100`, c: score > 70 ? '#34d399' : score > 40 ? '#fcd34d' : '#fca5a5' },
          { l: 'Intent', v: intent.replace(/_/g, ' '), c: IC_COLOR[intent] || 'var(--t1)' },
          { l: 'Assigned', v: currentAgent, c: 'var(--t1)' },
          { l: 'AI Mode', v: autoOn ? 'Auto' : 'Manual', c: autoOn ? '#67e8f9' : 'var(--t3)' },
        ].map(row => (
          <div key={row.l} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
            <span className="text-[12px] text-[var(--t4)]">{row.l}</span>
            <span className="text-[12px] font-semibold" style={{ color: row.c }}>{row.v}</span>
          </div>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/12 text-indigo-300 border border-indigo-500/20">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
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
