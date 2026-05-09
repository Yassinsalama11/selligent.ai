const { chromium } = require('playwright');

async function run(origin, websiteInput, companyName) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleEvents = [];
  const requests = [];

  page.on('console', (msg) => {
    consoleEvents.push({ type: msg.type(), text: msg.text() });
  });

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/scan/brand') || url.includes('/api/auth/register') || url.includes('/api/onboarding')) {
      requests.push({
        kind: 'request',
        method: req.method(),
        url,
        postData: req.postData(),
      });
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/scan/brand') || url.includes('/api/auth/register') || url.includes('/api/onboarding')) {
      let body = '';
      try {
        body = await res.text();
      } catch {}
      requests.push({
        kind: 'response',
        status: res.status(),
        url,
        body: body.slice(0, 2000),
      });
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('/api/scan/brand') || url.includes('/api/auth/register') || url.includes('/api/onboarding')) {
      requests.push({
        kind: 'failed',
        method: req.method(),
        url,
        error: req.failure()?.errorText || 'unknown',
      });
    }
  });

  try {
    await page.goto(`${origin}/signup`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[placeholder="Your name"]', 'Browser Debug');
    await page.fill('input[placeholder="My Company"]', companyName);
    await page.fill('input[type="email"]', `browser.debug.${Date.now()}@example.test`);
    await page.fill('input[placeholder="+1 234 567 8900"]', '+201000000000');
    await page.fill('input[type="password"]', 'StrongPass123!');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="https://mystore.com"]', websiteInput);
    await page.fill('input[placeholder="https://instagram.com/mybusiness"]', 'https://instagram.com/chatorai');
    await page.getByRole('button', { name: /scan my brand/i }).click();
    await page.waitForTimeout(8000);

    const bodyText = await page.locator('body').innerText();
    return {
      origin,
      bodySnippet: bodyText.slice(0, 2500),
      consoleEvents,
      requests,
    };
  } finally {
    await browser.close();
  }
}

(async () => {
  const websiteInput = process.argv[2] || '127.0.0.1:3010';
  const companyName = process.argv[3] || 'Browser Debug Co';
  const localhost = await run('http://localhost:3010', websiteInput, companyName);
  const loopback = await run('http://127.0.0.1:3010', websiteInput, companyName);
  console.log(JSON.stringify({ localhost, loopback }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
