'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminApi, getAdminProfile, logoutAdmin, setAdminSession } from '@/lib/adminApi';

const NAV = [
  { href:'/admin',         icon:'◈',  label:'Overview', exact:true },
  { href:'/admin/clients', icon:'🏢', label:'Clients' },
  { href:'/admin/pricing', icon:'🪙', label:'Plans' },
  { href:'/admin/offers',  icon:'🏷️', label:'Offers' },
  { href:'/admin/billing', icon:'💳', label:'Billing' },
  { href:'/admin/ai',      icon:'🤖', label:'AI Control' },
  { href:'/admin/agents',  icon:'🧠', label:'AI Agents' },
  { href:'/admin/ingestion', icon:'🕸', label:'Ingestion' },
  { href:'/admin/logs',    icon:'📋', label:'Logs' },
  { href:'/admin/system',  icon:'🖥', label:'System' },
  { href:'/admin/team',    icon:'👥', label:'Team' },
];

const ROLE_COLORS = {
  platform_admin: '#f59e0b',
  super_admin: '#f59e0b',
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState('');
  const [me, setMe] = useState(() => getAdminProfile());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', {
      hour:'2-digit',
      minute:'2-digit',
      second:'2-digit',
    }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
      if (pathname === '/admin/login') {
        setReady(true);
        return;
      }

      try {
        const data = await adminApi.get('/api/admin/auth/me');
        if (cancelled) return;
        setMe(data.admin);
        setAdminSession({ admin: data.admin });
      } catch {
        if (cancelled) return;
        router.replace('/admin/login');
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    loadAdmin();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  async function logout() {
    await logoutAdmin();
    router.replace('/admin/login');
  }

  if (pathname === '/admin/login') return <>{children}</>;
  if (!ready || !me) return null;

  const isActive = (item) => item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const pageLabel = NAV.find((item) => isActive(item))?.label || 'Admin';
  const roleColor = ROLE_COLORS[me.role] || '#f59e0b';
  const roleLabel = String(me.role || 'platform_admin').replace(/_/g, ' ');

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <aside style={{
        width:220,
        flexShrink:0,
        background:'var(--bg2)',
        borderRight:'1px solid var(--b1)',
        display:'flex',
        flexDirection:'column',
        overflow:'hidden',
      }}>
        <div style={{ height:'var(--topbar-h)', display:'flex', alignItems:'center', padding:'0 14px', borderBottom:'1px solid var(--b1)' }}>
          <div style={{ display:'inline-flex', alignItems:'center' }}>
            <Image src="/ChatOrAi.png" alt="ChatOrAI" width={120} height={30} style={{ height:30, width:'auto', objectFit:'contain', display:'block' }} priority />
          </div>
        </div>

        <div style={{ padding:'10px 12px 6px' }}>
          <span style={{
            fontSize:10,
            fontWeight:800,
            letterSpacing:'0.1em',
            color:'#f59e0b',
            background:'rgba(245,158,11,0.1)',
            border:'1px solid rgba(245,158,11,0.22)',
            padding:'3px 10px',
            borderRadius:99,
            display:'inline-block',
          }}>
            ADMIN PANEL
          </span>
        </div>

        <nav style={{ flex:1, padding:'6px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item${isActive(item) ? ' active' : ''}`}>
              <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {isActive(item) && <span style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }} />}
            </Link>
          ))}
        </nav>

        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px', borderRadius:10, background:'var(--s1)', border:'1px solid var(--b1)' }}>
            <div style={{
              width:30,
              height:30,
              borderRadius:'50%',
              background:`linear-gradient(135deg,${roleColor}cc,${roleColor}66)`,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              color:'#fff',
              fontWeight:800,
              fontSize:12,
              flexShrink:0,
            }}>
              {String(me.name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {me.name}
              </p>
              <p style={{ fontSize:10.5, color:roleColor, fontWeight:600, textTransform:'capitalize' }}>{roleLabel}</p>
            </div>
          </div>
          <button onClick={logout} style={{ width:'100%', padding:'7px', borderRadius:9, cursor:'pointer', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)', color:'#fca5a5', fontSize:12, fontWeight:600 }}>
            Sign Out
          </button>
          <Link href="/dashboard" className="nav-item" style={{ fontSize:12.5, color:'var(--t4)', border:'1px solid transparent' }}>
            <span style={{ fontSize:13 }}>←</span>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <header style={{ height:'var(--topbar-h)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', borderBottom:'1px solid var(--b1)', flexShrink:0, background:'rgba(7,7,16,0.9)', backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--t4)' }}>ChatOrAI</span>
            <span style={{ fontSize:12, color:'var(--t4)' }}>›</span>
            <span style={{ fontSize:12, fontWeight:600, color:'#f59e0b' }}>Admin</span>
            <span style={{ fontSize:12, color:'var(--t4)' }}>›</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>{pageLabel}</span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--t4)' }}>{time}</span>
            <div style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:700, background:`${roleColor}12`, border:`1px solid ${roleColor}28`, color:roleColor, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:roleColor, display:'inline-block' }} className="anim-pulse" />
              {roleLabel}
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
