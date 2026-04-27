const path = require('path');
const express = require('express');
const { requireRole } = require('../middleware/rbac');

const { updateTenantSettings } = require('../../db/queries/tenants');
const { normalizeTenantSettings, isPlainObject } = require('../../core/tenantSettings');
const { getRecycleBin, removeRecycleItem, clearRecycleBin } = require('../../core/recycleBin');
const { buildDefaultTemplateBody, sendEmail } = require('../../core/emailService');
const { runScheduledReportsForTenant } = require('../../core/reportScheduler');
const { listRoutingRules, createRoutingRule, updateRoutingRule, deleteRoutingRule } = require('../../db/queries/routingRules');
const { processImport } = require('../../core/importProcessor');
const { getUploadRoot } = require('./uploads');
const { listPrompts, rollbackPrompt } = require('../../ai/promptRegistry');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

/**
 * Convert flat UI routing rule format to the engine's conditions/action format.
 * UI: { conditionField, conditionOp, conditionValue, assignTo, enabled, name }
 * Engine: { name, enabled, priority, conditions: {...}, action: {...} }
 */
function uiRuleToEngineFormat(rule, index = 0) {
  const conditions = {};
  const { conditionField, conditionOp, conditionValue } = rule;

  if (conditionField && conditionValue !== undefined && conditionValue !== '') {
    const val = String(conditionValue).trim();
    // Map UI field names to engine condition keys
    switch (conditionField) {
      case 'channel':
      case 'tag':
      case 'country':
        conditions[conditionField] = [val];
        break;
      case 'keyword':
        conditions.keywords = [val];
        break;
      case 'language':
        conditions.country = [val]; // approximation
        break;
      default:
        // score, intent, etc. — stored as-is for future engine support
        conditions[conditionField] = [val];
    }
  }

  const action = {};
  const assignTo = String(rule.assignTo || '').trim();
  if (assignTo.startsWith('agent:')) {
    action.assign_to_user = assignTo.replace('agent:', '').trim();
  } else if (assignTo.startsWith('dept:')) {
    action.assign_to_team = assignTo.replace('dept:', '').trim();
  } else if (assignTo === 'ai_bot') {
    action.assign_to_ai = true;
  } else if (assignTo === 'queue') {
    action.assign_to_queue = true;
  } else if (assignTo) {
    action.assign_to_user = assignTo;
  }

  return {
    name: String(rule.name || 'Routing Rule').trim(),
    description: '',
    enabled: rule.enabled !== false,
    priority: (index + 1) * 10,
    conditions,
    action,
  };
}

const PLAN_LIMITS = {
  starter: { conversations: 1000, messages: 10000, aiReplies: 2500, contacts: 500, storageGb: 2, broadcast: 1000 },
  growth: { conversations: 5000, messages: 50000, aiReplies: 10000, contacts: 1000, storageGb: 10, broadcast: 5000 },
  pro: { conversations: 20000, messages: 200000, aiReplies: 50000, contacts: 5000, storageGb: 50, broadcast: 20000 },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[String(plan || '').toLowerCase()] || PLAN_LIMITS.growth;
}

async function saveRequestTenantSettings(req, nextSettings) {
  const saved = await updateTenantSettings(
    req.user.tenant_id,
    normalizeTenantSettings(nextSettings),
    req.db,
  );
  return normalizeTenantSettings(saved?.settings);
}

/**
 * Helper to handle generic sub-settings stored in JSONB.
 * Uses definitive keys from core/tenantSettings.js
 */
const createSubSettingHandler = (key) => async (req, res, next) => {
  try {
    const settings = normalizeTenantSettings(req.tenant?.settings);
    if (req.method === 'GET') {
      // Ensure we return the real saved data or the default empty structure
      return res.json(settings[key]);
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = req.body;
      settings[key] = payload;
      const saved = await saveRequestTenantSettings(req, settings);
      return res.json(saved[key]);
    }
  } catch (err) { next(err); }
};

/* ── Core Settings ───────────────────────────────────────────────────────── */

router.get('/', requireOwnerRole, async (req, res, next) => {
  try {
    res.json(normalizeTenantSettings(req.tenant?.settings));
  } catch (err) { next(err); }
});

