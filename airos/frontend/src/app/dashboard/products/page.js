'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

const TABS = ['All Products','WooCommerce','Shopify','Webhooks','Manual'];

const INIT_PRODUCTS = [
  { id:1,  name:'Premium Cotton T-Shirt', price:299,  sale:249,  cur:'EGP', stock:'in_stock',    qty:145, src:'woocommerce', cats:['Shirts','Summer'],  sku:'TSH-001', img:null, desc:'100% cotton premium tee', weight:'200g', tags:['summer','new'] },
  { id:2,  name:'Slim Fit Jeans',         price:599,  sale:null, cur:'EGP', stock:'in_stock',    qty:62,  src:'woocommerce', cats:['Jeans'],            sku:'JNS-002', img:null, desc:'Stretch denim slim fit', weight:'450g', tags:['denim'] },
  { id:3,  name:'Leather Sneakers',       price:1200, sale:999,  cur:'EGP', stock:'in_stock',    qty:28,  src:'shopify',     cats:['Shoes'],            sku:'SNK-003', img:null, desc:'Genuine leather sneakers', weight:'600g', tags:['leather','shoes'] },
  { id:4,  name:'Summer Dress',           price:450,  sale:null, cur:'EGP', stock:'out_of_stock',qty:0,   src:'woocommerce', cats:['Dresses','Summer'], sku:'DRS-004', img:null, desc:'Floral summer dress', weight:'180g', tags:['summer','dress'] },
  { id:5,  name:'Canvas Backpack',        price:380,  sale:320,  cur:'EGP', stock:'in_stock',    qty:44,  src:'manual',      cats:['Bags'],             sku:'BAG-005', img:null, desc:'Durable canvas backpack', weight:'350g', tags:['bag'] },
  { id:6,  name:'Classic Watch',          price:2500, sale:null, cur:'EGP', stock:'in_stock',    qty:12,  src:'manual',      cats:['Accessories'],      sku:'WTC-006', img:null, desc:'Stainless steel watch', weight:'150g', tags:['watch','luxury'] },
  { id:7,  name:'Linen Shirt',            price:349,  sale:299,  cur:'EGP', stock:'in_stock',    qty:88,  src:'shopify',     cats:['Shirts'],           sku:'LNS-007', img:null, desc:'Breathable linen shirt', weight:'220g', tags:['linen','summer'] },
];

const WC_INIT  = { url:'', key:'', secret:'', version:'wc/v3', auto_sync:'15', sync_images:true, sync_prices:true, sync_stock:true };
const SP_INIT  = { domain:'', token:'', version:'2024-01', auto_sync:'15', sync_images:true, sync_prices:true, sync_stock:true };
const WH_INIT  = { secret:'wh_sk_'+Math.random().toString(36).slice(2,18), active:true };

const SRC_COLOR = { woocommerce:'#a855f7', shopify:'#96bf48', manual:'#6366f1', api:'#06b6d4' };
const SRC_ICON  = { woocommerce:'🟣', shopify:'🟢', manual:'✏️', api:'🔌' };
const BLANK = { name:'', price:'', sale:'', cur:'EGP', stock:'in_stock', qty:'', src:'manual', cats:'', sku:'', desc:'', weight:'', tags:'' };

