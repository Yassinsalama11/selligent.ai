const { queryAdmin } = require('../pool');

async function upsertPromptVersion(tenantId, promptId, version, promptHash, content, client) {
  const result = client
    ? await client.query(
    `INSERT INTO prompt_versions (tenant_id, id, version, prompt_hash, content)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, id, version) DO UPDATE
       SET prompt_hash = EXCLUDED.prompt_hash,
           content = EXCLUDED.content
     RETURNING *`,
    [tenantId, promptId, version, promptHash, content]
    )
    : await queryAdmin(
    `INSERT INTO prompt_versions (tenant_id, id, version, prompt_hash, content)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, id, version) DO UPDATE
       SET prompt_hash = EXCLUDED.prompt_hash,
           content = EXCLUDED.content
     RETURNING *`,
    [tenantId, promptId, version, promptHash, content]
  );

  return result.rows[0];
}

async function listPromptVersions(tenantId, client) {
  const result = client
    ? await client.query(
    `SELECT tenant_id, id, version, prompt_hash, content, created_at
     FROM prompt_versions
     WHERE tenant_id = $1
     ORDER BY id ASC, created_at DESC`,
    [tenantId]
    )
    : await queryAdmin(
    `SELECT tenant_id, id, version, prompt_hash, content, created_at
     FROM prompt_versions
     WHERE tenant_id = $1
     ORDER BY id ASC, created_at DESC`,
    [tenantId]
  );

  return result.rows;
}

async function getPromptVersion(tenantId, promptId, version, client) {
  const result = client
    ? await client.query(
    `SELECT tenant_id, id, version, prompt_hash, content, created_at
     FROM prompt_versions
     WHERE tenant_id = $1 AND id = $2 AND version = $3
     LIMIT 1`,
    [tenantId, promptId, version]
    )
    : await queryAdmin(
    `SELECT tenant_id, id, version, prompt_hash, content, created_at
     FROM prompt_versions
     WHERE tenant_id = $1 AND id = $2 AND version = $3
     LIMIT 1`,
    [tenantId, promptId, version]
  );

  return result.rows[0] || null;
}

async function getTenantPromptPins(tenantId, client) {
  const result = client
    ? await client.query(
    `SELECT tenant_id, prompt_id, version, created_at
     FROM tenant_prompt_pins
     WHERE tenant_id = $1`,
    [tenantId]
    )
    : await queryAdmin(
    `SELECT tenant_id, prompt_id, version, created_at
     FROM tenant_prompt_pins
     WHERE tenant_id = $1`,
    [tenantId]
  );

  return result.rows;
}

async function setTenantPromptPin(tenantId, promptId, version, client) {
  const result = client
    ? await client.query(
    `INSERT INTO tenant_prompt_pins (tenant_id, prompt_id, version)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, prompt_id) DO UPDATE
       SET version = EXCLUDED.version,
           created_at = NOW()
     RETURNING *`,
    [tenantId, promptId, version]
    )
    : await queryAdmin(
    `INSERT INTO tenant_prompt_pins (tenant_id, prompt_id, version)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, prompt_id) DO UPDATE
       SET version = EXCLUDED.version,
           created_at = NOW()
     RETURNING *`,
    [tenantId, promptId, version]
  );

  return result.rows[0];
}

module.exports = {
  upsertPromptVersion,
  listPromptVersions,
  getPromptVersion,
  getTenantPromptPins,
  setTenantPromptPin,
};
