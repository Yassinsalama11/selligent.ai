'use strict';
const { pool } = require('../../db/pool');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tenantMiddleware(req, res, next) {
  const tenantId = req.user?.tenant_id;

  if (!tenantId || !UUID_RE.test(String(tenantId))) {
    return res.status(403).json({ error: 'Invalid tenant context' });
  }

  let client;
  let released = false;

  const release = (shouldCommit) => {
    if (released) return;
    released = true;
    const op = shouldCommit ? client.query('COMMIT') : client.query('ROLLBACK');
    op.catch(() => {}).finally(() => client.release());
  };

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    const result = await client.query(
      'SELECT id, name, plan, status, settings, knowledge_base FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (!result.rows.length || result.rows[0].status !== 'active') {
      release(false);
      return res.status(403).json({ error: 'Tenant not found or inactive' });
    }

    req.tenant = result.rows[0];
    req.db = client;

    res.on('finish', () => release(true));
    res.on('close', () => release(false));

    next();
  } catch (err) {
    if (client && !released) release(false);
    next(err);
  }
}

module.exports = { tenantMiddleware };
