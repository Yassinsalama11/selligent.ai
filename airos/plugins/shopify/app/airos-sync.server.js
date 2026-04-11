/**
 * Syncs Shopify store data to AIROS via the Catalog API.
 */
export class AirosSync {
  constructor(session) {
    this.session  = session;
    this.apiKey   = session.airos_api_key;   // stored in session metafield after setup
    this.tenantId = session.airos_tenant_id;
    this.baseUrl  = process.env.AIROS_API_BASE || 'https://api.airos.io/v1';
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async syncProducts(admin) {
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const query = `
        query ($cursor: String) {
          products(first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id legacyResourceId title descriptionHtml
              variants(first: 20) {
                nodes { id sku price compareAtPrice inventoryQuantity
                        selectedOptions { name value } }
              }
              images(first: 5) { nodes { url } }
              productCategory { productTaxonomyNode { name } }
            }
          }
        }
      `;
      const res = await admin.graphql(query, { variables: { cursor } });
      const { products } = await res.json().then(r => r.data);

      const payload = products.nodes.map(p => this.mapProduct(p));
      await this.post('/catalog/products/sync', { products: payload });

      hasMore = products.pageInfo.hasNextPage;
      cursor  = products.pageInfo.endCursor;
    }
  }

  mapProduct(p) {
    const variants = p.variants.nodes.map(v => ({
      id:           v.id,
      sku:          v.sku,
      price:        parseFloat(v.price),
      sale_price:   v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
      stock_quantity: v.inventoryQuantity,
      attributes:   Object.fromEntries(v.selectedOptions.map(o => [o.name, o.value])),
    }));

    return {
      external_id:     p.legacyResourceId,
      source:          'shopify',
      name:            p.title,
      description:     p.descriptionHtml?.replace(/<[^>]*>/g, '') || '',
      price:           parseFloat(p.variants.nodes[0]?.price || 0),
      sale_price:      p.variants.nodes[0]?.compareAtPrice
                         ? parseFloat(p.variants.nodes[0].compareAtPrice) : null,
      currency:        'USD',  // overridden server-side from shop currency
      images:          p.images.nodes.map(i => i.url),
      categories:      p.productCategory ? [p.productCategory.productTaxonomyNode?.name] : [],
      variants,
    };
  }

  // ── Shipping ──────────────────────────────────────────────────────────────

  async syncShipping(admin) {
    const query = `
      query {
        deliveryProfiles(first: 10) {
          nodes {
            profileLocationGroups {
              locationGroup { locations(first: 1) { nodes { name } } }
              profileLocations {
                location { name }
                methodDefinitions(first: 5) {
                  nodes { name rateProvider { ... on DeliveryRateDefinition { price { amount } } } }
                }
              }
            }
          }
        }
      }
    `;
    const res = await admin.graphql(query);
    const { deliveryProfiles } = await res.json().then(r => r.data);

    const zones = [];
    for (const profile of deliveryProfiles.nodes) {
      for (const group of profile.profileLocationGroups) {
        for (const loc of group.profileLocations) {
          zones.push({
            name:  loc.location.name,
            rates: loc.methodDefinitions.nodes.map(m => ({
              method: m.name,
              cost:   parseFloat(m.rateProvider?.price?.amount || 0),
            })),
          });
        }
      }
    }

    if (zones.length) await this.post('/catalog/shipping/sync', { zones });
  }

  // ── Discounts ─────────────────────────────────────────────────────────────

  async syncDiscounts(admin) {
    const query = `
      query {
        codeDiscountNodes(first: 50) {
          nodes {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title codes(first:1) { nodes { code } }
                customerGets { value { ... on DiscountPercentage { percentage } ... on DiscountAmount { amount { amount } } } }
                minimumRequirement { ... on DiscountMinimumQuantity { quantity } ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } } }
                usageLimit
                appliesOncePerCustomer
                endsAt
              }
            }
          }
        }
      }
    `;
    const res = await admin.graphql(query);
    const { codeDiscountNodes } = await res.json().then(r => r.data);

    const offers = codeDiscountNodes.nodes
      .filter(n => n.codeDiscount?.title)
      .map(n => {
        const d    = n.codeDiscount;
        const val  = d.customerGets?.value;
        const pct  = val?.percentage;
        const amt  = val?.amount?.amount;
        return {
          external_id: n.id,
          source:      'shopify',
          name:        d.title,
          type:        pct ? 'percentage' : 'fixed',
          value:       pct ? parseFloat(pct) * 100 : parseFloat(amt || 0),
          code:        d.codes?.nodes[0]?.code,
          usage_limit: d.usageLimit,
          expires_at:  d.endsAt,
          is_active:   true,
        };
      });

    if (offers.length) await this.post('/catalog/offers/sync', { offers });
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────

  async post(endpoint, body) {
    const res = await fetch(this.baseUrl + endpoint, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key':    this.apiKey,
        'X-Tenant-ID':  this.tenantId,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AIROS API ${endpoint} → ${res.status}: ${text}`);
    }
    return res.json();
  }
}
