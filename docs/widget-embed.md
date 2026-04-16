# ChatOrAI Widget Embed

The widget build artifact is `widget.js`.

Production CDN URL:

```html
<script
  src="https://cdn.chatorai.com/widget.js"
  data-tenant="YOUR_TENANT_ID"
  data-sentry-dsn="https://examplePublicKey@o0.ingest.sentry.io/0"
  data-sentry-environment="production"
  data-sentry-release="widget@2026.04.16"
  data-sentry-src="https://browser.sentry-cdn.com/7.120.3/bundle.tracing.min.js"
  async>
</script>
```

Local smoke test:

```bash
cd airos/widget
npm run build
open test/embed.html
```

The embed test references `../dist/widget.js`, matching the production artifact name and all plugin/dashboard snippets.

The Sentry attributes are optional. If `window.Sentry` is already present on the page, the widget will reuse it instead of loading the `data-sentry-src` script.
