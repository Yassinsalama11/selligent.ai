const path = require('path');
const express = require('express');
const { requireRole } = require('../middleware/rbac');

const { updateTenantSettings } = require('../../db/queries/tenants');
const { normalizeTenantSettings, isPlainObject } = require('../../core/tenantSettings');
const { getRecycleBin, removeRecycleItem, clearRecycleBin } = require('../../core/recycleBin');
const { buildDefaultTemplateBody, sendEmail } = require('../../core/emailService');
const { runScheduledReportsForTenant } = require('../../core/reportScheduler');
const { listRoutingRules, createRoutingRule, updateRoutingRule, deleteRoutingRule } = require('../../db/queries/routingRules');
const { updateConversationAiMode } = require('../../db/queries/conversations');
const { createTicket } = require('../../db/queries/tickets');
const { processImport } = require('../../core/importProcessor');
const { getUploadRoot } = require('./uploads');
const { listPrompts, rollbackPrompt } = require('../../ai/promptRegistry');
const { logAuditEvent } = require('../../db/queries/audit');
const {
  VALID_PROVIDERS,
  VALID_MODELS,
  getCustomAiProvider,
  getCustomAiProviderRaw,
  upsertCustomAiProvider,
  deleteCustomAiProvider,
} = require('../../db/queries/customAiProvider');
const {
  getProviderRuntimeStatus,
  getTenantSsoConfig,
  normalizeSsoConfig,
  publicSsoConfig,
} = require('../../services/ssoService');

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
  const { conditionField, conditionOp = '=', conditionValue } = rule;

  if (conditionField && conditionValue !== undefined && conditionValue !== '') {
    const val = String(conditionValue).trim();
    const condition = { op: String(conditionOp || '=').trim(), value: val };
    // Map UI field names to engine condition keys
    switch (conditionField) {
      case 'channel':
      case 'tag':
      case 'country':
      case 'intent':
      case 'language':
      case 'score':
        conditions[conditionField] = condition;
        break;
      case 'keyword':
        conditions.keywords = condition;
        break;
      default:
        // score, intent, etc. — stored as-is for future engine support
        conditions[conditionField] = condition;
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

const VISITOR_ROUTING_MODES = new Set(['round_robin', 'least_busy', 'least_active', 'random', 'manual']);
const VISITOR_ROUTING_FALLBACKS = new Set(['AI Bot', 'queue', 'offline']);
const VISITOR_ROUTING_FIELDS = new Set(['channel', 'language', 'intent', 'score', 'keyword', 'country', 'tag']);
const VISITOR_ROUTING_OPS = new Set(['=', '!=', 'contains', '>=', '<=', '>', '<']);
const LEAD_SCORING_SIGNALS = new Set([
  'buy/order keywords',
  'replies within 5 minutes',
  'more than 3 messages',
  'shares phone number',
  'price objection',
  'return/refund',
]);

function validateVisitorRoutingPayload(payload) {
  if (!isPlainObject(payload)) return 'Payload must be an object';

  if (payload.config != null) {
    if (!isPlainObject(payload.config)) return 'config must be an object';
    const { mode, fallback, threshold } = payload.config;
    if (mode != null && !VISITOR_ROUTING_MODES.has(String(mode))) return 'config.mode is invalid';
    if (fallback != null && !VISITOR_ROUTING_FALLBACKS.has(String(fallback))) return 'config.fallback is invalid';
    if (threshold != null) {
      const parsed = Number(threshold);
      if (!Number.isInteger(parsed) || parsed < 5 || parsed > 3600) {
        return 'config.threshold must be an integer between 5 and 3600';
      }
    }
  }

  if (payload.rules != null) {
    if (!Array.isArray(payload.rules)) return 'rules must be an array';
    if (payload.rules.length > 100) return 'rules can contain at most 100 items';
    for (const [index, rule] of payload.rules.entries()) {
      if (!isPlainObject(rule)) return `Rule ${index + 1} must be an object`;
      const name = String(rule.name || '').trim();
      if (!name) return `Rule ${index + 1} name is required`;
      if (name.length > 120) return `Rule ${index + 1} name must be 120 characters or less`;

      const field = String(rule.conditionField || '').trim();
      const op = String(rule.conditionOp || '').trim();
      const value = String(rule.conditionValue ?? '').trim();
      if (!VISITOR_ROUTING_FIELDS.has(field)) return `Rule ${index + 1} condition field is invalid`;
      if (!VISITOR_ROUTING_OPS.has(op)) return `Rule ${index + 1} operator is invalid`;
      if (!value) return `Rule ${index + 1} condition value is required`;
      if (value.length > 200) return `Rule ${index + 1} condition value must be 200 characters or less`;
      if (field === 'score' && !Number.isFinite(Number(value))) return `Rule ${index + 1} score value must be numeric`;
      if (['>=', '<=', '>', '<'].includes(op) && field !== 'score') return `Rule ${index + 1} numeric operators are only supported for score`;

      const assignTo = String(rule.assignTo || '').trim();
      if (!assignTo) return `Rule ${index + 1} route target is required`;
      if (!['ai_bot', 'queue'].includes(assignTo) && !assignTo.startsWith('agent:') && !assignTo.startsWith('dept:')) {
        return `Rule ${index + 1} route target is invalid`;
      }
      const enabledError = boolField(rule.enabled, `Rule ${index + 1} enabled`);
      if (enabledError) return enabledError;
    }
  }

  return null;
}

function validateChatRoutingPayload(payload) {
  if (!Array.isArray(payload)) return 'Chat routing rules must be an array';
  if (payload.length > 100) return 'Chat routing can contain at most 100 rules';

  for (const [index, rule] of payload.entries()) {
    if (!isPlainObject(rule)) return `Chat routing rule ${index + 1} must be an object`;
    const name = String(rule.name || '').trim();
    if (!name) return `Chat routing rule ${index + 1} name is required`;
    if (name.length > 120) return `Chat routing rule ${index + 1} name must be 120 characters or less`;

    const field = String(rule.conditionField || '').trim();
    const op = String(rule.conditionOp || '').trim();
    const value = String(rule.conditionValue ?? '').trim();
    if (!VISITOR_ROUTING_FIELDS.has(field)) return `Chat routing rule ${index + 1} condition field is invalid`;
    if (!VISITOR_ROUTING_OPS.has(op)) return `Chat routing rule ${index + 1} operator is invalid`;
    if (!value) return `Chat routing rule ${index + 1} condition value is required`;
    if (value.length > 200) return `Chat routing rule ${index + 1} condition value must be 200 characters or less`;
    if (field === 'score' && !Number.isFinite(Number(value))) return `Chat routing rule ${index + 1} score value must be numeric`;
    if (['>=', '<=', '>', '<'].includes(op) && field !== 'score') {
      return `Chat routing rule ${index + 1} numeric operators are only supported for score`;
    }

    const assignTo = String(rule.assignTo || '').trim();
    if (!assignTo) return `Chat routing rule ${index + 1} assignment target is required`;
    if (!['ai_bot', 'queue'].includes(assignTo) && !assignTo.startsWith('agent:') && !assignTo.startsWith('dept:')) {
      return `Chat routing rule ${index + 1} assignment target is invalid`;
    }
    const activeError = boolField(rule.active, `Chat routing rule ${index + 1} active`);
    if (activeError) return activeError;
  }

  return null;
}

function validateLeadScoringPayload(payload) {
  if (!Array.isArray(payload)) return 'Lead scoring rules must be an array';
  if (payload.length > 50) return 'Lead scoring can contain at most 50 rules';

  for (const [index, rule] of payload.entries()) {
    if (!isPlainObject(rule)) return `Lead scoring rule ${index + 1} must be an object`;
    const signal = String(rule.signal || '').trim();
    if (!LEAD_SCORING_SIGNALS.has(signal)) return `Lead scoring rule ${index + 1} signal is invalid`;
    const weight = Number(rule.weight);
    if (!Number.isInteger(weight) || weight < -100 || weight > 100) {
      return `Lead scoring rule ${index + 1} weight must be an integer between -100 and 100`;
    }
    const activeError = boolField(rule.active, `Lead scoring rule ${index + 1} active`);
    if (activeError) return activeError;
  }

  return null;
}

function validateCompanyScoringPayload(payload) {
  if (!isPlainObject(payload)) return 'Company scoring settings must be an object';
  const allowedKeys = ['enabled', 'minRevenue', 'minOrders', 'vipThreshold'];
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.includes(key)) return `companyScoring.${key} is not supported`;
  }

  const enabledError = boolField(payload.enabled, 'enabled');
  if (enabledError) return enabledError;

  const minRevenue = payload.minRevenue != null ? Number(payload.minRevenue) : null;
  const minOrders = payload.minOrders != null ? Number(payload.minOrders) : null;
  const vipThreshold = payload.vipThreshold != null ? Number(payload.vipThreshold) : null;

  if (minRevenue !== null && (!Number.isFinite(minRevenue) || minRevenue < 0 || minRevenue > 1_000_000_000)) {
    return 'minRevenue must be a number between 0 and 1000000000';
  }
  if (minOrders !== null && (!Number.isInteger(minOrders) || minOrders < 0 || minOrders > 100000)) {
    return 'minOrders must be an integer between 0 and 100000';
  }
  if (vipThreshold !== null && (!Number.isFinite(vipThreshold) || vipThreshold < 0 || vipThreshold > 1_000_000_000)) {
    return 'vipThreshold must be a number between 0 and 1000000000';
  }
  if (minRevenue !== null && vipThreshold !== null && vipThreshold < minRevenue) {
    return 'vipThreshold must be greater than or equal to minRevenue';
  }

  return null;
}

