'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import { adminApi, hasAdminSession, setAdminSession } from '@/lib/adminApi';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hasAdminSession()) router.replace('/admin');
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await adminApi.post('/api/admin/auth/login', { email, password });
      setAdminSession({ token: data.token, admin: data.admin });
      toast.success(`Welcome back, ${String(data.admin?.name || 'Admin').split(' ')[0]}`);
      router.replace('/admin');
    } catch (err) {
      toast.error(err.message || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width:'100%',
    padding:'11px 14px',
    borderRadius:10,
    fontSize:14,
    background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.1)',
    color:'var(--t1)',
    outline:'none',
    boxSizing:'border-box',
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style:{ background:'#1e1e2e', color:'#fff', border:'1px solid rgba(255,255,255,0.1)' }}} />
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
        <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:300, borderRadius:'50%', pointerEvents:'none', background:'radial-gradient(ellipse,rgba(245,158,11,0.07) 0%,transparent 70%)' }} />

        <div style={{ width:'100%', maxWidth:420, background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:20, padding:'36px 32px 32px', boxShadow:'0 24px 80px rgba(0,0,0,0.5)', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
            <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:10, padding:'6px 14px', display:'inline-flex', alignItems:'center' }}>
              <Image src="/chatorai-logo.svg" alt="ChatOrAI" width={140} height={34} style={{ height:34, width:'auto', objectFit:'contain', display:'block' }} priority />
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', color:'#f59e0b', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.22)', padding:'4px 14px', borderRadius:99 }}>
              ADMIN PANEL
            </span>
          </div>

          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--t1)', textAlign:'center', letterSpacing:'-0.03em', marginBottom:6 }}>
            Sign in to Admin
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)', textAlign:'center', marginBottom:28 }}>
            Live platform access backed by the backend API.
          </p>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:6 }}>Email</label>
              <input type="email" required autoFocus style={inputStyle} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@chatorai.com" />
            </div>

            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required style={{ ...inputStyle, paddingRight:44 }} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--t4)', fontSize:16, lineHeight:1 }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop:6, padding:'13px', borderRadius:12, border:'none', background: loading ? 'rgba(245,158,11,0.4)' : '#f59e0b', color:'#000', fontWeight:800, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing:'-0.01em' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop:24, padding:'12px 14px', borderRadius:10, background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.12)' }}>
            <p style={{ fontSize:11.5, fontWeight:700, color:'#f59e0b', marginBottom:6 }}>
              First-time setup
            </p>
            <p style={{ fontSize:11.5, color:'var(--t4)', lineHeight:1.6 }}>
              Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` on the backend to create the first live platform admin on first successful login.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
