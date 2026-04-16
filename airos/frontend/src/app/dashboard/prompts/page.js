'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';

function buildDiff(baseText = '', compareText = '') {
  const left = String(baseText || '').split('\n');
  const right = String(compareText || '').split('\n');
  const size = Math.max(left.length, right.length);
  const rows = [];

  for (let index = 0; index < size; index += 1) {
    const before = left[index] ?? '';
    const after = right[index] ?? '';
    let type = 'same';

    if (!before && after) type = 'added';
    else if (before && !after) type = 'removed';
    else if (before !== after) type = 'changed';

    rows.push({
      line: index + 1,
      before,
      after,
      type,
    });
  }

  return rows;
}

export default function PromptsPage() {
  const { data, error, loading, reload } = usePollingResource(async () => {
    const prompts = await api.get('/api/prompts');
    return Array.isArray(prompts) ? prompts : [];
  }, [], { intervalMs: 60000, initialData: [] });

  const prompts = data || [];
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedVersions, setSelectedVersions] = useState({});
  const [rollingBack, setRollingBack] = useState(null);

  const activePrompt = useMemo(() => (
    prompts.find((entry) => entry.id === selectedPromptId) || prompts[0] || null
  ), [prompts, selectedPromptId]);

  const compareVersion = activePrompt
    ? selectedVersions[activePrompt.id] || activePrompt.versions?.[0]?.version
    : null;

  const pinnedVersion = activePrompt?.versions?.find((entry) => entry.version === activePrompt?.pinnedVersion) || null;
  const inspectedVersion = activePrompt?.versions?.find((entry) => entry.version === compareVersion) || pinnedVersion;

  const diffRows = useMemo(() => (
    buildDiff(pinnedVersion?.content || '', inspectedVersion?.content || '')
  ), [inspectedVersion, pinnedVersion]);

  async function rollbackPrompt(version) {
    if (!activePrompt || !version) return;

    setRollingBack(`${activePrompt.id}:${version}`);
    try {
      await api.post(`/api/prompts/${activePrompt.id}/rollback`, { version });
      toast.success(`Pinned ${activePrompt.id} to ${version}`);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not rollback prompt');
    } finally {
      setRollingBack(null);
    }
  }

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Prompt Registry</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Versioned backend prompts with tenant pinning and rollback controls.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
      </div>

      {error && (
        <StatusBanner
          tone="error"
          title="Prompt versions could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      {loading ? (
        <LoadingGrid cards={2} />
      ) : prompts.length === 0 ? (
        <EmptyState
          title="No prompt versions available"
          description="Seed the prompt registry in the backend before using rollback controls."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,0.8fr) minmax(0,1.6fr)', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>Prompt IDs</div>
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedPromptId(prompt.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: prompt.id === activePrompt?.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--b1)',
                  background: prompt.id === activePrompt?.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t1)' }}>{prompt.id}</div>
                <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 6 }}>
                  Current {prompt.version} • Pinned {prompt.pinnedVersion}
                </div>
              </button>
            ))}
          </div>

          {activePrompt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--t1)' }}>{activePrompt.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
                      Default version {activePrompt.version} • Tenant pin {activePrompt.pinnedVersion}
                    </div>
                  </div>
                  <select
                    className="input"
                    value={compareVersion || ''}
                    onChange={(event) => setSelectedVersions((current) => ({
                      ...current,
                      [activePrompt.id]: event.target.value,
                    }))}
                    style={{ width: 180 }}
                  >
                    {activePrompt.versions.map((version) => (
                      <option key={version.version} value={version.version}>
                        {version.version}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                  <div style={{ border: '1px solid var(--b1)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Pinned version</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#6366f1' }}>{activePrompt.pinnedVersion}</div>
                  </div>
                  <div style={{ border: '1px solid var(--b1)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Inspecting</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>{compareVersion}</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 14 }}>Version History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activePrompt.versions.map((version) => (
                    <div
                      key={version.version}
                      style={{
                        border: '1px solid var(--b1)',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{version.version}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 4 }}>
                          Hash {String(version.promptHash || '').slice(0, 12)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {version.version === activePrompt.pinnedVersion ? (
                          <span style={{ fontSize: 11.5, color: '#6366f1', fontWeight: 800 }}>Pinned</span>
                        ) : null}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedVersions((current) => ({
                            ...current,
                            [activePrompt.id]: version.version,
                          }))}
                        >
                          View Diff
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={rollingBack === `${activePrompt.id}:${version.version}` || version.version === activePrompt.pinnedVersion}
                          onClick={() => rollbackPrompt(version.version)}
                        >
                          {rollingBack === `${activePrompt.id}:${version.version}` ? 'Pinning…' : 'Rollback'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 14 }}>
                  Diff vs pinned version
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                  {diffRows.map((row) => (
                    <div
                      key={row.line}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${
                          row.type === 'same'
                            ? 'var(--b1)'
                            : row.type === 'added'
                              ? 'rgba(16,185,129,0.2)'
                              : row.type === 'removed'
                                ? 'rgba(249,115,22,0.2)'
                                : 'rgba(99,102,241,0.2)'
                        }`,
                        background: row.type === 'same'
                          ? 'transparent'
                          : row.type === 'added'
                            ? 'rgba(16,185,129,0.06)'
                            : row.type === 'removed'
                              ? 'rgba(249,115,22,0.06)'
                              : 'rgba(99,102,241,0.06)',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 6 }}>Line {row.line}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--t3)', fontSize: 12, fontFamily: 'monospace' }}>
                          {row.before || ' '}
                        </pre>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--t2)', fontSize: 12, fontFamily: 'monospace' }}>
                          {row.after || ' '}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
