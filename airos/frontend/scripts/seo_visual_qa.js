const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9224;
const BASE_URL = process.argv[2] || 'http://localhost:3010';
const OUTPUT_DIR = process.argv[3] || '/tmp/chatorai-seo-visual-qa';
const USER_DATA_DIR = `/tmp/chatorai-seo-visual-${Date.now()}-${process.pid}`;

const DEFAULT_ROUTES = [
  '/ai-revenue-operating-system',
  '/features/omnichannel-ai-inbox',
  '/features/ai-customer-support-platform',
  '/features/ai-sales-agent-platform',
  '/features/whatsapp-ai-automation',
  '/alternatives/intercom',
  '/alternatives/zendesk',
  '/integrations/shopify',
  '/integrations/whatsapp-business-api',
  '/solutions/ecommerce',
  '/solutions/saas',
  '/docs/quickstart',
];
const ROUTES = process.argv[4]
  ? process.argv[4].split(',').map((route) => route.trim()).filter(Boolean)
  : DEFAULT_ROUTES;

function joinUrl(base, route) {
  return `${base.replace(/\/$/, '')}${route}`;
}

function slugify(route) {
  return route.replace(/^\//, '').replace(/\//g, '__') || 'home';
}

async function waitForDebugger() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return res.json();
    } catch (_) {
      // wait
    }
    await delay(200);
  }
  throw new Error('Chrome debugger did not become ready');
}

async function openTab(url) {
  const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error(`Failed to open tab for ${url}: ${response.status}`);
  }
  return response.json();
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const listeners = new Map();
  let id = 0;

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) {
        entry.reject(new Error(message.error.message));
      } else {
        entry.resolve(message.result);
      }
      return;
    }

    if (message.method && listeners.has(message.method)) {
      listeners.get(message.method).forEach((handler) => handler(message.params));
    }
  });

  function on(method, handler) {
    const handlers = listeners.get(method) || [];
    handlers.push(handler);
    listeners.set(method, handlers);
  }

  function send(method, params = {}) {
    const messageId = ++id;
    socket.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(messageId, { resolve, reject });
    });
  }

  async function close() {
    for (const entry of pending.values()) {
      entry.reject(new Error('CDP connection closed'));
    }
    pending.clear();
    socket.close();
  }

  return { ready, on, send, close };
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
}

