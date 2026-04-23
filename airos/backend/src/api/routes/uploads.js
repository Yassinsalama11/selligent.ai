const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
]);

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
};

function getUploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

function getPublicBaseUrl(req) {
  return (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://api.chatorai.com' : `${req.protocol}://${req.get('host')}`)).replace(/\/+$/, '');
}

function decodeBase64Payload(value = '') {
  const input = String(value || '');
  const dataUrlMatch = input.match(/^data:([^;]+);base64,(.+)$/);
  return {
    mimeType: dataUrlMatch?.[1] || null,
    buffer: Buffer.from(dataUrlMatch?.[2] || input, 'base64'),
  };
}

router.post('/', async (req, res, next) => {
  try {
    const declaredMime = String(req.body?.mime_type || req.body?.mimeType || '').trim().toLowerCase();
    const fileName = String(req.body?.file_name || req.body?.fileName || 'attachment').trim();
    const payload = req.body?.data || req.body?.base64;
    if (!payload) return res.status(400).json({ error: 'base64 upload data is required' });

    const decoded = decodeBase64Payload(payload);
    const mimeType = declaredMime || decoded.mimeType || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mimeType)) return res.status(400).json({ error: 'Unsupported file type' });
    if (!decoded.buffer.length || decoded.buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: 'File is empty or exceeds 8MB limit' });
    }

    const extension = EXTENSIONS[mimeType] || 'bin';
    const tenantDir = path.join(getUploadRoot(), String(req.user.tenant_id));
    await fs.mkdir(tenantDir, { recursive: true });

    const safeId = uuidv4();
    const storedName = `${safeId}.${extension}`;
    const storedPath = path.join(tenantDir, storedName);
    await fs.writeFile(storedPath, decoded.buffer);

    const publicPath = `/uploads/${encodeURIComponent(String(req.user.tenant_id))}/${storedName}`;
    res.status(201).json({
      url: `${getPublicBaseUrl(req)}${publicPath}`,
      path: publicPath,
      file_name: fileName,
      mime_type: mimeType,
      size: decoded.buffer.length,
      type: mimeType.startsWith('image/') ? 'image' : 'file',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.getUploadRoot = getUploadRoot;
