'use strict';
const { pool } = require('../../db/pool');
const { getCache, setCache } = require('../../db/cache');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tenantMiddleware(req, res, next) {
  const tenantId = req.user?.tenant_id;

  if (!tenantId || !UUID_RE.test(String(tenantId))) {
    return res.status(403).json({ error: 'Invalid tenant context' });
  }

  // 1. Try cache first
  const cachedTenant = await getCache(tenantId, 'config', 'data');
  if (cachedTenant) {
    req.tenant = cachedTenant;
    // We still need a DB client for the request, but we skip the tenant lookup query.
    try {
      req.db = await pool.connect();
      await req.db.query('BEGIN');
      await req.db.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      
      res.on('finish', () => {
        if (process.env.DEBUG_PERF === 'true') {
          console.log(`[PERF] ${req.method} ${req.path} — Total DB Time: ${req.dbTime || 0}ms (Cached Tenant)`);
        }
        req.db.query('COMMIT').catch(() => {}).finally(() => req.db.release());
      });
      res.on('close', () => {
        req.db.query('ROLLBACK').catch(() => {}).finally(() => req.db.release());
      });

      // Track DB time for this request
      req.dbTime = 0;
      const originalQuery = req.db.query.bind(req.db);
      req.db.query = async (...args) => {
        const start = Date.now();
        try {
          return await originalQuery(...args);
        } finally {
          req.dbTime += (Date.now() - start);
        }
      };

      return next();
    } catch (err) {
      if (req.db) req.db.release();
      return next(err);
    }
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

    // Cache the tenant data for 300 seconds (5 minutes)
    await setCache(tenantId, 'config', 'data', req.tenant, 300);

    // Track DB time for this request
    req.dbTime = 0;
    const originalQuery = client.query.bind(client);
    client.query = async (...args) => {
      const start = Date.now();
      try {
        return await originalQuery(...args);
      } finally {
        req.dbTime += (Date.now() - start);
      }
    };

    res.on('finish', () => {
      if (process.env.DEBUG_PERF === 'true') {
        console.log(`[PERF] ${req.method} ${req.path} — Total DB Time: ${req.dbTime}ms`);
      }
      release(true);
    });
    res.on('close', () => release(false));

    next();
  } catch (err) {
    if (client && !released) release(false);
    next(err);
  }
}

module.exports = { tenantMiddleware };
