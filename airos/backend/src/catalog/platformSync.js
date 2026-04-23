const { URL } = require('url');

const { decryptValue } = require('../db/queries/catalogIntegrations');

function trimSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const err = new Error(
      (data && typeof data === 'object' && (data.error || data.message?.description || data.message))
      || `Remote request failed with ${response.status}`,
    );
    err.status = response.status;
    throw err;
  }

  return { data, headers: response.headers };
}

function flattenCategoryNames(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object') return String(entry.name || entry.title || entry.value || '').trim();
      return '';
    })
    .filter(Boolean);
}

function extractImageUrls(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        return entry.src || entry.url || entry.thumbnail || entry.image || '';
      }
      return '';
    })
    .filter(Boolean);
}

function mapWooProduct(product, variants = []) {
  return {
    external_id: String(product.id),
    source: 'woocommerce',
    name: product.name,
    description: String(product.description || product.short_description || '').replace(/<[^>]+>/g, ' ').trim(),
    price: Number(product.regular_price || product.price || 0),
    sale_price: product.sale_price ? Number(product.sale_price) : null,
    currency: product.currency || 'USD',
    images: extractImageUrls(product.images),
    variants: variants.map((variant) => ({
      id: String(variant.id),
      sku: variant.sku || '',
      price: Number(variant.price || 0),
      sale_price: variant.sale_price ? Number(variant.sale_price) : null,
      stock_quantity: Number(variant.stock_quantity || 0),
      stock_status: variant.stock_status || 'in_stock',
      attributes: Array.isArray(variant.attributes)
        ? Object.fromEntries(variant.attributes.map((entry) => [entry.name, entry.option]))
        : {},
    })),
    stock_status: product.stock_status || 'in_stock',
    stock_quantity: Number(product.stock_quantity || 0),
    sku: product.sku || '',
    categories: flattenCategoryNames(product.categories),
    metadata: {
      url: product.permalink || '',
      platform_id: product.id,
      tags: flattenCategoryNames(product.tags),
    },
  };
}

async function syncWooCommerce(integration) {
  const config = integration.config || {};
  const meta = config.meta || {};
  const secrets = decryptValue(config.secrets);
  const baseUrl = trimSlash(meta.storeUrl || meta.storeDomain);
  const consumerKey = secrets.consumerKey || '';
  const consumerSecret = secrets.consumerSecret || '';

  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error('WooCommerce requires store URL, consumer key, and consumer secret');
  }

  const products = [];
  let page = 1;

  while (true) {
    const url = new URL(`${baseUrl}/wp-json/wc/v3/products`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'publish');
    url.searchParams.set('consumer_key', consumerKey);
    url.searchParams.set('consumer_secret', consumerSecret);

    const { data } = await fetchJson(url.toString());
    if (!Array.isArray(data) || data.length === 0) break;

    for (const product of data) {
      let variants = [];
      if (Array.isArray(product.variations) && product.variations.length > 0) {
        const variationsUrl = new URL(`${baseUrl}/wp-json/wc/v3/products/${product.id}/variations`);
        variationsUrl.searchParams.set('per_page', '100');
        variationsUrl.searchParams.set('consumer_key', consumerKey);
        variationsUrl.searchParams.set('consumer_secret', consumerSecret);
        const response = await fetchJson(variationsUrl.toString());
        variants = Array.isArray(response.data) ? response.data : [];
      }
      products.push(mapWooProduct(product, variants));
    }

    if (data.length < 100) break;
    page += 1;
  }

  return products;
}

function parseShopifyLinkHeader(header = '') {
  const next = String(header || '')
    .split(',')
    .map((entry) => entry.trim())
    .find((entry) => entry.includes('rel="next"'));
  const match = next?.match(/<([^>]+)>/);
  return match?.[1] || null;
}

