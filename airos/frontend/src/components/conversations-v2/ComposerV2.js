'use client';

export default function ComposerV2({
  reply,
  setReply,
  onSend,
  isAutoOn,
  onTakeOver,
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
}) {
  return (
    <footer className="shrink-0 border-t border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-5 py-4">
      <input ref={fileInputRef} type="file" className="hidden" onChange={event => onFileSelect?.(event, 'file')} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={event => onFileSelect?.(event, 'image')} />

      {isAutoOn ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14px] font-semibold text-[var(--inbox-text-primary)]">AI is handling this conversation</p>
            <p className="mt-1 text-[12px] text-[var(--inbox-text-secondary)]">Click Take Over to enable the composer.</p>
          </div>
          <button
            type="button"
            onClick={onTakeOver}
            className="rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(255,90,31,0.22)]"
          >
            Take Over
          </button>
        </div>
      ) : (
        <>
          {showCannedPicker && (
            <div className="mb-4 overflow-hidden rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--inbox-border)] px-4 py-3">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--inbox-text-primary)]">Canned replies</p>
                  <p className="mt-1 text-[12px] text-[var(--inbox-text-muted)]">Type `/` to filter, click to insert.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={onManageCanned} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
                    Manage
                  </button>
                  <button type="button" onClick={() => setShowCannedPicker(false)} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
                    Close
                  </button>
                </div>
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {filteredCanned.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[14px] text-[var(--inbox-text-secondary)]">No matching replies.</div>
                ) : filteredCanned.map(replyItem => (
                  <button
                    type="button"
                    key={replyItem.id}
                    onClick={() => onInsertCanned(replyItem.text)}
                    className="flex w-full items-start gap-3 border-b border-[var(--inbox-border)] px-4 py-3 text-left transition hover:bg-[var(--inbox-elevated)]"
                  >
                    <span className="shrink-0 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] font-mono text-[var(--inbox-text-secondary)]">
                      {replyItem.shortcut}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-[var(--inbox-text-primary)]">{replyItem.title}</span>
                      <span className="mt-1 block truncate text-[12px] text-[var(--inbox-text-secondary)]" dir="auto">{replyItem.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)]">
              Attach
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)] transition hover:bg-[var(--inbox-elevated)]">
              Image
            </button>
            <button
              type="button"
              onClick={() => { setShowCannedPicker(value => !value); setCannedSearch(''); }}
              className={`rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition ${showCannedPicker ? 'border-[var(--inbox-border-strong)] bg-[var(--inbox-elevated)] text-[var(--inbox-text-primary)]' : 'border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[var(--inbox-text-secondary)] hover:bg-[var(--inbox-elevated)]'}`}
            >
              Canned
            </button>
            <span className="hidden text-[12px] text-[var(--inbox-text-muted)] sm:inline">Ctrl+Enter to send</span>
          </div>

          <div className="flex items-end gap-3 rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-3">
            <textarea
              className="min-h-[56px] max-h-[144px] flex-1 resize-none bg-transparent px-1 py-1 text-[14px] leading-6 text-[var(--inbox-text-primary)] outline-none placeholder:text-[var(--inbox-text-muted)]"
              placeholder="Write a reply..."
              value={reply}
              onChange={event => {
                const value = event.target.value;
                setReply(value);
                if (value.startsWith('/')) {
                  setShowCannedPicker(true);
                  setCannedSearch(value.slice(1));
                } else if (showCannedPicker && !value.startsWith('/')) {
                  setShowCannedPicker(false);
                }
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' && event.ctrlKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              rows={2}
              dir="auto"
            />
            <button
              type="button"
              disabled={!reply.trim()}
              onClick={onSend}
              className="h-12 shrink-0 rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(255,90,31,0.22)] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </>
      )}
    </footer>
  );
}

