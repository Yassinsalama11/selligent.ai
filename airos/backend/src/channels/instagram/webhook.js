const express = require('express');
const router = express.Router();

router.get('/instagram', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/instagram', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'instagram') return;

    for (const entry of body.entry || []) {
      for (const msg of entry.messaging || []) {
        if (!msg.message) continue;
        const { addToQueue } = require('../../workers/messageProcessor');
        await addToQueue({ channel: 'instagram', raw: msg, page_id: entry.id });
      }
    }
  } catch (err) {
    console.error('[Instagram webhook]', err);
  }
});

module.exports = router;
