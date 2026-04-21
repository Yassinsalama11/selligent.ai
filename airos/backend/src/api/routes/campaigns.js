const express = require('express');
const { requireRole } = require('../middleware/rbac');
const { sendTemplate } = require('../../channels/whatsapp/sender');
const { decryptCredentials } = require('../../core/tenantManager');
const { getOrCreateConversation } = require('../../db/queries/conversations');
const { saveMessage } = require('../../db/queries/messages');
const {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  listCampaigns,
  listPendingRecipients,
  materializeRecipients,
  previewAudience,
  setCampaignStatus,
  updateCampaign,
  updateRecipientDelivery,
} = require('../../db/queries/campaigns');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireManageRole = requireRole('owner', 'admin');
const SEND_DELAY_MS = Math.max(Number(process.env.CAMPAIGN_SEND_DELAY_MS || 250), 0);

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function resolveTemplateValue(value, recipient = {}) {
  return String(value ?? '')
    .replace(/\{\{\s*(customer\.)?name\s*\}\}/gi, recipient.customer_name || '')
    .replace(/\{\{\s*(customer\.)?phone\s*\}\}/gi, recipient.phone || recipient.address || '');
}

function renderBody(campaign, recipient = {}) {
  let body = campaign.body || campaign.template_name || '';
  Object.entries(campaign.variables || {}).forEach(([key, value]) => {
    body = body.replaceAll(`{{${key}}}`, resolveTemplateValue(value, recipient));
  });
  body = body
    .replace(/\{\{\s*(customer\.)?name\s*\}\}/gi, recipient.customer_name || '')
    .replace(/\{\{\s*(customer\.)?phone\s*\}\}/gi, recipient.phone || recipient.address || '');
  return body;
}

function buildTemplateComponents(campaign, recipient) {
  const variables = campaign.variables || {};
  const keys = Object.keys(variables)
    .map((key) => Number.parseInt(key, 10))
    .filter((key) => Number.isInteger(key))
    .sort((left, right) => left - right);

  if (!keys.length) return [];

  return [{
    type: 'body',
    parameters: keys.map((key) => ({
      type: 'text',
      text: resolveTemplateValue(variables[key], recipient),
    })),
  }];
}

async function getWhatsAppConnection(tenantId, client) {
  const connection = await client.query(`
    SELECT credentials
    FROM channel_connections
    WHERE tenant_id = $1
      AND channel = 'whatsapp'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `, [tenantId]).then((result) => result.rows[0] || null);

  return connection ? decryptCredentials(connection.credentials) : null;
}

function getProviderMessageId(result = {}) {
  return result.messages?.[0]?.id || result.message_id || null;
}

