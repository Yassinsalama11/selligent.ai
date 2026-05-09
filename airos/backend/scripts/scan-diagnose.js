require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { crawlWebsite } = require('../src/ingest/crawler');
const { heuristicProfile } = require('../src/ai/businessAnalyzer');
const { completeTextWithMetadata, getPlatformConfig } = require('../src/ai/completionClient');

function buildChunkLikePages(pages = []) {
  return pages.map((page) => ({
    source_url: page.url,
    title: page.title,
    heading: page.title,
    content: page.content,
  }));
}

async function main() {
  const website = process.argv[2];
  const company = process.argv[3] || 'Sinai Taxi';
  if (!website) {
    throw new Error('Usage: node scripts/scan-diagnose.js <website> [company]');
  }

  const crawl = await crawlWebsite(website, { maxPages: 8, rateLimitMs: 75 });
  const chunks = buildChunkLikePages(crawl.pages);
  const heuristic = heuristicProfile(
    { name: company, email: '', settings: { company: { website } } },
    chunks,
  );

  const config = await getPlatformConfig().catch((error) => ({ error: error.message }));

  const content = crawl.pages
    .slice(0, 6)
    .map((page) => `URL: ${page.url}\nTitle: ${page.title}\n${page.content}`)
    .join('\n\n---\n\n')
    .slice(0, 16000);

  let ai = null;
  let aiError = null;
  try {
    ai = await completeTextWithMetadata({
      tenantId: null,
      prompt: `Analyze this business presence and return JSON only.\nBusiness name: ${company}\nWebsite: ${website}\nCrawled content:\n${content}`,
      maxTokens: 1000,
      purpose: 'signup_brand_scan_debug',
      safetyInput: `${company} ${website}`,
    });
  } catch (error) {
    aiError = {
      message: error.message,
      code: error.code || null,
      status: error.status || null,
    };
  }

  console.log(JSON.stringify({
    website,
    pagesSeen: crawl.pagesSeen,
    analyzedPages: crawl.pages.length,
    pageSummaries: crawl.pages.map((page) => ({
      url: page.url,
      title: page.title,
      description: page.metadata?.description || '',
      contentLength: page.content.length,
    })),
    firstContentSample: crawl.pages[0]?.content?.slice(0, 1200) || '',
    heuristic,
    platformConfig: config.error ? config : {
      provider: config.provider,
      source: config.source,
      anthropicConfigured: Boolean(config.anthropicKey),
      openaiConfigured: Boolean(config.openaiKey),
      anthropicModel: config.anthropicModel,
      openaiModel: config.openaiModel,
    },
    aiResult: ai ? {
      provider: ai.provider,
      model: ai.model,
      safetyDenied: ai.safetyDenied,
      textPreview: String(ai.text || '').slice(0, 2000),
    } : null,
    aiError,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
