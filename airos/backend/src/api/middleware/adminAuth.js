const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET
  || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('[SECURITY] ADMIN_JWT_SECRET env var is required in production'); })()
    : (console.warn('[SECURITY] ADMIN_JWT_SECRET not set - falling back to JWT_SECRET. Do not use in production.'), process.env.JWT_SECRET));

function parseCookies(header = '') {
  return Object.fromEntries(
    String(header || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function adminAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : cookies.chatorai_admin_session;

  if (!token) {
    return res.status(401).json({ error: 'Missing admin token' });
  }

  try {
    const payload = jwt.verify(token, ADMIN_SECRET);
    if (payload.scope !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

module.exports = { adminAuthMiddleware };
