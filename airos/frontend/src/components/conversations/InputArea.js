'use client';

import React from 'react';

export default function InputArea({
  reply,
  setReply,
  onSend,
  isAutoOn,
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
  return (
    <div className={`px-5 pb-5 bg-[#0f172a] border-t border-white/10 ${isAutoOn ? 'opacity-50 pointer-events-none' : 'opacity-100'}`} data-canned-area="">
      {/* Canned replies picker dropdown */}
      {showCannedPicker && (
        <div className="bg-[#111827] border border-white/10 rounded-2xl mb-3 overflow-hidden shadow-2xl">
          <div className="p-2.5 px-3 border-b border-[var(--b1)] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[var(--t2)]">
              💬 Canned Replies
              <span className="text-[11px] text-[var(--t4)] ml-1.5">type to filter · click to insert</span>
            </span>
            <div className="flex gap-1.5">
              <button 
                onClick={onManageCanned}
                className="text-[11px] px-2.5 py-1 rounded-md cursor-pointer bg-[var(--s2)] text-[var(--t3)] border border-[var(--b1)] font-semibold hover:bg-[var(--s3)] transition-colors"
              >
                ⚙ Manage
              </button>
              <button 
                onClick={() => setShowCannedPicker(false)}
                className="text-[13px] px-2 py-1 rounded-md cursor-pointer bg-transparent text-[var(--t4)] border-none hover:bg-[var(--s1)] transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {filteredCanned.length === 0 ? (
              <p className="p-4 text-[13px] text-[var(--t4)] text-center">
                No matches — <button onClick={onManageCanned} className="text-indigo-400 bg-none border-none cursor-pointer font-semibold hover:underline">add one</button>
              </p>
            ) : filteredCanned.map(c => (
              <button 
                key={c.id} 
                onClick={() => onInsertCanned(c.text)}
                className="w-full p-2.5 px-3.5 text-left cursor-pointer bg-transparent border-none border-b border-white/5 flex items-start gap-2.5 transition-colors duration-100 hover:bg-[var(--s1)]"
              >
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                  {c.shortcut}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[var(--t1)] mb-0.5">{c.title}</p>
                  <p className="text-[12px] text-[var(--t3)] overflow-hidden text-ellipsis whitespace-nowrap" dir="auto">{c.text}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <button 
          title="Attach file" 
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 px-2 rounded-lg cursor-pointer text-[16px] bg-[var(--s1)] border border-[var(--b1)] text-[var(--t3)] transition-all duration-150 hover:bg-[var(--s2)] hover:text-[var(--t1)]"
        >
          📎
        </button>
        <button 
          title="Send image" 
          onClick={() => imageInputRef.current?.click()}
          className="p-1.5 px-2 rounded-lg cursor-pointer text-[16px] bg-[var(--s1)] border border-[var(--b1)] text-[var(--t3)] transition-all duration-150 hover:bg-[var(--s2)] hover:text-[var(--t1)]"
        >
          🖼
        </button>
        <button 
          title="Canned replies" 
          onClick={() => { setShowCannedPicker(v => !v); setCannedSearch(''); }}
          className={`p-1.5 px-2.5 rounded-lg cursor-pointer text-[12px] font-semibold border transition-all duration-150 flex items-center gap-1.5 ${
            showCannedPicker 
              ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300' 
              : 'bg-[var(--s1)] border-[var(--b1)] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)]'
          }`}
        >
          💬 <span>Canned</span>
        </button>
        <span className="text-[11px] text-[var(--t4)] ml-0.5">
          {isAutoOn ? 'AI is handling — click "Take Over" to reply' : 'Type / to search canned · Ctrl+Enter to send'}
        </span>
      </div>

      {/* Textarea + send */}
      <div className="flex gap-2.5 items-end rounded-2xl border border-white/10 bg-white/[0.035] p-2 shadow-xl">
        <textarea 
          className="input flex-1 resize-none text-[13.5px] min-h-[48px] max-h-[120px] leading-relaxed border-transparent bg-transparent focus:bg-transparent focus:shadow-none"
          placeholder={isAutoOn ? 'AI is handling — click "Take Over" to reply manually' : 'Type a reply…'}
          value={reply}
          onChange={e => {
            const val = e.target.value;
            setReply(val);
            if (val.startsWith('/')) {
              setShowCannedPicker(true);
              setCannedSearch(val.slice(1));
            } else if (showCannedPicker && !val.startsWith('/')) {
              setShowCannedPicker(false);
            }
          }}
          onKeyDown={e => { 
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              onSend(); 
            }
          }}
          rows={2} 
          dir="auto"
        />
        <button 
          disabled={!reply.trim() || isAutoOn} 
          onClick={onSend}
          className="btn btn-primary h-[48px] px-5 flex-shrink-0"
        >
          Send ↑
        </button>
      </div>
    </div>
  );
}
