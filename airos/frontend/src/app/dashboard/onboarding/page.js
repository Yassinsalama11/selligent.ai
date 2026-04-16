'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';

const FIELDS = [
  ['businessName', 'Business name'],
  ['vertical', 'Vertical'],
  ['primaryLanguage', 'Primary language'],
  ['primaryDialect', 'Primary dialect'],
  ['tone', 'Reply tone'],
  ['openingHours', 'Opening hours'],
];

function emptyProfile() {
  return {
    businessName: '',
    vertical: '',
    offerings: [],
    policies: [],
    tone: '',
    primaryLanguage: '',
    primaryDialect: '',
    openingHours: '',
    locations: [],
    faqCandidates: [],
    brandVoiceNotes: '',
  };
}

function lines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function parseLines(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function Step({ label, done }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, background:done ? 'rgba(52,211,153,0.08)' : 'var(--s1)', border:`1px solid ${done ? 'rgba(52,211,153,0.2)' : 'var(--b1)'}` }}>
      <span style={{ width:24, height:24, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', background:done ? '#10b981' : 'var(--s3)', color:done ? '#001b12' : 'var(--t3)', fontWeight:900 }}>
        {done ? '✓' : '•'}
      </span>
      <span style={{ fontSize:13, fontWeight:700, color:done ? '#86efac' : 'var(--t3)' }}>{label}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [profile, setProfile] = useState(emptyProfile());

  async function load() {
    setLoading(true);
    try {
      const data = await api.get('/api/onboarding/progress');
      const nextOnboarding = data?.onboarding || {};
      setOnboarding(nextOnboarding);
      setProfile({
        ...emptyProfile(),
        ...(nextOnboarding.profile?.profile || {}),
      });
    } catch (err) {
      toast.error(err.message || 'Could not load onboarding');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateProfile(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(status = 'reviewed') {
    setSaving(true);
    try {
      const saved = await api.put('/api/business-profile', { profile, status });
      setProfile({ ...emptyProfile(), ...(saved.profile || {}) });
      toast.success('Business profile saved');
    } catch (err) {
      toast.error(err.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  async function regenerateProfile() {
    setSaving(true);
    try {
      const regenerated = await api.post('/api/business-profile/regenerate', {});
      setProfile({ ...emptyProfile(), ...(regenerated.profile || {}) });
      toast.success('Profile regenerated from knowledge base');
    } catch (err) {
      toast.error(err.message || 'Could not regenerate profile');
    } finally {
      setSaving(false);
    }
  }

  async function launchWorkspace() {
    setSaving(true);
    try {
      await api.post('/api/onboarding/complete', { profile });
      toast.success('Workspace launched');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not complete onboarding');
    } finally {
      setSaving(false);
    }
  }

  const steps = onboarding?.steps || {};
  const job = onboarding?.latestJob;
  const launched = onboarding?.status === 'completed' || steps.launch;

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:22, maxWidth:1180 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, marginBottom:6 }}>Review and Launch</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>
            Finalize the generated workspace before your AI goes live.
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading || saving}>Refresh</button>
          <Link className="btn btn-ghost btn-sm" href="/dashboard/migrations">Import helpdesk data</Link>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        <Step label="Account" done={steps.account} />
        <Step label="Presence" done={steps.presence} />
        <Step label="Knowledge" done={steps.ingestion} />
        <Step label="Profile" done={steps.profile} />
        <Step label="Launch" done={steps.launch} />
      </div>

      {job && (
        <div style={{ padding:'16px 18px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', gap:16 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:'var(--t1)' }}>Knowledge ingestion</p>
            <p style={{ fontSize:12, color:'var(--t4)', marginTop:4 }}>{job.source_url}</p>
          </div>
          <div style={{ display:'flex', gap:18, alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#818cf8', fontWeight:800, textTransform:'capitalize' }}>{job.status}</span>
            <span style={{ fontSize:12, color:'var(--t3)' }}>{job.pages_seen || 0} pages</span>
            <span style={{ fontSize:12, color:'var(--t3)' }}>{job.chunks_stored || 0} chunks</span>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:18 }}>
        <section style={{ padding:'22px', borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:900 }}>Business Understanding</h2>
              <p style={{ fontSize:12, color:'var(--t4)', marginTop:4 }}>Edit the profile used in AI instructions and retrieval.</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={regenerateProfile} disabled={saving || loading}>Regenerate</button>
          </div>

          {loading ? (
            <p style={{ fontSize:13, color:'var(--t4)' }}>Loading generated profile...</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {FIELDS.map(([key, label]) => (
                  <label key={key} style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, color:'var(--t4)', fontWeight:700 }}>
                    {label}
                    <input className="input" value={profile[key] || ''} onChange={(event) => updateProfile(key, event.target.value)} />
                  </label>
                ))}
              </div>
              <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, color:'var(--t4)', fontWeight:700 }}>
                Offerings, one per line
                <textarea className="input" rows={5} value={lines(profile.offerings)} onChange={(event) => updateProfile('offerings', parseLines(event.target.value))} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, color:'var(--t4)', fontWeight:700 }}>
                FAQ candidates, one per line
                <textarea className="input" rows={4} value={lines(profile.faqCandidates)} onChange={(event) => updateProfile('faqCandidates', parseLines(event.target.value))} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, color:'var(--t4)', fontWeight:700 }}>
                Brand voice notes
                <textarea className="input" rows={4} value={profile.brandVoiceNotes || ''} onChange={(event) => updateProfile('brandVoiceNotes', event.target.value)} />
              </label>
            </div>
          )}
        </section>

        <aside style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'22px', borderRadius:18, background:'linear-gradient(160deg,rgba(99,102,241,0.14),rgba(6,182,212,0.06))', border:'1px solid rgba(99,102,241,0.24)' }}>
            <p style={{ fontSize:12, color:'#a5b4fc', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Workspace status</p>
            <h2 style={{ fontSize:28, fontWeight:900, marginBottom:8 }}>{launched ? 'Live' : 'Draft'}</h2>
            <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>
              {launched ? 'Onboarding is complete. Your profile remains editable.' : 'Save the profile and launch when the knowledge and tone are correct.'}
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => saveProfile('reviewed')} disabled={saving || loading}>
            Save Profile
          </button>
          <button className="btn btn-ghost" onClick={launchWorkspace} disabled={saving || loading || launched}>
            {launched ? 'Already Launched' : 'Launch Workspace'}
          </button>
        </aside>
      </div>
    </div>
  );
}
