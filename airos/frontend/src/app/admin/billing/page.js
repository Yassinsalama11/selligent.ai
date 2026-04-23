'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

function money(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdminBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/billing')
      .then((data) => {
        if (!cancelled) setBilling(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load billing');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tenantPlans = billing?.tenantPlans || [];
  const subscriptions = billing?.stripeSubscriptions || [];

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
          Billing
        </h1>
        <p style={{ fontSize:13, color:'var(--t3)' }}>
          Live tenant plan revenue normalized in EUR. Public localized pricing does not change admin finance reporting.
        </p>
      </div>

      {error && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
          {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          { label:'Active Tenants', value: billing?.totals?.activeTenants || 0, color:'#818cf8' },
          { label:'Projected MRR', value: money(billing?.totals?.projectedMrr || 0), color:'#f59e0b' },
          { label:'Stripe Subscriptions', value: subscriptions.length, color: billing?.stripeConfigured ? '#34d399' : '#f87171' },
        ].map((card) => (
          <div key={card.label} style={{ padding:'20px 22px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', borderTop:`2px solid ${card.color}`, opacity: loading ? 0.65 : 1 }}>
            <p style={{ fontSize:28, fontWeight:800, color:card.color, marginBottom:4 }}>{card.value}</p>
            <p style={{ fontSize:12, color:'var(--t2)' }}>{card.label}</p>
          </div>
        ))}
      </div>

      {billing?.pricingControls && (
        <section style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
            <div>
              <h2 style={{ fontSize:15, fontWeight:800, color:'var(--t1)', marginBottom:6 }}>Plan control model</h2>
              <p style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.7 }}>
                Plans are configured for localized public pricing, user-seat billing, and AI-included subscriptions. Admin financial analytics stay normalized in EUR.
              </p>
            </div>
            <span style={{ padding:'6px 10px', borderRadius:999, background:'rgba(0,229,255,0.1)', color:'#00E5FF', fontSize:11.5, fontWeight:800 }}>
              AI included
            </span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
            {(billing.pricingControls.supportedCountries || []).map((country) => (
              <span key={country} style={{ padding:'5px 9px', borderRadius:999, background:'var(--bg3)', color:'var(--t2)', fontSize:11.5, fontWeight:700 }}>
                {country}
              </span>
            ))}
          </div>
        </section>
      )}

      <section style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Tenant Plans · EUR
        </div>
        {loading && <div style={{ padding:'18px 16px', color:'var(--t4)', fontSize:13 }}>Loading billing data…</div>}
        {!loading && tenantPlans.length === 0 && <div style={{ padding:'18px 16px', color:'var(--t4)', fontSize:13 }}>No tenant plan data yet.</div>}
        {tenantPlans.map((tenant) => (
          <div key={tenant.tenantId} style={{ display:'grid', gridTemplateColumns:'1.4fr 110px 110px 120px 120px', gap:12, padding:'14px 16px', borderTop:'1px solid var(--b1)', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{tenant.name}</p>
              <p style={{ fontSize:11.5, color:'var(--t4)' }}>{tenant.email}</p>
            </div>
            <span style={{ textTransform:'capitalize', color:'#818cf8', fontSize:12.5, fontWeight:700 }}>{tenant.plan}</span>
            <span style={{ textAlign:'right', color:'#00E5FF', fontSize:12.5, fontWeight:700 }}>{tenant.purchasedSeats || 0} seats</span>
            <span style={{ textTransform:'capitalize', color:tenant.status === 'active' ? '#34d399' : '#fbbf24', fontSize:12.5, fontWeight:700 }}>{tenant.status}</span>
            <span style={{ textAlign:'right', color:'#f59e0b', fontSize:13, fontWeight:800 }}>{money(tenant.monthlyValue)}</span>
          </div>
        ))}
      </section>

      {!!billing?.planCatalog?.length && (
        <section style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Current Plan Catalog
          </div>
          {billing.planCatalog.map((plan) => (
            <div key={plan.key} style={{ display:'grid', gridTemplateColumns:'1.2fr 120px 140px 1fr', gap:12, padding:'14px 16px', borderTop:'1px solid var(--b1)', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{plan.name}</p>
                <p style={{ fontSize:11.5, color:'var(--t4)' }}>{plan.description}</p>
              </div>
              <span style={{ textAlign:'right', color:'#f59e0b', fontSize:13, fontWeight:800 }}>{money(plan.priceEur)}</span>
              <span style={{ textAlign:'right', color:'#00E5FF', fontSize:12.5, fontWeight:700 }}>{plan.includedSeats} seats incl.</span>
              <span style={{ fontSize:11.5, color:plan.visible ? '#34d399' : '#f87171', fontWeight:700, textTransform:'uppercase' }}>
                {plan.visible ? 'Visible publicly' : 'Hidden'}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
