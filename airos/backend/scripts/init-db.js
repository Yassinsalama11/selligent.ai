const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const IGNORABLE_SQLSTATE_CODES = new Set([
  '42P07', // duplicate_table / relation already exists
  '42710', // duplicate_object
  '42701', // duplicate_column
]);

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (!inSingleQuote && !inDoubleQuote && char === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        current += sql[i];
        i += 1;
      }
      if (i < sql.length) current += sql[i];
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      const escaped = inSingleQuote && next === "'";
      current += char;
      if (escaped) {
        current += next;
        i += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function applySchema(client, schema) {
  const statements = splitSqlStatements(schema);

  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (err) {
      if (IGNORABLE_SQLSTATE_CODES.has(err?.code)) {
        const summary = statement.replace(/\s+/g, ' ').slice(0, 120);
        console.log(`Skipping existing schema object: ${summary}`);
        continue;
      }
      throw err;
    }
  }
}

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
    await applySchema(client, schema);
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
