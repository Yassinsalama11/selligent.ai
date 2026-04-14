'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const plan    = params.get('plan') || 'Pro';
  const [count, setCount] = useState(5);

  useEffect(() => {
    const t = setInterval(() => setCount(c => {
      if (c <= 1) { clearInterval(t); router.replace('/login'); }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:480 }}>
        <div style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 24px',
          background:'rgba(52,211,153,0.1)', border:'2px solid rgba(52,211,153,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>
          ✓
        </div>
        <h1 style={{ fontSize:28, fontWeight:800, color:'var(--t1)',
          letterSpacing:'-0.03em', marginBottom:10 }}>
          Payment Successful!
        </h1>
        <p style={{ fontSize:15, color:'var(--t3)', marginBottom:6, lineHeight:1.6 }}>
          Welcome to ChatOrAI <strong style={{ color:'#34d399' }}>{plan}</strong> plan.
          Your subscription is now active.
        </p>
        <p style={{ fontSize:13, color:'var(--t4)', marginBottom:28 }}>
          Redirecting to login in {count}s…
        </p>
        <div style={{ padding:'16px 20px', borderRadius:12, marginBottom:28,
          background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)' }}>
          {['✓ Account activated','✓ All channels ready to connect','✓ 14-day money-back guarantee'].map(item => (
            <p key={item} style={{ fontSize:13, color:'#34d399', marginBottom:6 }}>{item}</p>
          ))}
        </div>
        <Link href="/login"
          style={{ display:'inline-block', padding:'12px 28px', borderRadius:10,
            background:'#6366f1', color:'#fff', fontWeight:700, fontSize:14, textDecoration:'none' }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'var(--bg)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'var(--t4)' }}>Loading…</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
