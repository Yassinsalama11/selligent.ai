<?php
defined('ABSPATH') || exit;

/**
 * Injects the AIROS live chat widget script into the page footer.
 */
class AIROS_Widget {

    private string $tenant_id;

    public function __construct(string $tenant_id) {
        $this->tenant_id = $tenant_id;
    }

    public function render(): void {
        $tenant_id = esc_attr($this->tenant_id);
        echo <<<HTML
<script>
(function(){
  var s = document.createElement('script');
  s.src = 'https://cdn.airos.io/widget.js';
  s.setAttribute('data-tenant', '{$tenant_id}');
  s.async = true;
  document.head.appendChild(s);
})();
</script>
HTML;
    }
}
