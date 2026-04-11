const express = require('express');
const router = express.Router();

router.get('/messenger', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/messenger', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'page') return;

    for (const entry of body.entry || []) {
      for (const msg of entry.messaging || []) {
        if (!msg.message) continue;
        const { addToQueue } = require('../../workers/messageProcessor');
        await addToQueue({ channel: 'messenger', raw: msg, page_id: entry.id });
      }
    }
  } catch (err) {
    console.error('[Messenger webhook]', err);
  }
});

module.exports = router;
