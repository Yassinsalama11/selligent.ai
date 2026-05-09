'use client';

import * as React from 'react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import toast from 'react-hot-toast';
import { 
  Package, 
  RefreshCcw, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  Link as LinkIcon, 
  ShoppingCart, 
  Box, 
  Zap, 
  Code,
  CheckCircle2,
  DollarSign,
  Layers,
  History,
  Info
} from 'lucide-react';

import { api, getApiBase } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const TABS = ['all', 'woocommerce', 'shopify', 'salla', 'zid', 'manual', 'api'];
const sourceMeta = {
  woocommerce: { label: 'WooCommerce', color: '#FF5A1F', icon: ShoppingCart },
  shopify: { label: 'Shopify', color: '#96bf48', icon: Box },
  salla: { label: 'Salla', color: '#00a6a6', icon: Box },
  zid: { label: 'Zid', color: '#00E5FF', icon: Box },
  manual: { label: 'Manual', color: '#FF5A1F', icon: Layers },
  api: { label: 'API', color: '#06b6d4', icon: Code },
};

const SYNCED_SOURCES = ['woocommerce', 'shopify', 'salla', 'zid', 'api'];
const PLATFORM_FIELDS = {
  woocommerce: ['storeUrl', 'consumerKey', 'consumerSecret'],
  shopify: ['storeDomain', 'accessToken'],
  salla: ['storeLabel', 'accessToken'],
  zid: ['storeLabel', 'storeId', 'authorizationToken', 'accessToken'],
};
const PLATFORM_STEPS = {
  woocommerce: [
    'Install the WooCommerce connector in WordPress.',
    'Paste the API key / tenant id or use the manual store credentials below.',
    'Enable create, update, and delete product webhooks.',
    'Run a manual sync once to backfill the full catalog.',
  ],
  shopify: [
    'Install the Shopify app and save the tenant credentials inside the app settings.',
    'Register the product and discount webhooks against the ChatorAI webhook URL.',
    'Run a manual sync once to backfill existing products.',
  ],
  salla: [
    'Authorize ChatorAI with your Salla app access token.',
    'Subscribe product webhooks in Salla using the generated webhook URL and basic auth secret.',
    'Run a manual sync to import the current catalog.',
  ],
  zid: [
    'Connect Zid using your authorization token, access token, and store id.',
    'Register product.create / product.update / product.delete webhooks with the generated webhook URL.',
    'Run a manual sync to backfill catalog data and categories.',
  ],
};

function getSourceMeta(source) {
  const meta = sourceMeta[source];
  return meta || { label: source || 'Unknown', color: '#94a3b8', icon: Package };
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0);
  if (!amount) return 'Not priced';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US')}`;
  }
}

