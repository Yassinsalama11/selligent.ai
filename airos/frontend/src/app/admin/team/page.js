'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import toast from 'react-hot-toast';

const ROLES = ['Super Admin', 'Admin', 'Support', 'Developer'];

const ROLE_COLORS = {
  'Super Admin': '#f59e0b',
  'Admin':       '#6366f1',
  'Support':     '#06b6d4',
  'Developer':   '#34d399',
};

const ROLE_PERMS = {
  'Super Admin': ['All access', 'Manage team', 'Billing', 'Delete clients', 'System config'],
  'Admin':       ['Manage clients', 'Billing', 'Logs', 'System health'],
  'Support':     ['View clients', 'Logs', 'Activity feed'],
  'Developer':   ['System health', 'Logs', 'API access', 'Webhooks'],
};

const DEFAULT_TEAM = [
  { id:'u1', name:'Yassin Al-Masri', email:'yassin@chatorai.com', role:'Super Admin', avatar:'Y', status:'active',  lastActive:'Just now',   joined:'Jan 2025' },
  { id:'u2', name:'Sara Hassan',     email:'sara@chatorai.com',   role:'Admin',       avatar:'S', status:'active',  lastActive:'2h ago',      joined:'Feb 2025' },
  { id:'u3', name:'Omar Khalil',     email:'omar@chatorai.com',   role:'Support',     avatar:'O', status:'active',  lastActive:'Yesterday',   joined:'Mar 2025' },
  { id:'u4', name:'Nour Adel',       email:'nour@chatorai.com',   role:'Developer',   avatar:'N', status:'active',  lastActive:'3 days ago',  joined:'Mar 2025' },
];

const inputStyle = {
  width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--t1)', outline: 'none', boxSizing: 'border-box',
};

function Pill({ color, children }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99,
      background:`${color}18`, color, border:`1px solid ${color}28` }}>
      {children}
    </span>
  );
}