async function withPage(url, callback) {
  const tab = await openTab(url);
  const client = createCdpClient(tab.webSocketDebuggerUrl);
  await client.ready;
  try {
    return await callback(client, tab);
  } finally {
    await client.close();
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${tab.id}`).catch(() => {});
  }
}

async function auditRoute(route, { theme = 'light', mobile = false } = {}) {
  const url = joinUrl(BASE_URL, route);
  return withPage(url, async (client) => {
    const consoleEntries = [];
    const pageErrors = [];
    let loadResolve;
    const loaded = new Promise((resolve) => {
      loadResolve = resolve;
    });

    client.on('Runtime.consoleAPICalled', (params) => {
      const text = (params.args || [])
        .map((arg) => arg.value ?? arg.description ?? '')
        .join(' ')
        .trim();
      if (/react devtools|HMR|Fast Refresh/i.test(text)) return;
      consoleEntries.push({ type: params.type, text });
    });

    client.on('Log.entryAdded', (params) => {
      const text = params.entry?.text || '';
      if (/react devtools|HMR|Fast Refresh/i.test(text)) return;
      consoleEntries.push({ type: params.entry?.level || 'log', text });
    });

    client.on('Runtime.exceptionThrown', (params) => {
      const details = params.exceptionDetails || {};
      const description =
        details.exception?.description ||
        details.exception?.value ||
        details.text ||
        'Runtime exception';
      pageErrors.push(description);
    });

    client.on('Page.loadEventFired', () => loadResolve());

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');

    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.localStorage.setItem('theme', '${theme}');
        window.localStorage.setItem('airos_theme', '${theme}');
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add('${theme}');
      `,
    });

    await client.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    });

    if (mobile) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        mobile: true,
        screenWidth: 390,
        screenHeight: 844,
      });
      await client.send('Emulation.setUserAgentOverride', {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
      });
    }

    await client.send('Page.navigate', { url });
    await loaded;
    await delay(1200);

    const state = await evaluate(
      client,
      `(() => {
        const css = (el) => (el ? getComputedStyle(el) : null);
        const nav = document.querySelector('nav');
        const footer = document.querySelector('footer');
        const h1 = document.querySelector('h1');
        const cards = Array.from(document.querySelectorAll('.bg-card,[class*="bg-card"]')).slice(0, 6);
        const sections = Array.from(document.querySelectorAll('section'));
        const faq = sections.find((section) => /frequently asked questions/i.test(section.textContent || ''));
        const related = sections.find((section) => /explore more/i.test(section.textContent || ''));
        const cta = sections.find((section) => /ready to/i.test(section.textContent || ''));
        return {
          href: location.href,
          title: document.title,
          htmlClass: document.documentElement.className,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
          jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
          bodyBg: css(document.body)?.backgroundColor || null,
          bodyColor: css(document.body)?.color || null,
          navBg: css(nav)?.backgroundColor || null,
          footerBg: css(footer)?.backgroundColor || null,
          heroTop: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
          heroWidth: h1 ? Math.round(h1.getBoundingClientRect().width) : null,
          faqBg: css(faq)?.backgroundColor || null,
          relatedBg: css(related)?.backgroundColor || null,
          ctaBg: css(cta)?.backgroundColor || null,
          cardBackgrounds: cards.map((card) => css(card)?.backgroundColor || null),
          cardHeights: cards.map((card) => Math.round(card.getBoundingClientRect().height)),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          mobileMenuButtonCount: Array.from(document.querySelectorAll('nav button')).length,
        };
      })()`,
    );

    if (mobile) {
      await evaluate(
        client,
        `(() => {
          const button = Array.from(document.querySelectorAll('nav button')).find((btn) => {
            const label = btn.textContent?.trim() || '';
            return !/toggle theme/i.test(label) && btn.querySelector('svg');
          });
          if (button) button.click();
          return true;
        })()`,
      );
      await delay(400);
    }

    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    const screenshotPath = path.join(
      OUTPUT_DIR,
      `${slugify(route)}--${theme}${mobile ? '--mobile' : '--desktop'}.png`
    );
    await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const mobileNav = mobile
      ? await evaluate(
          client,
          `(() => ({
            links: Array.from(document.querySelectorAll('a'))
              .map((a) => a.getAttribute('href'))
              .filter((href) => href && ['/login', '/signup', '/features/omnichannel-ai-inbox', '/solutions/ecommerce'].includes(href)),
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }))()`,
        )
      : null;

    return {
      route,
      theme,
      mobile,
      screenshotPath,
      consoleEntries,
      pageErrors,
      horizontalScroll: state.scrollWidth > state.innerWidth + 2,
      mobileNav,
      ...state,
    };
  });
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const chrome = spawn(
    CHROME_BIN,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--remote-debugging-address=127.0.0.1',
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${USER_DATA_DIR}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let chromeErrors = '';
  chrome.stderr.on('data', (chunk) => {
    chromeErrors += chunk.toString();
  });

  try {
    await waitForDebugger();
    const results = [];

    for (const theme of ['light', 'dark']) {
      for (const route of ROUTES) {
        results.push(await auditRoute(route, { theme }));
      }
    }

    results.push(await auditRoute('/features/omnichannel-ai-inbox', { theme: 'dark', mobile: true }));

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          outputDir: OUTPUT_DIR,
          chromeErrors: chromeErrors
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    chrome.kill('SIGTERM');
    await delay(300);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
