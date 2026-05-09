const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) throw new Error('Usage: node scripts/browser-open-page.js <url>');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    const text = await page.locator('body').innerText().catch(() => '');
    console.log(JSON.stringify({
      url: page.url(),
      title,
      bodySnippet: String(text || '').slice(0, 2500),
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
