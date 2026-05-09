const { queryAdmin } = require('../pool');

async function createEmailLog({
  tenantId = null,
  userId = null,
  recipient,
  templateName,
  subject,
  status = 'queued',
  provider = 'zepto',
  metadata = {},
}) {
  const result = await queryAdmin(
    `INSERT INTO email_logs
      (tenant_id, user_id, recipient, template_name, subject, status, provider, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId,
      userId,
      recipient,
      templateName,
      subject,
      status,
      provider,
      JSON.stringify(metadata || {}),
    ],
  );

  return result.rows[0];
}

async function updateEmailLogStatus(id, {
  status,
  providerMessageId = null,
  errorMessage = null,
  metadata = undefined,
}) {
  const updates = ['status = $2', 'updated_at = NOW()'];
  const params = [id, status];

  if (providerMessageId !== null) {
    params.push(providerMessageId);
    updates.push(`provider_message_id = $${params.length}`);
  }

  if (errorMessage !== null) {
    params.push(errorMessage);
    updates.push(`error_message = $${params.length}`);
  }

  if (metadata !== undefined) {
    params.push(JSON.stringify(metadata || {}));
    updates.push(`metadata = $${params.length}`);
  }

  const result = await queryAdmin(
    `UPDATE email_logs
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
  );

  return result.rows[0] || null;
}

async function getEmailLogById(id) {
  const result = await queryAdmin(
    `SELECT *
     FROM email_logs
     WHERE id = $1
     LIMIT 1`,
    [id],
  );

  return result.rows[0] || null;
}

async function listEmailLogs({ limit = 100, status = null, tenantId = null } = {}) {
  const params = [];
  const where = [];

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  if (tenantId) {
    params.push(tenantId);
    where.push(`tenant_id = $${params.length}`);
  }

  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));

  const result = await queryAdmin(
    `SELECT *
     FROM email_logs
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return result.rows;
}

async function getEmailLogStats({ tenantId = null } = {}) {
  const params = [];
  const where = [];

  if (tenantId) {
    params.push(tenantId);
    where.push(`tenant_id = $${params.length}`);
  }

  const result = await queryAdmin(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
       COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE status = 'opened')::int AS opened,
       COUNT(*) FILTER (WHERE status = 'clicked')::int AS clicked,
       COUNT(DISTINCT template_name)::int AS template_count
     FROM email_logs
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );

  return result.rows[0] || {
    total: 0,
    queued: 0,
    sent: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    template_count: 0,
  };
}

async function createEmailToken({
  tenantId = null,
  userId,
  email,
  tokenType,
  tokenHash,
  expiresAt,
  metadata = {},
}) {
  const result = await queryAdmin(
    `INSERT INTO email_tokens
      (tenant_id, user_id, email, token_type, token_hash, expires_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      tenantId,
      userId,
      String(email || '').trim().toLowerCase(),
      tokenType,
      tokenHash,
      expiresAt,
      JSON.stringify(metadata || {}),
    ],
  );

  return result.rows[0];
}

async function invalidateEmailTokens({
  userId = null,
  email = null,
  tokenType = null,
  keepTokenId = null,
}) {
  const params = [];
  const where = ['consumed_at IS NULL', 'invalidated_at IS NULL'];

  if (userId) {
    params.push(userId);
    where.push(`user_id = $${params.length}`);
  }

  if (email) {
    params.push(String(email).trim().toLowerCase());
    where.push(`email = $${params.length}`);
  }

  if (tokenType) {
    params.push(tokenType);
    where.push(`token_type = $${params.length}`);
  }

  if (keepTokenId) {
    params.push(keepTokenId);
    where.push(`id <> $${params.length}`);
  }

  if (where.length === 2 && !userId && !email && !tokenType) return 0;

  const result = await queryAdmin(
    `UPDATE email_tokens
     SET invalidated_at = NOW()
     WHERE ${where.join(' AND ')}`,
    params,
  );

  return result.rowCount;
}

async function getActiveEmailToken(tokenType, tokenHash) {
  const result = await queryAdmin(
    `SELECT *
     FROM email_tokens
     WHERE token_type = $1
       AND token_hash = $2
       AND consumed_at IS NULL
       AND invalidated_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenType, tokenHash],
  );

  return result.rows[0] || null;
}

async function consumeEmailToken(id) {
  const result = await queryAdmin(
    `UPDATE email_tokens
     SET consumed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return result.rows[0] || null;
}

async function createDemoRequest({
  fullName,
  email,
  company,
  phone = null,
  teamSize = 'small',
  preferredDate = null,
  locale = 'en',
  comments = '',
  metadata = {},
}) {
  const enrichedMetadata = { ...(metadata || {}), comments: comments || '' };
  const result = await queryAdmin(
    `INSERT INTO demo_requests
      (full_name, email, company, phone, team_size, preferred_date, locale, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      fullName,
      String(email || '').trim().toLowerCase(),
      company,
      phone,
      teamSize,
      preferredDate,
      locale,
      JSON.stringify(enrichedMetadata),
    ],
  );

  return result.rows[0];
}

module.exports = {
  consumeEmailToken,
  createDemoRequest,
  createEmailLog,
  createEmailToken,
  getActiveEmailToken,
  getEmailLogById,
  getEmailLogStats,
  invalidateEmailTokens,
  listEmailLogs,
  updateEmailLogStatus,
};
