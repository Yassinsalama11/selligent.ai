'use client';

import CustomerPanelV2 from './CustomerPanelV2';

export default function ContextDrawerV2({
  open,
  onClose,
  panelProps,
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/40 lg:hidden"
        onClick={onClose}
        aria-label="Close context drawer"
      />
      <div className="fixed inset-y-0 right-0 z-30 flex w-[320px] max-w-[calc(100vw-32px)] flex-col border-l border-[var(--inbox-border)] bg-[var(--inbox-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] lg:hidden">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--inbox-border)] px-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-text-muted)]">Context</p>
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-1 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <CustomerPanelV2 {...panelProps} />
        </div>
      </div>
    </>
  );
}

