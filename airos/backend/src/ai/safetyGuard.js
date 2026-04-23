const crypto = require('crypto');

const RESTRICTED_CATEGORIES = {
  internal_financial_data: [
    /\brevenue\b/i,
    /\bsales total\b/i,
    /\bprofit\b/i,
    /\borders?\s+(today|this week|this month|count|total)\b/i,
    /كم.*(مبيعات|ايراد|إيراد|طلبات)/i,
  ],
  private_customer_data: [
    /\bcustomer emails?\b/i,
    /\busers?\s+from\s+the\s+database\b/i,
    /\bphone numbers?\b/i,
    /\bexport\s+(customers|users|contacts|emails)\b/i,
    /اعطني.*(ايميلات|إيميلات|عملاء|ارقام|أرقام)/i,
  ],
  database_like_request: [
    /\bselect\s+\*\s+from\b/i,
    /\bdatabase\b/i,
    /\bsql\b/i,
    /\bdump\b/i,
    /\bexport\b/i,
    /\btable\b/i,
  ],
  admin_system_internals: [
    /\bsystem prompt\b/i,
    /\bdeveloper message\b/i,
    /\bapi key\b/i,
    /\bsecret\b/i,
    /\btoken\b/i,
    /\badmin\b/i,
    /\bignore previous instructions\b/i,
    /\bjailbreak\b/i,
  ],
  sensitive_operational_metrics: [
    /\bconversion rate\b/i,
    /\baverage response\b/i,
    /\bagent performance\b/i,
    /\binternal metric/i,
    /\bchurn\b/i,
  ],
};

function hashForAudit(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function assessTextSafety(text = '') {
  const value = String(text || '').trim();
  if (!value) return { allowed: true };

  for (const [category, patterns] of Object.entries(RESTRICTED_CATEGORIES)) {
    if (patterns.some((pattern) => pattern.test(value))) {
      return {
        allowed: false,
        category,
        reason: `Restricted ${category.replace(/_/g, ' ')} request`,
        inputHash: hashForAudit(value),
      };
    }
  }

  return { allowed: true };
}

function buildSafeRefusal() {
  return 'I can’t access or disclose private company, customer, database, financial, or internal system data. I can help with product information, policies, support questions, and next steps that are appropriate for this conversation.';
}

module.exports = {
  RESTRICTED_CATEGORIES,
  assessTextSafety,
  buildSafeRefusal,
  hashForAudit,
};