export default function AdminTeam() {
  const [team, setTeam]           = useState(DEFAULT_TEAM);
  const [me, setMe]               = useState(null);
  const [addModal, setAddModal]   = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm]           = useState({ name:'', email:'', role:'Support', password:'' });
  const [showPw, setShowPw]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('adminTeam') || 'null');
      if (stored?.length) setTeam(stored);
      const auth = JSON.parse(localStorage.getItem('adminAuth') || 'null');
      setMe(auth);
    } catch {}
  }, []);

  function openAdd() {
    setForm({ name:'', email:'', role:'Support', password:'' });
    setEditMember(null);
    setAddModal(true);
  }

  function openEdit(member) {
    setForm({ name:member.name, email:member.email, role:member.role, password:'' });
    setEditMember(member);
    setAddModal(true);
  }

  function saveTeam(updated) {
    setTeam(updated);
    localStorage.setItem('adminTeam', JSON.stringify(updated));
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email required');
    if (!editMember && !form.password.trim()) return toast.error('Password required for new members');

    if (editMember) {
      // Edit existing
      const updated = team.map(m => m.id === editMember.id
        ? { ...m, name:form.name.trim(), email:form.email.trim(), role:form.role,
            avatar:form.name.trim()[0].toUpperCase() }
        : m);
      saveTeam(updated);
      toast.success('Member updated');
    } else {
      // Check duplicate email
      if (team.find(m => m.email.toLowerCase() === form.email.trim().toLowerCase())) {
        return toast.error('Email already exists');
      }
      const newMember = {
        id: `u${Date.now()}`,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        avatar: form.name.trim()[0].toUpperCase(),
        status: 'active',
        lastActive: 'Never',
        joined: new Date().toLocaleDateString('en-US', { month:'short', year:'numeric' }),
      };
      saveTeam([...team, newMember]);
      toast.success(`${newMember.name} added to team`);
    }
    setAddModal(false);
  }

  function handleDelete(member) {
    if (member.role === 'Super Admin' && team.filter(m => m.role === 'Super Admin').length === 1) {
      return toast.error('Cannot remove the last Super Admin');
    }
    const updated = team.filter(m => m.id !== member.id);
    saveTeam(updated);
    setConfirmDel(null);
    toast.success(`${member.name} removed`);
  }

  function toggleStatus(member) {
    const next = member.status === 'active' ? 'suspended' : 'active';
    const updated = team.map(m => m.id === member.id ? {...m, status:next} : m);
    saveTeam(updated);
    toast.success(`${member.name} ${next}`);
  }

  const isSuperAdmin = me?.role === 'Super Admin';

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:22 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em',
            color:'var(--t1)', marginBottom:4 }}>Team Members</h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            Manage ChatOrAI staff access and roles · {team.filter(m=>m.status==='active').length} active members
          </p>
        </div>
        {isSuperAdmin && (
          <button onClick={openAdd}
            style={{ padding:'9px 18px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
              background:'#f59e0b', border:'none', color:'#000' }}>
            + Add Member
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {ROLES.map(role => {
          const count = team.filter(m => m.role === role).length;
          const color = ROLE_COLORS[role];
          return (
            <div key={role} style={{ padding:'16px 18px', borderRadius:14,
              background:'var(--bg2)', border:`1px solid ${color}22` }}>
              <p style={{ fontSize:22, fontWeight:800, color, marginBottom:3 }}>{count}</p>
              <p style={{ fontSize:12, color:'var(--t4)' }}>{role}</p>
            </div>
          );
        })}
      </div>

      {/* Team table */}
      <div style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 130px 120px 120px 100px',
          padding:'10px 20px', fontSize:11, fontWeight:700, color:'var(--t4)',
          textTransform:'uppercase', letterSpacing:'0.07em',
          borderBottom:'1px solid var(--b1)', gap:8 }}>
          <span>Member</span>
          <span>Email</span>
          <span>Role</span>
          <span>Last Active</span>
          <span>Joined</span>
          <span style={{ textAlign:'right' }}>Actions</span>
        </div>

        {team.map((member, i) => {
          const color = ROLE_COLORS[member.role];
          const isMe  = me?.email === member.email;
          return (
            <div key={member.id}
              style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 130px 120px 120px 100px',
                padding:'14px 20px', gap:8, alignItems:'center',
                borderBottom: i < team.length-1 ? '1px solid var(--b1)' : 'none',
                background: member.status==='suspended' ? 'rgba(239,68,68,0.03)' : 'transparent',
                opacity: member.status==='suspended' ? 0.6 : 1 }}>

              {/* Name */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(135deg,${color}cc,${color}66)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:800, fontSize:14 }}>
                  {member.avatar}
                </div>
                <div>
                  <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>
                    {member.name}
                    {isMe && <span style={{ fontSize:10.5, marginLeft:6, color:'#f59e0b',
                      fontWeight:700 }}>(you)</span>}
                  </p>
                  {member.status === 'suspended' && (
                    <span style={{ fontSize:10.5, color:'#f87171', fontWeight:600 }}>Suspended</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <span style={{ fontSize:12.5, color:'var(--t4)', fontFamily:'monospace' }}>
                {member.email}
              </span>

              {/* Role */}
              <Pill color={color}>{member.role}</Pill>

              {/* Last active */}
              <span style={{ fontSize:12.5, color:'var(--t3)' }}>{member.lastActive}</span>

              {/* Joined */}
              <span style={{ fontSize:12.5, color:'var(--t4)' }}>{member.joined}</span>

              {/* Actions */}
              <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                {isSuperAdmin && !isMe && (
                  <>
                    <button onClick={() => openEdit(member)}
                      style={{ fontSize:11.5, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                        background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
                        color:'#818cf8', fontWeight:600 }}>
                      Edit
                    </button>
                    <button onClick={() => toggleStatus(member)}
                      style={{ fontSize:11.5, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                        background: member.status==='active'
                          ? 'rgba(251,191,36,0.07)' : 'rgba(52,211,153,0.07)',
                        border: `1px solid ${member.status==='active'
                          ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'}`,
                        color: member.status==='active' ? '#fbbf24' : '#34d399', fontWeight:600 }}>
                      {member.status==='active' ? 'Suspend' : 'Restore'}
                    </button>
                    <button onClick={() => setConfirmDel(member)}
                      style={{ fontSize:11.5, padding:'4px 8px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)',
                        color:'#fca5a5', fontWeight:600 }}>
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role permissions reference */}
      <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>
          Role Permissions
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {ROLES.map(role => {
            const color = ROLE_COLORS[role];
            return (
              <div key={role} style={{ padding:'14px 16px', borderRadius:10,
                background:'var(--s1)', border:`1px solid ${color}20` }}>
                <p style={{ fontSize:13, fontWeight:700, color, marginBottom:10 }}>{role}</p>
                {ROLE_PERMS[role].map(p => (
                  <div key={p} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:color,
                      flexShrink:0, opacity:0.7 }} />
                    <span style={{ fontSize:12, color:'var(--t3)' }}>{p}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal open={addModal} title={editMember ? 'Edit Member' : 'Add Team Member'}
        onClose={() => setAddModal(false)} width={460}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600,
              color:'var(--t4)', marginBottom:5 }}>Full Name</label>
            <input style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({...f, name:e.target.value}))}
              placeholder="Sara Hassan" autoFocus />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600,
              color:'var(--t4)', marginBottom:5 }}>Email</label>
            <input style={inputStyle} type="email" value={form.email}
              onChange={e => setForm(f => ({...f, email:e.target.value}))}
              placeholder="sara@chatorai.com" />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600,
              color:'var(--t4)', marginBottom:5 }}>Role</label>
            <select style={{ ...inputStyle, cursor:'pointer' }} value={form.role}
              onChange={e => setForm(f => ({...f, role:e.target.value}))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600,
              color:'var(--t4)', marginBottom:5 }}>
              Password {editMember && <span style={{ color:'var(--t4)', fontWeight:400 }}>(leave blank to keep current)</span>}
            </label>
            <div style={{ position:'relative' }}>
              <input style={{ ...inputStyle, paddingRight:44 }}
                type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({...f, password:e.target.value}))}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  color:'var(--t4)', fontSize:15 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Role preview */}
          <div style={{ padding:'10px 13px', borderRadius:9,
            background:`${ROLE_COLORS[form.role]}08`,
            border:`1px solid ${ROLE_COLORS[form.role]}22` }}>
            <p style={{ fontSize:11.5, fontWeight:600, color:ROLE_COLORS[form.role], marginBottom:5 }}>
              {form.role} Permissions
            </p>
            <p style={{ fontSize:11.5, color:'var(--t4)', lineHeight:1.7 }}>
              {ROLE_PERMS[form.role].join(' · ')}
            </p>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleSave}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none',
                background:'#f59e0b', color:'#000', fontWeight:800, fontSize:13, cursor:'pointer' }}>
              {editMember ? '✓ Save Changes' : '+ Add Member'}
            </button>
            <button onClick={() => setAddModal(false)}
              style={{ padding:'11px 18px', borderRadius:10, cursor:'pointer', fontSize:13,
                background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t3)' }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal open={!!confirmDel} title="Remove Member" onClose={() => setConfirmDel(null)} width={400}>
        {confirmDel && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <p style={{ fontSize:14, color:'var(--t2)', lineHeight:1.6 }}>
              Are you sure you want to remove <strong style={{ color:'var(--t1)' }}>{confirmDel.name}</strong> from the team?
              They will lose access immediately.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => handleDelete(confirmDel)}
                style={{ flex:1, padding:'11px', borderRadius:10, border:'none',
                  background:'#ef4444', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                Yes, Remove
              </button>
              <button onClick={() => setConfirmDel(null)}
                style={{ padding:'11px 18px', borderRadius:10, cursor:'pointer', fontSize:13,
                  background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t3)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