function validateScheduleReportsPayload(payload) {
  if (!Array.isArray(payload)) return 'Scheduled reports must be an array';
  if (payload.length > 25) return 'Scheduled reports can contain at most 25 items';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const allowedFreq = new Set(['daily', 'weekly', 'monthly']);
  const names = new Set();

  for (const [index, report] of payload.entries()) {
    if (!isPlainObject(report)) return `Scheduled report ${index + 1} must be an object`;
    const name = String(report.name || '').trim();
    if (!name) return `Scheduled report ${index + 1} name is required`;
    if (name.length > 120) return `Scheduled report ${index + 1} name must be 120 characters or less`;
    const normalizedName = name.toLowerCase();
    if (names.has(normalizedName)) return `Duplicate scheduled report name: "${name}"`;
    names.add(normalizedName);

    const freq = String(report.freq || '').trim().toLowerCase();
    if (!allowedFreq.has(freq)) return `Scheduled report ${index + 1} frequency is invalid`;

    const time = String(report.time || '').trim();
    if (!TIME_RE.test(time)) return `Scheduled report ${index + 1} time must be HH:MM`;

    const email = String(report.email || '').trim();
    if (email && !EMAIL_RE.test(email)) return `Scheduled report ${index + 1} email is invalid`;

    const activeError = boolField(report.active, `Scheduled report ${index + 1} active`);
    if (activeError) return activeError;
  }

  return null;
}

const PLAN_LIMITS = {
  starter: { conversations: 1000, messages: 10000, aiReplies: 2500, contacts: 500, storageGb: 2, broadcast: 1000 },
  growth: { conversations: 5000, messages: 50000, aiReplies: 10000, contacts: 1000, storageGb: 10, broadcast: 5000 },
  pro: { conversations: 20000, messages: 200000, aiReplies: 50000, contacts: 5000, storageGb: 50, broadcast: 20000 },
};
const IMPORT_TYPES = new Set(['conversations', 'pipeline', 'tickets']);
const IMPORT_FILE_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

function getPlanLimits(plan) {
  return PLAN_LIMITS[String(plan || '').toLowerCase()] || PLAN_LIMITS.growth;
}

function validateImportProcessPayload(payload) {
  if (!isPlainObject(payload)) return 'Payload must be an object';
  const importType = String(payload.importType || '').trim().toLowerCase();
  if (!IMPORT_TYPES.has(importType)) return 'importType is invalid';

  const filePath = String(payload.filePath || '').trim();
  if (!filePath) return 'filePath is required';
  if (!filePath.startsWith('/uploads/')) return 'filePath must be an uploaded file path';
  if (filePath.includes('\0')) return 'filePath is invalid';

  const extension = path.extname(filePath).toLowerCase();
  if (!IMPORT_FILE_EXTENSIONS.has(extension)) return 'Import file must be CSV, XLSX, or XLS';
  return null;
}

async function saveRequestTenantSettings(req, nextSettings) {
  const saved = await updateTenantSettings(
    req.user.tenant_id,
    normalizeTenantSettings(nextSettings),
    req.db,
  );
  return normalizeTenantSettings(saved?.settings);
}

function textField(value, field, max, { required = false } = {}) {
  if (value == null) return required ? `${field} is required` : null;
  if (typeof value !== 'string') return `${field} must be a string`;
  if (required && !value.trim()) return `${field} is required`;
  if (value.length > max) return `${field} must be ${max} characters or less`;
  return null;
}

function boolField(value, field) {
  if (value == null) return null;
  return typeof value === 'boolean' ? null : `${field} must be a boolean`;
}

