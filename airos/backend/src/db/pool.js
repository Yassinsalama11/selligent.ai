const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] ${Date.now() - start}ms — ${text.slice(0, 80)}`);
  }
  return res;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
