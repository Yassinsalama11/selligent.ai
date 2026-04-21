'use client';

import React, { forwardRef } from 'react';
import { CH_ICON, IC_COLOR } from './constants';

const ConversationList = forwardRef(({
  search,
  setSearch,
  filters,
  setFilters,
  agents,
  liveConvs,
  filtered,
  activeId,
  activeLiveId,
  openLiveConv,
  selectConv,
  layoutPrefs,
  aiAutoReply,
  pendingHandoffs = {},
}, ref) => {
  const listItemPadding = layoutPrefs.density === 'compact' ? 'py-2.5 px-3'
    : layoutPrefs.density === 'expanded' ? 'py-4 px-4'
      : 'py-3 px-3.5';

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-[var(--b1)] bg-[var(--bg2)] overflow-hidden">
      <div className="p-3.5 pb-2.5">
        <input 
          ref={ref}
          className="input text-[13px] focus:ring-1 focus:ring-indigo-500/50" 
          placeholder="Search conversations… (Ctrl+K)"
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <div className="flex gap-1 mt-2.5 flex-wrap">
          {['all','whatsapp','instagram','messenger','livechat'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilters(current => ({ ...current, channel: f }))}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold cursor-pointer border transition-all duration-150 ${
                filters.channel === f
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' 
                  : 'bg-transparent text-[var(--t4)] border-[var(--b1)]'
              }`}
            >
              {f === 'all' ? 'All' : CH_ICON[f]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-2.5">
          <select
            className="input text-[11px] py-1.5"
            value={filters.status}
            onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}
          >
            {['all', 'open', 'pending', 'closed'].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            className="input text-[11px] py-1.5"
            value={filters.assigned_to}
            onChange={e => setFilters(current => ({ ...current, assigned_to: e.target.value }))}
          >
            <option value="all">all agents</option>
            <option value="unassigned">unassigned</option>
            {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>)}
          </select>
          <select
            className="input text-[11px] py-1.5 col-span-2"
            value={filters.priority}
            onChange={e => setFilters(current => ({ ...current, priority: e.target.value }))}
          >
            {['all', 'low', 'medium', 'high', 'urgent'].map(value => <option key={value} value={value}>{value} priority</option>)}
          </select>
        </div>
      </div>
      
      <div className="border-b border-[var(--b1)] mb-0.5" />
      
      <div className="flex-1 overflow-y-auto">
        {/* Live WhatsApp conversations — top of list */}
        {liveConvs.length > 0 && (
          <>
            <div className="px-3.5 py-1.5 text-[10px] font-bold text-[#25D366] tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block animate-pulse" />
              Live
            </div>
            {liveConvs.map(conv => (
              <div 
                key={conv.id}
                onClick={() => openLiveConv(conv)}
                className={`${listItemPadding} cursor-pointer border-b border-white/5 transition-colors duration-120 hover:bg-[var(--s1)] ${
                  activeLiveId === conv.id 
                    ? 'bg-[#25D366]/10 border-l-2 border-l-[#25D366]' 
                    : 'bg-transparent border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#10B981]/20 flex items-center justify-center font-bold text-sm">
                      {conv.customerName?.[0]?.toUpperCase() || '?'}
                    </div>
                    {layoutPrefs.showChannel && (
                      <span className="absolute -bottom-0.5 -right-0.5 text-[11px]">📱</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-semibold text-[13.5px] text-[var(--t1)]">{conv.customerName}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conv.unread > 0 && (
                          <span className="text-[10px] font-bold bg-[#25D366] text-black rounded-full px-1.5 py-0.5">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[12.5px] text-[var(--t3)] overflow-hidden text-ellipsis whitespace-nowrap mb-1.5" dir="auto">
                      {conv.lastMessage || '…'}
                    </p>
                    <div className="flex items-center justify-between">
                      {layoutPrefs.showIntent && (
                        <span 
                          className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${IC_COLOR[conv.intent] || '#64748b'}12`,
                            color: IC_COLOR[conv.intent] || '#64748b',
                            borderColor: `${IC_COLOR[conv.intent] || '#64748b'}20`
                          }}
                        >
                          {(conv.intent || 'inquiry').replace(/_/g, ' ')}
                        </span>
                      )}
                      {layoutPrefs.showScore && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-[3px] rounded-full bg-[var(--s3)] overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (conv.score || 0) > 70 ? 'bg-[#10b981]' : (conv.score || 0) > 40 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                              }`}
                              style={{ width: `${conv.score || 0}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold ${
                            (conv.score || 0) > 70 ? 'text-[#10b981]' : (conv.score || 0) > 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                          }`}>
                            {conv.score || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="px-3.5 py-1.5 text-[10px] font-bold text-[var(--t4)] tracking-widest uppercase">
              Demo
            </div>
          </>
        )}

        {filtered.map(c => (
          <div 
            key={c.id} 
            onClick={() => selectConv(c)}
            className={`${listItemPadding} cursor-pointer border-b border-white/5 transition-colors duration-120 hover:bg-[var(--s1)] ${
              activeId === c.id 
                ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' 
                : 'bg-transparent border-l-2 border-l-transparent'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="relative flex-shrink-0">
                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center font-bold text-sm">
                  {c.name[0]}
                </div>
                {layoutPrefs.showChannel && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[11px]">{CH_ICON[c.ch]}</span>
                )}
                {aiAutoReply[c.id] && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#67e8f9] border-[1.5px] border-[var(--bg2)]" />
                )}
                {pendingHandoffs[c.id]?.status === 'pending' && (
                  <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-[1.5px] border-[var(--bg2)] animate-pulse" title="Handoff pending" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-0.5">
                  <span className="font-semibold text-[13.5px] text-[var(--t1)]">{c.name}</span>
                  <span className="text-[11px] text-[var(--t4)] flex-shrink-0">{c.ago}</span>
                </div>
                <p className="text-[12.5px] text-[var(--t3)] overflow-hidden text-ellipsis whitespace-nowrap mb-1.5" dir="auto">
                  {c.last}
                </p>
                <div className="flex items-center justify-between">
                  {layoutPrefs.showIntent && (
                    <span 
                      className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${IC_COLOR[c.intent] || '#64748b'}12`,
                        color: IC_COLOR[c.intent] || '#64748b',
                        borderColor: `${IC_COLOR[c.intent] || '#64748b'}20`
                      }}
                    >
                      {c.intent.replace(/_/g, ' ')}
                    </span>
                  )}
                  {layoutPrefs.showScore && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-[3px] rounded-full bg-[var(--s3)] overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            c.score > 70 ? 'bg-[#10b981]' : c.score > 40 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                          }`}
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${
                        c.score > 70 ? 'text-[#10b981]' : c.score > 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                      }`}>
                        {c.score}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList;
