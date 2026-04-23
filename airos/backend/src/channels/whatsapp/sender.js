const https = require('https');

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send a text message via WhatsApp Cloud API.
 * @param {string} phoneNumberId  — the tenant's WA phone number ID
 * @param {string} token          — the tenant's WA access token
 * @param {string} to             — recipient phone number (E.164)
 * @param {string} text           — message body
 */
async function sendText(phoneNumberId, token, to, text) {
  return _post(`${BASE_URL}/${phoneNumberId}/messages`, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  });
}

async function sendImage(phoneNumberId, token, to, imageUrl, caption = '') {
  return _post(`${BASE_URL}/${phoneNumberId}/messages`, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption ? { caption } : {}),
    },
  });
}

/**
 * Send a template message (e.g. for initiating a conversation).
 */
async function sendTemplate(phoneNumberId, token, to, templateName, languageCode = 'ar', components = []) {
  return _post(`${BASE_URL}/${phoneNumberId}/messages`, token, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

/**
 * Mark an inbound message as read.
 */
async function markRead(phoneNumberId, token, messageId) {
  return _post(`${BASE_URL}/${phoneNumberId}/messages`, token, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}

function _post(url, token, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 400) reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          reject(new Error('Invalid JSON response from WhatsApp API'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = { sendText, sendImage, sendTemplate, markRead };
