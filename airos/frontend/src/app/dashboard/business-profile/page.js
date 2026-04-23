'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';

function blankProfile() {
  return {
    businessName: '',
    businessCategory: '',
    businessModel: '',
    vertical: '',
    tone: '',
    primaryLanguage: '',
    primaryDialect: '',
    offerings: [],
    locations: [],
    faqCandidates: [],
    faqs: [],
    knowledge: [],
    policies: [],
    supportStyle: '',
    brandVoiceNotes: '',
  };
}

function toLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function fromLines(value) {
  return String(value || '').split('\n').map((entry) => entry.trim()).filter(Boolean);
}

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState(blankProfile());
  const [status, setStatus] = useState('empty');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await api.get('/api/business-profile');
      setProfile({ ...blankProfile(), ...(data.profile || {}) });
      setStatus(data.status || 'draft');
    } catch (err) {
      toast.error(err.message || 'Could not load business profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function update(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await api.put('/api/business-profile', { profile, status: 'reviewed' });
      setProfile({ ...blankProfile(), ...(saved.profile || {}) });
      setStatus(saved.status || 'reviewed');
      toast.success('Business profile saved');
    } catch (err) {
      toast.error(err.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    setSaving(true);
    try {
      const data = await api.post('/api/business-profile/regenerate', {});
      setProfile({ ...blankProfile(), ...(data.profile || {}) });
      setStatus(data.status || 'draft');
      toast.success('Profile regenerated');
    } catch (err) {
      toast.error(err.message || 'Could not regenerate profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding:'28px', maxWidth:980, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, marginBottom:6 }}>Business Profile</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>
            Human-reviewed business understanding document for AI replies and onboarding.
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={saving || loading}>Regenerate</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || loading}>Save</button>
        </div>
      </div>

      <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t3)', fontSize:12 }}>
        Status: <strong style={{ color:status === 'reviewed' ? '#34d399' : '#fbbf24', textTransform:'capitalize' }}>{status}</strong>
        <span style={{ marginLeft:10, color:'var(--t4)' }}>This profile is injected into AI context on every reply.</span>
      </div>

      <section style={{ padding:'22px', borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        {loading ? (
          <p style={{ color:'var(--t4)', fontSize:13 }}>Loading profile...</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                ['businessName', 'Business name'],
                ['businessCategory', 'Business category'],
                ['businessModel', 'Business model'],
                ['vertical', 'Vertical'],
                ['tone', 'Tone'],
                ['primaryLanguage', 'Language'],
                ['primaryDialect', 'Dialect'],
                ['supportStyle', 'Support style'],
              ].map(([key, label]) => (
                <label key={key} style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
                  {label}
                  <input className="input" value={profile[key] || ''} onChange={(event) => update(key, event.target.value)} />
                </label>
              ))}
            </div>
            <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
              Offerings
              <textarea className="input" rows={5} value={toLines(profile.offerings)} onChange={(event) => update('offerings', fromLines(event.target.value))} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
              Locations
              <textarea className="input" rows={3} value={toLines(profile.locations)} onChange={(event) => update('locations', fromLines(event.target.value))} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
              FAQ candidates
              <textarea className="input" rows={5} value={toLines(profile.faqCandidates)} onChange={(event) => update('faqCandidates', fromLines(event.target.value))} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
              FAQs
              <textarea className="input" rows={6} value={toLines((profile.faqs || []).map((entry) => `${entry.question || ''} | ${entry.answer || ''}`))}
                onChange={(event) => update('faqs', fromLines(event.target.value).map((line) => {
                  const [question, answer] = line.split('|').map((item) => item.trim());
                  return { question, answer };
                }))} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
              Knowledge base notes
              <textarea className="input" rows={6} value={toLines((profile.knowledge || []).map((entry) => entry.content || entry))}
                onChange={(event) => update('knowledge', fromLines(event.target.value).map((content) => ({ content })))} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:700, color:'var(--t4)' }}>
              Brand voice notes
              <textarea className="input" rows={5} value={profile.brandVoiceNotes || ''} onChange={(event) => update('brandVoiceNotes', event.target.value)} />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}
