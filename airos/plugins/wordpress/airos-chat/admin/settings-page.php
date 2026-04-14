<?php
defined('ABSPATH') || exit;

class AIROS_Settings_Page {

    public static function add_menu(): void {
        add_menu_page(
            __('ChatOrAI Chat', 'airos-chat'),
            __('ChatOrAI Chat', 'airos-chat'),
            'manage_options',
            'airos-chat',
            [self::class, 'render'],
            'dashicons-format-chat',
            58
        );
    }

    public static function render(): void {
        if (!current_user_can('manage_options')) return;

        $api_key   = esc_attr(get_option('airos_api_key', ''));
        $tenant_id = esc_attr(get_option('airos_tenant_id', ''));

        // Handle manual sync button
        if (isset($_POST['airos_manual_sync']) && check_admin_referer('airos_manual_sync_nonce')) {
            if (!$api_key || !$tenant_id) {
                echo '<div class="notice notice-error"><p>' . esc_html__(
                    'Enter your ChatOrAI API key and Tenant ID before running a sync.',
                    'airos-chat'
                ) . '</p></div>';
            } else {
                try {
                    $sync = new AIROS_Sync($api_key, $tenant_id);
                    $sync->sync_products();
                    $sync->sync_shipping_zones();
                    $sync->sync_coupons();
                    echo '<div class="notice notice-success"><p>' . esc_html__(
                        'Sync complete!',
                        'airos-chat'
                    ) . '</p></div>';
                } catch (Throwable $error) {
                    echo '<div class="notice notice-error"><p>' . esc_html__(
                        'Sync failed. Please verify your configuration and try again.',
                        'airos-chat'
                    ) . '</p></div>';
                }
            }
        }

        $widget_enabled = get_option('airos_widget_enabled', 1);
        $last_sync      = get_option('airos_last_sync', __('Never', 'airos-chat'));
        $synced_count   = get_option('airos_synced_count', 0);
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('ChatOrAI Chat & Sync', 'airos-chat'); ?></h1>

            <form method="post" action="options.php">
                <?php settings_fields('airos_options'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="airos_api_key"><?php esc_html_e('ChatOrAI API Key', 'airos-chat'); ?></label>
                        </th>
                        <td>
                            <input name="airos_api_key" id="airos_api_key" type="password"
                                   class="regular-text" value="<?php echo $api_key; ?>" autocomplete="off" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="airos_tenant_id"><?php esc_html_e('Tenant ID', 'airos-chat'); ?></label>
                        </th>
                        <td>
                            <input name="airos_tenant_id" id="airos_tenant_id" type="text"
                                   class="regular-text" value="<?php echo $tenant_id; ?>" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Enable Widget', 'airos-chat'); ?></th>
                        <td>
                            <label>
                                <input name="airos_widget_enabled" type="hidden" value="0" />
                                <input name="airos_widget_enabled" type="checkbox" value="1"
                                    <?php checked($widget_enabled, 1); ?> />
                                <?php esc_html_e('Show live chat bubble on all pages', 'airos-chat'); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <hr />

            <h2><?php esc_html_e('Product Sync', 'airos-chat'); ?></h2>
            <p>
                <?php printf(
                    esc_html__('Last sync: %1$s — %2$d products synced', 'airos-chat'),
                    esc_html($last_sync),
                    (int) $synced_count
                ); ?>
            </p>
            <form method="post">
                <?php wp_nonce_field('airos_manual_sync_nonce'); ?>
                <input type="submit" name="airos_manual_sync"
                       class="button button-secondary"
                       value="<?php esc_attr_e('Sync Now', 'airos-chat'); ?>" />
            </form>
        </div>
        <?php
    }
}
