<?php
/**
 * Plugin Name: AIROS Chat & Sync
 * Description: Connect your WooCommerce store to AIROS AI Revenue System
 * Version:     1.0.0
 * Author:      AIROS
 * Text Domain: airos-chat
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

define('AIROS_VERSION',    '1.0.0');
define('AIROS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('AIROS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('AIROS_API_BASE',   'https://api.airos.io/v1');

require_once AIROS_PLUGIN_DIR . 'includes/class-airos-api.php';
require_once AIROS_PLUGIN_DIR . 'includes/class-airos-sync.php';
require_once AIROS_PLUGIN_DIR . 'includes/class-airos-widget.php';
require_once AIROS_PLUGIN_DIR . 'admin/settings-page.php';

class AIROS_Plugin {

    private static ?AIROS_Plugin $instance = null;

    public static function instance(): AIROS_Plugin {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init',         [$this, 'load_textdomain']);
        add_action('admin_menu',   [$this, 'add_settings_page']);
        add_action('admin_init',   [$this, 'register_settings']);
        add_action('wp_footer',    [$this, 'inject_widget']);
        add_action('admin_notices',[$this, 'admin_notices']);

        // Cron sync
        add_action('airos_sync_cron', [$this, 'run_sync']);
        if (!wp_next_scheduled('airos_sync_cron')) {
            wp_schedule_event(time(), 'sixhours', 'airos_sync_cron');
        }

        // WooCommerce real-time webhooks
        add_action('woocommerce_new_product',            [$this, 'on_product_change']);
        add_action('woocommerce_update_product',         [$this, 'on_product_change']);
        add_action('woocommerce_before_delete_product',  [$this, 'on_product_delete']);
        add_action('woocommerce_new_coupon',             [$this, 'on_coupon_change']);
        add_action('woocommerce_update_coupon',          [$this, 'on_coupon_change']);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public function load_textdomain(): void {
        load_plugin_textdomain('airos-chat', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function add_settings_page(): void {
        AIROS_Settings_Page::add_menu();
    }

    public function register_settings(): void {
        register_setting('airos_options', 'airos_api_key',   ['sanitize_callback' => 'sanitize_text_field']);
        register_setting('airos_options', 'airos_tenant_id', ['sanitize_callback' => 'sanitize_text_field']);
        register_setting('airos_options', 'airos_widget_enabled', ['sanitize_callback' => 'absint']);
    }

    public function admin_notices(): void {
        if (!get_option('airos_api_key') || !get_option('airos_tenant_id')) {
            echo '<div class="notice notice-warning is-dismissible"><p>'
                . sprintf(
                    __('<strong>AIROS</strong>: Please <a href="%s">configure your API key and Tenant ID</a> to activate the chat widget.', 'airos-chat'),
                    admin_url('admin.php?page=airos-chat')
                )
                . '</p></div>';
        }
    }

    // ── Widget injection ─────────────────────────────────────────────────────

    public function inject_widget(): void {
        if (!get_option('airos_widget_enabled', 1)) return;

        $tenant_id = get_option('airos_tenant_id');
        if (!$tenant_id) return;

        $widget = new AIROS_Widget($tenant_id);
        $widget->render();
    }

    // ── Sync triggers ────────────────────────────────────────────────────────

    public function run_sync(): void {
        $sync = new AIROS_Sync(get_option('airos_api_key'), get_option('airos_tenant_id'));
        $sync->sync_products();
        $sync->sync_shipping_zones();
        $sync->sync_coupons();
    }

    public function on_product_change(int $product_id): void {
        $sync = new AIROS_Sync(get_option('airos_api_key'), get_option('airos_tenant_id'));
        $sync->sync_single_product($product_id);
    }

    public function on_product_delete(int $product_id): void {
        $api = new AIROS_API(get_option('airos_api_key'), get_option('airos_tenant_id'));
        $api->delete_product($product_id);
    }

    public function on_coupon_change(int $coupon_id): void {
        $sync = new AIROS_Sync(get_option('airos_api_key'), get_option('airos_tenant_id'));
        $sync->sync_single_coupon($coupon_id);
    }
}

// Custom cron interval
add_filter('cron_schedules', function ($schedules) {
    $schedules['sixhours'] = ['interval' => 21600, 'display' => __('Every 6 hours')];
    return $schedules;
});

// Activation / deactivation
register_activation_hook(__FILE__, function () {
    if (!wp_next_scheduled('airos_sync_cron')) {
        wp_schedule_event(time(), 'sixhours', 'airos_sync_cron');
    }
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('airos_sync_cron');
});

// Boot
add_action('plugins_loaded', function () {
    AIROS_Plugin::instance();
});
