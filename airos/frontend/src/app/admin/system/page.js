'use client';

export default function AdminSystemPage() {
  return (
    <div style={{ padding:'28px' }}>
      <div style={{ maxWidth:760, padding:'22px 24px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:8 }}>
          System
        </h1>
        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.7, marginBottom:14 }}>
          Seeded system health cards have been removed. This page is reserved for real infrastructure telemetry only.
        </p>
        <p style={{ fontSize:12.5, color:'var(--t4)', lineHeight:1.7 }}>
          Wire in real uptime, service health, and incident data before using this screen operationally.
        </p>
      </div>
    </div>
  );
}