function ProductCard({ product, deleting, onDelete, globalCurrency = 'USD' }) {
  const meta = getSourceMeta(product.source);
  const Icon = meta.icon;
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const canDelete = ['manual', ...SYNCED_SOURCES].includes(product.source);

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-transparent hover:border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-[15px] font-black truncate leading-tight group-hover:text-primary transition-colors">
              {product.name}
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <Icon className="h-3 w-3" style={{ color: meta.color }} />
              {meta.label}
              {product.sku && <span>• {product.sku}</span>}
            </div>
          </div>
          <Badge className={cn(
            "text-[10px] font-semibold uppercase tracking-wide border-none",
            product.stock_status === 'in_stock' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          )}>
            {product.stock_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
          {product.description || 'No description available for this product.'}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Price</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black">{formatMoney(product.sale_price || product.price, product.currency || globalCurrency)}</span>
              {product.sale_price && product.price && (
                <span className="text-[10px] text-red-500 line-through opacity-60">{formatMoney(product.price, product.currency || globalCurrency)}</span>
              )}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Quantity</p>
            <p className="text-lg font-black text-foreground/80">{Number(product.stock_quantity || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4">
          {categories.slice(0, 3).map(c => (
            <Badge key={c} variant="secondary" className="bg-muted/50 text-[10px] h-4 font-semibold border-none uppercase">{c}</Badge>
          ))}
          {categories.length > 3 && <Badge variant="secondary" className="bg-muted/50 text-[10px] h-4 font-semibold border-none uppercase">+{categories.length - 3}</Badge>}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 px-6 flex items-center justify-between border-t border-muted/20 mt-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <History className="h-3 w-3" />
          {product.last_synced_at ? new Date(product.last_synced_at).toLocaleDateString() : 'Not synced'}
        </div>
        {canDelete ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-[10px] font-bold uppercase text-destructive hover:bg-destructive/10"
            disabled={deleting}
            onClick={() => onDelete(product)}
          >
            {deleting ? '...' : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        ) : (
          <Badge variant="outline" className="text-[8px] font-black uppercase opacity-40 border-none">Sync Only</Badge>
        )}
      </CardFooter>
    </Card>
  );
}

export default function ProductsPage() {
  const { currency } = useCurrency();
  const { data, error, loading, reload, setData } = usePollingResource(async () => {
    const products = await api.get('/v1/catalog/products');
    return Array.isArray(products) ? products : [];
  }, [], { intervalMs: 90000, initialData: [] });

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
  // Sync new product currency with global setting
  React.useEffect(() => { setManualProduct(f => ({ ...f, currency })); }, [currency]);
  const [integrations, setIntegrations] = useState([]);
  const [integrationForms, setIntegrationForms] = useState({
    woocommerce: { storeUrl:'', consumerKey:'', consumerSecret:'' },
    shopify: { storeDomain:'', accessToken:'' },
    salla: { storeLabel:'', accessToken:'' },
    zid: { storeLabel:'', storeId:'', authorizationToken:'', accessToken:'' },
  });
  const [busyPlatform, setBusyPlatform] = useState('');
  const deferredSearch = useDeferredValue(search);
  const webhookUrl = `${getApiBase()}/v1/catalog/products/sync`;

  async function loadIntegrations() {
    try {
      const rows = await api.get('/v1/catalog/integrations');
      setIntegrations(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error(err.message || 'Could not load integrations');
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  const filteredProducts = useMemo(() => (
    (data || []).filter((product) => {
      if (activeTab !== 'all' && product.source !== activeTab) return false;
      if (!deferredSearch.trim()) return true;

      const haystack = [
        product.name,
        product.description,
        product.sku,
        ...(Array.isArray(product.categories) ? product.categories : []),
      ].filter(Boolean).join(' ').toLowerCase();

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
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setDeletingId(product.id);
    try {
      await api.delete(`/v1/catalog/products/${product.id}?source=${product.source}`);
      setData((current) => current.filter((entry) => entry.id !== product.id));
      toast.success('Product deleted');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
    finally { setDeletingId(null); }
  }

  async function createManualProduct(event) {
    event.preventDefault();
    if (!manualProduct.name.trim()) { toast.error('Name required'); return; }
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
          metadata: { created_from: 'dashboard_manual_entry', url: manualProduct.url.trim() || null },
        }],
      };
      await api.post('/v1/catalog/products/sync', payload);
      setManualProduct({ name: '', price: '', currency: 'USD', sku: '', description: '', category: '', url: '' });
      setActiveTab('manual');
      await reload();
      toast.success('Added to catalog');
    } catch (err) { toast.error(err.message || 'Failed to add'); }
    finally { setSavingManual(false); }
  }

  const integrationByPlatform = useMemo(() => (
    Object.fromEntries((integrations || []).map((i) => [i.platform, i]))
  ), [integrations]);

  async function connectPlatform(platform) {
    setBusyPlatform(platform);
    try {
      await api.post(`/v1/catalog/integrations/${platform}/connect`, integrationForms[platform]);
      await loadIntegrations();
      toast.success('Connected');
    } catch (err) { toast.error(err.message || 'Connection failed'); }
    finally { setBusyPlatform(''); }
  }

  async function syncPlatform(platform) {
    setBusyPlatform(platform);
    try {
      const result = await api.post(`/v1/catalog/integrations/${platform}/sync`, {});
      await loadIntegrations();
      await reload();
      toast.success(`Synced ${result.synced || 0} products`);
    } catch (err) { toast.error(err.message || 'Sync failed'); }
    finally { setBusyPlatform(''); }
  }

  return (
    <div className="p-8 pb-12 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
            Product Catalog
            <Package className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Unified inventory management across manual entries and commerce integrations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reload} className="h-9 gap-2">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Sync All
          </Button>
        </div>
      </header>

      {error && <StatusBanner tone="error" title="Catalog failed to load" description={error} actionLabel="Retry" onAction={reload} />}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: stats.total, color: '#ff5a1f', icon: Package },
          { label: 'In Stock', value: stats.inStock, color: '#10b981', icon: CheckCircle2 },
          { label: 'Cloud Synced', value: stats.synced, color: '#06b6d4', icon: Zap },
          { label: 'Valued Items', value: stats.priced, color: '#6366f1', icon: DollarSign },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{s.label}</p>
                <p className="text-2xl font-black tracking-tight" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
              </div>
              <s.icon className="h-8 w-8 opacity-10" style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="gap-2"><Layers className="h-3.5 w-3.5" /> All</TabsTrigger>
            {['woocommerce', 'shopify', 'salla', 'zid', 'manual'].map(t => {
              const meta = getSourceMeta(t);
              const Icon = meta.icon;
              return <TabsTrigger key={t} value={t} className="gap-2"><Icon className="h-3.5 w-3.5" /> {meta.label}</TabsTrigger>
            })}
          </TabsList>
          
          <div className="relative group max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search catalog by title, SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 bg-background border-none shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-8">
            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-[220px] bg-muted animate-pulse rounded-3xl" />)}
                </div>
              ) : filteredProducts.length === 0 ? (
                <EmptyState title="Catalog is empty" description="No products match your current filters or search query." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      deleting={deletingId === product.id}
                      onDelete={deleteProduct}
                      globalCurrency={currency}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>

          {/* Right Action Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Add (Only shown on Manual or All) */}
            {(activeTab === 'all' || activeTab === 'manual') && (
              <Card className="border-none shadow-xl bg-primary/5 border border-primary/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 blur-3xl rounded-full" />
                <CardHeader>
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Quick Add
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Manual Catalog Entry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground/80">Product Title</Label>
                    <Input value={manualProduct.name} onChange={e => setManualProduct({...manualProduct, name: e.target.value})} placeholder="Premium Plan" className="h-9 bg-background border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground/80">Price</Label>
                      <Input type="number" value={manualProduct.price} onChange={e => setManualProduct({...manualProduct, price: e.target.value})} placeholder="0.00" className="h-9 bg-background border-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground/80">SKU</Label>
                      <Input value={manualProduct.sku} onChange={e => setManualProduct({...manualProduct, sku: e.target.value})} placeholder="SKU-100" className="h-9 bg-background border-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground/80">Description</Label>
                    <Textarea value={manualProduct.description} onChange={e => setManualProduct({...manualProduct, description: e.target.value})} placeholder="Summary..." className="min-h-[80px] bg-background border-none text-xs" />
                  </div>
                  <Button onClick={createManualProduct} disabled={savingManual} className="w-full bg-primary font-black uppercase tracking-widest text-[11px] h-10 shadow-lg active:scale-95 transition-transform">
                    {savingManual ? '...' : 'Register Product'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Integration Status (Only shown for relevant tabs) */}
            {SYNCED_SOURCES.includes(activeTab) && (
              <Card className="border-none shadow-xl bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Sync Status
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">{getSourceMeta(activeTab).label} Node</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {integrationByPlatform[activeTab] ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-background space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Status</span>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-semibold uppercase">{integrationByPlatform[activeTab].status}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Synced</span>
                          <span className="text-xs font-black">{integrationByPlatform[activeTab].sourceProducts || 0} items</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button onClick={() => syncPlatform(activeTab)} disabled={busyPlatform === activeTab} variant="outline" className="w-full h-9 text-[10px] font-black uppercase tracking-widest gap-2">
                          <RefreshCcw className={cn("h-3 w-3", busyPlatform === activeTab && "animate-spin")} />
                          Trigger Manual Sync
                        </Button>
                        <Button onClick={() => disconnectPlatform(activeTab)} disabled={busyPlatform === activeTab} variant="ghost" className="w-full h-9 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10">
                          Disconnect Integration
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {PLATFORM_FIELDS[activeTab]?.map(f => (
                          <div key={f} className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground/80">{f.replace(/([A-Z])/g, ' $1')}</Label>
                            <Input 
                              value={integrationForms[activeTab][f] || ''} 
                              onChange={e => setIntegrationForms({...integrationForms, [activeTab]: {...integrationForms[activeTab], [f]: e.target.value}})} 
                              placeholder={f} 
                              className="h-9 bg-background border-none" 
                            />
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => connectPlatform(activeTab)} disabled={busyPlatform === activeTab} className="w-full bg-primary font-black uppercase tracking-widest text-[11px] h-10 shadow-lg">
                        Connect {getSourceMeta(activeTab).label}
                      </Button>
                      
                      <div className="space-y-3 pt-4 border-t border-muted/20">
                        <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60 flex items-center gap-1.5">
                          <Info className="h-3 w-3" />
                          Setup Guide
                        </p>
                        <ol className="space-y-2">
                          {PLATFORM_STEPS[activeTab]?.map((s, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                              <span className="font-black text-primary">{i+1}.</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* API Documentation Short-link */}
            <Card className="border-none shadow-lg bg-indigo-500/5 border border-indigo-500/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Developer SDK</p>
                  <p className="text-[10px] text-muted-foreground">API Sync Documentation</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
