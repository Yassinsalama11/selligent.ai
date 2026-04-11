const https = require('https');

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send a text reply to an Instagram DM.
 * @param {string} pageId     — Instagram Page ID (from channel_connections)
 * @param {string} token      — Page access token
 * @param {string} recipientId — Instagram-scoped user ID
 * @param {string} text
 */
async function sendText(pageId, token, recipientId, text) {
  return _post(`${BASE_URL}/${pageId}/messages`, token, {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  });
}

async function sendImage(pageId, token, recipientId, imageUrl) {
  return _post(`${BASE_URL}/${pageId}/messages`, token, {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'image',
        payload: { url: imageUrl, is_reusable: true },
      },
    },
    messaging_type: 'RESPONSE',
  });
}

function _post(url, token, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(`${url}?access_token=${token}`);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 400) reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          reject(new Error('Invalid JSON from Instagram API'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = { sendText, sendImage };
