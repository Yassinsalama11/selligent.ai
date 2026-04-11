'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { clearToken, isDemo } from '@/lib/api';
import Logo from '@/components/Logo';

const NAV = [
  { href: '/dashboard',               icon: '◈',  label: 'Overview',       exact: true },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversations'               },
  { href: '/dashboard/contacts',       icon: '👥', label: 'Contacts'                    },
  { href: '/dashboard/broadcast',      icon: '📣', label: 'Broadcast'                   },
  { href: '/dashboard/deals',         icon: '🎯', label: 'Deal Pipeline'               },
  { href: '/dashboard/tickets',       icon: '🎫', label: 'Tickets'                     },
  { href: '/dashboard/products',      icon: '📦', label: 'Products'                    },
  { href: '/dashboard/reports',       icon: '📊', label: 'Reports'                     },
  { href: '/dashboard/settings',      icon: '⚙',  label: 'Settings'                    },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime]           = useState('');
  const [demo, setDemo]           = useState(false);

  useEffect(() => {
    setDemo(isDemo());
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = item => item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const pageLabel = NAV.find(n => isActive(n))?.label ?? 'Dashboard';

  const S = {
    root:  { display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' },
    aside: {
      width: collapsed ? 62 : 'var(--sidebar-w)',
      flexShrink: 0, transition: 'width 0.22s ease',
      display:'flex', flexDirection:'column',
      background:'var(--bg2)', borderRight:'1px solid var(--b1)',
      overflow:'hidden',
    },
    logoRow: {
      height:'var(--topbar-h)', display:'flex', alignItems:'center',
      padding:'0 14px', borderBottom:'1px solid var(--b1)',
      flexShrink:0, gap:10,
    },
    nav: { flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' },
    bottomBar: { padding:'8px', borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:2 },
    main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 },
    topbar: {
      height:'var(--topbar-h)', display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px', borderBottom:'1px solid var(--b1)', flexShrink:0,
      background:'rgba(7,7,16,0.85)', backdropFilter:'blur(20px)',
    },
  };

  return (
    <div style={S.root}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={S.aside}>
        {/* Logo */}
        <div style={S.logoRow}>
          {collapsed ? (
            /* Collapsed — just the S mark */
            <div style={{ width:38, height:38, overflow:'hidden', flexShrink:0, position:'relative', borderRadius:8, background:'rgba(255,255,255,0.92)' }}>
              <Image
                src="/selligent-logo.png"
                alt="S"
                fill
                sizes="38px"
                style={{ objectFit:'cover', objectPosition:'left center' }}
                priority
              />
            </div>
          ) : (
            /* Expanded — full logo */
            <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:8, padding:'4px 10px', display:'inline-flex', alignItems:'center', flexShrink:0 }}>
              <Image
                src="/selligent-logo.png"
                alt="Selligent.ai"
                width={160}
                height={40}
                style={{ height:40, width:'auto', objectFit:'contain', display:'block' }}
                priority
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={S.nav}>
          {!collapsed && (
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--t4)', letterSpacing:'0.08em',
              textTransform:'uppercase', padding:'8px 12px 4px' }}>
              Main Menu
            </div>
          )}
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item${isActive(item) ? ' active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : undefined }}
              title={collapsed ? item.label : undefined}>
              <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span style={{ flex:1, whiteSpace:'nowrap' }}>{item.label}</span>
                  {isActive(item) && (
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#818cf8', flexShrink:0 }} />
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div style={S.bottomBar}>
          <button onClick={() => setCollapsed(c => !c)} className="nav-item"
            style={{ justifyContent: collapsed?'center':undefined,
              width:'100%', background:'none', border:'1px solid transparent', cursor:'pointer' }}>
            <span style={{ fontSize:13 }}>{collapsed ? '→' : '←'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={() => { clearToken(); router.push('/login'); }} className="nav-item"
            style={{ justifyContent: collapsed?'center':undefined, color:'#f87171',
              width:'100%', background:'none', border:'1px solid transparent', cursor:'pointer' }}>
            <span style={{ fontSize:13 }}>↪</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Right side ──────────────────────────────────────────────────── */}
      <div style={S.main}>
        <header style={S.topbar}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--t4)' }}>Selligent.ai</span>
            <span style={{ fontSize:12, color:'var(--t4)' }}>›</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>{pageLabel}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--t4)', letterSpacing:'0.02em' }}>
              {time}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:7,
              background:'rgba(6,182,212,0.07)', border:'1px solid rgba(6,182,212,0.18)',
              padding:'5px 13px', borderRadius:99, fontSize:12, fontWeight:600, color:'#67e8f9' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#67e8f9',
                display:'inline-block' }} className="anim-pulse" />
              AI Active
            </div>
            <button style={{ width:34, height:34, borderRadius:'var(--r)',
              background:'var(--s1)', border:'1px solid var(--b1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', position:'relative', fontSize:15 }}>
              🔔
              <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%',
                background:'var(--indigo)', border:'1.5px solid var(--bg2)' }} />
            </button>
            <div style={{ width:34, height:34, borderRadius:'50%',
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0 }}>
              D
            </div>
          </div>
        </header>

        {demo && (
          <div style={{ background:'rgba(99,102,241,0.08)', borderBottom:'1px solid rgba(99,102,241,0.18)',
            padding:'8px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0, fontSize:13 }}>
            <span style={{ color:'#a5b4fc' }}>
              🚀 <strong>Demo mode</strong> — exploring with sample data.{' '}
              <Link href="/signup" style={{ color:'#c4b5fd', textDecoration:'underline', fontWeight:600 }}>
                Create a free account
              </Link>{' '}
              to connect real channels.
            </span>
            <span style={{ fontSize:11, color:'var(--t4)', fontFamily:'monospace' }}>demo@selligent.ai</span>
          </div>
        )}

        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