function mapShopifyProduct(product) {
  return {
    external_id: String(product.id),
    source: 'shopify',
    name: product.title,
    description: String(product.body_html || '').replace(/<[^>]+>/g, ' ').trim(),
    price: Number(product.variants?.[0]?.price || 0),
    sale_price: product.variants?.[0]?.compare_at_price ? Number(product.variants[0].compare_at_price) : null,
    currency: product.variants?.[0]?.presentment_prices?.[0]?.price?.currency_code || product.currency || 'USD',
    images: extractImageUrls(product.images),
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
        id: String(variant.id),
        sku: variant.sku || '',
        price: Number(variant.price || 0),
        sale_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
        stock_quantity: Number(variant.inventory_quantity || 0),
        stock_status: Number(variant.inventory_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock',
        attributes: {
          option1: variant.option1 || '',
          option2: variant.option2 || '',
          option3: variant.option3 || '',
        },
      }))
      : [],
    stock_status: Array.isArray(product.variants) && product.variants.some((variant) => Number(variant.inventory_quantity || 0) > 0)
      ? 'in_stock'
      : 'out_of_stock',
    stock_quantity: Array.isArray(product.variants)
      ? product.variants.reduce((sum, variant) => sum + Number(variant.inventory_quantity || 0), 0)
      : 0,
    sku: product.variants?.[0]?.sku || '',
    categories: product.product_type ? [product.product_type] : [],
    metadata: {
      url: product.handle ? `https://${product.handle}` : '',
      tags: String(product.tags || '').split(',').map((entry) => entry.trim()).filter(Boolean),
    },
  };
}

async function syncShopify(integration) {
  const config = integration.config || {};
  const meta = config.meta || {};
  const secrets = decryptValue(config.secrets);
  const storeDomain = trimSlash(meta.storeDomain || meta.storeUrl);
  const accessToken = secrets.accessToken || '';

  if (!storeDomain || !accessToken) {
    throw new Error('Shopify requires store domain and access token');
  }

  let nextUrl = `https://${storeDomain}/admin/api/2024-10/products.json?limit=250&status=active`;
  const products = [];

  while (nextUrl) {
    const { data, headers } = await fetchJson(nextUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        Accept: 'application/json',
      },
    });

    const rows = Array.isArray(data?.products) ? data.products : [];
    rows.forEach((product) => products.push(mapShopifyProduct(product)));
    nextUrl = parseShopifyLinkHeader(headers.get('link'));
  }

  return products;
}

function mapSallaProduct(product) {
  const variantRows = Array.isArray(product.variants) ? product.variants : [];
  const categories = flattenCategoryNames(product.categories || product.category || []);
  const image = product.image?.url || product.image || product.thumbnail || '';
  return {
    external_id: String(product.id),
    source: 'salla',
    name: product.name,
    description: String(product.description || '').replace(/<[^>]+>/g, ' ').trim(),
    price: Number(product.price?.amount ?? product.price ?? 0),
    sale_price: product.sale_price?.amount != null ? Number(product.sale_price.amount) : (product.sale_price ? Number(product.sale_price) : null),
    currency: product.price?.currency || product.currency || 'SAR',
    images: [image].filter(Boolean),
    variants: variantRows.map((variant) => ({
      id: String(variant.id),
      sku: variant.sku || '',
      price: Number(variant.price?.amount ?? variant.price ?? 0),
      sale_price: variant.sale_price?.amount != null ? Number(variant.sale_price.amount) : null,
      stock_quantity: Number(variant.stock_quantity || variant.quantity || 0),
      stock_status: Number(variant.stock_quantity || variant.quantity || 0) > 0 ? 'in_stock' : 'out_of_stock',
      attributes: Array.isArray(variant.related_option_values)
        ? { option_values: variant.related_option_values }
        : {},
    })),
    stock_status: product.status === 'out' ? 'out_of_stock' : 'in_stock',
    stock_quantity: Number(product.quantity || product.stock_quantity || 0),
    sku: product.sku || '',
    categories,
    metadata: {
      url: product.urls?.customer || '',
    },
  };
}

async function syncSalla(integration) {
  const config = integration.config || {};
  const secrets = decryptValue(config.secrets);
  const accessToken = secrets.accessToken || '';
  if (!accessToken) throw new Error('Salla requires an access token');

  const products = [];
  let page = 1;

  while (true) {
    const url = new URL('https://api.salla.dev/admin/v2/products');
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '100');
    url.searchParams.set('format', 'light');

    const { data } = await fetchJson(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const rows = Array.isArray(data?.data) ? data.data : [];
    rows.forEach((product) => products.push(mapSallaProduct(product)));
    if (!rows.length || rows.length < 100) break;
    page += 1;
  }

  return products;
}

