const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'out'));
const port = Number(process.argv[3] || 3013);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = cleanPath === '/' ? '/index.html' : cleanPath;
  const candidates = [];

  if (path.extname(normalized)) {
    candidates.push(normalized);
  } else {
    const trimmed = normalized.replace(/\/$/, '');
    candidates.push(`${trimmed}.html`);
    candidates.push(path.join(trimmed, 'index.html'));
  }

  for (const candidate of candidates) {
    const fullPath = path.join(root, candidate);
    if (fullPath.startsWith(root) && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  return null;
}

http
  .createServer((req, res) => {
    const filePath = resolveFile(req.url || '/');
    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(port, () => {
    console.log(`Export server running at http://localhost:${port}`);
  });
