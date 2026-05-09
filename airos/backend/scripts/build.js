const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src', 'scripts', 'test'];

function collectJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'vendor') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(absolute));
      continue;
    }
    if (entry.isFile() && absolute.endsWith('.js')) {
      files.push(absolute);
    }
  }

  return files;
}

function checkSyntax(filePath) {
  execFileSync(process.execPath, ['--check', filePath], {
    stdio: 'pipe',
  });
}

function checkModuleLoad(relativePath) {
  require(path.join(ROOT, relativePath));
}

try {
  for (const targetDir of TARGET_DIRS) {
    const absolute = path.join(ROOT, targetDir);
    if (!fs.existsSync(absolute)) continue;
    for (const filePath of collectJsFiles(absolute)) {
      checkSyntax(filePath);
    }
  }

  [
    'src/services/email/emailService.js',
    'src/api/routes/auth.js',
    'src/api/stripe.js',
    'src/api/routes/demo.js',
  ].forEach(checkModuleLoad);

  console.log('Backend build validation passed.');
} catch (error) {
  console.error('Backend build validation failed.');
  console.error(error.message || error);
  process.exit(1);
}