router.put('/', requireOwnerRole, async (req, res, next) => {
  try {
    const payload = req.body?.settings ?? req.body;
    if (!isPlainObject(payload)) return res.status(400).json({ error: 'Payload must be an object' });
    const saved = await saveRequestTenantSettings(req, payload);
    res.json(saved);
  } catch (err) { next(err); }
});

/* ── Phase A Implementation (Corrected Mapping) ─────────────────────────── */

// 1. Departments -> depts
router.get('/departments', requireReadRole, createSubSettingHandler('depts'));
router.put('/departments', requireOwnerRole, createSubSettingHandler('depts'));

// 2. Brands -> brands
router.get('/brands', requireReadRole, createSubSettingHandler('brands'));
router.put('/brands', requireOwnerRole, createSubSettingHandler('brands'));

// 3. Triggers -> triggers
router.get('/triggers', requireReadRole, createSubSettingHandler('triggers'));
router.put('/triggers', requireOwnerRole, createSubSettingHandler('triggers'));

// 4. Visitor Routing -> visitorRouting config + routing_rules table
router.get('/visitor-routing', requireReadRole, async (req, res, next) => {
  try {
    const rules = await listRoutingRules(req.user.tenant_id, {}, req.db);
    const settings = normalizeTenantSettings(req.tenant?.settings);
    res.json({ rules, config: settings.visitorRouting });
  } catch (err) { next(err); }
});

router.put('/visitor-routing', requireOwnerRole, async (req, res, next) => {
  try {
    const body = req.body || {};
    const tenantId = req.user.tenant_id;

    // 1. Save the config portion (mode, fallback, threshold) to settings
    let currentSettings = normalizeTenantSettings(req.tenant?.settings);
    if (isPlainObject(body.config)) {
      currentSettings.visitorRouting = { ...currentSettings.visitorRouting, ...body.config };
      currentSettings = await saveRequestTenantSettings(req, currentSettings);
    }

    // 2. Sync rules to routing_rules table when provided
    if (Array.isArray(body.rules)) {
      const incomingRules = body.rules;
      const existingRules = await listRoutingRules(tenantId, {}, req.db);
      const existingIds = new Set(existingRules.map((r) => r.id));
      const incomingIds = new Set(
        incomingRules
          .filter((r) => r.id && !String(r.id).startsWith('vr_'))
          .map((r) => r.id),
      );

      // Delete rules that were removed in the UI
      for (const existingId of existingIds) {
        if (!incomingIds.has(existingId)) {
          await deleteRoutingRule(tenantId, existingId, req.db);
        }
      }

      // Create or update each rule
      for (let i = 0; i < incomingRules.length; i++) {
        const uiRule = incomingRules[i];
        const engineRule = uiRuleToEngineFormat(uiRule, i);
        const isNew = !uiRule.id || String(uiRule.id).startsWith('vr_');
        if (isNew) {
          await createRoutingRule(tenantId, engineRule, req.user.id, req.db);
        } else {
          await updateRoutingRule(tenantId, uiRule.id, engineRule, req.db);
        }
      }
    }

    // Return fresh state
    const rules = await listRoutingRules(tenantId, {}, req.db);
    res.json({ rules, config: currentSettings.visitorRouting });
  } catch (err) { next(err); }
});

// 5. Chat Routing -> routing
router.get('/chat-routing', requireReadRole, createSubSettingHandler('routing'));
router.put('/chat-routing', requireOwnerRole, createSubSettingHandler('routing'));

// 6. Lead Scoring -> leadRules
router.get('/lead-scoring', requireReadRole, createSubSettingHandler('leadRules'));
router.put('/lead-scoring', requireOwnerRole, createSubSettingHandler('leadRules'));

// 7. Import -> importConfig
router.get('/import', requireOwnerRole, createSubSettingHandler('importConfig'));
router.put('/import', requireOwnerRole, createSubSettingHandler('importConfig'));

