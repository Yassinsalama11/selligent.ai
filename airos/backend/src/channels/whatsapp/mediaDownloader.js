const https = require('https');
const fs = require('fs/promises');
const path = require('path');
const { getUploadRoot } = require('../../api/routes/uploads');

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/zip': 'zip',
  'text/plain': 'txt',
};

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    https.get(
      { hostname: opts.hostname, path: opts.pathname + opts.search, headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      },
    ).on('error', reject);
  });
}

async function downloadWhatsAppMedia({ tenantId, mediaId, accessToken }) {
  const metaRes = await httpsGet(`https://graph.facebook.com/v19.0/${mediaId}`, accessToken);
  if (metaRes.statusCode >= 400) {
    throw new Error(`WhatsApp media metadata fetch failed: HTTP ${metaRes.statusCode}`);
  }
  const meta = JSON.parse(metaRes.body.toString());
  const downloadUrl = meta.url;
  const mimeType = meta.mime_type || 'application/octet-stream';
  if (!downloadUrl) throw new Error('WhatsApp returned no download URL for media');

  const fileRes = await httpsGet(downloadUrl, accessToken);
  if (fileRes.statusCode >= 400) {
    throw new Error(`WhatsApp media download failed: HTTP ${fileRes.statusCode}`);
  }

  const ext = MIME_EXT[mimeType] || 'bin';
  const filename = `wa-${mediaId}.${ext}`;
  const tenantDir = path.join(getUploadRoot(), String(tenantId));
  await fs.mkdir(tenantDir, { recursive: true });
  const filePath = path.join(tenantDir, filename);
  await fs.writeFile(filePath, fileRes.body);

  const publicUrl = `/uploads/${encodeURIComponent(String(tenantId))}/${filename}`;
  const baseUrl = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || 'https://api.chatorai.com').replace(/\/+$/, '');

  return {
    url: `${baseUrl}${publicUrl}`,
    mimeType,
    size: fileRes.body.length,
    filename,
  };
}

module.exports = { downloadWhatsAppMedia };
