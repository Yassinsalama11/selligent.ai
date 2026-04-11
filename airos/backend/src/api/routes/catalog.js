const express = require('express');
const { upsertProducts, getActiveProducts } = require('../../db/queries/products');
const { query } = require('../../db/pool');

const router = express.Router();

// API key auth for plugin access
async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const tenantId = req.headers['x-tenant-id'];
  if (!apiKey || !tenantId) return res.status(401).json({ error: 'Missing X-API-Key or X-Tenant-ID' });

  // Validate API key against integration table
  const result = await query(
    `SELECT i.tenant_id FROM integrations i
     WHERE i.tenant_id = $1 AND i.config->>'api_key' = $2 AND i.status = 'active'`,
    [tenantId, apiKey]
  );

  if (!result.rows.length) return res.status(401).json({ error: 'Invalid API key' });

  req.tenant_id = tenantId;
  next();
}

// POST /v1/catalog/sync — bulk upsert products
router.post('/sync', apiKeyAuth, async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || !products.length) {
      return res.status(400).json({ error: 'products array required' });
    }
    const results = await upsertProducts(req.tenant_id, products);
    res.json({ synced: results.length });
  } catch (err) { next(err); }
});

// POST /v1/catalog/products/sync
router.post('/products/sync', apiKeyAuth, async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'products array required' });
    const results = await upsertProducts(req.tenant_id, products);
    res.json({ synced: results.length });
  } catch (err) { next(err); }
});

// POST /v1/catalog/shipping/sync
router.post('/shipping/sync', apiKeyAuth, async (req, res, next) => {
  try {
    const { zones } = req.body;
    if (!Array.isArray(zones)) return res.status(400).json({ error: 'zones array required' });

    for (const z of zones) {
      await query(`
        INSERT INTO shipping_zones (tenant_id, name, countries, regions, rates, free_shipping_threshold)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
      `, [req.tenant_id, z.name, JSON.stringify(z.countries || []), JSON.stringify(z.regions || []),
          JSON.stringify(z.rates || []), z.free_shipping_threshold]);
    }

    res.json({ synced: zones.length });
  } catch (err) { next(err); }
});

// POST /v1/catalog/offers/sync
router.post('/offers/sync', apiKeyAuth, async (req, res, next) => {
  try {
    const { offers } = req.body;
    if (!Array.isArray(offers)) return res.status(400).json({ error: 'offers array required' });

    for (const o of offers) {
      await query(`
        INSERT INTO offers (tenant_id, external_id, source, name, type, value, code, applies_to,
          min_order_value, usage_limit, starts_at, expires_at, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
      `, [req.tenant_id, o.external_id, o.source || 'api', o.name, o.type, o.value, o.code,
          JSON.stringify(o.applies_to || {}), o.min_order_value, o.usage_limit,
          o.starts_at, o.expires_at, o.is_active !== false]);
    }

    res.json({ synced: offers.length });
  } catch (err) { next(err); }
});

// GET /v1/catalog/products
router.get('/products', apiKeyAuth, async (req, res, next) => {
  try {
    const products = await getActiveProducts(req.tenant_id);
    res.json(products);
  } catch (err) { next(err); }
});

module.exports = router;
