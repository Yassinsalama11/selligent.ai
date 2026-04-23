'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';

export default function PromptsPage() {
  const { data, loading, error, reload } = usePollingResource(async () => {
    const prompts = await api.get('/api/prompts');
    return Array.isArray(prompts) ? prompts : [];
  }, [], { intervalMs: 60000, initialData: [] });

  const prompts = data || [];
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [testInput, setTestInput] = useState('Customer asks if the product is in stock and when it can be delivered.');
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const activePrompt = useMemo(() => (
    prompts.find((entry) => entry.id === selectedPromptId) || prompts[0] || null
  ), [prompts, selectedPromptId]);

  useEffect(() => {
    const currentVersion = activePrompt?.versions?.find((entry) => entry.version === activePrompt?.pinnedVersion)
      || activePrompt?.versions?.[0];
    setDraftContent(currentVersion?.content || '');
    setTestResult(null);
  }, [activePrompt]);

  async function savePrompt() {
    if (!activePrompt) return;
    setSaving(true);
    try {
      await api.put(`/api/prompts/${activePrompt.id}`, { content: draftContent });
      toast.success('Prompt version saved');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not save prompt');
    } finally {
      setSaving(false);
    }
  }

  async function testPrompt() {
    if (!activePrompt) return;
    setTesting(true);
    try {
      const result = await api.post(`/api/prompts/${activePrompt.id}/test`, {
        input: testInput,
        version: activePrompt.pinnedVersion,
        runModel: true,
      });
      setTestResult(result);
    } catch (err) {
      toast.error(err.message || 'Could not test prompt');
    } finally {
      setTesting(false);
    }
  }

  async function rollback(version) {
    if (!activePrompt) return;
    try {
      await api.post(`/api/prompts/${activePrompt.id}/rollback`, { version });
      toast.success(`Pinned ${activePrompt.id} to ${version}`);
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not rollback prompt');
    }
  }

  return (
    <div style={{ padding:'28px', display:'grid', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, marginBottom:6 }}>Prompt Registry</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>
            Tenant-scoped prompt control with version save, rollback, and live test output.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
      </div>

      {error && (
        <div style={{ padding:'12px 14px', borderRadius:12, border:'1px solid rgba(239,68,68,0.15)', background:'rgba(239,68,68,0.08)', color:'#fca5a5', fontSize:12.5 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color:'var(--t4)', fontSize:13 }}>Loading prompts…</div>
      ) : prompts.length === 0 ? (
        <div style={{ color:'var(--t4)', fontSize:13 }}>No prompt registry entries found for this tenant.</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'280px minmax(0,1fr)', gap:16 }}>
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>Prompt IDs</div>
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedPromptId(prompt.id)}
                style={{
                  width:'100%',
                  textAlign:'left',
                  padding:'14px 16px',
                  borderRadius:14,
                  border: prompt.id === activePrompt?.id ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--b1)',
                  background: prompt.id === activePrompt?.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  cursor:'pointer',
                }}
              >
                <div style={{ fontSize:13.5, fontWeight:800, color:'var(--t1)' }}>{prompt.id}</div>
                <div style={{ fontSize:11.5, color:'var(--t4)', marginTop:6 }}>
                  Current {prompt.version} · Pinned {prompt.pinnedVersion}
                </div>
              </button>
            ))}
          </div>

          {activePrompt && (
            <div style={{ display:'grid', gap:16 }}>
              <section className="card" style={{ display:'grid', gap:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:900, color:'var(--t1)' }}>{activePrompt.id}</div>
                    <div style={{ fontSize:12, color:'var(--t4)', marginTop:4 }}>
                      Editing the pinned version baseline. Saving creates a new tenant version and pins it.
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#6366f1', fontWeight:700 }}>Pinned: {activePrompt.pinnedVersion}</div>
                </div>

                <textarea
                  className="input"
                  rows={14}
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  style={{ minHeight:280, resize:'vertical', fontFamily:'monospace', fontSize:12.5 }}
                />

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDraftContent(activePrompt.versions?.find((entry) => entry.version === activePrompt.pinnedVersion)?.content || '')}>
                    Reset
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={savePrompt} disabled={saving}>
                    {saving ? 'Saving…' : 'Save new version'}
                  </button>
                </div>
              </section>

              <section className="card" style={{ display:'grid', gap:14 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>Preview / Test</div>
                  <div style={{ fontSize:12, color:'var(--t4)', marginTop:4 }}>
                    Send a sample input through the active prompt and inspect the generated output.
                  </div>
                </div>
                <textarea
                  className="input"
                  rows={4}
                  value={testInput}
                  onChange={(event) => setTestInput(event.target.value)}
                  style={{ resize:'vertical' }}
                />
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={testPrompt} disabled={testing}>
                    {testing ? 'Testing…' : 'Run test'}
                  </button>
                </div>
                {testResult && (
                  <div style={{ display:'grid', gap:10 }}>
                    <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)' }}>
                      <div style={{ fontSize:11.5, color:'var(--t4)', marginBottom:6 }}>Rendered prompt</div>
                      <pre style={{ margin:0, whiteSpace:'pre-wrap', fontSize:12, color:'var(--t3)', fontFamily:'monospace' }}>{testResult.renderedPrompt}</pre>
                    </div>
                    <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.16)' }}>
                      <div style={{ fontSize:11.5, color:'var(--t4)', marginBottom:6 }}>Model output</div>
                      <div style={{ fontSize:13, color:'var(--t2)', lineHeight:1.7 }}>{testResult.output || 'No output returned.'}</div>
                    </div>
                  </div>
                )}
              </section>

              <section className="card" style={{ display:'grid', gap:10 }}>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>Version History</div>
                {activePrompt.versions.map((version) => (
                  <div key={version.version} style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', padding:'12px 14px', borderRadius:12, border:'1px solid var(--b1)' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{version.version}</div>
                      <div style={{ fontSize:11.5, color:'var(--t4)', marginTop:4 }}>Hash {String(version.promptHash || '').slice(0, 12)}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" disabled={version.version === activePrompt.pinnedVersion} onClick={() => rollback(version.version)}>
                      {version.version === activePrompt.pinnedVersion ? 'Pinned' : 'Rollback'}
                    </button>
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
