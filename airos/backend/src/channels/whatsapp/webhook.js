const express = require('express');
const router = express.Router();

// GET /webhooks/whatsapp — Meta verification
router.get('/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST /webhooks/whatsapp — incoming messages
router.post('/whatsapp', async (req, res) => {
  res.sendStatus(200); // Always respond immediately to Meta

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const { value } = change;

        for (const message of value.messages || []) {
          const { addToQueue } = require('../../workers/messageProcessor');
          await addToQueue({
            channel: 'whatsapp',
            phone_number_id: value.metadata.phone_number_id,
            raw: message,
            contacts: value.contacts,
          });
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp webhook]', err);
  }
});

module.exports = router;
