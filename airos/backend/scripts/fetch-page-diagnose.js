require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error('Usage: node scripts/fetch-page-diagnose.js <url>');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ChatOrAI-Crawler/1.0 (+https://chatorai.com)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  const html = await response.text();
  console.log(JSON.stringify({
    finalUrl: response.url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type'),
    htmlLength: html.length,
    headSample: html.slice(0, 3000),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
