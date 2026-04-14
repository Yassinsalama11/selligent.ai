const crypto = require('crypto');
const express = require('express');

const { query } = require('../../db/pool');
const { getTenantById, updateTenantSettings } = require('../../db/queries/tenants');
const { normalizeTenantSettings } = require('../../core/tenantSettings');
const { sendTemplate } = require('../../channels/whatsapp/sender');
const { decryptCredentials } = require('../../core/tenantManager');

const router = express.Router();

const RATES = { EG: 0.025, AE: 0.036, SA: 0.041, OTHER: 0.035 };

function sanitizeTemplate(template = {}) {
  return {
    id: String(template.id || `tpl_${crypto.randomUUID()}`),
    name: String(template.name || '').trim(),
    status: String(template.status || 'pending').trim().toLowerCase(),
    category: String(template.category || 'MARKETING').trim().toUpperCase(),
    language: String(template.language || 'ar').trim(),
    header: template.header || null,
    body: String(template.body || '').trim(),
    footer: String(template.footer || '').trim(),
    buttons: Array.isArray(template.buttons) ? template.buttons : [],
    variables: Array.isArray(template.variables) ? template.variables : [],
  };
}

function sanitizeHistoryEntry(entry = {}) {
  return {
    id: String(entry.id || `b_${crypto.randomUUID()}`),
    name: String(entry.name || 'Untitled broadcast'),
    template: String(entry.template || ''),
    sentAt: entry.sentAt || new Date().toISOString(),
    recipients: Number(entry.recipients || 0),
    delivered: Number(entry.delivered || 0),
    read: Number(entry.read || 0),
    failed: Number(entry.failed || 0),
    cost: Number(entry.cost || 0),
    status: String(entry.status || 'completed'),
  };
}

function getRate(country) {
  return RATES[String(country || '').toUpperCase()] || RATES.OTHER;
}

function buildAnalytics(history = []) {
  return history.reduce((acc, entry) => {
    acc.messagesSent += Number(entry.recipients || 0);
    acc.delivered += Number(entry.delivered || 0);
    acc.read += Number(entry.read || 0);
    acc.failed += Number(entry.failed || 0);
    acc.cost += Number(entry.cost || 0);
    if (entry.template) acc.templates.add(entry.template);
    return acc;
  }, {
    messagesSent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    cost: 0,
    templates: new Set(),
  });
}

async function loadTenantSettings(tenantId) {
  const tenant = await getTenantById(tenantId);
  return normalizeTenantSettings(tenant?.settings);
}

async function saveTenantSettings(tenantId, settings) {
  const saved = await updateTenantSettings(tenantId, normalizeTenantSettings(settings));
  return normalizeTenantSettings(saved?.settings);
}

async function getWhatsAppConnection(tenantId) {
  const connection = await query(`
    SELECT credentials
    FROM channel_connections
    WHERE tenant_id = $1 AND channel = 'whatsapp' AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `, [tenantId]).then((result) => result.rows[0] || null);

  return connection ? decryptCredentials(connection.credentials) : null;
}

async function listRecipientContacts(tenantId) {
  const result = await query(`
    SELECT id, name, phone, tags, preferences
    FROM customers
    WHERE tenant_id = $1 AND COALESCE(preferences->>'deleted_at', '') = ''
    ORDER BY created_at DESC
    LIMIT 500
  `, [tenantId]);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name || row.phone || 'Unnamed contact',
    phone: row.phone || '',
    country: row.preferences?.country || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
  }));
}

