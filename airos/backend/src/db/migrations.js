const fs = require('fs');
const path = require('path');
const { queryAdmin } = require('./pool');

const IGNORABLE_SQLSTATE_CODES = new Set([
  '42P07', // relation already exists
  '42710', // extension already exists
  '42701', // column already exists
]);

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && char === '-' && next === '-') {
      while (index < sql.length && sql[index] !== '\n') {
        current += sql[index];
        index += 1;
      }
      if (index < sql.length) current += sql[index];
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inDollarQuote) {
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

    if (char === '"' && !inSingleQuote && !inDollarQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === '$' && next === '$' && !inSingleQuote && !inDoubleQuote) {
      current += '$$';
      index += 1;
      inDollarQuote = !inDollarQuote;
      continue;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote) {
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
    console.error(`[Migration] Statement failed: ${statement.slice(0, 100)}...`, err.message);
    throw err;
  }
}

async function runMigrationFile(filename) {
  try {
    const filePath = path.join(__dirname, 'migrations', filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Migration] File not found: ${filename}`);
      return;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = splitSqlStatements(sql);

    console.log(`[Migration] Running ${filename} (${statements.length} statements)...`);
    for (const statement of statements) {
      await applyStatement(statement);
    }
    console.log(`[Migration] ${filename} applied successfully.`);
  } catch (err) {
    console.error(`[Migration] Failed to apply ${filename}:`, err.message);
  }
}

async function runPerformanceMigrations() {
  await runMigrationFile('20260424_perf_optimization.sql');
  await runMigrationFile('20260424_tenant_stats.sql');
}

module.exports = {
  runPerformanceMigrations,
};
