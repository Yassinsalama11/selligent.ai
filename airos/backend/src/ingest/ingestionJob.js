const crypto = require('crypto');

const { query } = require('../db/pool');
const { crawlWebsite } = require('./crawler');
const { chunkContent } = require('./chunker');
const { embedText } = require('./embedder');

async function createIngestionJob(tenantId, sourceUrl, metadata = {}) {
  const result = await query(
    `INSERT INTO ingestion_jobs (tenant_id, source_url, status, metadata)
     VALUES ($1, $2, 'queued', $3)
     RETURNING *`,
    [tenantId, sourceUrl, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function updateIngestionJob(jobId, fields = {}) {
  const allowed = ['status', 'pages_seen', 'chunks_stored', 'error', 'metadata'];
  const keys = Object.keys(fields).filter((key) => allowed.includes(key));
  if (!keys.length) return null;

  const values = keys.map((key) => key === 'metadata' ? JSON.stringify(fields[key]) : fields[key]);
  const sets = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

  const result = await query(
    `UPDATE ingestion_jobs
     SET ${sets}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId, ...values]
  );
  return result.rows[0] || null;
}

async function listIngestionJobs(tenantId, { limit = 20 } = {}) {
  const result = await query(
    `SELECT *
     FROM ingestion_jobs
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  return result.rows;
}

async function storeChunks(tenantId, jobId, chunks) {
  let stored = 0;

  for (const chunk of chunks) {
    const contentHash = crypto.createHash('sha256').update(chunk.content).digest('hex');
    const embedding = await embedText(chunk.content);

    const result = await query(
      `INSERT INTO knowledge_chunks
        (tenant_id, job_id, source_url, title, heading, content_hash, content, token_count, embedding, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (tenant_id, content_hash) DO NOTHING
       RETURNING id`,
      [
        tenantId,
        jobId,
        chunk.sourceUrl,
        chunk.title,
        chunk.heading,
        contentHash,
        chunk.content,
        chunk.tokenCount,
        JSON.stringify(embedding),
        JSON.stringify(chunk.metadata || {}),
      ]
    );

    if (result.rows[0]) stored += 1;
  }

  return stored;
}

async function runIngestionJob({ tenantId, sourceUrl, jobId = null, maxPages = 50 }) {
  const job = jobId
    ? await updateIngestionJob(jobId, { status: 'running' })
    : await createIngestionJob(tenantId, sourceUrl);

  try {
    await updateIngestionJob(job.id, { status: 'running' });
    const crawl = await crawlWebsite(sourceUrl, { maxPages, rateLimitMs: 200 });
    const chunks = crawl.pages.flatMap((page) => chunkContent(page));
    const chunksStored = await storeChunks(tenantId, job.id, chunks);

    return updateIngestionJob(job.id, {
      status: 'completed',
      pages_seen: crawl.pagesSeen,
      chunks_stored: chunksStored,
      metadata: {
        rootUrl: crawl.rootUrl,
        pages: crawl.pages.map((page) => ({ url: page.url, title: page.title })),
      },
    });
  } catch (err) {
    await updateIngestionJob(job.id, {
      status: 'failed',
      error: err.message,
    });
    throw err;
  }
}

async function getKnowledgeChunks(tenantId, { limit = 200 } = {}) {
  const result = await query(
    `SELECT id, source_url, title, heading, content, token_count, created_at
     FROM knowledge_chunks
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  return result.rows;
}

module.exports = {
  createIngestionJob,
  updateIngestionJob,
  listIngestionJobs,
  runIngestionJob,
  getKnowledgeChunks,
};