router.get('/', async (req, res, next) => {
  try {
    const settings = await loadTenantSettings(req.user.tenant_id);
    const contacts = await listRecipientContacts(req.user.tenant_id);
    const history = settings.broadcastHistory.map(sanitizeHistoryEntry);
    const analytics = buildAnalytics(history);

    res.json({
      balance: Number(settings.broadcastBalance || 0),
      templates: settings.waTemplates.map(sanitizeTemplate),
      history,
      contacts,
      analytics: {
        messagesSent: analytics.messagesSent,
        delivered: analytics.delivered,
        read: analytics.read,
        failed: analytics.failed,
        cost: Number(analytics.cost.toFixed(3)),
        templatesUsed: analytics.templates.size,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/top-up', async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const settings = await loadTenantSettings(req.user.tenant_id);
    settings.broadcastBalance = Number((Number(settings.broadcastBalance || 0) + amount).toFixed(2));
    const saved = await saveTenantSettings(req.user.tenant_id, settings);

    res.json({ balance: saved.broadcastBalance });
  } catch (err) {
    next(err);
  }
});

router.post('/templates', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const nextTemplate = sanitizeTemplate(req.body || {});

    if (!nextTemplate.name || !nextTemplate.body) {
      return res.status(400).json({ error: 'Template name and body are required' });
    }

    const settings = await loadTenantSettings(tenantId);
    settings.waTemplates = [
      ...settings.waTemplates.filter((template) => template.id !== nextTemplate.id),
      nextTemplate,
    ];

    const saved = await saveTenantSettings(tenantId, settings);
    res.status(201).json(saved.waTemplates.map(sanitizeTemplate));
  } catch (err) {
    next(err);
  }
});

router.delete('/templates/:id', async (req, res, next) => {
  try {
    const settings = await loadTenantSettings(req.user.tenant_id);
    settings.waTemplates = settings.waTemplates.filter((template) => template.id !== req.params.id);
    const saved = await saveTenantSettings(req.user.tenant_id, settings);
    res.json(saved.waTemplates.map(sanitizeTemplate));
  } catch (err) {
    next(err);
  }
});

router.post('/send', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      name,
      templateId,
      recipients = [],
      variables = {},
      scheduleAt,
    } = req.body || {};

    const settings = await loadTenantSettings(tenantId);
    const template = settings.waTemplates.find((entry) => entry.id === templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (String(template.status || '').toLowerCase() !== 'approved') {
      return res.status(400).json({ error: 'Only approved WhatsApp templates can be sent' });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Select at least one recipient' });
    }

    const estimatedCost = recipients.reduce((sum, recipient) => sum + getRate(recipient.country), 0);
    if (Number(settings.broadcastBalance || 0) < estimatedCost) {
      return res.status(400).json({ error: 'Insufficient broadcast balance' });
    }

    const isScheduled = scheduleAt && new Date(scheduleAt).getTime() > Date.now();
    const entry = sanitizeHistoryEntry({
      name: name || template.name,
      template: template.name,
      sentAt: isScheduled ? new Date(scheduleAt).toISOString() : new Date().toISOString(),
      recipients: recipients.length,
      delivered: 0,
      read: 0,
      failed: 0,
      cost: 0,
      status: isScheduled ? 'scheduled' : 'completed',
    });

    if (!isScheduled) {
      const credentials = await getWhatsAppConnection(tenantId);
      if (!credentials?.phone_number_id || !credentials?.access_token) {
        return res.status(400).json({ error: 'Connect WhatsApp before sending broadcasts' });
      }

      const variableKeys = Object.keys(variables)
        .map((key) => Number.parseInt(key, 10))
        .filter((key) => Number.isInteger(key))
        .sort((left, right) => left - right);
      const components = variableKeys.length > 0
        ? [{
            type: 'body',
            parameters: variableKeys.map((key) => ({
              type: 'text',
              text: String(variables[key] ?? ''),
            })),
          }]
        : [];

      let delivered = 0;
      let failed = 0;
      let billedCost = 0;

      for (const recipient of recipients) {
        try {
          await sendTemplate(
            credentials.phone_number_id,
            credentials.access_token,
            recipient.phone,
            template.name,
            template.language || 'ar',
            components,
          );
          delivered += 1;
          billedCost += getRate(recipient.country);
        } catch {
          failed += 1;
        }
      }

      entry.delivered = delivered;
      entry.failed = failed;
      entry.cost = Number(billedCost.toFixed(3));
      settings.broadcastBalance = Number((Number(settings.broadcastBalance || 0) - billedCost).toFixed(3));
    }

    settings.broadcastHistory = [
      entry,
      ...settings.broadcastHistory.map(sanitizeHistoryEntry),
    ].slice(0, 200);

    const saved = await saveTenantSettings(tenantId, settings);
    res.status(201).json({
      entry,
      balance: saved.broadcastBalance,
      history: saved.broadcastHistory.map(sanitizeHistoryEntry),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
