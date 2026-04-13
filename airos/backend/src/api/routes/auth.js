const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register — create tenant + owner account
router.post('/register', async (req, res, next) => {
  try {
    const { tenantName, email, password, name } = req.body;
    if (!tenantName || !email || !password || !name) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existing = await query('SELECT id FROM tenants WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create tenant + owner in a transaction
    const result = await query(`
      WITH new_tenant AS (
        INSERT INTO tenants (name, email) VALUES ($1, $2) RETURNING id
      )
      INSERT INTO users (tenant_id, email, password_hash, name, role)
      SELECT id, $2, $3, $4, 'owner' FROM new_tenant
      RETURNING id, tenant_id, email, name, role
    `, [tenantName, email, passwordHash, name]);

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await query(`
      SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = $1 AND t.status = 'active'
    `, [email]);

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/invite — owner/admin creates agent account
router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = await query(`
      UPDATE users
      SET email = $1, name = $2
      WHERE id = $3 AND tenant_id = $4
      RETURNING id, tenant_id, email, name, role
    `, [email, name, req.user.id, req.user.tenant_id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitize(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

router.patch('/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userResult = await query(
      'SELECT id, password_hash FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1',
      [req.user.id, req.user.tenant_id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND tenant_id = $3',
      [passwordHash, req.user.id, req.user.tenant_id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/team', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, tenant_id, email, name, role, created_at
      FROM users
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `, [req.user.tenant_id]);

    res.json(result.rows.map(sanitize));
  } catch (err) {
    next(err);
  }
});

router.post('/invite', authMiddleware, async (req, res, next) => {
  try {
    const { email, name, role = 'agent' } = req.body;
    const { tenant_id, role: callerRole } = req.user;

    if (!['owner', 'admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const result = await query(`
      INSERT INTO users (tenant_id, email, password_hash, name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, tenant_id, email, name, role
    `, [tenant_id, email, passwordHash, name, role]);

    res.status(201).json({ user: sanitize(result.rows[0]), tempPassword });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

router.patch('/team/:id', authMiddleware, async (req, res, next) => {
  try {
    const { tenant_id, role: callerRole, id: callerId } = req.user;
    if (!['owner', 'admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.role) updates.role = req.body.role;

    const fields = Object.keys(updates);
    if (!fields.length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    if (req.params.id === callerId && updates.role && updates.role !== callerRole) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const sets = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const values = fields.map((field) => updates[field]);

    const result = await query(`
      UPDATE users
      SET ${sets}
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, tenant_id, email, name, role, created_at
    `, [req.params.id, tenant_id, ...values]);

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitize(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete('/team/:id', authMiddleware, async (req, res, next) => {
  try {
    const { tenant_id, role: callerRole, id: callerId } = req.user;
    if (!['owner', 'admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.params.id === callerId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const result = await query(`
      DELETE FROM users
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [req.params.id, tenant_id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, tenant_id: user.tenant_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitize(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = router;
