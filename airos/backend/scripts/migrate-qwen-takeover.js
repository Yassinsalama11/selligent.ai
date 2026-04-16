const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function main() {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    console.error('DATABASE_URL is required to run the Qwen takeover migration.');
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    '..',
    'src',
    'db',
    'migrations',
    '20260416_qwen_takeover.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query(sql);
    console.log('Qwen takeover migration applied successfully.');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('Failed to apply the Qwen takeover migration.');
  console.error(err.message || err);
  process.exit(1);
});
