# ChatOrAI Widget Embed

The widget build artifact is `widget.js`.

Production CDN URL:

```html
<script
  src="https://cdn.chatorai.com/widget.js"
  data-tenant="YOUR_TENANT_ID"
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
