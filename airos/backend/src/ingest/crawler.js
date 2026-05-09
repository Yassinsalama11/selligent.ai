const crypto = require('crypto');
const cheerio = require('cheerio');

function normalizeUrl(rawUrl, baseUrl) {
  try {
    let candidate = rawUrl;
    if (!baseUrl && typeof candidate === 'string' && candidate.trim() && !/^[a-z]+:\/\//i.test(candidate) && !candidate.startsWith('/')) {
      const trimmed = candidate.trim();
      const localHost = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(trimmed);
      candidate = `${localHost ? 'http' : 'https'}://${trimmed}`;
    }
    const url = new URL(candidate, baseUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function sameDomain(url, root) {
  try {
    return new URL(url).hostname === new URL(root).hostname;
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ChatOrAI-Crawler/1.0 (+https://chatorai.com)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
    redirect: 'follow',
  });
  const html = await response.text();
  const contentType = response.headers.get('content-type') || '';
  return {
    ok: response.ok,
    status: response.status,
    url: response.url || url,
    html,
    contentType,
    headers: {
      server: response.headers.get('server') || '',
      xVercelMitigated: response.headers.get('x-vercel-mitigated') || '',
    },
  };
}

async function getRobotsRules(rootUrl) {
  try {
    const robotsUrl = new URL('/robots.txt', rootUrl).toString();
    const response = await fetchText(robotsUrl);
    if (!response.ok) return { disallow: [] };
    const body = response.html;
    const disallow = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^disallow:/i.test(line))
      .map((line) => line.split(':').slice(1).join(':').trim())
      .filter(Boolean);
    return { disallow };
  } catch {
    return { disallow: [] };
  }
}

function allowedByRobots(url, rules) {
  const pathname = new URL(url).pathname;
  return !(rules.disallow || []).some((rule) => rule !== '/' && pathname.startsWith(rule));
}

async function discoverSitemapUrls(rootUrl) {
  try {
    const sitemapUrl = new URL('/sitemap.xml', rootUrl).toString();
    const response = await fetchText(sitemapUrl);
    if (!response.ok) return [];
    const xml = response.html;
    return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((match) => normalizeUrl(match[1], rootUrl))
      .filter(Boolean)
      .filter((url) => sameDomain(url, rootUrl));
  } catch {
    return [];
  }
}

function extractPage(url, html) {
  const $ = cheerio.load(html);
  $('script,style,noscript,iframe,svg').remove();

  const title = $('title').first().text().trim()
    || $('meta[property="og:title"]').attr('content')
    || url;
  const description = $('meta[name="description"]').attr('content')
    || $('meta[property="og:description"]').attr('content')
    || '';

  const sections = [];
  $('h1,h2,h3,p,li,[itemtype],[itemscope]').each((_, el) => {
    const tag = String(el.tagName || '').toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 20) return;
    if (/^h[1-3]$/.test(tag)) sections.push(`## ${text}`);
    else sections.push(text);
  });

  const content = [description, ...sections]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const links = $('a[href]')
    .map((_, el) => normalizeUrl($(el).attr('href'), url))
    .get()
    .filter(Boolean);

  return {
    url,
    title,
    content,
    contentHash: crypto.createHash('sha256').update(content).digest('hex'),
    links,
    metadata: {
      description,
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      schemaTypes: $('[itemtype]').map((_, el) => $(el).attr('itemtype')).get(),
    },
  };
}

function classifyPageIssue(response, html) {
  const lowerHtml = String(html || '').toLowerCase();
  const lowerServer = String(response.headers?.server || '').toLowerCase();
  const mitigated = String(response.headers?.xVercelMitigated || '').toLowerCase();
  const blocked = response.status === 403
    || response.status === 429
    || mitigated === 'challenge'
    || lowerHtml.includes('security checkpoint')
    || lowerHtml.includes('vercel security checkpoint')
    || lowerHtml.includes('access denied')
    || lowerHtml.includes('captcha');
  const reason = blocked
    ? (mitigated === 'challenge'
      ? 'security_challenge'
      : response.status === 429
        ? 'rate_limited'
        : 'blocked')
    : 'fetch_failed';
  const titleMatch = String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return {
    blocked,
    reason,
    title: titleMatch ? titleMatch[1].trim() : '',
    server: lowerServer,
  };
}

async function crawlWebsite(rootUrl, options = {}) {
  const maxPages = Math.min(Number(options.maxPages || 500), 500);
  const rateLimitMs = Number(options.rateLimitMs || 250);
  const startUrl = normalizeUrl(rootUrl);
  if (!startUrl) throw new Error('Invalid website URL');

  const rules = await getRobotsRules(startUrl);
  const sitemapUrls = await discoverSitemapUrls(startUrl);
  const queue = [startUrl, ...sitemapUrls].filter((url, index, list) => list.indexOf(url) === index);
  const visited = new Set();
  const contentHashes = new Set();
  const pages = [];
  const failures = [];

  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url) || !sameDomain(url, startUrl) || !allowedByRobots(url, rules)) continue;
    visited.add(url);

    try {
      const response = await fetchText(url);
      if (!response.ok) {
        const issue = classifyPageIssue(response, response.html);
        failures.push({
          url,
          finalUrl: response.url || url,
          status: response.status,
          reason: issue.reason,
          blocked: issue.blocked,
          title: issue.title,
          contentType: response.contentType,
          server: issue.server,
        });
        continue;
      }

      const page = extractPage(response.url || url, response.html);
      if (page.content && !contentHashes.has(page.contentHash)) {
        contentHashes.add(page.contentHash);
        pages.push(page);
      }

      for (const link of page.links) {
        if (queue.length + visited.size >= maxPages * 3) break;
        if (!visited.has(link) && sameDomain(link, startUrl) && allowedByRobots(link, rules)) {
          queue.push(link);
        }
      }
    } catch (error) {
      // Individual page failures should not abort the whole crawl.
      failures.push({
        url,
        finalUrl: url,
        status: 0,
        reason: 'network_error',
        blocked: false,
        title: '',
        contentType: '',
        server: '',
        error: error.message,
      });
    }

    if (rateLimitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
    }
  }

  return {
    rootUrl: startUrl,
    pages,
    pagesSeen: visited.size,
    failures,
  };
}

module.exports = { crawlWebsite, extractPage, discoverSitemapUrls };
