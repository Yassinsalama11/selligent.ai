'use strict';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function customerTags(customer = {}) {
  const tags = customer.tags || customer.labels || [];
  if (Array.isArray(tags)) return tags.map(normalizeText).filter(Boolean);
  return String(tags || '')
    .split(',')
    .map(normalizeText)
    .filter(Boolean);
}

function matchesPattern(text, pattern) {
  const haystack = normalizeText(text);
  const needle = normalizeText(pattern);
  if (!haystack || !needle) return false;
  return haystack.includes(needle);
}

function evaluateForbiddenActions(rules = [], text = '') {
  if (!Array.isArray(rules)) return null;

  for (const rule of rules) {
    if (!rule || rule.enabled === false) continue;
    const pattern = String(rule.pattern || '').trim();
    if (!pattern || !matchesPattern(text, pattern)) continue;
    return {
      matched: true,
      rule,
      enforcement: ['block', 'warn', 'log'].includes(rule.enforcement) ? rule.enforcement : 'block',
      reason: `Forbidden action matched: ${pattern}`,
    };
  }

  return null;
}

function buildForbiddenRefusal(match) {
  const rule = match?.rule || {};
  const label = String(rule.pattern || 'that topic').trim();
  return `I can’t help with "${label}". I can still help with product information, order support, policies, and next steps that are appropriate for this conversation.`;
}

function getAiTimeBehavior(responseControl = {}, globalSettings = {}, date = new Date(), isWithinWorkingHours) {
  const withinHours = typeof isWithinWorkingHours === 'function'
    ? isWithinWorkingHours(globalSettings, date)
    : true;
  const key = withinHours ? 'businessHoursAiBehavior' : 'afterHoursAiBehavior';
  const value = responseControl?.[key] || 'auto';
  return ['auto', 'suggest', 'off'].includes(value) ? value : 'auto';
}

function parseSilentModeConditions(value = '') {
  return String(value || '')
    .split(',')
    .map((raw) => raw.trim().replace(/^(when|if)\s+/i, ''))
    .filter(Boolean)
    .map((condition) => {
      const [field, ...rest] = condition.split('=');
      const expected = rest.join('=').trim();
      return { field: normalizeText(field), expected: normalizeText(expected) };
    })
    .filter((condition) => condition.field && condition.expected);
}

function matchesSilentModeConditions(value, context = {}) {
  const conditions = parseSilentModeConditions(value);
  if (!conditions.length) return null;

  const tags = customerTags(context.customer);
  for (const condition of conditions) {
    if (condition.field === 'channel' && normalizeText(context.channel) === condition.expected) {
      return condition;
    }
    if (condition.field === 'tag' && tags.includes(condition.expected)) {
      return condition;
    }
    if (condition.field === 'intent' && normalizeText(context.intent) === condition.expected) {
      return condition;
    }
    if (condition.field === 'sentiment' && normalizeText(context.sentiment) === condition.expected) {
      return condition;
    }
  }

  return null;
}

function countConsecutiveAiAutoReplies(history = []) {
  let count = 0;
  const rows = Array.isArray(history) ? history : [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i] || {};
    if (row.direction === 'outbound' && row.sent_by === 'agent') break;
    if (row.direction === 'outbound' && row.sent_by && row.sent_by !== 'ai') break;
    if (row.direction === 'outbound' && row.sent_by === 'ai' && row.metadata?.ai_auto_reply === true) {
      count += 1;
    }
  }
  return count;
}

function countConsecutiveAiFailures(history = []) {
  let count = 0;
  const rows = Array.isArray(history) ? history : [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i] || {};
    if (row.direction === 'outbound' && row.sent_by === 'agent') break;
    if (row.direction === 'outbound' && row.sent_by === 'ai' && row.metadata?.send_error) {
      count += 1;
      continue;
    }
    if (row.direction === 'outbound' && row.sent_by === 'ai' && row.metadata?.ai_auto_reply === true) break;
  }
  return count;
}

function textRequestsHuman(text = '') {
  return /\b(human|agent|representative|manager|support team|real person)\b/i.test(String(text || ''))
    || /(انسان|موظف|وكيل|مدير|خدمة العملاء)/i.test(String(text || ''));
}

function textLooksNegative(text = '') {
  return /\b(angry|upset|complaint|refund|cancel|terrible|bad service|scam)\b/i.test(String(text || ''))
    || /(غاضب|زعلان|شكوى|استرجاع|الغاء|إلغاء|سيء|نصب)/i.test(String(text || ''));
}

function evaluateHandoffRules(rules = [], context = {}) {
  if (!Array.isArray(rules)) return null;

  for (const rule of rules) {
    if (!rule || rule.enabled === false) continue;
    const ruleChannel = normalizeText(rule.channel || '__all__');
    if (ruleChannel && ruleChannel !== '__all__' && ruleChannel !== normalizeText(context.channel)) continue;

    const condition = normalizeText(rule.condition || 'score_below');
    const threshold = rule.threshold;
    let matched = false;

    if (condition === 'score_below') {
      matched = Number(context.leadScore) < Number(threshold);
    } else if (condition === 'intent_detected') {
      matched = normalizeText(context.intent) === normalizeText(threshold);
    } else if (condition === 'consecutive_failures') {
      matched = Number(context.consecutiveFailures || 0) >= Number(threshold || 1);
    } else if (condition === 'customer_requests_human') {
      matched = textRequestsHuman(context.text);
    } else if (condition === 'negative_sentiment') {
      matched = textLooksNegative(context.text);
    }

    if (matched) {
      return {
        matched: true,
        rule,
        reason: `Handoff rule matched: ${condition}`,
      };
    }
  }

  return null;
}

module.exports = {
  evaluateForbiddenActions,
  buildForbiddenRefusal,
  getAiTimeBehavior,
  matchesSilentModeConditions,
  countConsecutiveAiAutoReplies,
  countConsecutiveAiFailures,
  evaluateHandoffRules,
};
