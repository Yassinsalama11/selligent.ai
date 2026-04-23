const fs = require('fs');
const path = require('path');

const { queryAdmin } = require('./pool');

const IGNORABLE_SQLSTATE_CODES = new Set([
  '42P07',
  '42710',
  '42701',
]);

let ensurePromise = null;

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (!inSingleQuote && !inDoubleQuote && char === '-' && next === '-') {
      while (index < sql.length && sql[index] !== '\n') {
        current += sql[index];
        index += 1;
      }
      if (index < sql.length) current += sql[index];
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      const escaped = inSingleQuote && next === "'";
      current += char;
      if (escaped) {
        current += next;
        index += 1;
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

async function applyStatement(statement) {
  try {
    await queryAdmin(statement);
  } catch (err) {
    if (IGNORABLE_SQLSTATE_CODES.has(err?.code)) return;
    throw err;
  }
}

async function ensureRuntimeSchema() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_ADMIN) return false;

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = splitSqlStatements(schema);

    for (const statement of statements) {
      await applyStatement(statement);
    }

    return true;
  })();

  return ensurePromise;
}

module.exports = {
  ensureRuntimeSchema,
};