function numberField(value, field, min, max, { integer = false } = {}) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${field} must be a number`;
  if (integer && !Number.isInteger(number)) return `${field} must be an integer`;
  if (number < min || number > max) return `${field} must be between ${min} and ${max}`;
  return null;
}

function enumField(value, field, allowed) {
  if (value == null || value === '') return null;
  return allowed.includes(value) ? null : `${field} is invalid`;
}

function validateBooleanMap(value, field, allowedKeys) {
  if (value == null) return null;
  if (!isPlainObject(value)) return `${field} must be an object`;
  for (const [key, val] of Object.entries(value)) {
    if (!allowedKeys.includes(key)) return `${field}.${key} is not supported`;
    const error = boolField(val, `${field}.${key}`);
    if (error) return error;
  }
  return null;
}

function validateAiConfigPayload(payload) {
  const allowedTopLevel = [
    'platformManaged', 'tenantApiKeysAllowed', 'agentName', 'temperature', 'maxTokens',
    'systemPrompt', 'autoReply', 'suggestOnly', 'identity', 'responseControl',
    'forbiddenActions', 'handoffRules', 'leadQualification', 'knowledgeSources',
    'safety', 'channelOverrides', 'businessRules', 'refundComplaintRules',
    'escalationRules', 'knowledgeSourcePriority', 'modelPreference', 'updatedAt', 'updatedBy',
  ];
  for (const key of Object.keys(payload)) {
    if (!allowedTopLevel.includes(key)) return `aiConfig.${key} is not supported`;
  }

  const scalarChecks = [
    textField(payload.agentName, 'agentName', 80),
    textField(payload.systemPrompt, 'systemPrompt', 8000),
    textField(payload.businessRules, 'businessRules', 5000),
    textField(payload.refundComplaintRules, 'refundComplaintRules', 4000),
    textField(payload.escalationRules, 'escalationRules', 4000),
    textField(payload.modelPreference, 'modelPreference', 120),
    boolField(payload.autoReply, 'autoReply'),
    boolField(payload.suggestOnly, 'suggestOnly'),
    numberField(payload.temperature, 'temperature', 0, 1),
    numberField(payload.maxTokens, 'maxTokens', 50, 2000, { integer: true }),
  ].filter(Boolean);
  if (scalarChecks[0]) return scalarChecks[0];

  if (payload.identity != null) {
    if (!isPlainObject(payload.identity)) return 'identity must be an object';
    const identity = payload.identity;
    const identityError = [
      enumField(identity.defaultLanguage, 'identity.defaultLanguage', ['ar', 'en', 'fr', 'es', 'auto']),
      enumField(identity.secondaryLanguage, 'identity.secondaryLanguage', ['ar', 'en', 'fr', 'es']),
      textField(identity.tone, 'identity.tone', 80),
      enumField(identity.formality, 'identity.formality', ['formal', 'semi-formal', 'informal']),
      textField(identity.persona, 'identity.persona', 1200),
      textField(identity.greetingStyle, 'identity.greetingStyle', 250),
      textField(identity.closingStyle, 'identity.closingStyle', 250),
      textField(identity.brandPersonality, 'identity.brandPersonality', 250),
    ].filter(Boolean)[0];
    if (identityError) return identityError;
  }

  if (payload.responseControl != null) {
    if (!isPlainObject(payload.responseControl)) return 'responseControl must be an object';
    const rc = payload.responseControl;
    const rcError = [
      numberField(rc.confidenceThreshold, 'responseControl.confidenceThreshold', 0, 100, { integer: true }),
      numberField(rc.maxConsecutiveReplies, 'responseControl.maxConsecutiveReplies', 1, 20, { integer: true }),
      numberField(rc.escalationThreshold, 'responseControl.escalationThreshold', 1, 10, { integer: true }),
      textField(rc.silentModeConditions, 'responseControl.silentModeConditions', 500),
      enumField(rc.businessHoursAiBehavior, 'responseControl.businessHoursAiBehavior', ['auto', 'suggest', 'off']),
      enumField(rc.afterHoursAiBehavior, 'responseControl.afterHoursAiBehavior', ['auto', 'suggest', 'off']),
    ].filter(Boolean)[0];
    if (rcError) return rcError;
  }

  if (payload.forbiddenActions != null) {
    if (!Array.isArray(payload.forbiddenActions)) return 'forbiddenActions must be an array';
    if (payload.forbiddenActions.length > 50) return 'forbiddenActions can contain at most 50 rules';
    for (const [index, rule] of payload.forbiddenActions.entries()) {
      if (!isPlainObject(rule)) return `forbiddenActions.${index} must be an object`;
      const error = [
        textField(rule.id, `forbiddenActions.${index}.id`, 80),
        textField(rule.pattern, `forbiddenActions.${index}.pattern`, 200, { required: true }),
        enumField(rule.severity, `forbiddenActions.${index}.severity`, ['low', 'medium', 'high', 'critical']),
        enumField(rule.enforcement, `forbiddenActions.${index}.enforcement`, ['block', 'warn', 'log']),
        boolField(rule.escalate, `forbiddenActions.${index}.escalate`),
      ].filter(Boolean)[0];
      if (error) return error;
    }
  }

  if (payload.handoffRules != null) {
    if (!Array.isArray(payload.handoffRules)) return 'handoffRules must be an array';
    if (payload.handoffRules.length > 50) return 'handoffRules can contain at most 50 rules';
    for (const [index, rule] of payload.handoffRules.entries()) {
      if (!isPlainObject(rule)) return `handoffRules.${index} must be an object`;
      const error = [
        textField(rule.id, `handoffRules.${index}.id`, 80),
        enumField(rule.condition, `handoffRules.${index}.condition`, ['score_below', 'intent_detected', 'consecutive_failures', 'customer_requests_human', 'negative_sentiment']),
        textField(rule.channel, `handoffRules.${index}.channel`, 40),
        enumField(rule.action, `handoffRules.${index}.action`, ['notify_agent', 'assign_to_dept', 'send_away_message', 'create_ticket']),
        textField(rule.message, `handoffRules.${index}.message`, 500),
      ].filter(Boolean)[0];
      if (error) return error;
      if (rule.threshold != null && String(rule.threshold).length > 100) return `handoffRules.${index}.threshold is too long`;
    }
  }

  const knowledgeError = validateBooleanMap(payload.knowledgeSources, 'knowledgeSources', ['companyProfile', 'knowledgeBase', 'productCatalog', 'faq', 'policies']);
  if (knowledgeError) return knowledgeError;
  if (payload.knowledgeSourcePriority != null) {
    if (!Array.isArray(payload.knowledgeSourcePriority)) return 'knowledgeSourcePriority must be an array';
    const allowedPriority = ['companyProfile', 'knowledgeBase', 'productCatalog', 'faq', 'policies'];
    if (payload.knowledgeSourcePriority.length > allowedPriority.length) return 'knowledgeSourcePriority has too many entries';
    for (const key of payload.knowledgeSourcePriority) {
      if (!allowedPriority.includes(key)) return `knowledgeSourcePriority.${key} is not supported`;
    }
  }
  const safetyError = validateBooleanMap(payload.safety, 'safety', ['piiRestriction', 'gdprMode', 'legalComplianceMode', 'promptInjectionProtection']);
  if (safetyError) return safetyError;
  if (payload.leadQualification != null && !isPlainObject(payload.leadQualification)) return 'leadQualification must be an object';
  if (payload.channelOverrides != null && !isPlainObject(payload.channelOverrides)) return 'channelOverrides must be an object';
  return null;
}

function normalizeCustomAiPayload(payload = {}) {
  const next = { ...payload };
  if ('customSystemPrompt' in payload) {
    next.systemPrompt = payload.customSystemPrompt;
    delete next.customSystemPrompt;
  }
  if ('persona' in payload || 'tone' in payload || 'language' in payload || 'fallbackLanguage' in payload) {
    next.identity = {
      ...(isPlainObject(payload.identity) ? payload.identity : {}),
      ...(payload.persona !== undefined ? { persona: payload.persona } : {}),
      ...(payload.tone !== undefined ? { tone: payload.tone } : {}),
      ...(payload.language !== undefined ? { defaultLanguage: payload.language } : {}),
      ...(payload.fallbackLanguage !== undefined ? { secondaryLanguage: payload.fallbackLanguage } : {}),
    };
    delete next.persona;
    delete next.tone;
    delete next.language;
    delete next.fallbackLanguage;
  }
  if ('confidenceThreshold' in payload) {
    next.responseControl = {
      ...(isPlainObject(payload.responseControl) ? payload.responseControl : {}),
      confidenceThreshold: payload.confidenceThreshold,
    };
    delete next.confidenceThreshold;
  }
  delete next.updatedAt;
  delete next.updatedBy;
  return next;
}

function publicCustomAiConfig(aiConfig = {}) {
  const identity = aiConfig.identity || {};
  return {
    agentName: aiConfig.agentName || '',
    persona: identity.persona || '',
    tone: identity.tone || '',
    language: identity.defaultLanguage || 'auto',
    fallbackLanguage: identity.secondaryLanguage || '',
    customSystemPrompt: aiConfig.systemPrompt || '',
    businessRules: aiConfig.businessRules || '',
    forbiddenActions: Array.isArray(aiConfig.forbiddenActions) ? aiConfig.forbiddenActions : [],
    escalationRules: aiConfig.escalationRules || '',
    handoffRules: Array.isArray(aiConfig.handoffRules) ? aiConfig.handoffRules : [],
    refundComplaintRules: aiConfig.refundComplaintRules || '',
    knowledgeSources: aiConfig.knowledgeSources || {},
    knowledgeSourcePriority: Array.isArray(aiConfig.knowledgeSourcePriority) ? aiConfig.knowledgeSourcePriority : [],
    modelPreference: aiConfig.modelPreference || '',
    temperature: aiConfig.temperature,
    maxTokens: aiConfig.maxTokens,
    autoReply: aiConfig.autoReply,
    suggestOnly: aiConfig.suggestOnly,
    confidenceThreshold: aiConfig.responseControl?.confidenceThreshold ?? 50,
    updatedAt: aiConfig.updatedAt || null,
    updatedBy: aiConfig.updatedBy || null,
  };
}

const TRIGGER_EVENTS = new Set([
  'message_received',
  'conversation_started',
  'score_updated',
  'intent_detected',
  'ready_to_buy',
  'ticket_created',
  'deal_stage_changed',
]);

const TRIGGER_CONDITION_FIELDS = new Set([
  'score',
  'intent',
  'channel',
  'language',
  'message_count',
  'wait_time',
  'tag',
  'keyword',
  'message_contains',
]);

const TRIGGER_CONDITION_OPS = new Set(['>=', '<=', '>', '<', '=', '!=', 'contains']);
const TRIGGER_ACTION_TYPES = new Set([
  'add_tag',
  'remove_tag',
  'assign_to',
  'send_message',
  'notify_agent',
  'close_conversation',
  'update_score',
]);

function validateTriggersPayload(payload) {
  if (!Array.isArray(payload)) return 'Triggers must be an array';
  if (payload.length > 100) return 'Triggers can contain at most 100 rules';

  for (const [index, trigger] of payload.entries()) {
    if (!isPlainObject(trigger)) return `Trigger ${index + 1} must be an object`;

    const name = String(trigger.name || '').trim();
    if (!name) return `Trigger ${index + 1} name is required`;
    if (name.length > 120) return `Trigger ${index + 1} name must be 120 characters or less`;

    const event = String(trigger.event || '').trim();
    if (!TRIGGER_EVENTS.has(event)) return `Trigger ${index + 1} event is invalid`;

    const field = String(trigger.conditionField || '').trim();
    const op = String(trigger.conditionOp || '').trim();
    const value = String(trigger.conditionValue ?? '').trim();
    if (!TRIGGER_CONDITION_FIELDS.has(field)) return `Trigger ${index + 1} condition field is invalid`;
    if (!TRIGGER_CONDITION_OPS.has(op)) return `Trigger ${index + 1} operator is invalid`;
    if (!value) return `Trigger ${index + 1} condition value is required`;
    if (value.length > 200) return `Trigger ${index + 1} condition value must be 200 characters or less`;

    const actionType = String(trigger.actionType || '').trim();
    if (!TRIGGER_ACTION_TYPES.has(actionType)) return `Trigger ${index + 1} action is invalid`;

    const actionValue = String(trigger.actionValue ?? '').trim();
    if (actionValue.length > 1000) return `Trigger ${index + 1} action value must be 1000 characters or less`;
    if (['add_tag', 'remove_tag', 'assign_to', 'send_message', 'update_score'].includes(actionType) && !actionValue) {
      return `Trigger ${index + 1} action value is required`;
    }
    if (actionType === 'update_score' && !/^[+-]?\d{1,3}$/.test(actionValue)) {
      return `Trigger ${index + 1} score adjustment must be a signed integer`;
    }
    if (actionType === 'assign_to' && !/^(agent|dept):.+/.test(actionValue)) {
      return `Trigger ${index + 1} assignment target is invalid`;
    }
    const activeError = boolField(trigger.active, `Trigger ${index + 1} active`);
    if (activeError) return activeError;
  }

  return null;
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

/* ── Global sub-settings ─────────────────────────────────────────────────── */

// Global settings read (agents need soundNotifs/desktopNotifs) — GET is read-only, requireReadRole
router.get('/global', requireReadRole, createSubSettingHandler('global'));

/* ── Phase A Implementation (Corrected Mapping) ─────────────────────────── */

// 1. Departments -> depts
router.get('/departments', requireReadRole, createSubSettingHandler('depts'));
router.put('/departments', requireOwnerRole, async (req, res, next) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: 'Departments must be an array' });
    }

    const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
    const errors = [];
    const names = new Set();

    for (let i = 0; i < payload.length; i++) {
      const d = payload[i];
      if (!isPlainObject(d)) { errors.push(`Item ${i}: must be an object`); continue; }

      const name = typeof d.name === 'string' ? d.name.trim() : '';
      if (!name) { errors.push(`Item ${i}: name is required`); continue; }

      const nameLower = name.toLowerCase();
      if (names.has(nameLower)) { errors.push(`Duplicate department name: "${name}"`); continue; }
      names.add(nameLower);

      if (d.priority !== undefined && !VALID_PRIORITIES.has(d.priority)) {
        errors.push(`Item ${i} ("${name}"): invalid priority "${d.priority}"`);
      }
      if (d.slaTarget !== undefined) {
        const sla = Number(d.slaTarget);
        if (!Number.isInteger(sla) || sla < 1) {
          errors.push(`Item ${i} ("${name}"): slaTarget must be a positive integer`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({ error: 'Validation failed', details: errors });
    }

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.depts = payload;
    const saved = await saveRequestTenantSettings(req, settings);
    return res.json(saved.depts);
  } catch (err) { next(err); }
});

// 2. Brands -> brands
router.get('/brands', requireReadRole, createSubSettingHandler('brands'));
router.put('/brands', requireOwnerRole, async (req, res, next) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: 'Brands must be an array' });
    }

    const errors = [];
    const names = new Set();
    const slugs = new Set();

    for (let i = 0; i < payload.length; i++) {
      const b = payload[i];
      if (!isPlainObject(b)) { errors.push(`Item ${i}: must be an object`); continue; }

      const name = typeof b.name === 'string' ? b.name.trim() : '';
      if (!name) { errors.push(`Item ${i}: name is required`); continue; }

      const nameLower = name.toLowerCase();
      if (names.has(nameLower)) { errors.push(`Duplicate brand name: "${name}"`); continue; }
      names.add(nameLower);

      const slug = typeof b.slug === 'string' ? b.slug.trim() : '';
      if (slug) {
        if (slugs.has(slug)) { errors.push(`Duplicate brand slug: "${slug}"`); continue; }
        slugs.add(slug);
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({ error: 'Validation failed', details: errors });
    }

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.brands = payload;
    const saved = await saveRequestTenantSettings(req, settings);
    return res.json(saved.brands);
  } catch (err) { next(err); }
});

// 3. Triggers -> triggers
router.get('/triggers', requireReadRole, createSubSettingHandler('triggers'));
router.put('/triggers', requireOwnerRole, async (req, res, next) => {
  try {
    const validationError = validateTriggersPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.triggers = req.body.map((trigger) => ({
      ...trigger,
      name: String(trigger.name || '').trim(),
      event: String(trigger.event || '').trim(),
      conditionField: String(trigger.conditionField || '').trim(),
      conditionOp: String(trigger.conditionOp || '').trim(),
      conditionValue: String(trigger.conditionValue ?? '').trim(),
      actionType: String(trigger.actionType || '').trim(),
      actionValue: String(trigger.actionValue ?? '').trim(),
      active: trigger.active !== false,
    }));
    const saved = await saveRequestTenantSettings(req, settings);
    return res.json(saved.triggers);
  } catch (err) { next(err); }
});

// Canned Responses -> cannedResponses
router.get('/canned-responses', requireReadRole, createSubSettingHandler('cannedResponses'));
router.put('/canned-responses', requireOwnerRole, async (req, res, next) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) return res.status(400).json({ error: 'Canned responses must be an array' });
    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.cannedResponses = payload;
    const saved = await saveRequestTenantSettings(req, settings);
    return res.json(saved.cannedResponses);
  } catch (err) { next(err); }
});

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
    const validationError = validateVisitorRoutingPayload(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const tenantId = req.user.tenant_id;

    // 1. Save the config portion (mode, fallback, threshold) to settings
    let currentSettings = normalizeTenantSettings(req.tenant?.settings);
    if (isPlainObject(body.config)) {
      currentSettings.visitorRouting = {
        ...currentSettings.visitorRouting,
        ...body.config,
        threshold: body.config.threshold != null ? Number(body.config.threshold) : currentSettings.visitorRouting.threshold,
      };
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
router.put('/chat-routing', requireOwnerRole, async (req, res, next) => {
  try {
    const validationError = validateChatRoutingPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.routing = req.body.map((rule, index) => ({
      id: String(rule.id || `cr_${Date.now()}_${index}`),
      name: String(rule.name || '').trim(),
      conditionField: String(rule.conditionField || '').trim(),
      conditionOp: String(rule.conditionOp || '').trim(),
      conditionValue: String(rule.conditionValue ?? '').trim(),
      assignTo: String(rule.assignTo || '').trim(),
      active: rule.active !== false,
      priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : (index + 1) * 10,
    }));
    const saved = await saveRequestTenantSettings(req, settings);
    res.json(saved.routing);
  } catch (err) { next(err); }
});

// 6. Lead Scoring -> leadRules
router.get('/lead-scoring', requireReadRole, createSubSettingHandler('leadRules'));
router.put('/lead-scoring', requireOwnerRole, async (req, res, next) => {
  try {
    const validationError = validateLeadScoringPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.leadRules = req.body.map((rule, index) => ({
      id: String(rule.id || `lr_${Date.now()}_${index}`),
      signal: String(rule.signal || '').trim(),
      weight: Number(rule.weight),
      active: rule.active !== false,
    }));
    const saved = await saveRequestTenantSettings(req, settings);
    res.json(saved.leadRules);
  } catch (err) { next(err); }
});

// 7. Import -> importConfig
router.get('/import', requireReadRole, createSubSettingHandler('importConfig'));
router.put('/import', requireOwnerRole, createSubSettingHandler('importConfig'));

// Import processing: parse uploaded file and insert rows into correct tables
router.post('/import/process', requireOwnerRole, async (req, res, next) => {
  try {
    const validationError = validateImportProcessPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const importType = String(req.body.importType || '').trim().toLowerCase();
    const publicFilePath = String(req.body.filePath || '').trim();

    // filePath from uploads endpoint is a public path like /uploads/<tenantId>/file.xlsx
    // We reconstruct the absolute disk path from the upload root.
    const uploadRoot = getUploadRoot();
    const tenantSegment = encodeURIComponent(String(req.user.tenant_id));
    const expectedPrefix = `/uploads/${tenantSegment}/`;
    if (!publicFilePath.startsWith(expectedPrefix)) {
      return res.status(403).json({ error: 'Import file does not belong to this tenant' });
    }

    // publicFilePath = "/uploads/<tenantId>/<filename>" — strip leading /uploads/
    const relative = publicFilePath.slice('/uploads/'.length);
    const absolutePath = path.join(uploadRoot, relative);

    // Security: ensure the resolved path remains inside this tenant's upload directory.
    const resolved = path.resolve(absolutePath);
    const root = path.resolve(uploadRoot);
    const tenantRoot = path.resolve(uploadRoot, tenantSegment);
    if (
      (!resolved.startsWith(root + path.sep) && resolved !== root)
      || !resolved.startsWith(tenantRoot + path.sep)
    ) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const result = await processImport({
      tenantId: req.user.tenant_id,
      filePath: resolved,
      importType,
    });

    // Persist result into importConfig.lastResult
    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.importConfig = {
      ...(settings.importConfig || {}),
      lastResult: { ...result, importType, filePath: publicFilePath },
    };
    await saveRequestTenantSettings(req, settings);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 8. Spammers -> spammers
router.get('/spammers', requireReadRole, createSubSettingHandler('spammers'));
router.put('/spammers', requireOwnerRole, async (req, res, next) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(422).json({ error: 'Payload must be an array' });
    }
    if (payload.length > 5000) {
      return res.status(422).json({ error: 'Spammers list cannot exceed 5000 entries' });
    }
    const VALID_TYPES = new Set(['phone', 'id', 'name', 'channel_id']);
    const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);
    const errors = [];
    for (let i = 0; i < payload.length; i++) {
      const entry = payload[i];
      if (!entry || typeof entry !== 'object') { errors.push({ index: i, field: 'entry', message: 'Must be an object' }); continue; }
      const val = String(entry.value || '').trim();
      if (!val) errors.push({ index: i, field: 'value', message: 'Required' });
      else if (val.length > 200) errors.push({ index: i, field: 'value', message: 'Max 200 characters' });
      if (entry.type !== undefined && !VALID_TYPES.has(entry.type)) {
        errors.push({ index: i, field: 'type', message: 'Must be phone, id, name, or channel_id' });
      }
      if (!entry.whitelisted && entry.severity !== undefined && !VALID_SEVERITIES.has(entry.severity)) {
        errors.push({ index: i, field: 'severity', message: 'Must be low, medium, or high' });
      }
    }
    if (errors.length > 0) {
      return res.status(422).json({ error: 'Validation failed', details: errors });
    }

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.spammers = payload.map(entry => ({
      value: String(entry.value).trim(),
      type: entry.type || 'phone',
      severity: entry.severity || 'medium',
      reason: String(entry.reason || '').trim(),
      temporary: Boolean(entry.temporary),
      expiresAt: entry.expiresAt || '',
      whitelisted: Boolean(entry.whitelisted),
    }));
    await saveRequestTenantSettings(req, settings);
    res.json(settings.spammers);
  } catch (err) {
    next(err);
  }
});

// 9. Schedule Report -> schedReports
router.get('/schedule-report', requireReadRole, createSubSettingHandler('schedReports'));
router.put('/schedule-report', requireOwnerRole, async (req, res, next) => {
  try {
    const validationError = validateScheduleReportsPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    const existingById = new Map(settings.schedReports.map((report) => [String(report.id || ''), report]));
    settings.schedReports = req.body.map((report, index) => {
      const id = String(report.id || `sr_${Date.now()}_${index}`);
      const previous = existingById.get(id) || {};
      return {
        ...previous,
        id,
        name: String(report.name || '').trim(),
        freq: String(report.freq || 'daily').trim().toLowerCase(),
        time: String(report.time || '08:00').trim(),
        email: String(report.email || '').trim().toLowerCase(),
        active: report.active !== false,
      };
    });
    const saved = await saveRequestTenantSettings(req, settings);
    res.json(saved.schedReports);
  } catch (err) { next(err); }
});

router.post('/schedule-report/:id/run', requireOwnerRole, async (req, res, next) => {
  try {
    const results = await runScheduledReportsForTenant(req.user.tenant_id, req.params.id, { force: true });
    if (results.length === 0) return res.status(404).json({ error: 'Scheduled report not found' });
    res.json(results);
  } catch (err) { next(err); }
});

// 10. Company Scoring -> compScore
router.get('/company-scoring', requireReadRole, createSubSettingHandler('compScore'));
router.put('/company-scoring', requireOwnerRole, async (req, res, next) => {
  try {
    const validationError = validateCompanyScoringPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.compScore = {
      ...settings.compScore,
      enabled: req.body.enabled !== false,
      minRevenue: Number(req.body.minRevenue ?? settings.compScore.minRevenue),
      minOrders: Number(req.body.minOrders ?? settings.compScore.minOrders),
      vipThreshold: Number(req.body.vipThreshold ?? settings.compScore.vipThreshold),
    };
    const saved = await saveRequestTenantSettings(req, settings);
    res.json(saved.compScore);
  } catch (err) { next(err); }
});

// 11. Email Templates -> emailTpls
router.get('/email-templates', requireReadRole, createSubSettingHandler('emailTpls'));
router.put('/email-templates', requireOwnerRole, async (req, res, next) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) return res.status(400).json({ error: 'Email templates must be an array' });
    const settings = normalizeTenantSettings(req.tenant?.settings);
    settings.emailTpls = payload;
    const saved = await saveRequestTenantSettings(req, settings);
    return res.json(saved.emailTpls);
  } catch (err) { next(err); }
});

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

    const cycleEndDate = req.tenant?.next_billing_at
      || req.tenant?.renewal_at
      || req.tenant?.trial_ends_at
      || endOfMonth();

    res.json({
      plan: req.tenant?.plan || 'growth',
      cycleEnd: new Date(cycleEndDate).toISOString().slice(0, 10),
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
      const lastInboundMs = c.last_inbound_at ? new Date(c.last_inbound_at).getTime() : null;
      const lastOutboundMs = c.last_outbound_at ? new Date(c.last_outbound_at).getTime() : null;
      const waitingSinceMs = lastInboundMs && (!lastOutboundMs || lastInboundMs > lastOutboundMs)
        ? lastInboundMs
        : openedMs;
      const waitingMinutes = lastInboundMs && lastOutboundMs && lastOutboundMs >= lastInboundMs
        ? 0
        : Math.max(0, Math.floor((now.getTime() - waitingSinceMs) / 60_000));
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

router.post('/monitor/:id/escalate', requireOwnerRole, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const convResult = await req.db.query(`
      SELECT
        c.id,
        c.customer_id,
        c.channel,
        c.assigned_to,
        cu.name AS customer_name,
        c.last_message_preview,
        t.id AS ticket_id
      FROM conversations c
      JOIN customers cu ON cu.id = c.customer_id AND cu.tenant_id = c.tenant_id
      LEFT JOIN tickets t ON t.tenant_id = c.tenant_id AND t.conversation_id = c.id AND t.deleted_at IS NULL
      WHERE c.tenant_id = $1
        AND c.id = $2
        AND c.status = 'open'
      LIMIT 1
    `, [tenantId, req.params.id]);
    const conversation = convResult.rows[0];
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    let ticketId = conversation.ticket_id;
    if (ticketId) {
      await req.db.query(`
        UPDATE tickets
        SET priority = 'urgent',
            status = CASE WHEN status IN ('resolved', 'closed') THEN status ELSE 'open' END,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2
          AND deleted_at IS NULL
      `, [tenantId, ticketId]);
    } else {
      const ticket = await createTicket(tenantId, {
        title: `Escalated conversation with ${conversation.customer_name || 'customer'}`,
        description: conversation.last_message_preview || 'Conversation escalated from monitor',
        priority: 'urgent',
        category: 'Conversation',
        status: 'open',
        channel: conversation.channel,
        source: 'conversation_monitor',
        conversation_id: conversation.id,
        customer_id: conversation.customer_id,
        customer_name: conversation.customer_name,
        assignee_id: conversation.assigned_to || null,
        escalation_reason: 'Escalated from Conversation Monitor',
      }, req.db);
      ticketId = ticket.id;
    }

    const [conversationUpdate] = await Promise.all([
      updateConversationAiMode(tenantId, conversation.id, 'manual', req.db),
      req.db.query(
        'UPDATE conversations SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2',
        [tenantId, conversation.id],
      ),
    ]);

    res.json({
      id: conversation.id,
      ticket_id: ticketId,
      ai_mode: conversationUpdate?.ai_mode || 'manual',
      priority: 'urgent',
      is_urgent: true,
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

/* ── SSO Settings ───────────────────────────────────────────────────────── */

router.get('/sso', requireReadRole, async (req, res, next) => {
  try {
    const config = getTenantSsoConfig(req.tenant || {});
    res.json(publicSsoConfig(config));
  } catch (err) { next(err); }
});

router.put('/sso', requireOwnerRole, async (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Payload must be an object' });
    const settings = normalizeTenantSettings(req.tenant?.settings);
    const current = getTenantSsoConfig({ settings });
    const nextConfig = normalizeSsoConfig(req.body, current);

    if (nextConfig.enabled) {
      if (!['google', 'microsoft'].includes(nextConfig.provider)) {
        return res.status(400).json({ error: 'Only Google Workspace and Microsoft Entra ID OAuth can be enabled from this screen.' });
      }
      if (nextConfig.allowedDomains.length === 0) {
        return res.status(400).json({ error: 'At least one allowed email domain is required when SSO is enabled.' });
      }
    }

    settings.sso = {
      ...nextConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
      lastError: '',
    };
    const saved = await saveRequestTenantSettings(req, settings);
    await logAuditEvent({
      tenantId: req.user.tenant_id,
      actorType: 'user',
      actorId: req.user.id,
      action: 'settings.sso.updated',
      entityType: 'tenant_settings',
      entityId: req.user.tenant_id,
      metadata: {
        enabled: settings.sso.enabled,
        provider: settings.sso.provider,
        requireSso: settings.sso.requireSso,
        autoProvision: settings.sso.autoProvision,
        domains: settings.sso.allowedDomains,
      },
    }).catch(() => {});
    res.json(publicSsoConfig(saved.sso || settings.sso));
  } catch (err) { next(err); }
});

router.post('/sso/test', requireOwnerRole, async (req, res, next) => {
  try {
    const settings = normalizeTenantSettings(req.tenant?.settings);
    const config = getTenantSsoConfig({ settings });
    const runtime = getProviderRuntimeStatus(config.provider);
    const status = config.enabled && runtime.configured && config.allowedDomains.length > 0 ? 'ready' : 'blocked';
    settings.sso = {
      ...config,
      lastTestedAt: new Date().toISOString(),
      lastError: status === 'ready' ? '' : 'SSO requires enabled tenant config, allowed domains, and provider client credentials in server environment variables.',
    };
    await saveRequestTenantSettings(req, settings);
    await logAuditEvent({
      tenantId: req.user.tenant_id,
      actorType: 'user',
      actorId: req.user.id,
      action: 'settings.sso.tested',
      entityType: 'tenant_settings',
      entityId: req.user.tenant_id,
      metadata: { provider: config.provider, status, providerConfigured: runtime.configured },
    }).catch(() => {});
    res.json({
      status,
      provider: config.provider,
      providerConfigured: runtime.configured,
      redirectConfigured: Boolean(runtime.redirectUri),
      message: status === 'ready'
        ? `${config.provider} SSO is configured and ready to start OAuth.`
        : 'SSO is not ready. Configure provider credentials and allowed domains.',
    });
  } catch (err) { next(err); }
});

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
    const payload = { ...req.body };
    delete payload.updatedAt;
    delete payload.updatedBy;
    const validationError = validateAiConfigPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    // Deep-merge nested sub-objects
    const mergedAiConfig = { ...settings.aiConfig };
    for (const [key, value] of Object.entries(payload)) {
      if (isPlainObject(value) && isPlainObject(mergedAiConfig[key])) {
        mergedAiConfig[key] = { ...mergedAiConfig[key], ...value };
      } else if (Array.isArray(value)) {
        mergedAiConfig[key] = value;
      } else if (value !== undefined) {
        mergedAiConfig[key] = value;
      }
    }
    mergedAiConfig.platformManaged = true;
    mergedAiConfig.tenantApiKeysAllowed = false;
    if (mergedAiConfig.safety) {
      mergedAiConfig.safety = {
        ...mergedAiConfig.safety,
        piiRestriction: true,
        promptInjectionProtection: true,
      };
    }
    settings.aiConfig = mergedAiConfig;
    const saved = await saveRequestTenantSettings(req, settings);
    res.json(saved.aiConfig);
  } catch (err) { next(err); }
});

// GET /api/settings/ai/custom — tenant Custom AI contract used by enterprise settings UI
router.get('/ai/custom', requireReadRole, async (req, res, next) => {
  try {
    const settings = normalizeTenantSettings(req.tenant?.settings);
    res.json(publicCustomAiConfig(settings.aiConfig || {}));
  } catch (err) { next(err); }
});

// PUT /api/settings/ai/custom — save only Custom AI controls, still backed by tenant aiConfig
router.put('/ai/custom', requireOwnerRole, async (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Payload must be an object' });
    const payload = normalizeCustomAiPayload(req.body);
    const validationError = validateAiConfigPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    const settings = normalizeTenantSettings(req.tenant?.settings);
    const mergedAiConfig = { ...settings.aiConfig };
    for (const [key, value] of Object.entries(payload)) {
      if (isPlainObject(value) && isPlainObject(mergedAiConfig[key])) {
        mergedAiConfig[key] = { ...mergedAiConfig[key], ...value };
      } else if (Array.isArray(value)) {
        mergedAiConfig[key] = value;
      } else if (value !== undefined) {
        mergedAiConfig[key] = value;
      }
    }
    mergedAiConfig.platformManaged = true;
    mergedAiConfig.tenantApiKeysAllowed = false;
    mergedAiConfig.updatedAt = new Date().toISOString();
    mergedAiConfig.updatedBy = req.user.id;
    settings.aiConfig = mergedAiConfig;
    const saved = await saveRequestTenantSettings(req, settings);

    await logAuditEvent({
      tenantId: req.user.tenant_id,
      actorType: 'user',
      actorId: req.user.id,
      action: 'settings.ai.custom.updated',
      entityType: 'tenant_settings',
      entityId: req.user.tenant_id,
      metadata: {
        changedFields: Object.keys(payload),
        autoReply: saved.aiConfig.autoReply,
        suggestOnly: saved.aiConfig.suggestOnly,
      },
    }).catch(() => {});

    res.json(publicCustomAiConfig(saved.aiConfig || {}));
  } catch (err) { next(err); }
});

// GET /api/settings/ai/custom-provider — BYOK provider config (masked)
router.get('/ai/custom-provider', requireReadRole, async (req, res, next) => {
  try {
    const provider = await getCustomAiProvider(req.user.tenant_id);
    res.json({ provider: provider || null, availableProviders: [...VALID_PROVIDERS], validModels: VALID_MODELS });
  } catch (err) { next(err); }
});

// PUT /api/settings/ai/custom-provider — create/update BYOK config
router.put('/ai/custom-provider', requireOwnerRole, async (req, res, next) => {
  try {
    const { provider, apiKey, model } = req.body || {};
    if (!provider || !apiKey) return res.status(400).json({ error: 'provider and apiKey are required' });
    const billing = req.billing;
    const featureMap = Object.fromEntries((billing?.featureAccess || []).map((f) => [f.key, f]));
    if (featureMap.custom_ai?.allowed === false) {
      return res.status(403).json({ error: 'Custom AI BYOK requires an Enterprise plan.', code: 'FEATURE_NOT_AVAILABLE' });
    }
    const allowedProviders = featureMap.custom_ai?.metadata?.allowedProviders;
    if (Array.isArray(allowedProviders) && allowedProviders.length && !allowedProviders.includes(provider)) {
      return res.status(403).json({ error: `Provider "${provider}" is not in your plan's allowed providers: ${allowedProviders.join(', ')}.`, code: 'FEATURE_NOT_AVAILABLE' });
    }
    const saved = await upsertCustomAiProvider(req.user.tenant_id, { provider, apiKey, model });
    await logAuditEvent({ tenantId: req.user.tenant_id, actorType: 'user', actorId: req.user.id, action: 'settings.ai.byok.updated', entityType: 'custom_ai_provider', entityId: req.user.tenant_id, metadata: { provider } }).catch(() => {});
    res.json({ provider: saved });
  } catch (err) { next(err); }
});

