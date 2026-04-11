'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';

const TEAM_ACCOUNTS = [
  { id:'u1', name:'Yassin Al-Masri',   email:'yassin@selligent.ai',   password:'admin123',   role:'Super Admin', avatar:'Y' },
  { id:'u2', name:'Sara Hassan',       email:'sara@selligent.ai',     password:'sara123',    role:'Admin',       avatar:'S' },
  { id:'u3', name:'Omar Khalil',       email:'omar@selligent.ai',     password:'omar123',    role:'Support',     avatar:'O' },
  { id:'u4', name:'Nour Adel',         email:'nour@selligent.ai',     password:'nour123',    role:'Developer',   avatar:'N' },
];

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('adminAuth') || 'null');
      if (auth?.id) router.replace('/admin');
    } catch {}
  }, [router]);

  function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = TEAM_ACCOUNTS.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (!user) {
        toast.error('Invalid email or password');
        setLoading(false);
        return;
      }
      localStorage.setItem('adminAuth', JSON.stringify({
        id: user.id, name: user.name, email: user.email,
        role: user.role, avatar: user.avatar,
      }));
      localStorage.setItem('adminTeam', JSON.stringify(TEAM_ACCOUNTS.map(({ password: _, ...u }) => u)));
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      setTimeout(() => router.replace('/admin'), 600);
    }, 900);
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--t1)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style:{ background:'#1e1e2e', color:'#fff', border:'1px solid rgba(255,255,255,0.1)' }}} />
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: 20,
      }}>

        {/* Ambient glow */}
        <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:600, height:300, borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(ellipse,rgba(245,158,11,0.07) 0%,transparent 70%)' }} />

        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg2)', border: '1px solid var(--b1)',
          borderRadius: 20, padding: '36px 32px 32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          position: 'relative', zIndex: 1,
        }}>

          {/* Logo */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
            <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:10,
              padding:'6px 14px', display:'inline-flex', alignItems:'center' }}>
              <Image src="/selligent-logo.png" alt="Selligent.ai" width={140} height={34}
                style={{ height:34, width:'auto', objectFit:'contain', display:'block' }} priority />
            </div>
          </div>

          {/* Badge */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', color:'#f59e0b',
              background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.22)',
              padding:'4px 14px', borderRadius:99 }}>
              🛡 ADMIN PANEL
            </span>
          </div>

          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--t1)', textAlign:'center',
            letterSpacing:'-0.03em', marginBottom:6 }}>
            Sign in to Admin
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)', textAlign:'center', marginBottom:28 }}>
            Selligent.ai staff access only
          </p>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600,
                color:'var(--t4)', marginBottom:6 }}>Email</label>
              <input
                type="email" required autoFocus
                style={inputStyle} value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@selligent.ai"
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600,
                color:'var(--t4)', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required
                  style={{ ...inputStyle, paddingRight:44 }} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'var(--t4)', fontSize:16, lineHeight:1 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop:6, padding:'13px', borderRadius:12, border:'none',
                background: loading ? 'rgba(245,158,11,0.4)' : '#f59e0b',
                color: '#000', fontWeight:800, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing:'-0.01em', transition:'background 0.2s' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{ marginTop:24, padding:'12px 14px', borderRadius:10,
            background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.12)' }}>
            <p style={{ fontSize:11.5, fontWeight:700, color:'#f59e0b', marginBottom:6 }}>
              Demo credentials
            </p>
            {[
              ['yassin@selligent.ai', 'admin123', 'Super Admin'],
              ['sara@selligent.ai',   'sara123',  'Admin'],
            ].map(([e,p,r]) => (
              <button key={e} type="button"
                onClick={() => { setEmail(e); setPassword(p); }}
                style={{ display:'block', width:'100%', textAlign:'left', marginBottom:4,
                  background:'none', border:'none', cursor:'pointer', padding:'2px 0' }}>
                <span style={{ fontSize:11.5, color:'var(--t3)', fontFamily:'monospace' }}>{e}</span>
                <span style={{ fontSize:11, color:'var(--t4)', marginLeft:8 }}>/ {p}</span>
                <span style={{ fontSize:10.5, color:'var(--t4)', marginLeft:8 }}>({r})</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
