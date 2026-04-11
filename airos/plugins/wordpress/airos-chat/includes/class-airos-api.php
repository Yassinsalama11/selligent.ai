<?php
defined('ABSPATH') || exit;

/**
 * Low-level HTTP client for the AIROS REST API.
 */
class AIROS_API {

    private string $api_key;
    private string $tenant_id;
    private string $base_url;

    public function __construct(string $api_key, string $tenant_id, string $base_url = AIROS_API_BASE) {
        $this->api_key   = $api_key;
        $this->tenant_id = $tenant_id;
        $this->base_url  = $base_url;
    }

    public function post(string $endpoint, array $body): array|WP_Error {
        return wp_remote_post($this->base_url . $endpoint, [
            'timeout' => 30,
            'headers' => $this->headers(),
            'body'    => wp_json_encode($body),
        ]);
    }

    public function delete(string $endpoint): array|WP_Error {
        return wp_remote_request($this->base_url . $endpoint, [
            'method'  => 'DELETE',
            'timeout' => 15,
            'headers' => $this->headers(),
        ]);
    }

    public function delete_product(int $external_id): void {
        $this->delete('/catalog/products/' . $external_id . '?source=woocommerce');
    }

    private function headers(): array {
        return [
            'Content-Type' => 'application/json',
            'X-API-Key'    => $this->api_key,
            'X-Tenant-ID'  => $this->tenant_id,
        ];
    }

    public function is_configured(): bool {
        return !empty($this->api_key) && !empty($this->tenant_id);
    }
}
