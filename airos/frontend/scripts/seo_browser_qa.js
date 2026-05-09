const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9223;
const BASE_URL = process.argv[2] || 'http://localhost:3012';
const USER_DATA_DIR = `/tmp/chatorai-seo-chrome-${Date.now()}-${process.pid}`;

const ROUTES = [
  '/',
  '/ai-revenue-operating-system/',
  '/features/omnichannel-ai-inbox/',
  '/features/ai-customer-support-platform/',
  '/features/ai-sales-agent-platform/',
  '/features/whatsapp-ai-automation/',
  '/alternatives/intercom/',
  '/alternatives/zendesk/',
  '/alternatives/freshchat/',
  '/alternatives/help-scout/',
  '/integrations/shopify/',
  '/integrations/whatsapp-business-api/',
  '/solutions/ecommerce/',
  '/solutions/saas/',
  '/solutions/real-estate/',
  '/solutions/agencies/',
  '/docs/quickstart/',
  '/llms.txt',
  '/sitemap.xml',
];

function joinUrl(base, path) {
  return `${base.replace(/\/$/, '')}${path}`;
}

async function waitForDebugger() {
  const versionUrls = [
    `http://127.0.0.1:${DEBUG_PORT}/json/version`,
    `http://localhost:${DEBUG_PORT}/json/version`,
  ];
  for (let i = 0; i < 120; i += 1) {
    for (const versionUrl of versionUrls) {
      try {
        const response = await fetch(versionUrl);
        if (response.ok) {
          return response.json();
        }
      } catch (_) {
        // ignore until debugger is ready
      }
    }
    await delay(200);
  }
  throw new Error('Chrome remote debugger did not become ready');
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
  let id = 0;
  const pending = new Map();
  const listeners = new Map();

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

  async function close() {
    for (const entry of pending.values()) {
      entry.reject(new Error('CDP connection closed'));
    }
    pending.clear();
    socket.close();
  }

  return { ready, send, on, close };
}

async function withPage(url, fn) {
  const tab = await openTab(url);
  const client = createCdpClient(tab.webSocketDebuggerUrl);
  await client.ready;
  try {
    return await fn(client, tab);
  } finally {
    await client.close();
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${tab.id}`).catch(() => {});
  }
}

async function setupPage(client, mobile = false) {
  const consoleEntries = [];
  const pageErrors = [];
  const hydrationWarnings = [];
  let loadResolve;
  let loadReject;
  const loaded = new Promise((resolve, reject) => {
    loadResolve = resolve;
    loadReject = reject;
  });

  client.on('Runtime.consoleAPICalled', (params) => {
    const text = (params.args || [])
      .map((arg) => arg.value ?? arg.description ?? '')
      .join(' ')
      .trim();
    const entry = { type: params.type, text };
    consoleEntries.push(entry);
    if (/hydration|did not match|server rendered|hydrating/i.test(text)) {
      hydrationWarnings.push(text);
    }
  });
  client.on('Runtime.exceptionThrown', (params) => {
    pageErrors.push(params.exceptionDetails?.text || 'Runtime exception');
  });
  client.on('Log.entryAdded', (params) => {
    const text = params.entry?.text || '';
    consoleEntries.push({ type: params.entry?.level || 'log', text });
    if (/hydration|did not match|server rendered|hydrating/i.test(text)) {
      hydrationWarnings.push(text);
    }
  });
  client.on('Page.loadEventFired', () => loadResolve());
  client.on('Inspector.detached', () => loadReject(new Error('Inspector detached')));

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  await client.send('Network.enable');
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

  return { consoleEntries, pageErrors, hydrationWarnings, loaded };
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
}

function filterConsole(entries) {
  return entries.filter((entry) => {
    if (!entry.text) return false;
    return !/SharedImageManager::ProduceMemory|favicon\.ico|Failed to load resource: the server responded with a status of 404 \(File not found\)/i.test(
      entry.text,
    );
  });
}

async function auditRoute(url, mobile = false) {
  return withPage(url, async (client) => {
    const state = await setupPage(client, mobile);
    await client.send('Page.navigate', { url });
    await state.loaded;
    await delay(1500);

    const routeState = await evaluate(
      client,
      `(() => ({
        href: location.href,
        title: document.title,
        bodyText: document.body ? document.body.innerText.slice(0, 400) : '',
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))()`,
    );

    return {
      mobile,
      url,
      title: routeState.title,
      bodyText: routeState.bodyText,
      horizontalScroll: routeState.scrollWidth > routeState.innerWidth + 2,
      consoleEntries: filterConsole(state.consoleEntries),
      pageErrors: state.pageErrors,
      hydrationWarnings: state.hydrationWarnings,
    };
  });
}

async function auditHomeInteractions() {
  return withPage(joinUrl(BASE_URL, '/'), async (client) => {
    const state = await setupPage(client, false);
    await client.send('Page.navigate', { url: joinUrl(BASE_URL, '/') });
    await state.loaded;
    await delay(1500);

    const desktop = await evaluate(
      client,
      `(() => {
        const openByText = (text) => {
          const el = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.trim().startsWith(text));
          if (!el) return false;
          ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        };
        const navLinks = Array.from(document.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
        const footerLinks = Array.from(document.querySelectorAll('footer a')).map((a) => a.getAttribute('href'));
        const productOpened = openByText('Product');
        return { navLinks, footerLinks, productOpened };
      })()`,
    );

    await delay(300);

    const productDropdown = await evaluate(
      client,
      `(() => Array.from(document.querySelectorAll('[role="menuitem"] a, [role="menuitem"]')).map((el) => el.getAttribute('href') || el.textContent.trim()).filter(Boolean))()`,
    );

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
    await delay(300);

    const mobile = await evaluate(
      client,
      `(() => {
        const menuButton = Array.from(document.querySelectorAll('nav button')).find((btn) => {
          const label = btn.textContent.trim();
          const hasThemeText = /toggle theme/i.test(label);
          return !hasThemeText && btn.querySelector('svg');
        });
        if (menuButton) menuButton.click();
        const mobileLinks = Array.from(document.querySelectorAll('a')).filter((a) => {
          const href = a.getAttribute('href');
          return href && ['/signup', '/login', '/features/omnichannel-ai-inbox', '/solutions/ecommerce'].includes(href);
        }).map((a) => a.getAttribute('href'));
        return {
          mobileLinks,
          bodyOverflow: getComputedStyle(document.body).overflowX,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      })()`,
    );

    return {
      consoleEntries: filterConsole(state.consoleEntries),
      pageErrors: state.pageErrors,
      hydrationWarnings: state.hydrationWarnings,
      navLinks: desktop.navLinks,
      footerLinks: desktop.footerLinks,
      productDropdown,
      mobileLinks: mobile.mobileLinks,
      horizontalScrollMobile: mobile.scrollWidth > mobile.innerWidth + 2,
    };
  });
}

async function main() {
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

    const routes = [];
    for (const route of ROUTES) {
      routes.push(await auditRoute(joinUrl(BASE_URL, route), false));
    }

    const mobileRoute = await auditRoute(joinUrl(BASE_URL, '/'), true);
    const interactions = await auditHomeInteractions();

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          chromeErrors: chromeErrors
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => !/SharedImageManager::ProduceMemory/.test(line)),
          routes,
          mobileRoute,
          interactions,
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
