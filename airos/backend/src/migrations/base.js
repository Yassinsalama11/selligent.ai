const { query } = require('../db/pool');

async function createMigrationJob(tenantId, provider, metadata = {}) {
  const result = await query(
    `INSERT INTO migration_jobs (tenant_id, provider, status, metadata)
     VALUES ($1, $2, 'queued', $3)
     RETURNING *`,
    [tenantId, provider, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function updateMigrationJob(jobId, fields = {}) {
  const allowed = ['status', 'external_account', 'imported_counts', 'error', 'metadata'];
  const keys = Object.keys(fields).filter((key) => allowed.includes(key));
  if (!keys.length) return null;

  const values = keys.map((key) => (
    ['imported_counts', 'metadata'].includes(key) ? JSON.stringify(fields[key]) : fields[key]
  ));
  const sets = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

  const result = await query(
    `UPDATE migration_jobs
     SET ${sets}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId, ...values]
  );
  return result.rows[0] || null;
}

async function listMigrationJobs(tenantId) {
  const result = await query(
    `SELECT *
     FROM migration_jobs
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [tenantId]
  );
  return result.rows;
}

module.exports = {
  createMigrationJob,
  updateMigrationJob,
  listMigrationJobs,
};
