const { query } = require('../../db/pool');

async function tenantMiddleware(req, res, next) {
  try {
    const result = await query(
      'SELECT id, name, plan, status, settings, knowledge_base FROM tenants WHERE id = $1',
      [req.user.tenant_id]
    );

    if (!result.rows.length || result.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Tenant not found or inactive' });
    }

    req.tenant = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { tenantMiddleware };
