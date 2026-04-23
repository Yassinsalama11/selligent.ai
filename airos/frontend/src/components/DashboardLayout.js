'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { API_BASE, clearToken, isDemo } from '@/lib/api';
import Logo from '@/components/Logo';

const NAV = [
  { href: '/dashboard',               icon: '◈',  label: 'Overview',       exact: true },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversations'               },
  { href: '/dashboard/contacts',       icon: '👥', label: 'Contacts'                    },
  { href: '/dashboard/broadcast',      icon: '📣', label: 'Broadcast'                   },
  { href: '/dashboard/campaigns',      icon: '✉',  label: 'Campaigns'                  },
  { href: '/dashboard/deals',         icon: '🎯', label: 'Deal Pipeline'               },
  { href: '/dashboard/tickets',       icon: '🎫', label: 'Tickets'                     },
  { href: '/dashboard/products',      icon: '📦', label: 'Products'                    },
  { href: '/dashboard/reports',       icon: '📊', label: 'Reports'                     },
  { href: '/dashboard/prompts',       icon: '🧠', label: 'Prompts'                     },
  { href: '/dashboard/business-profile', icon: '🏷', label: 'Business Profile'          },
  { href: '/dashboard/migrations',    icon: '⇄',  label: 'Migrations'                  },
  { href: '/dashboard/settings',      icon: '⚙',  label: 'Settings'                    },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime]           = useState('');
  const [demo, setDemo]           = useState(false);
  const [trialInfo, setTrialInfo] = useState(null); // { daysLeft, isExpired, isTrialUser }
  const [upgradeLoading, setUpgradeLoading] = useState(null);

  const [currentUser, setCurrentUser] = useState({});

  useEffect(() => {
    setDemo(isDemo());
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    );
    tick();
    const t = setInterval(tick, 1000);

    // Load user from localStorage
    try {
      const u = JSON.parse(localStorage.getItem('airos_user') || '{}');
      setCurrentUser(u);
    } catch {}

    // Check trial status
    const trialEnd = localStorage.getItem('airos_trial_end');
    if (trialEnd) {
      const now = Date.now();
      const end = parseInt(trialEnd, 10);
      const msLeft = end - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      setTrialInfo({ daysLeft, isExpired: msLeft <= 0, isTrialUser: true });
    }

    return () => clearInterval(t);
  }, []);

  async function handleUpgrade(plan) {
    setUpgradeLoading(plan);
    const user = JSON.parse(localStorage.getItem('airos_user') || '{}');
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { alert(data.error || 'Something went wrong'); setUpgradeLoading(null); }
    } catch {
      alert('Could not connect to payment server');
      setUpgradeLoading(null);
    }
  }

  const isActive = item => item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const pageLabel = NAV.find(n => isActive(n))?.label ?? 'Dashboard';
  const userInitial = currentUser?.name?.[0]?.toUpperCase() || 'U';
  const isConversationsPage = pathname.startsWith('/dashboard/conversations');

  const S = {
    root:  { display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' },
    aside: {
      width: collapsed ? 62 : 'var(--sidebar-w)',
      flexShrink: 0, transition: 'width 0.22s ease',
      display:'flex', flexDirection:'column',
      background:'linear-gradient(180deg, rgba(11,18,32,0.98), rgba(5,8,22,0.98))', borderRight:'1px solid var(--b1)',
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
      background:'rgba(11,18,32,0.86)', backdropFilter:'blur(20px)',
    },
  };

  return (
    <div style={S.root}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={S.aside}>
        {/* Logo */}
        <div style={S.logoRow}>
          {collapsed ? (
            <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'linear-gradient(135deg,#ff7a18,#ff3d00)', color:'#fff',
              fontWeight:800, fontSize:15, letterSpacing:'-0.03em' }}>
              C
            </div>
          ) : (
            <Logo href="/" size="lg" />
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
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#ff5a1f', flexShrink:0 }} />
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div style={S.bottomBar}>
          {/* User card */}
          {!collapsed && currentUser?.name && (
            <div style={{ padding:'10px 12px', borderRadius:10, marginBottom:4,
              background:'rgba(255,90,31,0.06)', border:'1px solid rgba(255,90,31,0.16)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,#ff7a18,#ff3d00)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:700, fontSize:12 }}>
                  {userInitial}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentUser.name}</div>
                  <div style={{ fontSize:11, color:'var(--t4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentUser.company || currentUser.email}</div>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="nav-item"
            style={{ justifyContent: collapsed?'center':undefined,
              width:'100%', background:'none', border:'1px solid transparent', cursor:'pointer' }}>
            <span style={{ fontSize:13 }}>{collapsed ? '→' : '←'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={() => { clearToken(); localStorage.removeItem('airos_user'); localStorage.removeItem('airos_trial_end'); router.push('/login'); }} className="nav-item"
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
            <span style={{ fontSize:12, color:'var(--t4)' }}>ChatOrAI</span>
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
                background:'#ff5a1f', border:'1.5px solid var(--bg2)' }} />
            </button>
            <div style={{ width:34, height:34, borderRadius:'50%',
              background:'linear-gradient(135deg,#ff7a18,#ff3d00)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0 }}>
              {userInitial}
            </div>
          </div>
        </header>

        {demo && (
          <div style={{ background:'rgba(255,90,31,0.08)', borderBottom:'1px solid rgba(255,90,31,0.18)',
            padding:'8px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0, fontSize:13 }}>
            <span style={{ color:'#ffb48a' }}>
              🚀 <strong>Demo mode</strong> — exploring with sample data.{' '}
              <Link href="/signup" style={{ color:'#ffd0b8', textDecoration:'underline', fontWeight:600 }}>
                Create a free account
              </Link>{' '}
              to connect real channels.
            </span>
            <span style={{ fontSize:11, color:'var(--t4)', fontFamily:'monospace' }}>preview@demo.chatorai.local</span>
          </div>
        )}

        {/* Trial banner — shows when active trial */}
        {trialInfo?.isTrialUser && !trialInfo.isExpired && (
          <div style={{ background:'rgba(245,158,11,0.08)', borderBottom:'1px solid rgba(245,158,11,0.2)',
            padding:'8px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0, fontSize:13 }}>
            <span style={{ color:'#fcd34d' }}>
              ⏳ <strong>Free trial</strong> — {trialInfo.daysLeft > 0 ? `${trialInfo.daysLeft} day${trialInfo.daysLeft !== 1 ? 's' : ''} remaining` : 'expires today'}.
              Upgrade to keep your account active.
            </span>
            <button onClick={() => handleUpgrade('pro')} disabled={!!upgradeLoading}
              style={{ padding:'6px 18px', borderRadius:8, border:'none', cursor:'pointer',
                background:'#f59e0b', color:'#000', fontWeight:700, fontSize:12, opacity: upgradeLoading ? 0.7 : 1 }}>
              {upgradeLoading ? 'Loading…' : 'Upgrade Now'}
            </button>
          </div>
        )}

        <main style={{ flex:1, overflowY: isConversationsPage ? 'hidden' : 'auto', overflowX:'hidden', position:'relative', minHeight:0 }}>
          {/* Trial expired overlay */}
          {trialInfo?.isExpired && (
            <div style={{ position:'absolute', inset:0, zIndex:100,
              background:'rgba(7,7,16,0.92)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center', maxWidth:480, padding:40 }}>
                <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
                <h2 style={{ fontSize:26, fontWeight:800, color:'var(--t1)', marginBottom:8, letterSpacing:'-0.03em' }}>
                  Your trial has ended
                </h2>
                <p style={{ fontSize:15, color:'var(--t3)', marginBottom:32, lineHeight:1.6 }}>
                  Your 7-day free trial has expired. Upgrade to a paid plan to continue using ChatOrAI and keep all your data.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { plan:'starter', label:'Starter', price:'€49/mo', desc:'1 channel · 500 conv/mo' },
                    { plan:'pro',     label:'Pro',     price:'€149/mo', desc:'All channels · 5,000 conv/mo', popular:true },
                    { plan:'enterprise', label:'Enterprise', price:'€299/mo', desc:'Unlimited everything' },
                  ].map(p => (
                    <button key={p.plan} onClick={() => handleUpgrade(p.plan)} disabled={!!upgradeLoading}
                      style={{ padding:'14px 20px', borderRadius:12, border:'none', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        background: p.popular ? '#ff5a1f' : 'rgba(255,255,255,0.06)',
                        opacity: upgradeLoading === p.plan ? 0.7 : 1,
                        border: p.popular ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontWeight:700, color: p.popular ? '#fff' : 'var(--t1)', fontSize:14 }}>
                        {upgradeLoading === p.plan ? 'Redirecting…' : p.label}
                        {p.popular && <span style={{ marginLeft:8, fontSize:10, background:'rgba(255,255,255,0.2)', padding:'2px 8px', borderRadius:99 }}>POPULAR</span>}
                      </span>
                      <span style={{ fontSize:13, color: p.popular ? 'rgba(255,255,255,0.8)' : 'var(--t3)' }}>
                        {p.price} · {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
                <p style={{ marginTop:20, fontSize:12, color:'var(--t4)' }}>
                  Need help?{' '}
                  <a href="mailto:support@chatorai.com" style={{ color:'#ffb48a' }}>Contact support</a>
                </p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
