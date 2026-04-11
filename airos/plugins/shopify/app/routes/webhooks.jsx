import { authenticate } from '../shopify.server.js';
import { AirosSync } from '../airos-sync.server.js';

export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  switch (topic) {
    case 'PRODUCTS_CREATE':
    case 'PRODUCTS_UPDATE': {
      if (!session) break;
      const sync = new AirosSync(session);
      await sync.post('/catalog/products/sync', {
        products: [sync.mapProduct(transformShopifyRestProduct(payload))],
      });
      break;
    }

    case 'PRODUCTS_DELETE': {
      if (!session) break;
      await fetch(`${process.env.AIROS_API_BASE}/catalog/products/${payload.id}?source=shopify`, {
        method:  'DELETE',
        headers: { 'X-API-Key': session.airos_api_key, 'X-Tenant-ID': session.airos_tenant_id },
      });
      break;
    }

    case 'DISCOUNT_CODES_CREATE':
    case 'DISCOUNT_CODES_UPDATE': {
      if (!session) break;
      const sync = new AirosSync(session);
      await sync.post('/catalog/offers/sync', {
        offers: [{
          external_id: String(payload.id),
          source:      'shopify',
          name:        payload.title || payload.code,
          type:        'fixed',
          value:       parseFloat(payload.amount || 0),
          code:        payload.code,
          is_active:   true,
        }],
      });
      break;
    }

    case 'APP_UNINSTALLED': {
      // Clean up session
      console.log(`[Shopify] App uninstalled from ${shop}`);
      break;
    }
  }

  return new Response(null, { status: 200 });
};

// Shopify REST webhook payload → GraphQL-compatible shape for mapProduct
function transformShopifyRestProduct(p) {
  return {
    legacyResourceId: String(p.id),
    title:            p.title,
    descriptionHtml:  p.body_html,
    variants: {
      nodes: (p.variants || []).map(v => ({
        id:               `gid://shopify/ProductVariant/${v.id}`,
        sku:              v.sku,
        price:            v.price,
        compareAtPrice:   v.compare_at_price,
        inventoryQuantity: v.inventory_quantity,
        selectedOptions:  (v.option_values || []).map((val, i) => ({ name: `Option${i + 1}`, value: val })),
      })),
    },
    images:          { nodes: (p.images || []).map(i => ({ url: i.src })) },
    productCategory: null,
  };
}
