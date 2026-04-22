'use client';

import React from 'react';
import { CH_ICON } from './constants';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-4">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--inbox-text-muted)]">{title}</p>
      {children}
    </section>
  );
}

function DetailRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[12px] text-[var(--inbox-text-secondary)]">{label}</span>
      <span className={`min-w-0 truncate text-right text-[12px] font-semibold text-[var(--inbox-text-primary)] ${valueClassName}`}>{value}</span>
    </div>
  );
}

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

  const name = activeConv.customerName || activeConv.name || 'Unknown customer';
  const channel = activeConv.channel || activeConv.ch || 'livechat';
  const score = Math.max(0, Math.min(100, Number(activeConv.score || 0)));
  const intent = activeConv.intent || 'inquiry';
  const phone = activeConv.customerPhone || activeConv.phone || '';
  const email = activeConv.customerEmail || activeConv.email || '';

  return (
    <div className="flex w-full flex-col gap-4 bg-[var(--inbox-surface)] p-4">
      <Section title="Customer">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-elevated)] text-[16px] font-bold text-[var(--inbox-text-primary)]">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold text-[var(--inbox-text-primary)]">{name}</p>
            <div className="mt-2 inline-flex items-center rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-2 py-1 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
              {CH_ICON[channel] || 'CH'} · {channel}
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-[var(--inbox-border)] pt-2">
          <DetailRow label="Phone" value={phone || 'Not provided'} />
          <DetailRow label="Email" value={email || 'Not provided'} />
        </div>
      </Section>

      <Section title="Lead score">
        <div className="flex items-end justify-between">
          <span className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--inbox-text-primary)]">{score}</span>
          <span className="pb-1 text-[12px] text-[var(--inbox-text-secondary)]">/100</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--inbox-elevated)]">
          <div className="h-full rounded-full bg-[#00E5FF]" style={{ width: `${score}%` }} />
        </div>
      </Section>

      <Section title="Conversation">
        <DetailRow label="Intent" value={intent.replace(/_/g, ' ')} valueClassName="capitalize" />
        <DetailRow label="Assignee" value={currentAgent || 'Unassigned'} />
        <DetailRow label="AI mode" value={isAutoOn ? 'Auto reply' : 'Manual'} valueClassName={isAutoOn ? 'text-[#00E5FF]' : ''} />
      </Section>

      <Section title="AI state">
        <button
          type="button"
          onClick={onToggleAuto}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${
            isAutoOn ? 'border-[#00E5FF]/30 bg-[#00E5FF]/10' : 'border-[var(--inbox-border)] bg-[var(--inbox-surface)]'
          }`}
        >
          <span className="text-[14px] font-semibold text-[var(--inbox-text-primary)]">
            {isAutoOn ? 'AI handling' : 'Manual'}
          </span>
          <span className={`h-3 w-3 rounded-full ${isAutoOn ? 'bg-[var(--inbox-ai)] shadow-[0_0_14px_rgba(0,229,255,0.8)]' : 'bg-[var(--inbox-text-muted)]'}`} />
        </button>
      </Section>

      <Section title="Tags">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-1 text-[12px] font-semibold text-[var(--inbox-text-secondary)]">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--inbox-text-secondary)]">No tags yet.</p>
        )}
      </Section>

      <Section title="Actions">
        <div className="grid grid-cols-1 gap-2">
          <button type="button" className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-primary)] transition hover:bg-[var(--inbox-elevated)]" onClick={onManageCanned}>
            Canned replies
          </button>
          <button type="button" className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-primary)] transition hover:bg-[var(--inbox-elevated)]" onClick={onAddTag}>
            Add tag
          </button>
          <button type="button" className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-primary)] transition hover:bg-[var(--inbox-elevated)]" onClick={onViewHistory}>
            View history
          </button>
        </div>
      </Section>
    </div>
  );
}
