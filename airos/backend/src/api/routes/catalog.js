const express = require('express');
const jwt = require('jsonwebtoken');

const {
  upsertProducts,
  getActiveProducts,
  deleteCatalogProduct,
} = require('../../db/queries/products');
const { query } = require('../../db/pool');

const VALID_CATALOG_SOURCES = new Set(['woocommerce', 'shopify']);

function defaultVerifyJwt(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function normalizeCatalogSource(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveCatalogDeps(deps = {}) {
  return {
    queryFn: deps.query || query,
    upsertProductsFn: deps.upsertProducts || upsertProducts,
    getActiveProductsFn: deps.getActiveProducts || getActiveProducts,
    deleteCatalogProductFn: deps.deleteCatalogProduct || deleteCatalogProduct,
    verifyJwt: deps.verifyJwt || defaultVerifyJwt,
  };
}

function createCatalogHandlers(deps = {}) {
  const {
    queryFn,
    upsertProductsFn,
    getActiveProductsFn,
    deleteCatalogProductFn,
    verifyJwt,
  } = resolveCatalogDeps(deps);

  async function catalogAuth(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'];
      const tenantId = req.headers['x-tenant-id'];
      const header = req.headers.authorization;

      if (apiKey && tenantId) {
        const result = await queryFn(
          `SELECT i.id, i.tenant_id, i.type
           FROM integrations i
           WHERE i.tenant_id = $1
             AND i.config->>'api_key' = $2
             AND i.status = 'active'
           LIMIT 1`,
          [tenantId, apiKey]
        );

        if (!result.rows.length) {
          return res.status(401).json({ error: 'Invalid API key' });
        }

        req.tenant_id = tenantId;
        req.catalog_actor = {
          type: 'integration',
          id: result.rows[0].id,
        };
        return next();
      }

      if (header && header.startsWith('Bearer ')) {
        const user = verifyJwt(header.slice(7));
        req.user = user;
        req.tenant_id = user.tenant_id;
        req.catalog_actor = {
          type: 'user',
          id: user.id,
        };
        return next();
      }

      return res.status(401).json({ error: 'Missing catalog credentials' });
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      return next(err);
    }
  }

  async function syncCatalog(req, res, next) {
    try {
      const { products } = req.body;
      if (!Array.isArray(products) || !products.length) {
        return res.status(400).json({ error: 'products array required' });
      }
      const results = await upsertProductsFn(req.tenant_id, products);
      return res.json({ synced: results.length });
    } catch (err) {
      return next(err);
    }
  }

  async function syncProducts(req, res, next) {
    try {
      const { products } = req.body;
      if (!Array.isArray(products)) return res.status(400).json({ error: 'products array required' });
      const results = await upsertProductsFn(req.tenant_id, products);
      return res.json({ synced: results.length });
    } catch (err) {
      return next(err);
    }
  }

  async function syncShipping(req, res, next) {
    try {
      const { zones } = req.body;
      if (!Array.isArray(zones)) return res.status(400).json({ error: 'zones array required' });

      for (const zone of zones) {
        await queryFn(
          `INSERT INTO shipping_zones (tenant_id, name, countries, regions, rates, free_shipping_threshold)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT DO NOTHING`,
          [
            req.tenant_id,
            zone.name,
            JSON.stringify(zone.countries || []),
            JSON.stringify(zone.regions || []),
            JSON.stringify(zone.rates || []),
            zone.free_shipping_threshold,
          ]
        );
      }

      return res.json({ synced: zones.length });
    } catch (err) {
      return next(err);
    }
  }

  async function syncOffers(req, res, next) {
    try {
      const { offers } = req.body;
      if (!Array.isArray(offers)) return res.status(400).json({ error: 'offers array required' });

      for (const offer of offers) {
        await queryFn(
          `INSERT INTO offers (tenant_id, external_id, source, name, type, value, code, applies_to,
            min_order_value, usage_limit, starts_at, expires_at, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT DO NOTHING`,
          [
            req.tenant_id,
            offer.external_id,
            offer.source || 'api',
            offer.name,
            offer.type,
            offer.value,
            offer.code,
            JSON.stringify(offer.applies_to || {}),
            offer.min_order_value,
            offer.usage_limit,
            offer.starts_at,
            offer.expires_at,
            offer.is_active !== false,
          ]
        );
      }

      return res.json({ synced: offers.length });
    } catch (err) {
      return next(err);
    }
  }

  async function listProducts(req, res, next) {
    try {
      const source = normalizeCatalogSource(req.query.source);
      const products = await getActiveProductsFn(req.tenant_id, {
        limit: req.query.limit ? Number.parseInt(req.query.limit, 10) || 100 : 100,
        source: VALID_CATALOG_SOURCES.has(source) ? source : undefined,
      });
      return res.json(products);
    } catch (err) {
      return next(err);
    }
  }

  async function removeProduct(req, res, next) {
    try {
      const source = normalizeCatalogSource(req.query.source);
      if (!VALID_CATALOG_SOURCES.has(source)) {
        return res.status(400).json({ error: 'source must be woocommerce or shopify' });
      }

      const deleted = await deleteCatalogProductFn(
        req.tenant_id,
        req.params.id,
        source,
        {
          actorType: req.catalog_actor?.type || 'system',
          actorId: req.catalog_actor?.id || null,
          metadata: {
            via: 'catalog-api',
          },
        }
      );

      if (!deleted) {
        return res.status(404).json({ error: 'Product not found for tenant and source' });
      }

      return res.json({ deleted });
    } catch (err) {
      return next(err);
    }
  }

  return {
    catalogAuth,
    syncCatalog,
    syncProducts,
    syncShipping,
    syncOffers,
    listProducts,
    removeProduct,
  };
}

function createCatalogRouter(deps = {}) {
  const router = express.Router();
  const handlers = createCatalogHandlers(deps);

  router.post('/sync', handlers.catalogAuth, handlers.syncCatalog);
  router.post('/products/sync', handlers.catalogAuth, handlers.syncProducts);
  router.post('/shipping/sync', handlers.catalogAuth, handlers.syncShipping);
  router.post('/offers/sync', handlers.catalogAuth, handlers.syncOffers);
  router.get('/products', handlers.catalogAuth, handlers.listProducts);
  router.delete('/products/:id', handlers.catalogAuth, handlers.removeProduct);

  return router;
}

const router = createCatalogRouter();

module.exports = router;
module.exports.createCatalogHandlers = createCatalogHandlers;
module.exports.createCatalogRouter = createCatalogRouter;
module.exports.VALID_CATALOG_SOURCES = VALID_CATALOG_SOURCES;
