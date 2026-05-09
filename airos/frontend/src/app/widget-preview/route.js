const ALLOWED_SERVERS = new Set([
  'https://api.chatorai.com',
  'http://localhost:3011',
  'http://127.0.0.1:3011',
]);
const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_POSITIONS = new Set(['bottom-right', 'bottom-left']);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawTenantId = searchParams.get('tenantId') || '';
  const rawColor    = searchParams.get('color')    || '';
  const rawPosition = searchParams.get('position') || '';
  const rawServer   = searchParams.get('server')   || '';

  const tenantId = UUID_RE.test(rawTenantId)          ? rawTenantId : '';
  const color    = HEX_COLOR_RE.test(rawColor)         ? rawColor    : '#ff5a1f';
  const position = ALLOWED_POSITIONS.has(rawPosition)  ? rawPosition : 'bottom-right';
  const server   = ALLOWED_SERVERS.has(rawServer)      ? rawServer   : 'https://api.chatorai.com';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{height:100vh;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}
  .sk{background:#cbd5e1;border-radius:6px;margin-bottom:10px;animation:pulse 2s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
  .content{padding:28px 24px}
  .heading{height:20px;width:55%}
  .line{height:11px}
  .card{height:140px;width:100%;border-radius:12px;margin-top:20px;background:#dde3ec}
</style>
</head>
<body>
  <div class="content">
    <div class="sk heading"></div>
    <div class="sk line" style="width:80%"></div>
    <div class="sk line" style="width:60%"></div>
    <div class="sk line" style="width:72%;margin-top:18px"></div>
    <div class="sk line" style="width:45%"></div>
    <div class="sk line" style="width:65%"></div>
    <div class="sk card"></div>
  </div>
  <script
    src="${server}/widget/widget.js"
    data-tenant="${tenantId}"
    data-server="${server}"
    data-color="${color}"
    data-position="${position}">
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-store',
    },
  });
}
