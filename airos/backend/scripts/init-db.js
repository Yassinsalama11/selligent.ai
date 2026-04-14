const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    console.error('DATABASE_URL is required to initialize the database.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query(schema);
    console.log('Database schema initialized successfully.');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('Failed to initialize database.');
  console.error(err.message || err);
  process.exit(1);
});
