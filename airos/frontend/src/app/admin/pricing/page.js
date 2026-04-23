'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/adminApi';

const REGIONS = ['EU', 'US', 'GB', 'SA', 'AE', 'EG'];
const REGION_CURRENCY = {
  EU: 'EUR',
  US: 'USD',
  GB: 'GBP',
  SA: 'SAR',
  AE: 'AED',
  EG: 'EGP',
};

function toFeatureText(features) {
  return Array.isArray(features) ? features.join('\n') : '';
}

function fromFeatureText(value) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function emptyPlan() {
  return {
    key: '',
    name: '',
    description: '',
    priceEur: 0,
    includedSeats: 1,
    visible: true,
    sortOrder: 100,
    features: [],
    limits: {},
    countryOverrides: {},
    metadata: {},
  };
}

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/plans')
      .then((data) => {
        if (!cancelled) setPlans(Array.isArray(data?.plans) ? data.plans : []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Could not load plans');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updatePlan(index, field, value) {
    setPlans((current) => current.map((plan, planIndex) => (
      planIndex === index ? { ...plan, [field]: value } : plan
    )));
  }

  function updateRegion(index, region, seatPrice) {
    setPlans((current) => current.map((plan, planIndex) => (
      planIndex === index
        ? (() => {
          const nextOverrides = { ...(plan.countryOverrides || {}) };
          if (seatPrice === '' || seatPrice === null || seatPrice === undefined) {
            delete nextOverrides[region];
          } else {
            nextOverrides[region] = {
              currency: REGION_CURRENCY[region] || 'EUR',
              seatPrice: Number(seatPrice || 0),
            };
          }
          return {
            ...plan,
            countryOverrides: nextOverrides,
          };
        })()
        : plan
    )));
  }

  async function savePlan(plan) {
    if (!String(plan.key || '').trim()) {
      toast.error('Plan key is required');
      return;
    }
    setSavingKey(plan.key);
    try {
      const payload = {
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : fromFeatureText(plan.featuresText),
      };
      const response = plan._isNew
        ? await adminApi.post('/api/admin/plans', payload)
        : await adminApi.put(`/api/admin/plans/${encodeURIComponent(plan.key)}`, payload);
      setPlans((current) => current.map((entry) => (
        entry.key === plan.key ? { ...response.plan } : entry
      )));
      toast.success(`${response.plan.name} saved`);
    } catch (err) {
      toast.error(err.message || 'Could not save plan');
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
            Plans Pricing Control
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            Public pricing is driven from these plans. Values are stored in EUR and rendered publicly per seat.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setPlans((current) => [...current, { ...emptyPlan(), _isNew: true }])}>
          + Add Plan
        </button>
      </div>

      {loading && <div style={{ color:'var(--t4)', fontSize:13 }}>Loading plans…</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:16 }}>
        {plans.map((plan, index) => (
          <section key={`${plan.key || 'new'}-${index}`} style={{ padding:'20px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Plan key</span>
                <input value={plan.key} disabled={!plan._isNew} onChange={(e) => updatePlan(index, 'key', e.target.value.toLowerCase().replace(/\s+/g, '-'))} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Plan name</span>
                <input value={plan.name} onChange={(e) => updatePlan(index, 'name', e.target.value)} style={inputStyle} />
              </label>
            </div>

            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Description</span>
              <input value={plan.description} onChange={(e) => updatePlan(index, 'description', e.target.value)} style={inputStyle} />
            </label>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>EUR / user</span>
                <input type="number" value={plan.priceEur} onChange={(e) => updatePlan(index, 'priceEur', Number(e.target.value || 0))} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Included seats</span>
                <input type="number" min="1" value={plan.includedSeats} onChange={(e) => updatePlan(index, 'includedSeats', Number(e.target.value || 1))} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Sort order</span>
                <input type="number" value={plan.sortOrder} onChange={(e) => updatePlan(index, 'sortOrder', Number(e.target.value || 100))} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Visible</span>
                <select value={plan.visible ? 'yes' : 'no'} onChange={(e) => updatePlan(index, 'visible', e.target.value === 'yes')} style={inputStyle}>
                  <option value="yes">Visible</option>
                  <option value="no">Hidden</option>
                </select>
              </label>
            </div>

            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Features / included limits</span>
              <textarea rows={6} value={toFeatureText(plan.features)} onChange={(e) => updatePlan(index, 'features', fromFeatureText(e.target.value))} style={{ ...inputStyle, resize:'vertical', minHeight:132 }} />
            </label>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12 }}>
              {REGIONS.map((region) => (
                <label key={region} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>{region} override</span>
                  <input
                    type="number"
                    value={plan.countryOverrides?.[region]?.seatPrice || ''}
                    onChange={(e) => updateRegion(index, region, e.target.value)}
                    placeholder="Use FX fallback"
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:11.5, color:'var(--t4)' }}>
                Public checkout uses dynamic seat pricing from this configuration.
              </span>
              <button className="btn btn-primary" onClick={() => savePlan(plan)} disabled={savingKey === plan.key}>
                {savingKey === plan.key ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </section>
        ))}
      </div>
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
