'use client';

function getToneStyles(tone) {
  if (tone === 'error') {
    return {
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      color: '#fecaca',
    };
  }

  if (tone === 'success') {
    return {
      background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.2)',
      color: '#a7f3d0',
    };
  }

  return {
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.18)',
    color: '#c7d2fe',
  };
}

export function StatusBanner({
  title,
  description,
  tone = 'info',
  actionLabel,
  onAction,
}) {
  const styles = getToneStyles(tone);

  return (
    <div style={{
      ...styles,
      borderRadius: 16,
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        {description && (
          <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>{description}</div>
        )}
      </div>
      {actionLabel && onAction && (
        <button className="btn btn-ghost btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div style={{
      borderRadius: 16,
      border: '1px dashed var(--b2)',
      padding: '28px 20px',
      textAlign: 'center',
      color: 'var(--t4)',
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 12.5 }}>{description}</div>
      )}
    </div>
  );
}

export function LoadingGrid({ cards = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="card"
          style={{ minHeight: 120, opacity: 0.6 }}
        />
      ))}
    </div>
  );
}
