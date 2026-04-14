const { Pool } = require('pg');

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const pool = new Pool({ connectionString: DATABASE_URL || undefined });

function databaseUnavailableError(message) {
  const err = new Error(message);
  err.status = 503;
  err.code = 'DB_UNAVAILABLE';
  return err;
}

function ensureDatabaseConfigured() {
  if (!DATABASE_URL) {
    throw databaseUnavailableError('Database is not configured. Set DATABASE_URL in the Railway backend service.');
  }
}

function mapDatabaseError(err) {
  if (err?.code === 'ECONNREFUSED') {
    return databaseUnavailableError('Database is unreachable. Check DATABASE_URL and the Railway Postgres service.');
  }
  if (err?.code === '42P01') {
    return databaseUnavailableError('Database schema is not initialized. Run `npm run db:init` in the Railway backend service shell.');
  }
  return err;
}

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

async function query(text, params) {
  ensureDatabaseConfigured();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] ${Date.now() - start}ms — ${text.slice(0, 80)}`);
    }
    return res;
  } catch (err) {
    throw mapDatabaseError(err);
  }
}

async function withTransaction(fn) {
  ensureDatabaseConfigured();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw mapDatabaseError(err);
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
