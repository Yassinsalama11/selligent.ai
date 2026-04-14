'use client';

export default function AdminLogsPage() {
  return (
    <div style={{ padding:'28px' }}>
      <div style={{ maxWidth:760, padding:'22px 24px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:8 }}>
          Activity Logs
        </h1>
        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.7, marginBottom:14 }}>
          Fake live-feed log data has been removed. This page should only render real platform events.
        </p>
        <p style={{ fontSize:12.5, color:'var(--t4)', lineHeight:1.7 }}>
          Add a real admin logging pipeline before exposing this screen to production operators.
        </p>
      </div>
    </div>
  );
}
