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

const TABS = ['all', 'woocommerce', 'shopify', 'salla', 'zid', 'manual', 'api'];
const sourceMeta = {
  woocommerce: { label: 'WooCommerce', color: '#FF5A1F', icon: '🛒' },
  shopify: { label: 'Shopify', color: '#96bf48', icon: '🟢' },
  salla: { label: 'Salla', color: '#00a6a6', icon: '🏬' },
  zid: { label: 'Zid', color: '#00E5FF', icon: '🧾' },
  manual: { label: 'Manual', color: '#FF5A1F', icon: '✏️' },
  api: { label: 'API', color: '#06b6d4', icon: '🔌' },
};

const SYNCED_SOURCES = ['woocommerce', 'shopify', 'salla', 'zid', 'api'];

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
  const [savingManual, setSavingManual] = useState(false);
  const [manualProduct, setManualProduct] = useState({
    name: '',
    price: '',
    currency: 'USD',
    sku: '',
    description: '',
    category: '',
    url: '',
  });
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
    synced: (data || []).filter((product) => SYNCED_SOURCES.includes(product.source)).length,
    priced: (data || []).filter((product) => Number(product.price || 0) > 0).length,
  }), [data]);

  async function deleteProduct(product) {
    if (!['manual', ...SYNCED_SOURCES].includes(product.source)) {
      toast.error('Unsupported product source.');
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

  async function createManualProduct(event) {
    event.preventDefault();
    if (!manualProduct.name.trim()) {
      toast.error('Product title is required.');
      return;
    }

    setSavingManual(true);
    try {
      const payload = {
        products: [{
          external_id: `manual:${Date.now()}`,
          source: 'manual',
          name: manualProduct.name.trim(),
          description: manualProduct.description.trim(),
          price: manualProduct.price ? Number(manualProduct.price) : null,
          currency: manualProduct.currency || 'USD',
          sku: manualProduct.sku.trim() || null,
          stock_status: 'in_stock',
          categories: manualProduct.category ? [manualProduct.category.trim()] : [],
          images: [],
          variants: [],
          metadata: {
            created_from: 'dashboard_manual_entry',
            url: manualProduct.url.trim() || null,
          },
        }],
      };
      await api.post('/v1/catalog/products/sync', payload);
      setManualProduct({ name: '', price: '', currency: 'USD', sku: '', description: '', category: '', url: '' });
      setActiveTab('manual');
      await reload();
      toast.success('Manual product added');
    } catch (err) {
      toast.error(err.message || 'Could not add product');
    } finally {
      setSavingManual(false);
    }
  }

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Product Catalog</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Unified catalog data for manual products, WooCommerce, Shopify, Salla, Zid, and API sources.
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
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FF5A1F' }}>{stats.total}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>In stock</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{stats.inStock}</span>
          </div>
          <div className="card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Synced</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#00E5FF' }}>{stats.synced}</span>
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

      <form
        onSubmit={createManualProduct}
        className="card"
        style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, alignItems:'end' }}
      >
        <div style={{ gridColumn:'1 / -1' }}>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>Manual product entry</div>
          <div style={{ fontSize:12.5, color:'var(--t4)', marginTop:4 }}>
            Add products that are not connected through a commerce integration. These are stored in the same catalog used by AI replies.
          </div>
        </div>
        <input className="input" placeholder="Product title" value={manualProduct.name}
          onChange={(event) => setManualProduct((current) => ({ ...current, name:event.target.value }))} />
        <input className="input" placeholder="Price" type="number" min="0" step="0.01" value={manualProduct.price}
          onChange={(event) => setManualProduct((current) => ({ ...current, price:event.target.value }))} />
        <input className="input" placeholder="Currency" value={manualProduct.currency}
          onChange={(event) => setManualProduct((current) => ({ ...current, currency:event.target.value.toUpperCase() }))} />
        <input className="input" placeholder="SKU" value={manualProduct.sku}
          onChange={(event) => setManualProduct((current) => ({ ...current, sku:event.target.value }))} />
        <input className="input" placeholder="Category" value={manualProduct.category}
          onChange={(event) => setManualProduct((current) => ({ ...current, category:event.target.value }))} />
        <input className="input" placeholder="Product URL" value={manualProduct.url}
          onChange={(event) => setManualProduct((current) => ({ ...current, url:event.target.value }))} />
        <textarea className="input" placeholder="Description" value={manualProduct.description}
          onChange={(event) => setManualProduct((current) => ({ ...current, description:event.target.value }))}
          style={{ gridColumn:'1 / -1', minHeight:74, resize:'vertical' }} />
        <button className="btn btn-primary" type="submit" disabled={savingManual} style={{ justifySelf:'start' }}>
          {savingManual ? 'Adding…' : 'Add product'}
        </button>
      </form>

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
            const canDelete = ['manual', ...SYNCED_SOURCES].includes(product.source);

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
