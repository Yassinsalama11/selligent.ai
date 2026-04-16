'use client';

import { startTransition, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';

const STAGES = [
  { id: 'new_lead', label: 'New Leads', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  { id: 'engaged', label: 'Engaged', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'negotiation', label: 'Negotiation', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { id: 'closing', label: 'Closing', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { id: 'won', label: 'Won', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  { id: 'lost', label: 'Lost', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
];

const intentColors = {
  ready_to_buy: '#10b981',
  interested: '#6366f1',
  price_objection: '#f59e0b',
  inquiry: '#94a3b8',
  complaint: '#ef4444',
  other: '#64748b',
};

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount ? `$${amount.toLocaleString()}` : 'Unqualified';
}

function formatStageLabel(stage) {
  return String(stage || 'new_lead').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function DealCard({ deal, onMove, moving }) {
  return (
    <div className="deal-card" style={{ position: 'relative', opacity: moving ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>
            {deal.customer_name || 'Unknown customer'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 4 }}>
            {deal.channel || 'unknown'} • {formatStageLabel(deal.stage)}
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>
          {formatMoney(deal.estimated_value)}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: 999,
          background: `${intentColors[deal.intent] || '#64748b'}18`,
          color: intentColors[deal.intent] || '#64748b',
        }}>
          {(deal.intent || 'other').replace(/_/g, ' ')}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: 999,
          background: 'rgba(148,163,184,0.12)',
          color: 'var(--t3)',
        }}>
          Score {Number(deal.lead_score || 0)}
        </span>
      </div>

      <div style={{ height: 5, borderRadius: 999, background: 'var(--s3)', marginBottom: 12 }}>
        <div style={{
          height: 5,
          borderRadius: 999,
          width: `${Math.max(0, Math.min(100, Number(deal.lead_score || 0)))}%`,
          background: Number(deal.lead_score || 0) >= 70 ? '#10b981' : Number(deal.lead_score || 0) >= 40 ? '#f59e0b' : '#ef4444',
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {STAGES.filter((stage) => stage.id !== deal.stage).slice(0, 2).map((stage) => (
          <button
            key={stage.id}
            className="btn btn-ghost btn-sm"
            disabled={moving}
            onClick={() => onMove(deal, stage.id)}
            style={{ justifyContent: 'center' }}
          >
            Move to {stage.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { data, error, loading, reload, setData } = usePollingResource(async () => {
    const deals = await api.get('/api/deals');
    return Array.isArray(deals) ? deals : [];
  }, [], { intervalMs: 30000, initialData: [] });

  const [movingDealId, setMovingDealId] = useState(null);

  const groupedDeals = useMemo(() => {
    const groups = Object.fromEntries(STAGES.map((stage) => [stage.id, []]));
    for (const deal of data || []) {
      const key = groups[deal.stage] ? deal.stage : 'new_lead';
      groups[key].push(deal);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at));
    }
    return groups;
  }, [data]);

  const totals = useMemo(() => ({
    count: (data || []).length,
    pipeline: (data || [])
      .filter((deal) => !['won', 'lost'].includes(deal.stage))
      .reduce((sum, deal) => sum + Number(deal.estimated_value || 0), 0),
    won: (data || [])
      .filter((deal) => deal.stage === 'won')
      .reduce((sum, deal) => sum + Number(deal.estimated_value || 0), 0),
  }), [data]);

  async function moveDeal(deal, stage) {
    setMovingDealId(deal.id);
    const previous = data || [];

    startTransition(() => {
      setData((current) => (
        current.map((entry) => (
          entry.id === deal.id
            ? { ...entry, stage, updated_at: new Date().toISOString() }
            : entry
        ))
      ));
    });

    try {
      const updated = await api.post(`/api/deals/${deal.id}/stage`, { stage });
      startTransition(() => {
        setData((current) => current.map((entry) => (entry.id === deal.id ? updated : entry)));
      });
      toast.success(`Moved to ${formatStageLabel(stage)}`);
    } catch (err) {
      startTransition(() => {
        setData(previous);
      });
      toast.error(err.message || 'Could not update deal stage');
    } finally {
      setMovingDealId(null);
    }
  }

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Deal Pipeline</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Live deal stages from `/api/deals` with backend stage transitions.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
      </div>

      {error && (
        <StatusBanner
          tone="error"
          title="Deals could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      {loading ? (
        <LoadingGrid />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Active deals</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#6366f1' }}>{totals.count}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Pipeline value</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>${totals.pipeline.toLocaleString()}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Won revenue</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#22c55e' }}>${totals.won.toLocaleString()}</span>
          </div>
        </div>
      )}

      {loading ? null : (data || []).length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="As conversations qualify into pipeline opportunities, they will appear here automatically."
        />
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', flex: 1, paddingBottom: 12 }}>
          {STAGES.map((stage) => {
            const deals = groupedDeals[stage.id] || [];
            const stageValue = deals.reduce((sum, deal) => sum + Number(deal.estimated_value || 0), 0);

            return (
              <div key={stage.id} className="kanban-col">
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{stage.label}</span>
                    </div>
                    <span style={{
                      padding: '2px 9px',
                      borderRadius: 999,
                      background: stage.bg,
                      color: stage.color,
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      {deals.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t4)', paddingLeft: 16 }}>
                    ${stageValue.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
                  {deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      moving={movingDealId === deal.id}
                      onMove={moveDeal}
                    />
                  ))}

                  {deals.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '26px 0', color: 'var(--t4)', fontSize: 12 }}>
                      No deals in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
