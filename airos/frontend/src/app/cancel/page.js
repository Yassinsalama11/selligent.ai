'use client';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:440 }}>

        <div style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 24px',
          background:'rgba(251,191,36,0.08)', border:'2px solid rgba(251,191,36,0.25)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>
          ↩
        </div>

        <h1 style={{ fontSize:26, fontWeight:800, color:'var(--t1)',
          letterSpacing:'-0.03em', marginBottom:10 }}>
          Payment Cancelled
        </h1>

        <p style={{ fontSize:14, color:'var(--t3)', marginBottom:28, lineHeight:1.6 }}>
          No worries — you haven't been charged. Come back anytime to start your subscription.
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Link href="/#pricing"
            style={{ padding:'11px 24px', borderRadius:10, background:'#6366f1',
              color:'#fff', fontWeight:700, fontSize:13, textDecoration:'none' }}>
            View Plans
          </Link>
          <Link href="/"
            style={{ padding:'11px 24px', borderRadius:10,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
              color:'var(--t2)', fontWeight:600, fontSize:13, textDecoration:'none' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
