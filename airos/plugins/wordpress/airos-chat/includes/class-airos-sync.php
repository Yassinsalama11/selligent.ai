<?php
defined('ABSPATH') || exit;

/**
 * Syncs WooCommerce products, shipping zones, and coupons to AIROS.
 */
class AIROS_Sync {

    private AIROS_API $api;

    public function __construct(string $api_key, string $tenant_id) {
        $this->api = new AIROS_API($api_key, $tenant_id);
    }

    // ── Products ─────────────────────────────────────────────────────────────

    public function sync_products(): void {
        if (!$this->api->is_configured() || !function_exists('wc_get_products')) return;

        $products = wc_get_products(['limit' => -1, 'status' => 'publish']);
        $payload  = array_map([$this, 'map_product'], $products);

        $this->api->post('/catalog/products/sync', ['products' => $payload]);
        update_option('airos_last_sync', current_time('mysql'));
        update_option('airos_synced_count', count($payload));
    }

    public function sync_single_product(int $product_id): void {
        if (!$this->api->is_configured()) return;

        $product = wc_get_product($product_id);
        if (!$product || $product->get_status() !== 'publish') return;

        $this->api->post('/catalog/products/sync', ['products' => [$this->map_product($product)]]);
    }

    private function map_product(WC_Product $p): array {
        $image_ids = $p->get_gallery_image_ids();
        if ($main = $p->get_image_id()) array_unshift($image_ids, $main);

        $variants = [];
        if ($p->is_type('variable')) {
            foreach ($p->get_available_variations() as $v) {
                $variants[] = [
                    'id'           => $v['variation_id'],
                    'sku'          => $v['sku'],
                    'price'        => (float) $v['display_price'],
                    'stock_status' => $v['is_in_stock'] ? 'in_stock' : 'out_of_stock',
                    'attributes'   => $v['attributes'],
                ];
            }
        }

        return [
            'external_id'   => (string) $p->get_id(),
            'source'        => 'woocommerce',
            'name'          => $p->get_name(),
            'description'   => wp_strip_all_tags($p->get_description() ?: $p->get_short_description()),
            'price'         => (float) $p->get_regular_price() ?: (float) $p->get_price(),
            'sale_price'    => $p->get_sale_price() ? (float) $p->get_sale_price() : null,
            'currency'      => get_woocommerce_currency(),
            'sku'           => $p->get_sku(),
            'stock_status'  => $p->get_stock_status(),
            'stock_quantity'=> $p->get_stock_quantity(),
            'images'        => array_map('wp_get_attachment_url', array_filter($image_ids)),
            'categories'    => wp_get_post_terms($p->get_id(), 'product_cat', ['fields' => 'names']),
            'variants'      => $variants,
            'weight'        => $p->get_weight() ? (float) $p->get_weight() : null,
        ];
    }

    // ── Shipping zones ────────────────────────────────────────────────────────

    public function sync_shipping_zones(): void {
        if (!$this->api->is_configured() || !class_exists('WC_Shipping_Zones')) return;

        $zones   = WC_Shipping_Zones::get_zones();
        $payload = [];

        foreach ($zones as $z) {
            $zone       = new WC_Shipping_Zone($z['zone_id']);
            $locations  = $zone->get_zone_locations();
            $countries  = [];
            $regions    = [];

            foreach ($locations as $loc) {
                if ($loc->type === 'country') $countries[] = $loc->code;
                if ($loc->type === 'state')   $regions[]   = $loc->code;
            }

            $rates = [];
            foreach ($zone->get_shipping_methods(true) as $method) {
                $rates[] = [
                    'method'   => $method->id,
                    'title'    => $method->title,
                    'cost'     => (float) ($method->get_option('cost') ?: 0),
                    'min_days' => null,
                    'max_days' => null,
                ];
            }

            $payload[] = [
                'name'      => $zone->get_zone_name(),
                'countries' => $countries,
                'regions'   => $regions,
                'rates'     => $rates,
            ];
        }

        if ($payload) $this->api->post('/catalog/shipping/sync', ['zones' => $payload]);
    }

    // ── Coupons ───────────────────────────────────────────────────────────────

    public function sync_coupons(): void {
        if (!$this->api->is_configured()) return;

        $coupon_ids = get_posts(['post_type' => 'shop_coupon', 'numberposts' => -1, 'fields' => 'ids']);
        $payload    = [];

        foreach ($coupon_ids as $id) {
            $c = new WC_Coupon($id);
            $payload[] = $this->map_coupon($c);
        }

        if ($payload) $this->api->post('/catalog/offers/sync', ['offers' => $payload]);
    }

    public function sync_single_coupon(int $coupon_id): void {
        if (!$this->api->is_configured()) return;

        $c = new WC_Coupon($coupon_id);
        $this->api->post('/catalog/offers/sync', ['offers' => [$this->map_coupon($c)]]);
    }

    private function map_coupon(WC_Coupon $c): array {
        $type_map = [
            'percent'       => 'percentage',
            'fixed_cart'    => 'fixed',
            'fixed_product' => 'fixed',
        ];

        return [
            'external_id'     => (string) $c->get_id(),
            'source'          => 'woocommerce',
            'name'            => $c->get_code(),
            'type'            => $type_map[$c->get_discount_type()] ?? 'fixed',
            'value'           => (float) $c->get_amount(),
            'code'            => $c->get_code(),
            'min_order_value' => $c->get_minimum_amount() ? (float) $c->get_minimum_amount() : null,
            'usage_limit'     => $c->get_usage_limit() ?: null,
            'usage_count'     => $c->get_usage_count(),
            'expires_at'      => $c->get_date_expires() ? $c->get_date_expires()->date('c') : null,
            'is_active'       => true,
        ];
    }
}
