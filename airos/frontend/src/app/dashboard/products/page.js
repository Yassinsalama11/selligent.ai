'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';

const TABS = ['all', 'woocommerce', 'shopify', 'manual', 'api'];
const sourceMeta = {
  woocommerce: { label: 'WooCommerce', color: '#a855f7', icon: '🟣' },
  shopify: { label: 'Shopify', color: '#96bf48', icon: '🟢' },
  manual: { label: 'Manual', color: '#6366f1', icon: '✏️' },
  api: { label: 'API', color: '#06b6d4', icon: '🔌' },
};

function getSourceMeta(source) {
  return sourceMeta[source] || { label: source || 'Unknown', color: '#94a3b8', icon: '📦' };
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0);
  if (!amount) return 'Not priced';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductsPage() {
  const { data, error, loading, reload, setData } = usePollingResource(async () => {
    const products = await api.get('/v1/catalog/products');
    return Array.isArray(products) ? products : [];
  }, [], { intervalMs: 45000, initialData: [] });

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const filteredProducts = useMemo(() => (
    (data || []).filter((product) => {
      if (activeTab !== 'all' && product.source !== activeTab) return false;
      if (!deferredSearch.trim()) return true;

      const haystack = [
        product.name,
        product.description,
        product.sku,
        ...(Array.isArray(product.categories) ? product.categories : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(deferredSearch.trim().toLowerCase());
    })
  ), [activeTab, data, deferredSearch]);

  const stats = useMemo(() => ({
    total: (data || []).length,
    inStock: (data || []).filter((product) => product.stock_status === 'in_stock').length,
    synced: (data || []).filter((product) => ['woocommerce', 'shopify'].includes(product.source)).length,
    priced: (data || []).filter((product) => Number(product.price || 0) > 0).length,
  }), [data]);

  async function deleteProduct(product) {
    if (!['woocommerce', 'shopify'].includes(product.source)) {
      toast.error('Only WooCommerce and Shopify products can be deleted from this screen.');
      return;
    }

    setDeletingId(product.id);
    try {
      await api.delete(`/v1/catalog/products/${product.id}?source=${product.source}`);
      setData((current) => current.filter((entry) => entry.id !== product.id));
      toast.success(`Deleted ${product.name}`);
    } catch (err) {
      toast.error(err.message || 'Could not delete product');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Product Catalog</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Live catalog data from `/v1/catalog/products`, including plugin-owned delete actions.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
      </div>

      {error && (
        <StatusBanner
          tone="error"
          title="Catalog data could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      {loading ? (
        <LoadingGrid />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Total products</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#6366f1' }}>{stats.total}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>In stock</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{stats.inStock}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Synced</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#8b5cf6' }}>{stats.synced}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Priced</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#06b6d4' }}>{stats.priced}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="tabs">
          {TABS.map((tab) => {
            const meta = getSourceMeta(tab);
            const label = tab === 'all' ? 'All Products' : meta.label;
            return (
              <button
                key={tab}
                className={`tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'all' ? '📦' : meta.icon} {label}
              </button>
            );
          })}
        </div>

        <input
          className="input"
          placeholder="Search products, SKU, or category"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {!loading && filteredProducts.length === 0 ? (
        <EmptyState
          title="No products match this filter"
          description="Try a different source tab or search term once products are synced."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          {filteredProducts.map((product) => {
            const meta = getSourceMeta(product.source);
            const categories = Array.isArray(product.categories) ? product.categories : [];
            const canDelete = ['woocommerce', 'shopify'].includes(product.source);

            return (
              <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
                      {meta.icon} {meta.label}
                      {product.sku ? ` • ${product.sku}` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: `${meta.color}18`,
                    color: meta.color,
                    fontSize: 11,
                    fontWeight: 800,
                  }}>
                    {product.stock_status === 'in_stock' ? 'In stock' : 'Out of stock'}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>
                  {product.description || 'No description available yet.'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Price</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                      {formatMoney(product.sale_price || product.price, product.currency || 'USD')}
                    </div>
                    {product.sale_price && product.price ? (
                      <div style={{ fontSize: 11.5, color: '#f59e0b', marginTop: 4 }}>
                        Was {formatMoney(product.price, product.currency || 'USD')}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Quantity</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                      {Number(product.stock_quantity || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.length ? categories.map((category) => (
                    <span
                      key={category}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: 'rgba(148,163,184,0.12)',
                        color: 'var(--t3)',
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {category}
                    </span>
                  )) : (
                    <span style={{ fontSize: 12, color: 'var(--t4)' }}>No categories</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
                    Synced {product.last_synced_at ? new Date(product.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'not yet'}
                  </div>
                  {canDelete ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={deletingId === product.id}
                      onClick={() => deleteProduct(product)}
                    >
                      {deletingId === product.id ? 'Deleting…' : 'Delete'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>Read-only source</span>
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
