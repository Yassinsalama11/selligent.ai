'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/adminApi';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'platform_admin',
  isActive: true,
};

export default function AdminTeamPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      setLoading(true);
      const data = await adminApi.get('/api/admin/team');
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (err) {
      toast.error(err.message || 'Could not load team');
    } finally {
      setLoading(false);
    }
  }

  async function addMember() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const data = await adminApi.post('/api/admin/team', form);
      setMembers((current) => [...current, data.member]);
      setForm(EMPTY_FORM);
      toast.success('Team member added');
      if (data.generatedPassword) {
        window.alert(`Team member created.\nTemporary password: ${data.generatedPassword}`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not create team member');
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(member, patch) {
    try {
      const data = await adminApi.patch(`/api/admin/team/${encodeURIComponent(member.id)}`, patch);
      setMembers((current) => current.map((entry) => entry.id === member.id ? data.member : entry));
      toast.success('Team member updated');
    } catch (err) {
      toast.error(err.message || 'Could not update team member');
    }
  }

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
          Team Management
        </h1>
        <p style={{ fontSize:13, color:'var(--t4)' }}>
          Create platform admins, assign roles, and activate or deactivate access without touching the database manually.
        </p>
      </div>

      <section style={{ padding:'20px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)', display:'grid', gridTemplateColumns:'1fr 1fr 180px 140px 150px', gap:12, alignItems:'end' }}>
        <label style={labelStyle}>
          <span style={labelText}>Name</span>
          <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Role</span>
          <select value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))} style={inputStyle}>
            <option value="platform_admin">Platform Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>
        <label style={labelStyle}>
          <span style={labelText}>Status</span>
          <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.value === 'active' }))} style={inputStyle}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button className="btn btn-primary" onClick={addMember} disabled={saving}>
          {saving ? 'Adding…' : '+ Add User'}
        </button>
        <label style={{ ...labelStyle, gridColumn:'1 / span 2' }}>
          <span style={labelText}>Password</span>
          <input type="password" value={form.password} placeholder="Leave blank to generate a temporary password" onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} style={inputStyle} />
        </label>
      </section>

      <section style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.1fr 170px 150px 120px', gap:12, padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span style={{ textAlign:'right' }}>Actions</span>
        </div>
        {loading && <div style={{ padding:'18px 16px', color:'var(--t4)', fontSize:13 }}>Loading team…</div>}
        {!loading && members.map((member) => (
          <div key={member.id} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.1fr 170px 150px 120px', gap:12, padding:'14px 16px', borderTop:'1px solid var(--b1)', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{member.name}</p>
              <p style={{ fontSize:11.5, color:'var(--t4)' }}>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'No date'}</p>
            </div>
            <p style={{ fontSize:12.5, color:'var(--t2)' }}>{member.email}</p>
            <select value={member.role} onChange={(e) => updateMember(member, { role: e.target.value, isActive: member.isActive, name: member.name })} style={inputStyle}>
              <option value="platform_admin">Platform Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select value={member.isActive ? 'active' : 'inactive'} onChange={(e) => updateMember(member, { role: member.role, isActive: e.target.value === 'active', name: member.name })} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => updateMember(member, { role: member.role, isActive: !member.isActive, name: member.name })}>
                {member.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const inputStyle = {
  width:'100%',
  padding:'10px 13px',
  borderRadius:10,
  fontSize:13,
  background:'rgba(255,255,255,0.04)',
  border:'1px solid rgba(255,255,255,0.1)',
  color:'var(--t1)',
  outline:'none',
  boxSizing:'border-box',
};

const labelStyle = {
  display:'flex',
  flexDirection:'column',
  gap:6,
};

const labelText = {
  fontSize:12,
  color:'var(--t4)',
  fontWeight:700,
};
