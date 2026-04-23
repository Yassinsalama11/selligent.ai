'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/adminApi';

export default function AdminAiPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [tenantUsage, setTenantUsage] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/ai-control')
      .then((data) => {
        if (cancelled) return;
        setConfig(data?.config || null);
        setProviderStatus(data?.providerStatus || null);
        setTenantUsage(Array.isArray(data?.tenantUsage) ? data.tenantUsage : []);
        setAvailableModels(Array.isArray(data?.availableModels) ? data.availableModels : []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Could not load AI control plane');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const providerCredentials = {};
      if (String(config.openaiApiKey || '').trim()) providerCredentials.openaiApiKey = String(config.openaiApiKey).trim();
      if (String(config.anthropicApiKey || '').trim()) providerCredentials.anthropicApiKey = String(config.anthropicApiKey).trim();
      const payload = {
        ...config,
        enabledModels: String(config.enabledModelsText || '').split('\n').map((item) => item.trim()).filter(Boolean),
        providerCredentials,
        defaultModelByPlan: {
          starter: config.starterModel || '',
          growth: config.growthModel || '',
          pro: config.proModel || '',
          enterprise: config.enterpriseModel || '',
        },
        chator: {
          ...(config.chator || {}),
          name: config.chatorName || 'Chator',
          hierarchyMode: config.hierarchyMode || 'platform-defaults',
          tenantIsolation: config.tenantIsolation !== false,
        },
      };
      const response = await adminApi.patch('/api/admin/ai-control', payload);
      setConfig({
        ...response.config,
        enabledModelsText: Array.isArray(response.config.enabledModels) ? response.config.enabledModels.join('\n') : '',
        starterModel: response.config.defaultModelByPlan?.starter || '',
        growthModel: response.config.defaultModelByPlan?.growth || '',
        proModel: response.config.defaultModelByPlan?.pro || '',
        enterpriseModel: response.config.defaultModelByPlan?.enterprise || '',
        chatorName: response.config.chator?.name || 'Chator',
        hierarchyMode: response.config.chator?.hierarchyMode || 'platform-defaults',
        tenantIsolation: response.config.chator?.tenantIsolation !== false,
        openaiApiKey: '',
        anthropicApiKey: '',
      });
      toast.success('AI control plane updated');
    } catch (err) {
      toast.error(err.message || 'Could not update AI settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding:'28px', color:'var(--t4)', fontSize:13 }}>Loading AI control plane…</div>;
  }

  if (!config) return null;

  const form = {
    ...config,
    enabledModelsText: config.enabledModelsText ?? (Array.isArray(config.enabledModels) ? config.enabledModels.join('\n') : ''),
    starterModel: config.starterModel ?? config.defaultModelByPlan?.starter ?? '',
    growthModel: config.growthModel ?? config.defaultModelByPlan?.growth ?? '',
    proModel: config.proModel ?? config.defaultModelByPlan?.pro ?? '',
    enterpriseModel: config.enterpriseModel ?? config.defaultModelByPlan?.enterprise ?? '',
    chatorName: config.chatorName ?? config.chator?.name ?? 'Chator',
    hierarchyMode: config.hierarchyMode ?? config.chator?.hierarchyMode ?? 'platform-defaults',
    tenantIsolation: config.tenantIsolation ?? config.chator?.tenantIsolation !== false,
  };

  const setField = (field, value) => setConfig((current) => ({ ...current, [field]: value }));
  const modelOptions = availableModels.length ? availableModels : ['gpt-5.4-mini', 'gpt-5.4'];

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
          AI Control Plane
        </h1>
        <p style={{ fontSize:13, color:'var(--t4)' }}>
          Central provider, model, safety, and Chator hierarchy defaults for all tenant agents.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:16 }}>
        <section style={cardStyle}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 }}>
            <label style={labelStyle}>
              <span style={labelText}>Provider</span>
              <select value={form.provider} onChange={(e) => setField('provider', e.target.value)} style={inputStyle}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Safety mode</span>
              <select value={form.safetyMode} onChange={(e) => setField('safetyMode', e.target.value)} style={inputStyle}>
                <option value="strict">Strict</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Active model</span>
              <select value={form.activeModel} onChange={(e) => setField('activeModel', e.target.value)} style={inputStyle}>
                {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Fallback model</span>
              <select value={form.fallbackModel || ''} onChange={(e) => setField('fallbackModel', e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Temperature</span>
              <input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={(e) => setField('temperature', Number(e.target.value || 0))} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Top P</span>
              <input type="number" step="0.1" min="0" max="1" value={form.topP} onChange={(e) => setField('topP', Number(e.target.value || 1))} style={inputStyle} />
            </label>
          </div>

          <label style={{ ...labelStyle, marginTop:12 }}>
            <span style={labelText}>Enabled models</span>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
              {modelOptions.map((model) => {
                const enabled = String(form.enabledModelsText || '').split('\n').includes(model);
                return (
                  <label key={model} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => {
                        const current = String(form.enabledModelsText || '').split('\n').map((item) => item.trim()).filter(Boolean);
                        const next = event.target.checked
                          ? [...new Set([...current, model])]
                          : current.filter((item) => item !== model);
                        setField('enabledModelsText', next.join('\n'));
                      }}
                    />
                    <span style={{ fontSize:12.5, color:'var(--t2)' }}>{model}</span>
                  </label>
                );
              })}
            </div>
          </label>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12, marginTop:12 }}>
            <label style={labelStyle}>
              <span style={labelText}>OpenAI API key</span>
              <input placeholder={config.providerCredentials?.openaiApiKey || 'Not set'} value={config.openaiApiKey || ''} onChange={(e) => setField('openaiApiKey', e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Anthropic API key</span>
              <input placeholder={config.providerCredentials?.anthropicApiKey || 'Not set'} value={config.anthropicApiKey || ''} onChange={(e) => setField('anthropicApiKey', e.target.value)} style={inputStyle} />
            </label>
          </div>

          <h2 style={sectionTitle}>Default model by plan</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
            {[
              ['Starter', 'starterModel'],
              ['Growth', 'growthModel'],
              ['Pro', 'proModel'],
              ['Enterprise', 'enterpriseModel'],
            ].map(([label, field]) => (
              <label key={field} style={labelStyle}>
                <span style={labelText}>{label}</span>
                <select value={form[field]} onChange={(e) => setField(field, e.target.value)} style={inputStyle}>
                  {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </label>
            ))}
          </div>

          <h2 style={sectionTitle}>Chator hierarchy</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 220px 160px', gap:12 }}>
            <label style={labelStyle}>
              <span style={labelText}>Master AI name</span>
              <input value={form.chatorName} onChange={(e) => setField('chatorName', e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Hierarchy mode</span>
              <select value={form.hierarchyMode} onChange={(e) => setField('hierarchyMode', e.target.value)} style={inputStyle}>
                <option value="platform-defaults">Platform defaults</option>
                <option value="tenant-overrides">Tenant overrides allowed</option>
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Isolation</span>
              <select value={form.tenantIsolation ? 'strict' : 'loose'} onChange={(e) => setField('tenantIsolation', e.target.value === 'strict')} style={inputStyle}>
                <option value="strict">Strict</option>
                <option value="loose">Loose</option>
              </select>
            </label>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save AI Controls'}
            </button>
          </div>
        </section>

        <section style={{ ...cardStyle, gap:16 }}>
          <div>
            <h2 style={sectionTitle}>Runtime status</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 }}>
              <StatusCard label="Provider" value={providerStatus?.provider || 'Unknown'} tone="#00E5FF" />
              <StatusCard label="Config source" value={providerStatus?.source || 'environment'} tone="#f59e0b" />
              <StatusCard label="OpenAI" value={providerStatus?.providers?.openai?.configured ? 'Configured' : 'Missing'} tone={providerStatus?.providers?.openai?.configured ? '#34d399' : '#f87171'} />
              <StatusCard label="Anthropic" value={providerStatus?.providers?.anthropic?.configured ? 'Configured' : 'Missing'} tone={providerStatus?.providers?.anthropic?.configured ? '#34d399' : '#f87171'} />
            </div>
          </div>

          <div>
            <h2 style={sectionTitle}>Tenant AI visibility</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:420, overflowY:'auto' }}>
              {tenantUsage.map((tenant) => (
                <div key={tenant.tenantId} style={{ padding:'12px 14px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', display:'grid', gridTemplateColumns:'1.4fr 90px 90px', gap:12, alignItems:'center' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{tenant.name}</p>
                    <p style={{ fontSize:11.5, color:'var(--t4)' }}>
                      {tenant.plan} · {tenant.aiAgentName || 'Default agent'} · {tenant.purchasedSeats} seats
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#34d399' }}>{tenant.messagesCount}</p>
                    <p style={{ fontSize:10.5, color:'var(--t4)' }}>messages</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#818cf8' }}>{tenant.conversationsCount}</p>
                    <p style={{ fontSize:10.5, color:'var(--t4)' }}>threads</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusCard({ label, value, tone }) {
  return (
    <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', borderTop:`2px solid ${tone}` }}>
      <p style={{ fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>{label}</p>
      <p style={{ fontSize:13.5, fontWeight:800, color:tone }}>{value}</p>
    </div>
  );
}

const cardStyle = {
  padding:'20px',
  borderRadius:16,
  background:'var(--bg2)',
  border:'1px solid var(--b1)',
  display:'flex',
  flexDirection:'column',
  gap:14,
};

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

const sectionTitle = {
  fontSize:14,
  fontWeight:800,
  color:'var(--t1)',
  margin:'6px 0 2px',
};
