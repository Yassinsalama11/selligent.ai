const test = require('node:test');
const assert = require('node:assert/strict');

const { createCatalogHandlers } = require('../src/api/routes/catalog');

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runMiddleware(handler, req, res) {
  let nextError = null;

  await handler(req, res, (err) => {
    nextError = err || null;
  });

  if (nextError) {
    throw nextError;
  }
}

test('DELETE catalog handler deletes WooCommerce products through plugin auth', async () => {
  const calls = [];
  const handlers = createCatalogHandlers({
    query: async (text, params) => {
      calls.push({ text, params });
      return { rows: [{ id: 'integration-1', tenant_id: 'tenant-1', type: 'woocommerce' }] };
    },
    deleteCatalogProduct: async (tenantId, productId, source, options) => ({
      id: productId,
      tenant_id: tenantId,
      source,
      audit: options,
    }),
  });

  const req = {
    headers: {
      'x-api-key': 'secret',
      'x-tenant-id': 'tenant-1',
    },
    params: { id: 'prod-1' },
    query: { source: 'woocommerce' },
  };
  const res = createResponseRecorder();

  await runMiddleware(handlers.catalogAuth, req, res);
  await runMiddleware(handlers.removeProduct, req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deleted.id, 'prod-1');
  assert.equal(res.body.deleted.source, 'woocommerce');
  assert.deepEqual(res.body.deleted.audit, {
    actorType: 'integration',
    actorId: 'integration-1',
    metadata: { via: 'catalog-api' },
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /SELECT i\.id, i\.tenant_id, i\.type/i);
});

test('DELETE catalog handler deletes Shopify products through plugin auth', async () => {
  const handlers = createCatalogHandlers({
    query: async () => ({
      rows: [{ id: 'integration-2', tenant_id: 'tenant-9', type: 'shopify' }],
    }),
    deleteCatalogProduct: async (tenantId, productId, source, options) => ({
      id: productId,
      tenant_id: tenantId,
      source,
      actorType: options.actorType,
      actorId: options.actorId,
    }),
  });

  const req = {
    headers: {
      'x-api-key': 'secret',
      'x-tenant-id': 'tenant-9',
    },
    params: { id: 'prod-9' },
    query: { source: 'shopify' },
  };
  const res = createResponseRecorder();

  await runMiddleware(handlers.catalogAuth, req, res);
  await runMiddleware(handlers.removeProduct, req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deleted.source, 'shopify');
  assert.equal(res.body.deleted.actorType, 'integration');
  assert.equal(res.body.deleted.actorId, 'integration-2');
});

test('DELETE catalog handler rejects invalid catalog sources', async () => {
  const handlers = createCatalogHandlers({
    query: async () => ({
      rows: [{ id: 'integration-3', tenant_id: 'tenant-2', type: 'woocommerce' }],
    }),
  });

  const req = {
    headers: {
      'x-api-key': 'secret',
      'x-tenant-id': 'tenant-2',
    },
    params: { id: 'prod-2' },
    query: { source: 'manual' },
  };
  const res = createResponseRecorder();

  await runMiddleware(handlers.catalogAuth, req, res);
  await runMiddleware(handlers.removeProduct, req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'source must be woocommerce or shopify');
});

test('GET catalog handler supports dashboard JWT auth', async () => {
  const handlers = createCatalogHandlers({
    verifyJwt: () => ({ id: 'user-1', tenant_id: 'tenant-4' }),
    getActiveProducts: async (tenantId, options) => ([
      { id: 'prod-77', tenant_id: tenantId, source: options.source || 'woocommerce', name: 'Test Product' },
    ]),
  });

  const req = {
    headers: {
      authorization: 'Bearer valid-token',
    },
    query: { source: 'woocommerce' },
  };
  const res = createResponseRecorder();

  await runMiddleware(handlers.catalogAuth, req, res);
  await runMiddleware(handlers.listProducts, req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].tenant_id, 'tenant-4');
  assert.equal(res.body[0].source, 'woocommerce');
});
