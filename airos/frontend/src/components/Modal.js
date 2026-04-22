'use client';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width = 480, variant = 'default' }) {
  useEffect(() => {
    if (!open) return;
    const esc = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  const isInbox = variant === 'inbox';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width,
          background: isInbox ? 'var(--inbox-surface)' : 'var(--bg3)',
          border: isInbox ? '1px solid var(--inbox-border)' : '1px solid var(--b2)',
          borderRadius: isInbox ? 12 : 'var(--r-xl)',
          padding: isInbox ? 24 : '28px 28px 24px',
          display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          animation: 'slide-up 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: isInbox ? 14 : 17, fontWeight: isInbox ? 600 : 800, color: isInbox ? 'var(--inbox-text-primary)' : 'var(--t1)' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              border: isInbox ? '1px solid var(--inbox-border)' : '1px solid var(--b1)',
              background: isInbox ? 'var(--inbox-card)' : 'var(--s1)',
              color: isInbox ? 'var(--inbox-text-secondary)' : 'var(--t3)', cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
