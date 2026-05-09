'use strict';
const { pool } = require('../../db/pool');
const { getCache, setCache } = require('../../db/cache');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function tenantMiddleware(req, res, next) {
  const tenantId = req.user?.tenant_id;

  if (!tenantId || !UUID_RE.test(String(tenantId))) {
    return res.status(403).json({ error: 'Invalid tenant context' });
  }

  const isReadOnly = READ_METHODS.has(req.method);

  // Cache hit path
  const cachedTenant = await getCache(tenantId, 'config', 'data');
  if (cachedTenant) {
    req.tenant = cachedTenant;

    if (isReadOnly) {
      // For read-only requests with cached tenant: use a lightweight pool.query proxy.
      // No connection held open for the entire request — queries acquire/release inline.
      req.dbTime = 0;
      req.db = {
        query: async (...args) => {
          const start = Date.now();
          // Inject tenant isolation for each query via session param inline
          const client = await pool.connect();
          try {
            await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
            const res = await client.query(...args);
            req.dbTime += Date.now() - start;
            return res;
          } finally {
            client.release();
          }
        },
      };
      return next();
    }

    // Write requests with cached tenant: hold a transaction for the full request
    let released = false;
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

      req.dbTime = 0;
      const originalQuery = client.query.bind(client);
      client.query = async (...args) => {
        const start = Date.now();
        try { return await originalQuery(...args); }
        finally { req.dbTime += Date.now() - start; }
      };
      req.db = client;

      const release = (commit) => {
        if (released) return;
        released = true;
        const op = commit ? client.query('COMMIT') : client.query('ROLLBACK');
        op.catch(() => {}).finally(() => client.release());
      };
      res.on('finish', () => release(true));
      res.on('close', () => release(false));
      return next();
    } catch (err) {
      if (client && !released) { released = true; client.release(); }
      return next(err);
    }
  }

  // Cache miss: fetch tenant from DB (always use transaction for RLS safety)
  let client;
  let released = false;
  const release = (commit) => {
    if (released) return;
    released = true;
    const op = commit ? client.query('COMMIT') : client.query('ROLLBACK');
    op.catch(() => {}).finally(() => client.release());
  };

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    const result = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (!result.rows.length) {
      release(false);
      return res.status(403).json({ error: 'Tenant not found or inactive' });
    }

    req.tenant = result.rows[0];
    setCache(tenantId, 'config', 'data', req.tenant, 300).catch(() => {});

    req.dbTime = 0;
    const originalQuery = client.query.bind(client);
    client.query = async (...args) => {
      const start = Date.now();
      try { return await originalQuery(...args); }
      finally { req.dbTime += Date.now() - start; }
    };
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
