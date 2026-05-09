const { chromium } = require('playwright');

async function readReview(page) {
  const inputs = await page.locator('input.input, textarea.input, select.input').evaluateAll((nodes) => nodes.map((node) => ({
    tag: node.tagName.toLowerCase(),
    value: node.value,
  })));
  const labels = await page.locator('label').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
  const bodyText = await page.locator('body').innerText();
  return { labels, inputs, bodySnippet: bodyText.slice(0, 2500) };
}

async function fillAccount(page) {
  await page.fill('input[placeholder="Your name"]', 'Leak Check');
  await page.fill('input[placeholder="My Company"]', 'Leak Check Co');
  await page.fill('input[type="email"]', `leak.check.${Date.now()}@example.test`);
  await page.fill('input[placeholder="+1 234 567 8900"]', '+201000000001');
  await page.fill('input[type="password"]', 'StrongPass123!');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForTimeout(300);
}

async function scanWebsite(page, website) {
  await page.fill('input[placeholder="https://mystore.com"]', website);
  await page.getByRole('button', { name: /scan my brand/i }).click();
  await page.waitForTimeout(8000);
  const review = await readReview(page);
  await page.getByRole('button', { name: /back/i }).click();
  await page.waitForTimeout(300);
  return review;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3010/signup', { waitUntil: 'networkidle', timeout: 30000 });
    await fillAccount(page);
    const first = await scanWebsite(page, '127.0.0.1:3010');
    const second = await scanWebsite(page, 'https://thebedouinmoon.com');
    console.log(JSON.stringify({ first, second }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
