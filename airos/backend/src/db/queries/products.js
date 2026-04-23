const { query, queryAdmin, adminWithTransaction } = require('../pool');

function asNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null) return [];
  return [value].filter(Boolean);
}

function normalizeImageList(value) {
  return normalizeList(value)
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        return entry.url || entry.src || entry.thumbnail || entry.image || '';
      }
      return '';
    })
    .filter(Boolean);
}

function normalizeCategoryList(value, tags = []) {
  return normalizeList(value)
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object') return pickString(entry.name, entry.title, entry.label, entry.value);
      return '';
    })
    .concat(
      normalizeList(tags).map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean),
    )
    .filter(Boolean);
}

function normalizeVariantList(value) {
  return normalizeList(value)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      return {
        id: pickString(entry.id, entry.external_id, entry.externalId),
        sku: pickString(entry.sku),
        price: asNumber(entry.price),
        sale_price: asNumber(entry.sale_price ?? entry.salePrice ?? entry.compare_at_price ?? entry.compareAtPrice),
        stock_quantity: asNumber(entry.stock_quantity ?? entry.stockQuantity ?? entry.quantity ?? entry.inventory_quantity),
        stock_status: pickString(entry.stock_status, entry.stockStatus) || (
          Number((entry.stock_quantity ?? entry.quantity ?? entry.inventory_quantity) || 0) > 0
            ? 'in_stock'
            : 'out_of_stock'
        ),
        attributes: entry.attributes || entry.options || {},
      };
    })
    .filter(Boolean);
}

function normalizeCatalogProduct(input = {}) {
  const metadata = input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {};
  const priceAmount = typeof input.price === 'object' && input.price
    ? (input.price.amount ?? input.price.value ?? null)
    : input.price;
  const salePriceAmount = typeof input.sale_price === 'object' && input.sale_price
    ? (input.sale_price.amount ?? input.sale_price.value ?? null)
    : (input.sale_price ?? input.salePrice);
  const categories = normalizeCategoryList(input.categories, input.tags);
  const images = normalizeImageList(input.images);
  const variants = normalizeVariantList(input.variants);
  const stockQuantity = asNumber(
    input.stock_quantity ?? input.stockQuantity ?? input.stock ?? input.inventory_quantity ?? input.quantity,
  );
  const stockStatus = pickString(input.stock_status, input.stockStatus)
    || (stockQuantity != null ? (stockQuantity > 0 ? 'in_stock' : 'out_of_stock') : 'in_stock');
  const externalId = pickString(
    input.external_id,
    input.externalId,
    input.id,
    input.sku,
  );
  const name = pickString(input.name, input.title);
  if (!externalId || !name) return null;

  if (input.url && !metadata.url) metadata.url = input.url;
  if (Array.isArray(input.tags) && !metadata.tags) metadata.tags = input.tags;

  return {
    external_id: externalId,
    source: pickString(input.source) || 'api',
    name,
    description: pickString(input.description, input.body_html, input.bodyHtml),
    price: asNumber(priceAmount),
    sale_price: asNumber(salePriceAmount),
    currency: pickString(input.currency, input.currency_code, input.price?.currency, input.sale_price?.currency) || 'USD',
    sku: pickString(input.sku),
    stock_status: stockStatus,
    stock_quantity: stockQuantity,
    images,
    variants,
    categories,
    shipping_info: input.shipping_info && typeof input.shipping_info === 'object' ? input.shipping_info : {},
    metadata,
  };
}

async function upsertProducts(tenantId, products) {
  const results = [];
  for (const rawProduct of products) {
    const p = normalizeCatalogProduct(rawProduct);
    if (!p) continue;
    const res = await queryAdmin(`
      INSERT INTO products (
        tenant_id, external_id, source, name, description, price, sale_price,
        currency, sku, stock_status, stock_quantity, images, variants,
        categories, shipping_info, metadata, is_active, last_synced_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,NOW(),NOW())
      ON CONFLICT (tenant_id, external_id, source)
      DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        price = EXCLUDED.price, sale_price = EXCLUDED.sale_price,
        currency = EXCLUDED.currency, sku = EXCLUDED.sku,
        stock_status = EXCLUDED.stock_status, stock_quantity = EXCLUDED.stock_quantity,
        images = EXCLUDED.images, variants = EXCLUDED.variants,
        categories = EXCLUDED.categories, shipping_info = EXCLUDED.shipping_info,
        metadata = EXCLUDED.metadata,
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

async function getActiveProducts(tenantId, { limit = 100, source } = {}, client) {
  const params = [tenantId];
  const filters = ['tenant_id = $1', 'is_active = TRUE'];

  if (source) {
    params.push(source);
    filters.push(`source = $${params.length}`);
  }

  params.push(limit);

  const sql = `
    SELECT * FROM products
    WHERE ${filters.join(' AND ')}
    ORDER BY name
    LIMIT $${params.length}
  `;

  const res = client
    ? await client.query(sql, params)
    : await query(sql, params);
  return res.rows;
}

async function getProductCatalogSummary(tenantId) {
  const res = await queryAdmin(`
    SELECT id, name, description, price, sale_price, currency, stock_status,
           stock_quantity, sku, source, images, variants, categories, metadata
    FROM products WHERE tenant_id = $1 AND is_active = TRUE
    ORDER BY name LIMIT 50
  `, [tenantId]);
  return res.rows;
}

async function deleteCatalogProduct(
  tenantId,
  productId,
  source,
  { actorType = 'system', actorId = null, metadata = {} } = {}
) {
  return adminWithTransaction(async (client) => {
    const deleted = await client.query(
      `DELETE FROM products
       WHERE tenant_id = $1 AND id = $2 AND source = $3
       RETURNING *`,
      [tenantId, productId, source]
    );

    const product = deleted.rows[0];
    if (!product) return null;

    await client.query(
      `INSERT INTO audit_log
        (tenant_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenantId,
        actorType,
        actorId,
        'catalog.product.deleted',
        'product',
        product.id,
        JSON.stringify({
          source,
          product_name: product.name,
          external_id: product.external_id,
          ...metadata,
        }),
      ]
    );

    return product;
  });
}

async function deleteCatalogProductByExternalId(
  tenantId,
  externalId,
  source,
  { actorType = 'system', actorId = null, metadata = {} } = {},
) {
  return adminWithTransaction(async (client) => {
    const deleted = await client.query(
      `DELETE FROM products
       WHERE tenant_id = $1 AND external_id = $2 AND source = $3
       RETURNING *`,
      [tenantId, externalId, source]
    );

    const product = deleted.rows[0];
    if (!product) return null;

    await client.query(
      `INSERT INTO audit_log
        (tenant_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenantId,
        actorType,
        actorId,
        'catalog.product.deleted',
        'product',
        product.id,
        JSON.stringify({
          source,
          product_name: product.name,
          external_id: product.external_id,
          ...metadata,
        }),
      ]
    );

    return product;
  });
}

module.exports = {
  deleteCatalogProductByExternalId,
  upsertProducts,
  getActiveProducts,
  getProductCatalogSummary,
  deleteCatalogProduct,
  normalizeCatalogProduct,
};