// DELETE /api/settings/ai/custom-provider — remove BYOK config
router.delete('/ai/custom-provider', requireOwnerRole, async (req, res, next) => {
  try {
    await deleteCustomAiProvider(req.user.tenant_id);
    await logAuditEvent({ tenantId: req.user.tenant_id, actorType: 'user', actorId: req.user.id, action: 'settings.ai.byok.deleted', entityType: 'custom_ai_provider', entityId: req.user.tenant_id, metadata: {} }).catch(() => {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/settings/ai/custom-provider/test — validate key against provider
router.post('/ai/custom-provider/test', requireOwnerRole, async (req, res, next) => {
  try {
    const { provider, apiKey } = req.body || {};
    if (!provider || !apiKey) return res.status(400).json({ error: 'provider and apiKey are required' });
    if (!VALID_PROVIDERS.has(provider)) return res.status(400).json({ error: `Invalid provider: ${provider}` });

    let ok = false;
    let errorMsg = null;
    try {
      if (provider === 'openai') {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey });
        await client.models.list();
        ok = true;
      } else if (provider === 'anthropic') {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey });
        await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
        ok = true;
      } else if (provider === 'gemini') {
        let GoogleGenAI;
        try { ({ GoogleGenAI } = require('@google/genai')); } catch { errorMsg = 'Gemini SDK not installed on this server'; }
        if (GoogleGenAI) {
          const client = new GoogleGenAI({ apiKey });
          await client.models.generateContent({ model: 'gemini-1.5-flash', contents: 'ping' });
          ok = true;
        }
      }
    } catch (testErr) {
      errorMsg = testErr.message;
    }

    res.json({ ok, error: errorMsg || null });
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
        `SELECT COUNT(*)::int AS total
         FROM messages
         WHERE tenant_id = $1
           AND sent_by = 'ai'
           AND metadata->>'ai_auto_reply' = 'true'
           AND COALESCE(metadata->>'send_status', 'sent') = 'sent'
           AND metadata->>'send_error' IS NULL`,
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
    if (message.length > 2000) return res.status(400).json({ error: 'message must be 2000 characters or less' });
    if (!['livechat', 'whatsapp', 'instagram', 'messenger'].includes(channel)) {
      return res.status(400).json({ error: 'channel is invalid' });
    }

    const { completeTextForTenant } = require('../../ai/completionClient');
    const { assessTextSafety, buildSafeRefusal } = require('../../ai/safetyGuard');
    const { evaluateForbiddenActions, buildForbiddenRefusal } = require('../../ai/policyEngine');
    const { resolvePromptContent } = require('../../ai/promptRegistry');
    const { buildCompanyContext } = require('../../core/tenantSettings');

    const settings = normalizeTenantSettings(req.tenant?.settings);
    const aiConfig = settings.aiConfig || {};
    const identity = aiConfig.identity || {};
    const safety = aiConfig.safety || {};
    const company = buildCompanyContext(req.tenant || {}, { channel });
    const agentName = company.agentName || aiConfig.agentName || 'Chator Assistant';
    const tone = identity.tone || company.brandTone || 'friendly and professional';
    const formality = identity.formality || 'semi-formal';
    const persona = identity.persona || '';
    const businessRules = String(aiConfig.businessRules || '').trim();
    const refundComplaintRules = String(aiConfig.refundComplaintRules || '').trim();
    const customEscalationRules = String(aiConfig.escalationRules || '').trim();

    const baseInstruction = await resolvePromptContent(
      req.user.tenant_id,
      'reply-system',
      aiConfig.systemPrompt || 'You are a professional sales assistant for an eCommerce store.',
    );

    const inputGuard = assessTextSafety(message);
    const forbiddenMatch = evaluateForbiddenActions(aiConfig.forbiddenActions, message);
    let simulatedReply;
    let blocked = false;
    let blockedReason = null;

    if (!inputGuard.allowed) {
      simulatedReply = buildSafeRefusal();
      blocked = true;
      blockedReason = inputGuard.reason;
    } else if (forbiddenMatch?.enforcement === 'block') {
      simulatedReply = buildForbiddenRefusal(forbiddenMatch);
      blocked = true;
      blockedReason = forbiddenMatch.reason;
    } else {
      const forbiddenInstruction = forbiddenMatch
        ? `Tenant policy match: ${forbiddenMatch.reason}. Avoid the matched topic and keep the reply within approved product/support scope.`
        : '';
      const safetyInstructions = [
        safety.gdprMode ? 'If the customer asks about personal data, privacy, deletion, or export rights, explain that a human support agent can help with the official data request process.' : '',
        safety.legalComplianceMode ? 'Do not provide legal, financial, or medical advice. For regulated topics, give general support guidance and recommend a qualified professional or human agent.' : '',
      ].filter(Boolean).join('\n');
      const prompt = `${baseInstruction}

Business name: ${company.name}
Assistant name: ${agentName}
Tone: ${tone} | Formality: ${formality}
${persona ? `Persona: ${persona}` : ''}
${safetyInstructions}
${company.forbiddenTopics ? `Forbidden topics — never discuss: ${company.forbiddenTopics}` : ''}
${forbiddenInstruction}
${businessRules ? `Tenant business rules — follow exactly: ${businessRules}` : ''}
${refundComplaintRules ? `Refund and complaint handling — follow exactly: ${refundComplaintRules}` : ''}
${customEscalationRules || company.escalationRules ? `Escalation — hand off to human when: ${customEscalationRules || company.escalationRules}` : ''}
Channel: ${channel}

[SIMULATION MODE — do not save, do not send]
Customer: ${customerName}
Message: ${message}

Write ONE reply only — ready to send on ${channel}. Max 3 lines.`;

      simulatedReply = await completeTextForTenant({
        tenantId: req.user.tenant_id,
        prompt,
        maxTokens: Number(aiConfig.maxTokens || 250),
        temperature: Number(aiConfig.temperature ?? 0.3),
        modelPreference: aiConfig.modelPreference || '',
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