// Import processing: parse uploaded file and insert rows into correct tables
router.post('/import/process', requireOwnerRole, async (req, res, next) => {
  try {
    const { importType, filePath } = req.body || {};
    if (!importType) return res.status(400).json({ error: 'importType is required' });
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    // filePath from uploads endpoint is a public path like /uploads/<tenantId>/file.xlsx
    // We reconstruct the absolute disk path from the upload root.
    const uploadRoot = getUploadRoot();
    // filePath = "/uploads/<tenantId>/<filename>" — strip leading /uploads/
    const relative = String(filePath).replace(/^\/uploads\//, '');
    const absolutePath = path.join(uploadRoot, relative);

    // Security: ensure the resolved path is inside the upload root
    const resolved = path.resolve(absolutePath);
    const root = path.resolve(uploadRoot);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const result = await processImport({
      tenantId: req.user.tenant_id,
      filePath: resolved,
      importType: String(importType).toLowerCase(),
    });

    // Persist result into importConfig.lastResult
    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.importConfig = {
      ...(settings.importConfig || {}),
      lastResult: { ...result, importType, filePath },
    };
    await saveRequestTenantSettings(req, settings);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 8. Spammers -> spammers
router.get('/spammers', requireReadRole, createSubSettingHandler('spammers'));
router.put('/spammers', requireOwnerRole, createSubSettingHandler('spammers'));

// 9. Schedule Report -> schedReports
router.get('/schedule-report', requireOwnerRole, createSubSettingHandler('schedReports'));
router.put('/schedule-report', requireOwnerRole, createSubSettingHandler('schedReports'));

router.post('/schedule-report/:id/run', requireOwnerRole, async (req, res, next) => {
  try {
    const results = await runScheduledReportsForTenant(req.user.tenant_id, req.params.id, { force: true });
    res.json(results);
  } catch (err) { next(err); }
});

// 10. Company Scoring -> compScore
router.get('/company-scoring', requireOwnerRole, createSubSettingHandler('compScore'));
router.put('/company-scoring', requireOwnerRole, createSubSettingHandler('compScore'));

// 11. Email Templates -> emailTpls
router.get('/email-templates', requireReadRole, createSubSettingHandler('emailTpls'));
router.put('/email-templates', requireOwnerRole, createSubSettingHandler('emailTpls'));

// Test-send a single email template to the currently authenticated user
router.post('/email-templates/test-send', requireOwnerRole, async (req, res, next) => {
  try {
    const { template } = req.body || {};
    if (!template || !template.subject || !template.body) {
      return res.status(400).json({ error: 'template.subject and template.body are required' });
    }
    const recipientEmail = req.user.email;
    if (!recipientEmail) return res.status(400).json({ error: 'No email address on your account' });

    const testVariables = {
      operator_name: req.user.name || 'Agent',
      company_name: req.tenant?.name || 'ChatorAI',
      customer: 'Test Customer',
      agent: req.user.name || 'Agent',
      date: new Date().toLocaleDateString('en-GB'),
    };
    const html = buildDefaultTemplateBody(template, testVariables);
    await sendEmail({
      to: recipientEmail,
      subject: `[Test] ${template.subject}`,
      html,
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      metadata: { type: 'template_test', templateName: template.name },
    });
    res.json({ ok: true, sentTo: recipientEmail });
  } catch (err) { next(err); }
});

// 12. Profanity -> profanity[] + profanityControls (custom — spans two JSONB keys)
router.get('/profanity', requireReadRole, async (req, res, next) => {
  try {
    const settings = normalizeTenantSettings(req.tenant?.settings);
    res.json({ words: settings.profanity, controls: settings.profanityControls });
  } catch (err) { next(err); }
});
router.put('/profanity', requireOwnerRole, async (req, res, next) => {
  try {
    const { words, controls } = req.body || {};
    const settings = normalizeTenantSettings(req.tenant?.settings);
    if (Array.isArray(words)) settings.profanity = words;
    if (controls && typeof controls === 'object') {
      settings.profanityControls = { ...settings.profanityControls, ...controls };
    }
    const saved = await saveRequestTenantSettings(req, settings);
    res.json({ words: saved.profanity, controls: saved.profanityControls });
  } catch (err) { next(err); }
});

// 13. Conversation Layout -> layout
router.get('/layout', requireReadRole, createSubSettingHandler('layout'));
router.put('/layout', requireOwnerRole, createSubSettingHandler('layout'));

// 14. Customer Profile Fields -> profileFields
router.get('/profiles', requireReadRole, createSubSettingHandler('profileFields'));
router.put('/profiles', requireOwnerRole, createSubSettingHandler('profileFields'));

/* ── Existing Functional Routes ─────────────────────────────────────────── */

router.get('/usage', requireReadRole, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const limits = getPlanLimits(req.tenant?.plan);
    const [conversationsRes, messagesRes, aiRepliesRes, contactsRes] = await Promise.all([
      req.db.query('SELECT COUNT(*)::int AS total FROM conversations WHERE tenant_id = $1', [tenantId]),
      req.db.query('SELECT COUNT(*)::int AS total FROM messages WHERE tenant_id = $1', [tenantId]),
      req.db.query('SELECT COUNT(*)::int AS total FROM ai_suggestions WHERE tenant_id = $1', [tenantId]),
      req.db.query('SELECT COUNT(*)::int AS total FROM customers WHERE tenant_id = $1', [tenantId]),
    ]);

    res.json({
      plan: req.tenant?.plan || 'growth',
      cycleEnd: endOfMonth().toISOString().slice(0, 10),
      conversations: { used: conversationsRes.rows[0].total, limit: limits.conversations },
      messages: { used: messagesRes.rows[0].total, limit: limits.messages },
      aiReplies: { used: aiRepliesRes.rows[0].total, limit: limits.aiReplies },
      contacts: { used: contactsRes.rows[0].total, limit: limits.contacts },
    });
  } catch (err) { next(err); }
});

router.get('/monitor', requireReadRole, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const [convsResult, opsResult] = await Promise.all([
      req.db.query(`
        SELECT
          c.id,
          c.channel,
          c.status,
          c.ai_mode,
          c.created_at,
          c.updated_at,
          c.assigned_to,
          c.last_message_preview,
          cu.name     AS customer_name,
          cu.phone    AS customer_phone,
          cu.tags     AS customer_tags,
          u.name      AS agent_name,
          t.priority,
          t.id        AS ticket_id,
          d.lead_score,
          d.stage     AS deal_stage,
          (
            SELECT MAX(m.created_at)
            FROM messages m
            WHERE m.conversation_id = c.id AND m.direction = 'inbound' AND m.tenant_id = c.tenant_id
          ) AS last_inbound_at,
          (
            SELECT MAX(m.created_at)
            FROM messages m
            WHERE m.conversation_id = c.id AND m.direction = 'outbound' AND m.tenant_id = c.tenant_id
          ) AS last_outbound_at,
          (
            SELECT s.confidence
            FROM ai_suggestions s
            WHERE s.conversation_id = c.id AND s.tenant_id = c.tenant_id
            ORDER BY s.created_at DESC LIMIT 1
          ) AS ai_confidence
        FROM conversations c
        JOIN customers cu ON cu.id = c.customer_id AND cu.tenant_id = c.tenant_id
        LEFT JOIN users u ON u.id = c.assigned_to AND u.tenant_id = c.tenant_id
        LEFT JOIN tickets t ON t.tenant_id = c.tenant_id AND t.conversation_id = c.id AND t.deleted_at IS NULL
        LEFT JOIN deals d ON d.tenant_id = c.tenant_id AND d.conversation_id = c.id
        WHERE c.tenant_id = $1 AND c.status = 'open'
        ORDER BY c.updated_at ASC
        LIMIT 200
      `, [tenantId]),
      req.db.query(`
        SELECT
          u.id,
          u.name,
          COUNT(c.id)::int AS active_conversations
        FROM users u
        LEFT JOIN conversations c
          ON c.assigned_to = u.id AND c.tenant_id = u.tenant_id AND c.status = 'open'
        WHERE u.tenant_id = $1 AND u.role IN ('owner', 'admin', 'agent')
        GROUP BY u.id, u.name
        ORDER BY u.name
      `, [tenantId]),
    ]);

    const now = new Date();
    const conversations = convsResult.rows.map(c => {
      const openedMs = c.created_at ? new Date(c.created_at).getTime() : now.getTime();
      const lastOutboundMs = c.last_outbound_at ? new Date(c.last_outbound_at).getTime() : null;
      const waitingSinceMs = lastOutboundMs || openedMs;
      const waitingMinutes = Math.floor((now.getTime() - waitingSinceMs) / 60_000);
      const isVip = Array.isArray(c.customer_tags) && c.customer_tags.some(t => String(t).toLowerCase() === 'vip');
      const isDelayed = waitingMinutes >= 30;
      const isUrgent = c.priority === 'urgent' || (isVip && waitingMinutes >= 10);

      return {
        id: c.id,
        channel: c.channel,
        status: c.status,
        ai_mode: c.ai_mode,
        customer_name: c.customer_name,
        customer_phone: c.customer_phone,
        customer_tags: c.customer_tags,
        agent_name: c.agent_name,
        assigned_to: c.assigned_to,
        last_message_preview: c.last_message_preview,
        priority: c.priority,
        ticket_id: c.ticket_id,
        lead_score: c.lead_score,
        deal_stage: c.deal_stage,
        ai_confidence: c.ai_confidence,
        created_at: c.created_at,
        updated_at: c.updated_at,
        last_inbound_at: c.last_inbound_at,
        last_outbound_at: c.last_outbound_at,
        waiting_minutes: waitingMinutes,
        is_vip: isVip,
        is_delayed: isDelayed,
        is_urgent: isUrgent,
      };
    });

    res.json({
      conversations,
      operators: opsResult.rows,
      summary: {
        total: conversations.length,
        delayed: conversations.filter(c => c.is_delayed).length,
        urgent: conversations.filter(c => c.is_urgent).length,
        unassigned: conversations.filter(c => !c.assigned_to).length,
        ai_active: conversations.filter(c => c.ai_mode === 'auto').length,
      },
    });
  } catch (err) { next(err); }
});

