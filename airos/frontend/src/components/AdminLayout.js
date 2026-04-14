'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV = [
  { href:'/admin',          icon:'◈',  label:'Overview',        exact:true },
  { href:'/admin/clients',  icon:'🏢', label:'Clients'                     },
  { href:'/admin/billing',  icon:'💳', label:'Billing & Orders'            },
  { href:'/admin/logs',     icon:'📋', label:'Activity Logs'               },
  { href:'/admin/system',   icon:'🖥', label:'System Health'               },
  { href:'/admin/team',     icon:'👥', label:'Team'                        },
];

const ROLE_COLORS = {
  'Super Admin': '#f59e0b',
  'Admin':       '#6366f1',
  'Support':     '#06b6d4',
  'Developer':   '#34d399',
};

export default function AdminLayout({ children }) {
  const pathname        = usePathname();
  const router          = useRouter();
  const [time, setTime] = useState('');
  const [me, setMe]     = useState(null);
  const [authReady, setAuthReady] = useState(false);

  /* Live clock */
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US',
      { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  /* Auth guard — skip on login page */
  useEffect(() => {
    if (pathname === '/admin/login') { setAuthReady(true); return; }
    try {
      const auth = JSON.parse(localStorage.getItem('adminAuth') || 'null');
      if (!auth?.id) { router.replace('/admin/login'); return; }
      setMe(auth);
    } catch {
      router.replace('/admin/login');
      return;
    }
    setAuthReady(true);
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem('adminAuth');
    router.replace('/admin/login');
  }

  /* Login page renders children directly, no chrome */
  if (pathname === '/admin/login') return <>{children}</>;

  /* Wait for auth check before rendering */
  if (!authReady || !me) return null;

  const isActive  = item => item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const pageLabel = NAV.find(n => isActive(n))?.label ?? 'Admin';
  const roleColor = ROLE_COLORS[me.role] ?? '#f59e0b';

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:220, flexShrink:0, background:'var(--bg2)',
        borderRight:'1px solid var(--b1)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        <div style={{ height:'var(--topbar-h)', display:'flex', alignItems:'center',
          padding:'0 14px', borderBottom:'1px solid var(--b1)' }}>
          <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:8,
            padding:'4px 8px', display:'inline-flex', alignItems:'center' }}>
            <Image src="/chatorai-logo.svg" alt="ChatOrAI" width={120} height={30}
              style={{ height:30, width:'auto', objectFit:'contain', display:'block' }} priority />
          </div>
        </div>

        <div style={{ padding:'10px 12px 6px' }}>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', color:'#f59e0b',
            background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.22)',
            padding:'3px 10px', borderRadius:99, display:'inline-block' }}>
            🛡 ADMIN PANEL
          </span>
        </div>

        <nav style={{ flex:1, padding:'6px 8px', display:'flex', flexDirection:'column',
          gap:2, overflowY:'auto' }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item${isActive(item) ? ' active' : ''}`}>
              <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {isActive(item) && (
                <span style={{ width:6, height:6, borderRadius:'50%',
                  background:'#f59e0b', flexShrink:0 }} />
              )}
            </Link>
          ))}
        </nav>

        {/* Logged-in user card */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--b1)',
          display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9,
            padding:'10px 10px', borderRadius:10,
            background:'var(--s1)', border:'1px solid var(--b1)' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
              background:`linear-gradient(135deg,${roleColor}cc,${roleColor}66)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:800, fontSize:12 }}>
              {me.avatar || me.name?.[0] || 'A'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {me.name}
              </p>
              <p style={{ fontSize:10.5, color:roleColor, fontWeight:600 }}>{me.role}</p>
            </div>
          </div>
          <button onClick={logout}
            style={{ width:'100%', padding:'7px', borderRadius:9, cursor:'pointer',
              background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)',
              color:'#fca5a5', fontSize:12, fontWeight:600 }}>
            Sign Out
          </button>
          <Link href="/dashboard" className="nav-item"
            style={{ fontSize:12.5, color:'var(--t4)', border:'1px solid transparent' }}>
            <span style={{ fontSize:13 }}>←</span>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <header style={{ height:'var(--topbar-h)', display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'0 24px', borderBottom:'1px solid var(--b1)',
          flexShrink:0, background:'rgba(7,7,16,0.9)', backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--t4)' }}>ChatOrAI</span>
            <span style={{ fontSize:12, color:'var(--t4)' }}>›</span>
            <span style={{ fontSize:12, fontWeight:600, color:'#f59e0b' }}>Admin</span>
            <span style={{ fontSize:12, color:'var(--t4)' }}>›</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>{pageLabel}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--t4)' }}>{time}</span>
            <div style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:700,
              background:`${roleColor}12`, border:`1px solid ${roleColor}28`,
              color:roleColor, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:roleColor,
                display:'inline-block' }} className="anim-pulse" />
              {me.role}
            </div>
            <div style={{ width:34, height:34, borderRadius:'50%',
              background:`linear-gradient(135deg,${roleColor}cc,${roleColor}66)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>
              {me.avatar || me.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
