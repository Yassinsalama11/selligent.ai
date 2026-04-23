'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/adminApi';

const PLAN_TARGETS = ['starter', 'growth', 'pro', 'enterprise'];

function emptyOffer() {
  return {
    title: '',
    subtitle: '',
    badgeLabel: '',
    discountType: 'percent',
    discountValue: 10,
    startAt: '',
    endAt: '',
    active: true,
    targetPlans: [],
    promoStrip: false,
    saleLabel: '',
    sortOrder: 100,
  };
}

export default function AdminOffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/offers')
      .then((data) => {
        if (!cancelled) setOffers(Array.isArray(data?.offers) ? data.offers : []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Could not load offers');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateOffer(index, field, value) {
    setOffers((current) => current.map((offer, offerIndex) => (
      offerIndex === index ? { ...offer, [field]: value } : offer
    )));
  }

  function togglePlan(index, plan) {
    setOffers((current) => current.map((offer, offerIndex) => (
      offerIndex === index
        ? {
          ...offer,
          targetPlans: offer.targetPlans.includes(plan)
            ? offer.targetPlans.filter((entry) => entry !== plan)
            : [...offer.targetPlans, plan],
        }
        : offer
    )));
  }

  async function saveOffer(offer) {
    setSavingId(offer.id || offer.title);
    try {
      const response = offer.id
        ? await adminApi.patch(`/api/admin/offers/${encodeURIComponent(offer.id)}`, offer)
        : await adminApi.post('/api/admin/offers', offer);
      setOffers((current) => {
        if (offer.id) {
          return current.map((entry) => entry.id === offer.id ? response.offer : entry);
        }
        return current.map((entry) => entry === offer ? response.offer : entry);
      });
      toast.success('Offer saved');
    } catch (err) {
      toast.error(err.message || 'Could not save offer');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
            Offers & Promotions
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            Launch public sale banners, badges, and plan-level discounts without code changes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOffers((current) => [...current, emptyOffer()])}>
          + New Offer
        </button>
      </div>

      {loading && <div style={{ color:'var(--t4)', fontSize:13 }}>Loading offers…</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {offers.map((offer, index) => (
          <section key={offer.id || `draft-${index}`} style={{ padding:'20px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 150px 130px', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Title</span>
                <input value={offer.title} onChange={(e) => updateOffer(index, 'title', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Subtitle</span>
                <input value={offer.subtitle || ''} onChange={(e) => updateOffer(index, 'subtitle', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Badge label</span>
                <input value={offer.badgeLabel || ''} onChange={(e) => updateOffer(index, 'badgeLabel', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Sale label</span>
                <input value={offer.saleLabel || ''} onChange={(e) => updateOffer(index, 'saleLabel', e.target.value)} style={inputStyle} />
              </label>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'140px 140px 1fr 1fr', gap:12 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Discount type</span>
                <select value={offer.discountType} onChange={(e) => updateOffer(index, 'discountType', e.target.value)} style={inputStyle}>
                  <option value="percent">Percent</option>
                  <option value="amount">Amount</option>
                </select>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Discount value</span>
                <input type="number" value={offer.discountValue} onChange={(e) => updateOffer(index, 'discountValue', Number(e.target.value || 0))} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Start date</span>
                <input type="datetime-local" value={offer.startAt ? String(offer.startAt).slice(0,16) : ''} onChange={(e) => updateOffer(index, 'startAt', e.target.value || null)} style={inputStyle} />
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>End date</span>
                <input type="datetime-local" value={offer.endAt ? String(offer.endAt).slice(0,16) : ''} onChange={(e) => updateOffer(index, 'endAt', e.target.value || null)} style={inputStyle} />
              </label>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {PLAN_TARGETS.map((plan) => {
                const active = offer.targetPlans.includes(plan);
                return (
                  <button key={plan} type="button" onClick={() => togglePlan(index, plan)} style={{ padding:'6px 10px', borderRadius:999, border: active ? '1px solid rgba(255,90,31,0.35)' : '1px solid var(--b1)', background: active ? 'rgba(255,90,31,0.12)' : 'var(--s1)', color: active ? '#ffb08f' : 'var(--t3)', fontSize:12, fontWeight:700, cursor:'pointer', textTransform:'capitalize' }}>
                    {plan}
                  </button>
                );
              })}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'140px 140px 140px auto', gap:12, alignItems:'end' }}>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Promo strip</span>
                <select value={offer.promoStrip ? 'yes' : 'no'} onChange={(e) => updateOffer(index, 'promoStrip', e.target.value === 'yes')} style={inputStyle}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Active</span>
                <select value={offer.active ? 'yes' : 'no'} onChange={(e) => updateOffer(index, 'active', e.target.value === 'yes')} style={inputStyle}>
                  <option value="yes">Active</option>
                  <option value="no">Inactive</option>
                </select>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontWeight:700 }}>Sort order</span>
                <input type="number" value={offer.sortOrder || 100} onChange={(e) => updateOffer(index, 'sortOrder', Number(e.target.value || 100))} style={inputStyle} />
              </label>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" onClick={() => saveOffer(offer)} disabled={savingId === (offer.id || offer.title)}>
                  {savingId === (offer.id || offer.title) ? 'Saving…' : 'Save Offer'}
                </button>
              </div>
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