function mapZidProduct(product) {
  return {
    external_id: String(product.id),
    source: 'zid',
    name: product.name?.en || product.name?.ar || product.name || product.title || '',
    description: String(product.description?.en || product.description?.ar || product.description || '').replace(/<[^>]+>/g, ' ').trim(),
    price: Number(product.price || product.sale_price || 0),
    sale_price: product.sale_price ? Number(product.sale_price) : null,
    currency: product.currency || 'SAR',
    images: extractImageUrls(product.images || product.image?.images || [product.image]),
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
        id: String(variant.id),
        sku: variant.sku || '',
        price: Number(variant.price || 0),
        sale_price: variant.sale_price ? Number(variant.sale_price) : null,
        stock_quantity: Number(variant.quantity || variant.stock_quantity || 0),
        stock_status: Number(variant.quantity || variant.stock_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock',
        attributes: variant.attributes || {},
      }))
      : [],
    stock_status: Number(product.quantity || product.stock_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock',
    stock_quantity: Number(product.quantity || product.stock_quantity || 0),
    sku: product.sku || '',
    categories: flattenCategoryNames(product.categories),
    metadata: {
      url: product.html_url || product.url || '',
    },
  };
}

async function syncZid(integration) {
  const config = integration.config || {};
  const meta = config.meta || {};
  const secrets = decryptValue(config.secrets);
  const accessToken = secrets.accessToken || secrets.apiToken || '';
  const authorizationToken = secrets.authorizationToken || '';
  const storeId = meta.storeId || '';

  if (!accessToken || !authorizationToken || !storeId) {
    throw new Error('Zid requires authorization token, access token, and store ID');
  }

  const products = [];
  let nextUrl = 'https://api.zid.sa/v1/products/';

  while (nextUrl) {
    const { data } = await fetchJson(nextUrl, {
      headers: {
        Authorization: authorizationToken,
        'Access-Token': accessToken,
        'X-Manager-Token': accessToken,
        'Store-Id': storeId,
        Role: 'Manager',
        'Accept-Language': 'en',
      },
    });

    const rows = Array.isArray(data?.results) ? data.results : [];
    rows.forEach((product) => products.push(mapZidProduct(product)));
    nextUrl = data?.next || null;
  }

  return products;
}

async function syncPlatformProducts(integration) {
  switch (integration.type) {
    case 'woocommerce':
      return syncWooCommerce(integration);
    case 'shopify':
      return syncShopify(integration);
    case 'salla':
      return syncSalla(integration);
    case 'zid':
      return syncZid(integration);
    default:
      throw new Error('Unsupported integration type');
  }
}

function parseBasicAuth(header = '') {
  if (!String(header).startsWith('Basic ')) return null;
  const raw = Buffer.from(String(header).slice(6), 'base64').toString('utf8');
  const separator = raw.indexOf(':');
  if (separator === -1) return null;
  return {
    username: raw.slice(0, separator),
    password: raw.slice(separator + 1),
  };
}

function normalizeWebhookEvent(platform, payload = {}) {
  const event = String(payload.event || payload.topic || payload.type || '').trim().toLowerCase();
  if (event.includes('delete') || event.includes('remove')) {
    const deletedId = payload.id || payload.product_id || payload.data?.id || payload.product?.id;
    return {
      action: 'delete',
      externalId: deletedId ? String(deletedId) : '',
      products: [],
    };
  }

  if (platform === 'shopify') {
    const product = payload.product || payload.data || payload;
    return { action: 'upsert', products: [mapShopifyProduct(product)] };
  }
  if (platform === 'woocommerce') {
    const product = payload.product || payload.data || payload;
    return { action: 'upsert', products: [mapWooProduct(product, product.variants || [])] };
  }
  if (platform === 'salla') {
    const product = payload.data?.product || payload.product || payload.data || payload;
    return { action: 'upsert', products: [mapSallaProduct(product)] };
  }
  if (platform === 'zid') {
    const product = payload.data?.product || payload.product || payload.data || payload;
    return { action: 'upsert', products: [mapZidProduct(product)] };
  }

  return { action: 'upsert', products: [] };
}

module.exports = {
  normalizeWebhookEvent,
  parseBasicAuth,
  syncPlatformProducts,
};
