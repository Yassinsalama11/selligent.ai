# ChatOrAI Domain Setup From Namecheap

Last updated: 2026-04-14

This project is already configured around these production domains:

- `chatorai.com` for the main website and app
- `api.chatorai.com` for the backend API
- `cdn.chatorai.com` for the widget script and static assets

Relevant code references:

- [frontend/src/lib/api.js](./airos/frontend/src/lib/api.js)
- [backend/.env.example](./airos/backend/.env.example)
- [backend/src/index.js](./airos/backend/src/index.js)
- [widget/src/widget.js](./airos/widget/src/widget.js)
- [frontend/src/lib/socket.js](./airos/frontend/src/lib/socket.js)

## Recommended Production Layout

Use this setup:

- `chatorai.com` and `www.chatorai.com` -> Cloudflare Pages
- `api.chatorai.com` -> Railway backend service
- `cdn.chatorai.com` -> Cloudflare static host for widget/assets

Namecheap should stay the registrar.
Cloudflare should become the DNS provider.

This is the cleanest setup because the frontend is already deployed through Cloudflare Pages and the backend deployment flow in this repo points to Railway.

## Why Move DNS From Namecheap To Cloudflare

The main site should live on the root domain `chatorai.com`.

For Cloudflare Pages, the easiest and safest way to use the apex domain is to put the DNS zone on Cloudflare. Namecheap can still keep the domain registration, but DNS management should move to Cloudflare.

## Phase 1 - Change Nameservers At Namecheap

1. Open Namecheap.
2. Go to `Domain List` -> `Manage` for `chatorai.com`.
3. In the `Domain` tab, change `Nameservers` from `Namecheap BasicDNS` to `Custom DNS`.
4. Paste the two Cloudflare nameservers shown when you add `chatorai.com` inside Cloudflare.
5. Save.

After this, DNS for the domain is managed in Cloudflare, not in Namecheap.

## Phase 2 - Connect The Main Site

In Cloudflare Pages:

1. Open the ChatOrAI frontend project.
2. Add custom domains:
   - `chatorai.com`
   - `www.chatorai.com`
3. Make `chatorai.com` the canonical domain.
4. Redirect `www` -> apex, or apex -> `www`, but choose one and keep it consistent.

Recommended:

- canonical site: `https://chatorai.com`
- redirect: `https://www.chatorai.com` -> `https://chatorai.com`

## Phase 3 - Connect The API

In Railway:

1. Open the backend service.
2. Add custom domain `api.chatorai.com`.
3. Railway will show the required DNS target, usually a `CNAME`.
4. In Cloudflare DNS, create the record exactly as Railway gives it.

Expected record shape:

- Type: `CNAME`
- Name: `api`
- Target: Railway-provided hostname

## Phase 4 - Connect The CDN

The project expects the widget script here:

- `https://cdn.chatorai.com/widget.js`

That is referenced in:

- [frontend/src/app/dashboard/settings/page.js](./airos/frontend/src/app/dashboard/settings/page.js)
- [frontend/src/app/dashboard/channels/page.js](./airos/frontend/src/app/dashboard/channels/page.js)
- [plugins/shopify/extensions/airos-chat-block/blocks/chat.liquid](./airos/plugins/shopify/extensions/airos-chat-block/blocks/chat.liquid)
- [plugins/wordpress/airos-chat/includes/class-airos-widget.php](./airos/plugins/wordpress/airos-chat/includes/class-airos-widget.php)

Recommended setup:

1. Create a small static asset project on Cloudflare Pages or a Cloudflare Worker static asset host.
2. Attach `cdn.chatorai.com` to that project.
3. Publish the widget bundle there as `widget.js`.

Important:

The current widget package builds to:

- `airos/widget/dist/chatorai-widget.min.js`

So before launch, either:

- rename the deployed file to `widget.js`, or
- update all references in the codebase to the final asset filename

Without that, the widget domain can resolve correctly but still return `404`.

## DNS Records You Will End Up With

Once Cloudflare DNS is active, the final records should look like this:

| Type | Name | Target | Purpose |
|---|---|---|---|
| `CNAME` or Pages-managed | `@` | Cloudflare Pages target | main website |
| `CNAME` or Pages-managed | `www` | Cloudflare Pages target | website alias |
| `CNAME` | `api` | Railway-provided hostname | backend API |
| `CNAME` | `cdn` | Cloudflare asset host | widget/static assets |

Cloudflare Pages often manages the apex and `www` records for you when you attach custom domains in the Pages dashboard.

## Environment Variables To Confirm Before Go-Live

Frontend:

- `NEXT_PUBLIC_API_URL=https://api.chatorai.com`

Backend:

- `FRONTEND_URL=https://chatorai.com`
- `BACKEND_URL=https://api.chatorai.com`
- `CDN_URL=https://cdn.chatorai.com`

Meta OAuth callback:

- `https://api.chatorai.com/api/channels/meta/callback`

## SSL And Proxy Notes

In Cloudflare:

- keep proxy enabled for the web and CDN records unless the target requires DNS-only
- for Railway custom domains, follow Railway's required mode exactly
- wait for SSL to become active before testing OAuth flows

## Go-Live Test Checklist

Test all of these after DNS propagation:

1. `https://chatorai.com`
2. `https://www.chatorai.com`
3. `https://api.chatorai.com/health` or your API health route
4. `https://cdn.chatorai.com/widget.js`
5. login flow
6. dashboard API calls
7. live chat widget load
8. Meta OAuth redirect and callback
9. Stripe checkout redirect
10. Shopify and WordPress embedded widget references

## Current Risk I Found

DNS alone is not the only launch task.

The widget host assumption is production-facing, but the widget artifact naming is not yet aligned with the URL the app publishes to customers. That should be fixed before launch, otherwise channel installs and embedded chat can break even if the domain itself is connected correctly.
