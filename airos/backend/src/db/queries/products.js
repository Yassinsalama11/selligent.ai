const { query } = require('../pool');

async function upsertProducts(tenantId, products) {
  const results = [];
  for (const p of products) {
    const res = await query(`
      INSERT INTO products (
        tenant_id, external_id, source, name, description, price, sale_price,
        currency, sku, stock_status, stock_quantity, images, variants,
        categories, shipping_info, metadata, is_active, last_synced_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,NOW(),NOW())
      ON CONFLICT (tenant_id, external_id, source)
      DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        price = EXCLUDED.price, sale_price = EXCLUDED.sale_price,
        stock_status = EXCLUDED.stock_status, stock_quantity = EXCLUDED.stock_quantity,
        images = EXCLUDED.images, variants = EXCLUDED.variants,
        categories = EXCLUDED.categories, metadata = EXCLUDED.metadata,
        last_synced_at = NOW(), updated_at = NOW()
      RETURNING id
    `, [
      tenantId, p.external_id, p.source || 'api', p.name, p.description,
      p.price, p.sale_price, p.currency || 'USD', p.sku,
      p.stock_status || 'in_stock', p.stock_quantity,
      JSON.stringify(p.images || []), JSON.stringify(p.variants || []),
      JSON.stringify(p.categories || []), JSON.stringify(p.shipping_info || {}),
      JSON.stringify(p.metadata || {})
    ]);
    results.push(res.rows[0]);
  }
  return results;
}

async function getActiveProducts(tenantId, { limit = 100 } = {}) {
  const res = await query(`
    SELECT * FROM products WHERE tenant_id = $1 AND is_active = TRUE
    ORDER BY name LIMIT $2
  `, [tenantId, limit]);
  return res.rows;
}

async function getProductCatalogSummary(tenantId) {
  const res = await query(`
    SELECT id, name, price, sale_price, currency, stock_status, categories
    FROM products WHERE tenant_id = $1 AND is_active = TRUE
    ORDER BY name LIMIT 50
  `, [tenantId]);
  return res.rows;
}

module.exports = { upsertProducts, getActiveProducts, getProductCatalogSummary };