export default function ProductsPage() {
  const [activeTab, setActiveTab]   = useState('All Products');
  const [products, setProducts]     = useState(INIT_PRODUCTS);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [syncing, setSyncing]       = useState({});

  const [addModal,  setAddModal]    = useState(false);
  const [editModal, setEditModal]   = useState(false);
  const [form, setForm]             = useState(BLANK);

  // Integration settings
  const [wc, setWc]   = useState(WC_INIT);
  const [sp, setSp]   = useState(SP_INIT);
  const [wh, setWh]   = useState(WH_INIT);
  const [wcSaved, setWcSaved] = useState(false);
  const [spSaved, setSpSaved] = useState(false);

  const filtered = products.filter(p => {
    const tabMatch = activeTab === 'All Products' ? true
      : activeTab === 'WooCommerce' ? p.src === 'woocommerce'
      : activeTab === 'Shopify'     ? p.src === 'shopify'
      : activeTab === 'Manual'      ? p.src === 'manual'
      : true;
    if (!tabMatch) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'in_stock' && p.stock !== 'in_stock') return false;
    if (filter === 'out_of_stock' && p.stock !== 'out_of_stock') return false;
    return true;
  });

  const inStock = products.filter(p => p.stock === 'in_stock').length;

  function syncSource(src, label) {
    setSyncing(s => ({ ...s, [src]: true }));
    toast.loading(`Syncing ${label}…`, { id:`sync-${src}` });
    setTimeout(() => {
      setSyncing(s => ({ ...s, [src]: false }));
      const count = products.filter(p => p.src === src).length;
      toast.success(`${count} products synced from ${label}!`, { id:`sync-${src}` });
    }, 2200);
  }

  function syncAll() {
    ['woocommerce','shopify'].forEach(src => syncSource(src, src));
  }

  function openEdit(p) {
    setForm({ ...p, cats: p.cats.join(', '), sale: p.sale ?? '', tags: (p.tags||[]).join(', ') });
    setEditModal(true);
  }

  function saveProduct() {
    if (!form.name.trim()) { toast.error('Product name required'); return; }
    const parsed = {
      ...form,
      id: form.id || Date.now(),
      price: Number(form.price) || 0,
      sale:  form.sale !== '' ? Number(form.sale) : null,
      qty:   Number(form.qty) || 0,
      cats:  form.cats.split(',').map(c => c.trim()).filter(Boolean),
      tags:  form.tags.split(',').map(t => t.trim()).filter(Boolean),
      src:   form.src || 'manual',
    };
    if (editModal) {
      setProducts(ps => ps.map(p => p.id === parsed.id ? parsed : p));
      setEditModal(false);
      toast.success('Product updated!');
    } else {
      setProducts(ps => [parsed, ...ps]);
      setAddModal(false);
      toast.success('Product added!');
      setActiveTab('All Products');
    }
    setForm(BLANK);
  }

  function deleteProduct(id) {
    setProducts(ps => ps.filter(p => p.id !== id));
    setEditModal(false);
    toast.success('Product removed');
  }

  function saveWc() {
    setWcSaved(true);
    toast.success('WooCommerce settings saved!');
    setTimeout(() => setWcSaved(false), 2000);
  }
  function saveSp() {
    setSpSaved(true);
    toast.success('Shopify settings saved!');
    setTimeout(() => setSpSaved(false), 2000);
  }
  function copyWebhook(text) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => toast.error('Copy failed'));
  }
  function regenSecret() {
    setWh(w => ({ ...w, secret:'wh_sk_'+Math.random().toString(36).slice(2,18) }));
    toast.success('Webhook secret regenerated');
  }

  const productForm = (
    <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
      <div>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Product Name *</label>
        <input className="input" placeholder="e.g. Classic T-Shirt"
          value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} />
      </div>
      <div>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Description</label>
        <textarea className="input" rows={2} placeholder="Product description…"
          style={{ resize:'none', fontSize:13 }}
          value={form.desc} onChange={e => setForm(f => ({...f, desc:e.target.value}))} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Price (EGP) *</label>
          <input className="input" type="number" placeholder="299"
            value={form.price} onChange={e => setForm(f => ({...f, price:e.target.value}))} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
            Sale Price <span style={{ color:'#10b981', fontWeight:400 }}>(optional)</span>
          </label>
          <input className="input" type="number" placeholder="Leave blank if no sale"
            value={form.sale} onChange={e => setForm(f => ({...f, sale:e.target.value}))} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>SKU</label>
          <input className="input" placeholder="e.g. TSH-001"
            value={form.sku} onChange={e => setForm(f => ({...f, sku:e.target.value}))} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Stock Qty</label>
          <input className="input" type="number" placeholder="0"
            value={form.qty} onChange={e => setForm(f => ({...f, qty:e.target.value}))} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Weight</label>
          <input className="input" placeholder="e.g. 200g"
            value={form.weight} onChange={e => setForm(f => ({...f, weight:e.target.value}))} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Status</label>
          <select className="input" value={form.stock} onChange={e => setForm(f => ({...f, stock:e.target.value}))}>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
          Categories <span style={{ fontWeight:400, color:'var(--t4)' }}>(comma-separated)</span>
        </label>
        <input className="input" placeholder="Shirts, Summer"
          value={form.cats} onChange={e => setForm(f => ({...f, cats:e.target.value}))} />
      </div>
      <div>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
          Tags <span style={{ fontWeight:400, color:'var(--t4)' }}>(comma-separated)</span>
        </label>
        <input className="input" placeholder="summer, new, sale"
          value={form.tags} onChange={e => setForm(f => ({...f, tags:e.target.value}))} />
      </div>
    </div>
  );

  return (
    <>
      <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Product Catalog</h1>
            <p style={{ fontSize:13, color:'var(--t3)' }}>
              {products.length} products · {inStock} in stock · synced from WooCommerce & Shopify
            </p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost btn-sm" onClick={syncAll}
              style={{ display:'flex', alignItems:'center', gap:6 }}
              disabled={syncing.woocommerce || syncing.shopify}>
              <span style={{ display:'inline-block',
                animation: (syncing.woocommerce||syncing.shopify) ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              {(syncing.woocommerce||syncing.shopify) ? 'Syncing…' : 'Sync All'}
            </button>
            <button className="btn btn-primary btn-sm"
              onClick={() => { setForm(BLANK); setAddModal(true); }}>
              + Add Product
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {[
            { label:'Total Products',                              val:products.length,                 color:'#6366f1' },
            { label:'In Stock',                                    val:inStock,                          color:'#10b981' },
            { label:'Out of Stock',                                val:products.length - inStock,        color:'#ef4444' },
            { label:'WooCommerce + Shopify',                       val:products.filter(p=>p.src!=='manual').length, color:'#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="card-sm" style={{ display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:24, fontWeight:900, fontFamily:'Space Grotesk', color:s.color }}>{s.val}</span>
              <span style={{ fontSize:12.5, color:'var(--t3)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab${activeTab===t?' active':''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        {/* ── WooCommerce Settings ─────────────────────────────────────── */}
        {activeTab === 'WooCommerce' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Connection card */}
            <div className="card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:32 }}>🟣</span>
                  <div>
                    <h3 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>WooCommerce Integration</h3>
                    <p style={{ fontSize:12.5, color:'var(--t3)' }}>Connect via REST API · OAuth or API Keys</p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => syncSource('woocommerce', 'WooCommerce')}
                    disabled={syncing.woocommerce}>
                    <span style={{ animation: syncing.woocommerce ? 'spin 1s linear infinite' : 'none', display:'inline-block' }}>↻</span>
                    {syncing.woocommerce ? ' Syncing…' : ' Sync Now'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={saveWc}>
                    {wcSaved ? '✓ Saved!' : 'Save Settings'}
                  </button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {[
                  { label:'Store URL', key:'url', ph:'https://yourstore.com', type:'url' },
                  { label:'API Version', key:'version', ph:'wc/v3', type:'text' },
                  { label:'Consumer Key', key:'key', ph:'ck_xxxxxxxxxxxx', type:'text' },
                  { label:'Consumer Secret', key:'secret', ph:'cs_xxxxxxxxxxxx', type:'password' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>{f.label}</label>
                    <input className="input" type={f.type} placeholder={f.ph}
                      value={wc[f.key]} onChange={e => setWc(w => ({...w, [f.key]:e.target.value}))} />
                  </div>
                ))}
              </div>

              {/* Sync options */}
              <div style={{ marginTop:20, padding:'16px 18px', borderRadius:'var(--r-md)',
                background:'var(--s1)', border:'1px solid var(--b1)' }}>
                <p style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'var(--t1)' }}>Sync Options</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Auto-sync interval</label>
                    <select className="input" value={wc.auto_sync}
                      onChange={e => setWc(w => ({...w, auto_sync:e.target.value}))}>
                      <option value="5">Every 5 minutes</option>
                      <option value="15">Every 15 minutes</option>
                      <option value="30">Every 30 minutes</option>
                      <option value="60">Every hour</option>
                      <option value="0">Manual only</option>
                    </select>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { k:'sync_images', l:'Sync product images' },
                      { k:'sync_prices', l:'Sync prices & discounts' },
                      { k:'sync_stock',  l:'Sync stock quantities' },
                    ].map(opt => (
                      <div key={opt.k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, color:'var(--t2)' }}>{opt.l}</span>
                        <div className={`toggle${wc[opt.k]?' on':''}`} style={{ transform:'scale(0.8)' }}
                          onClick={() => setWc(w => ({...w, [opt.k]:!w[opt.k]}))} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Synced products */}
              <div style={{ marginTop:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>
                    Synced Products ({products.filter(p=>p.src==='woocommerce').length})
                  </p>
                </div>
                {products.filter(p=>p.src==='woocommerce').map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 14px', borderRadius:'var(--r)', background:'var(--s1)',
                    border:'1px solid var(--b1)', marginBottom:6 }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>{p.name}</p>
                      <p style={{ fontSize:11.5, color:'var(--t4)' }}>{p.sku} · EGP {p.price}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {p.sale && <span style={{ fontSize:12, color:'#10b981', fontWeight:600 }}>Sale: EGP {p.sale}</span>}
                      <span className="badge" style={p.stock==='in_stock'
                        ? { background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }
                        : { background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.2)' }}>
                        {p.stock==='in_stock' ? `✓ ${p.qty}` : '✕ OOS'}
                      </span>
                      <button onClick={() => openEdit(p)}
                        style={{ fontSize:11.5, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Shopify Settings ─────────────────────────────────────────── */}
        {activeTab === 'Shopify' && (
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:32 }}>🟢</span>
                <div>
                  <h3 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>Shopify Integration</h3>
                  <p style={{ fontSize:12.5, color:'var(--t3)' }}>Connect via Admin API · Access Token</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => syncSource('shopify', 'Shopify')}
                  disabled={syncing.shopify}>
                  <span style={{ animation: syncing.shopify ? 'spin 1s linear infinite' : 'none', display:'inline-block' }}>↻</span>
                  {syncing.shopify ? ' Syncing…' : ' Sync Now'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveSp}>
                  {spSaved ? '✓ Saved!' : 'Save Settings'}
                </button>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[
                { label:'Shop Domain', key:'domain', ph:'yourstore.myshopify.com', type:'text' },
                { label:'API Version', key:'version', ph:'2024-01', type:'text' },
                { label:'Admin API Access Token', key:'token', ph:'shpat_xxxxxxxxxxxx', type:'password' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.key==='token' ? '1/-1' : undefined }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>{f.label}</label>
                  <input className="input" type={f.type} placeholder={f.ph}
                    value={sp[f.key]} onChange={e => setSp(s => ({...s, [f.key]:e.target.value}))} />
                </div>
              ))}
            </div>

            <div style={{ marginTop:20, padding:'16px 18px', borderRadius:'var(--r-md)',
              background:'var(--s1)', border:'1px solid var(--b1)' }}>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'var(--t1)' }}>Sync Options</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Auto-sync interval</label>
                  <select className="input" value={sp.auto_sync}
                    onChange={e => setSp(s => ({...s, auto_sync:e.target.value}))}>
                    <option value="5">Every 5 minutes</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                    <option value="0">Manual only</option>
                  </select>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { k:'sync_images', l:'Sync product images' },
                    { k:'sync_prices', l:'Sync prices & discounts' },
                    { k:'sync_stock',  l:'Sync stock quantities' },
                  ].map(opt => (
                    <div key={opt.k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'var(--t2)' }}>{opt.l}</span>
                      <div className={`toggle${sp[opt.k]?' on':''}`} style={{ transform:'scale(0.8)' }}
                        onClick={() => setSp(s => ({...s, [opt.k]:!s[opt.k]}))} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Shopify products list */}
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:12 }}>
                Synced Products ({products.filter(p=>p.src==='shopify').length})
              </p>
              {products.filter(p=>p.src==='shopify').map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px', borderRadius:'var(--r)', background:'var(--s1)',
                  border:'1px solid var(--b1)', marginBottom:6 }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>{p.name}</p>
                    <p style={{ fontSize:11.5, color:'var(--t4)' }}>{p.sku} · EGP {p.price}</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {p.sale && <span style={{ fontSize:12, color:'#10b981', fontWeight:600 }}>Sale: EGP {p.sale}</span>}
                    <span className="badge" style={p.stock==='in_stock'
                      ? { background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }
                      : { background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.2)' }}>
                      {p.stock==='in_stock' ? `✓ ${p.qty}` : '✕ OOS'}
                    </span>
                    <button onClick={() => openEdit(p)}
                      style={{ fontSize:11.5, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Webhooks Tab ──────────────────────────────────────────────── */}
        {activeTab === 'Webhooks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card">
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Incoming Webhook</h3>
              <p style={{ fontSize:13, color:'var(--t3)', marginBottom:20 }}>
                Push product data directly to Selligent.ai from any platform via HTTP POST
              </p>

              {/* Endpoint URL */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
                  Webhook Endpoint URL
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'12px 14px', borderRadius:'var(--r)', background:'rgba(0,0,0,0.35)', border:'1px solid var(--b1)' }}>
                  <code style={{ flex:1, fontFamily:'monospace', fontSize:13, color:'#67e8f9' }}>
                    https://api.selligent.ai/webhooks/products/sync
                  </code>
                  <button onClick={() => copyWebhook('https://api.selligent.ai/webhooks/products/sync')}
                    style={{ fontSize:12, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                    Copy
                  </button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
                  Webhook Secret <span style={{ fontWeight:400, color:'var(--t4)' }}>(use in X-Webhook-Secret header)</span>
                </label>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1, display:'flex', alignItems:'center', gap:10,
                    padding:'11px 14px', borderRadius:'var(--r)', background:'rgba(0,0,0,0.35)', border:'1px solid var(--b1)' }}>
                    <code style={{ flex:1, fontFamily:'monospace', fontSize:13, color:'#fcd34d' }}>{wh.secret}</code>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyWebhook(wh.secret)}>Copy</button>
                  <button className="btn btn-ghost btn-sm" onClick={regenSecret}>↻ Regen</button>
                </div>
              </div>

              {/* Toggle */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'14px 16px', borderRadius:'var(--r)', background:'var(--s1)', border:'1px solid var(--b1)' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>Webhook Active</p>
                  <p style={{ fontSize:12.5, color:'var(--t4)' }}>Accept incoming product sync requests</p>
                </div>
                <div className={`toggle${wh.active?' on':''}`}
                  onClick={() => { setWh(w => ({...w, active:!w.active})); toast(wh.active ? 'Webhook disabled' : 'Webhook enabled'); }} />
              </div>
            </div>

            {/* Payload format */}
            <div className="card">
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Expected Payload Format</h3>
              <div style={{ borderRadius:'var(--r-md)', background:'rgba(0,0,0,0.5)',
                border:'1px solid rgba(6,182,212,0.15)', padding:'16px 20px',
                fontFamily:'monospace', fontSize:12.5, color:'#67e8f9', lineHeight:1.8, userSelect:'all' }}>
                <pre style={{ margin:0, whiteSpace:'pre-wrap', color:'inherit' }}>{JSON.stringify({
                  "products": [
                    {
                      "sku": "TSH-001",
                      "name": "Premium Cotton T-Shirt",
                      "price": 299,
                      "sale_price": 249,
                      "currency": "EGP",
                      "stock": "in_stock",
                      "quantity": 145,
                      "image_url": "https://yourstore.com/img/tsh-001.jpg",
                      "description": "100% cotton premium tee",
                      "categories": ["Shirts", "Summer"],
                      "tags": ["summer", "new"],
                      "weight": "200g"
                    }
                  ]
                }, null, 2)}</pre>
              </div>
              <button onClick={() => copyWebhook(JSON.stringify({ products:[] }, null, 2))}
                className="btn btn-ghost btn-sm" style={{ marginTop:12 }}>
                Copy Template
              </button>
            </div>

            {/* Recent webhook logs */}
            <div className="card">
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Recent Webhook Calls</h3>
              {[
                { time:'Apr 11, 10:02 AM', status:200, count:7, src:'WooCommerce plugin' },
                { time:'Apr 11, 09:47 AM', status:200, count:3, src:'Custom script' },
                { time:'Apr 10, 11:30 PM', status:401, count:0, src:'Unknown' },
              ].map((log, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px', borderRadius:'var(--r)', background:'var(--s1)',
                  border:'1px solid var(--b1)', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:5,
                      background: log.status===200 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: log.status===200 ? '#34d399' : '#fca5a5',
                      border: `1px solid ${log.status===200 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      {log.status}
                    </span>
                    <span style={{ fontSize:13, color:'var(--t2)' }}>{log.src}</span>
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center', fontSize:12, color:'var(--t4)' }}>
                    {log.count > 0 && <span style={{ color:'var(--t2)' }}>{log.count} products</span>}
                    <span>{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All Products / Manual / filtered table ────────────────────── */}
        {(activeTab === 'All Products' || activeTab === 'Manual') && (
          <>
            {/* Filters row */}
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <input className="input" style={{ width:260, fontSize:13 }}
                placeholder="Search products…"
                value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['all','in_stock','out_of_stock'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={filter===f ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}>
                    {f.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {['Product','SKU','Price','Discount','Stock','Source','Categories',''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
                            background:'var(--s2)', border:'1px solid var(--b1)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                            {SRC_ICON[p.src]}
                          </div>
                          <div>
                            <span style={{ fontWeight:600, color:'var(--t1)', fontSize:13.5, display:'block' }}>{p.name}</span>
                            {p.desc && <span style={{ fontSize:11.5, color:'var(--t4)' }}>{p.desc}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--t4)' }}>{p.sku}</span>
                      </td>
                      <td>
                        <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>EGP {p.price.toLocaleString()}</div>
                      </td>
                      <td>
                        {p.sale ? (
                          <span style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>EGP {p.sale}</span>
                        ) : (
                          <span style={{ fontSize:12, color:'var(--t4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={p.stock==='in_stock'
                          ? { background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }
                          : { background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.2)' }}>
                          {p.stock==='in_stock' ? `✓ ${p.qty}` : '✕ OOS'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5,
                          fontWeight:600, color:SRC_COLOR[p.src] }}>
                          {SRC_ICON[p.src]} {p.src}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {p.cats.map(c => (
                            <span key={c} style={{ fontSize:11, padding:'2px 7px', borderRadius:99,
                              background:'var(--s2)', color:'var(--t3)', border:'1px solid var(--b1)' }}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button onClick={() => openEdit(p)}
                          style={{ fontSize:12, color:'#818cf8', background:'none', border:'none',
                            cursor:'pointer', fontWeight:600 }}>Edit →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Add Product Modal ────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New Product" width={520}>
        {productForm}
        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={saveProduct}>Add Product</button>
        </div>
      </Modal>

      {/* ── Edit Product Modal ───────────────────────────────────────────── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Product" width={520}>
        {productForm}
        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
          <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(form.id)}>Delete</button>
          <div style={{ flex:1 }} />
          <button className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveProduct}>Save Changes</button>
        </div>
      </Modal>
    </>
  );
}
