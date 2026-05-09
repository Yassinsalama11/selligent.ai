const { chromium } = require('playwright');

const ORIGIN = process.argv[2] || 'http://localhost:3010';
const EMAIL = process.argv[3] || 'Ymohamed@sinaitaxi.com';
const PASSWORD = process.argv[4] || 'Yassin012@@@';
const PATHS = [
  '/admin',
  '/admin/clients',
  '/admin/billing',
  '/admin/pricing',
  '/admin/ai',
  '/admin/logs',
  '/admin/system',
  '/admin/team',
  '/admin/ingestion',
  '/admin/offers',
  '/admin/agents',
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleEvents = [];
  const network = [];

  page.on('console', (msg) => consoleEvents.push({ type: msg.type(), text: msg.text() }));
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/admin/') || url.includes('/admin')) {
      let body = '';
      try {
        if (res.request().resourceType() === 'xhr' || res.request().resourceType() === 'fetch') {
          body = (await res.text()).slice(0, 600);
        }
      } catch {}
      network.push({
        kind: 'response',
        url,
        status: res.status(),
        body,
      });
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('/api/admin/') || url.includes('/admin')) {
      network.push({
        kind: 'failed',
        url,
        method: req.method(),
        error: req.failure()?.errorText || 'unknown',
      });
    }
  });

  await page.goto(`${ORIGIN}/admin/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(2500);

  const results = [];

  for (const path of PATHS) {
    const startUrl = page.url();
    await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    results.push({
      path,
      startUrl,
      finalUrl: page.url(),
      title: await page.title(),
      bodySnippet: (await page.locator('body').innerText()).slice(0, 1200),
      cookies: await context.cookies(),
    });
  }

  console.log(JSON.stringify({
    origin: ORIGIN,
    finalUrl: page.url(),
    results,
    consoleEvents,
    network,
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