async function sendCampaignBatch(req, campaign, batchSize) {
  if (campaign.channel !== 'whatsapp') {
    const err = new Error('Only WhatsApp campaign sending is supported currently');
    err.statusCode = 400;
    throw err;
  }
  if (!campaign.template_name) {
    const err = new Error('WhatsApp campaigns require a template_name');
    err.statusCode = 400;
    throw err;
  }
  if (campaign.scheduled_at && new Date(campaign.scheduled_at).getTime() > Date.now()) {
    const err = new Error('Campaign is scheduled for a future time');
    err.statusCode = 400;
    throw err;
  }

  const tenantId = req.user.tenant_id;
  const credentials = await getWhatsAppConnection(tenantId, req.db);
  if (!credentials?.phone_number_id || !credentials?.access_token) {
    const err = new Error('Connect WhatsApp before sending campaigns');
    err.statusCode = 400;
    throw err;
  }

  await materializeRecipients(tenantId, campaign, req.db);
  await setCampaignStatus(tenantId, campaign.id, 'sending', req.db);

  const recipients = await listPendingRecipients(tenantId, campaign.id, batchSize, req.db);
  const result = { attempted: recipients.length, sent: 0, failed: 0 };

  for (const recipient of recipients) {
    try {
      const conversation = await getOrCreateConversation(tenantId, recipient.customer_id, campaign.channel, req.db);
      const provider = await sendTemplate(
        credentials.phone_number_id,
        credentials.access_token,
        recipient.address,
        campaign.template_name,
        campaign.template_language || 'ar',
        buildTemplateComponents(campaign, recipient),
      );
      const providerMessageId = getProviderMessageId(provider);

      await saveMessage(tenantId, conversation.id, {
        direction: 'outbound',
        type: 'text',
        content: renderBody(campaign, recipient),
        sent_by: 'agent',
        metadata: {
          campaign_id: campaign.id,
          campaign_recipient_id: recipient.id,
          provider_message_id: providerMessageId,
        },
      }, req.db);

      await updateRecipientDelivery(tenantId, recipient.id, {
        status: 'sent',
        conversation_id: conversation.id,
        provider_message_id: providerMessageId,
      }, req.db);
      result.sent += 1;
    } catch (err) {
      await updateRecipientDelivery(tenantId, recipient.id, {
        status: 'failed',
        error: err.message || 'Send failed',
      }, req.db);
      result.failed += 1;
    }

    await sleep(SEND_DELAY_MS);
  }

  const remaining = await listPendingRecipients(tenantId, campaign.id, 1, req.db);
  if (remaining.length) {
    result.campaign = await setCampaignStatus(tenantId, campaign.id, 'sending', req.db);
  } else {
    result.campaign = await setCampaignStatus(
      tenantId,
      campaign.id,
      result.sent > 0 ? 'sent' : 'failed',
      req.db
    );
  }

  return result;
}

router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const campaigns = await listCampaigns(req.user.tenant_id, req.query, req.db);
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
});

router.post('/preview', requireReadRole, async (req, res, next) => {
  try {
    const body = req.body || {};
    const channel = String(body.channel || 'whatsapp').trim().toLowerCase();
    const preview = await previewAudience(
      req.user.tenant_id,
      channel,
      body.audience_filter || body.audienceFilter || {},
      req.db
    );
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireReadRole, async (req, res, next) => {
  try {
    const campaign = await getCampaignById(req.user.tenant_id, req.params.id, req.db);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireManageRole, async (req, res, next) => {
  try {
    const campaign = await createCampaign(req.user.tenant_id, req.body || {}, req.user.id, req.db);
    res.status(201).json(campaign);
  } catch (err) {
    if (err.message?.includes('required')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.patch('/:id', requireManageRole, async (req, res, next) => {
  try {
    const campaign = await updateCampaign(req.user.tenant_id, req.params.id, req.body || {}, req.db);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    if (err.message?.includes('required') || err.message?.includes('cannot be edited')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.delete('/:id', requireManageRole, async (req, res, next) => {
  try {
    const deleted = await deleteCampaign(req.user.tenant_id, req.params.id, req.db);
    if (!deleted) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/send', requireManageRole, async (req, res, next) => {
  try {
    const campaign = await getCampaignById(req.user.tenant_id, req.params.id, req.db);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (['paused', 'canceled', 'sent'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Campaign cannot be sent in its current status' });
    }

    const result = await sendCampaignBatch(req, campaign, req.body?.batchSize || req.query.batchSize || 25);
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

router.post('/:id/pause', requireManageRole, async (req, res, next) => {
  try {
    const campaign = await getCampaignById(req.user.tenant_id, req.params.id, req.db);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!['draft', 'scheduled', 'sending'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Campaign cannot be paused in its current status' });
    }
    res.json(await setCampaignStatus(req.user.tenant_id, req.params.id, 'paused', req.db));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', requireManageRole, async (req, res, next) => {
  try {
    const campaign = await getCampaignById(req.user.tenant_id, req.params.id, req.db);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Sent campaigns cannot be canceled' });
    }
    res.json(await setCampaignStatus(req.user.tenant_id, req.params.id, 'canceled', req.db));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