router.get('/recycle-bin', requireOwnerRole, async (req, res, next) => {
  try {
    const recycled = await getRecycleBin(req.user.tenant_id, req.db);
    res.json(recycled);
  } catch (err) { next(err); }
});

router.delete('/recycle-bin', requireOwnerRole, async (req, res, next) => {
  try {
    await clearRecycleBin(req.user.tenant_id, req.db);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.delete('/recycle-bin/:id', requireOwnerRole, async (req, res, next) => {
  try {
    const result = await removeRecycleItem(req.user.tenant_id, req.params.id, req.db);
    res.json(result);
  } catch (err) { next(err); }
});

function endOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/* ── AI Configuration Sub-Routes ────────────────────────────────────────── */

// GET /api/settings/ai — full aiConfig blob
router.get('/ai', requireReadRole, async (req, res, next) => {
  try {
    const settings = normalizeTenantSettings(req.tenant?.settings);
    res.json(settings.aiConfig);
  } catch (err) { next(err); }
});

// PUT /api/settings/ai — merge-save aiConfig
router.put('/ai', requireOwnerRole, async (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Payload must be an object' });
    const settings = normalizeTenantSettings(req.tenant?.settings);
    // Deep-merge nested sub-objects
    const mergedAiConfig = { ...settings.aiConfig };
    for (const [key, value] of Object.entries(req.body)) {
      if (isPlainObject(value) && isPlainObject(mergedAiConfig[key])) {
        mergedAiConfig[key] = { ...mergedAiConfig[key], ...value };
      } else if (Array.isArray(value)) {
        mergedAiConfig[key] = value;
      } else if (value !== undefined) {
        mergedAiConfig[key] = value;
      }
    }
    settings.aiConfig = mergedAiConfig;
    const saved = await saveRequestTenantSettings(req, settings);
    res.json(saved.aiConfig);
  } catch (err) { next(err); }
});

// GET /api/settings/ai/prompts — list prompt versions for this tenant
router.get('/ai/prompts', requireReadRole, async (req, res, next) => {
  try {
    const prompts = await listPrompts(req.user.tenant_id);
    res.json(prompts);
  } catch (err) { next(err); }
});

// POST /api/settings/ai/prompts/:id/pin — pin/rollback a prompt version
router.post('/ai/prompts/:id/pin', requireOwnerRole, async (req, res, next) => {
  try {
    const { version } = req.body || {};
    if (!version) return res.status(400).json({ error: 'version is required' });
    const result = await rollbackPrompt(req.user.tenant_id, req.params.id, version);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/settings/ai/metrics — real AI performance metrics from DB
router.get('/ai/metrics', requireReadRole, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const [
      totalSuggestions,
      autoReplied,
      avgConfidence,
      intentBreakdown,
      recentActivity,
    ] = await Promise.all([
      req.db.query(
        'SELECT COUNT(*)::int AS total FROM ai_suggestions WHERE tenant_id = $1',
        [tenantId],
      ).then((r) => r.rows[0].total),
      req.db.query(
        `SELECT COUNT(*)::int AS total FROM messages WHERE tenant_id = $1 AND sent_by = 'ai'`,
        [tenantId],
      ).then((r) => r.rows[0].total),
      req.db.query(
        'SELECT ROUND(AVG(confidence)::numeric, 3)::float AS avg FROM ai_suggestions WHERE tenant_id = $1',
        [tenantId],
      ).then((r) => r.rows[0].avg || 0),
      req.db.query(
        `SELECT intent, COUNT(*)::int AS count FROM ai_suggestions WHERE tenant_id = $1 GROUP BY intent ORDER BY count DESC LIMIT 10`,
        [tenantId],
      ).then((r) => r.rows),
      req.db.query(
        `SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS suggestions
         FROM ai_suggestions WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY day ORDER BY day`,
        [tenantId],
      ).then((r) => r.rows),
    ]);

    const autoReplyRate = totalSuggestions > 0
      ? Math.round((autoReplied / totalSuggestions) * 100)
      : 0;

    res.json({
      totalSuggestions,
      autoReplied,
      autoReplyRate,
      avgConfidence,
      intentBreakdown,
      recentActivity,
    });
  } catch (err) { next(err); }
});

// POST /api/settings/ai/simulate — dry-run AI reply without persisting
router.post('/ai/simulate', requireOwnerRole, async (req, res, next) => {
  try {
    const { message, channel = 'livechat', customerName = 'Test User' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const { completeText } = require('../../ai/completionClient');
    const { assessTextSafety, buildSafeRefusal } = require('../../ai/safetyGuard');
    const { resolvePromptContent } = require('../../ai/promptRegistry');
    const { buildCompanyContext } = require('../../core/tenantSettings');

    const settings = normalizeTenantSettings(req.tenant?.settings);
    const aiConfig = settings.aiConfig || {};
    const identity = aiConfig.identity || {};
    const company = buildCompanyContext(req.tenant || {});
    const agentName = company.agentName || aiConfig.agentName || 'Chator Assistant';
    const tone = identity.tone || company.brandTone || 'friendly and professional';
    const formality = identity.formality || 'semi-formal';
    const persona = identity.persona || '';

    const baseInstruction = await resolvePromptContent(
      req.user.tenant_id,
      'reply-system',
      aiConfig.systemPrompt || 'You are a professional sales assistant for an eCommerce store.',
    );

    const inputGuard = assessTextSafety(message);
    let simulatedReply;
    let blocked = false;
    let blockedReason = null;

    if (!inputGuard.allowed) {
      simulatedReply = buildSafeRefusal();
      blocked = true;
      blockedReason = inputGuard.reason;
    } else {
      const prompt = `${baseInstruction}

Business name: ${company.name}
Assistant name: ${agentName}
Tone: ${tone} | Formality: ${formality}
${persona ? `Persona: ${persona}` : ''}
Channel: ${channel}

[SIMULATION MODE — do not save, do not send]
Customer: ${customerName}
Message: ${message}

Write ONE reply only — ready to send on ${channel}. Max 3 lines.`;

      simulatedReply = await completeText({
        tenantId: req.user.tenant_id,
        prompt,
        maxTokens: Number(aiConfig.maxTokens || 250),
        temperature: Number(aiConfig.temperature ?? 0.3),
        purpose: 'simulate',
        safetyInput: message,
      });
    }

    res.json({
      simulatedReply,
      blocked,
      blockedReason,
      agentName,
      tone,
      channel,
    });
  } catch (err) { next(err); }
});

module.exports = router;
