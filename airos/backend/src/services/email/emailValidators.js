const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmailAddress(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    const err = new Error(`Invalid email address: ${value || ''}`);
    err.code = 'INVALID_EMAIL';
    err.status = 400;
    throw err;
  }
  return email;
}

function normalizeRecipient(value) {
  if (typeof value === 'string') {
    return { address: normalizeEmailAddress(value), name: '' };
  }

  if (value && typeof value === 'object') {
    return {
      address: normalizeEmailAddress(value.address || value.email),
      name: String(value.name || '').trim(),
    };
  }

  const err = new Error('Recipient must be an email string or object');
  err.code = 'INVALID_RECIPIENT';
  err.status = 400;
  throw err;
}

function normalizeRecipients(input) {
  const values = Array.isArray(input) ? input : [input];
  const deduped = new Map();

  for (const value of values) {
    if (value == null || value === '') continue;
    const recipient = normalizeRecipient(value);
    deduped.set(recipient.address, recipient);
  }

  if (deduped.size === 0) {
    const err = new Error('At least one email recipient is required');
    err.code = 'RECIPIENT_REQUIRED';
    err.status = 400;
    throw err;
  }

  return [...deduped.values()];
}

function normalizeLocale(value) {
  const locale = String(value || 'en').trim().toLowerCase();
  return locale.startsWith('ar') ? 'ar' : 'en';
}

function isRtlLocale(locale) {
  return normalizeLocale(locale) === 'ar';
}

function normalizeSubject(value) {
  const subject = String(value || '').trim();
  if (!subject) {
    const err = new Error('Email subject is required');
    err.code = 'SUBJECT_REQUIRED';
    err.status = 400;
    throw err;
  }
  return subject.slice(0, 255);
}

function ensurePlainObject(value, label = 'value') {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    const err = new Error(`${label} must be an object`);
    err.code = 'INVALID_OBJECT';
    err.status = 400;
    throw err;
  }
  return value;
}

function sanitizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
    return parsed.toString();
  } catch {
    const err = new Error(`Invalid URL: ${value || ''}`);
    err.code = 'INVALID_URL';
    err.status = 400;
    throw err;
  }
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function buildEmailConfig(env = process.env) {
  const port = Number.parseInt(env.SMTP_PORT || '465', 10);
  const transport = String(env.ZEPTO_TRANSPORT || 'auto').trim().toLowerCase();

  return {
    transport: ['smtp', 'api', 'auto'].includes(transport) ? transport : 'auto',
    provider: 'zepto',
    fromEmail: String(env.ZEPTO_FROM_EMAIL || 'sales@chatorai.com').trim(),
    fromName: String(env.ZEPTO_FROM_NAME || 'ChatorAI').trim() || 'ChatorAI',
    smtpHost: String(env.SMTP_HOST || 'smtp.zeptomail.com').trim(),
    smtpPort: Number.isFinite(port) ? port : 465,
    smtpSecure: parseBoolean(env.SMTP_SECURE, port === 465),
    smtpUsername: String(env.SMTP_USERNAME || '').trim(),
    smtpPassword: String(env.SMTP_PASSWORD || '').trim(),
    apiUrl: String(env.ZEPTO_API_URL || 'https://api.zeptomail.com/v1.1/email').trim(),
    apiToken: String(env.ZEPTO_API_TOKEN || '').trim(),
    trackOpens: parseBoolean(env.ZEPTO_TRACK_OPENS, true),
    trackClicks: parseBoolean(env.ZEPTO_TRACK_CLICKS, true),
    frontendUrl: String(env.FRONTEND_URL || 'https://chatorai.com').trim().replace(/\/$/, ''),
    websiteUrl: String(env.WEBSITE_URL || env.FRONTEND_URL || 'https://chatorai.com').trim().replace(/\/$/, ''),
    supportEmail: String(env.SUPPORT_EMAIL || 'support@chatorai.com').trim(),
    privacyUrl: String(env.PRIVACY_URL || `${env.FRONTEND_URL || 'https://chatorai.com'}/privacy`).trim(),
    termsUrl: String(env.TERMS_URL || `${env.FRONTEND_URL || 'https://chatorai.com'}/terms`).trim(),
  };
}

function validateProviderConfig(config) {
  if (!config.fromEmail) {
    const err = new Error('ZEPTO_FROM_EMAIL is required');
    err.code = 'EMAIL_CONFIG_MISSING';
    err.status = 503;
    throw err;
  }

  if (config.transport === 'api') {
    if (!config.apiToken) {
      const err = new Error('ZEPTO_API_TOKEN is required when ZEPTO_TRANSPORT=api');
      err.code = 'EMAIL_CONFIG_MISSING';
      err.status = 503;
      throw err;
    }
    return config;
  }

  if (!config.smtpUsername || !config.smtpPassword) {
    console.warn('[Email] SMTP credentials missing — email sending disabled. Set SMTP_USERNAME and SMTP_PASSWORD in Railway.');
    config.disabled = true;
  }

  return config;
}

function validateSendEmailInput(payload = {}) {
  const normalized = {
    template: payload.template ? String(payload.template).trim() : '',
    to: normalizeRecipients(payload.to),
    subject: payload.subject ? normalizeSubject(payload.subject) : '',
    variables: ensurePlainObject(payload.variables, 'variables'),
    metadata: ensurePlainObject(payload.metadata, 'metadata'),
    tenantId: payload.tenantId || null,
    userId: payload.userId || null,
    locale: normalizeLocale(payload.locale || payload.variables?.locale),
  };

  if (!normalized.template && !normalized.subject) {
    const err = new Error('Either template or subject is required');
    err.code = 'EMAIL_TEMPLATE_REQUIRED';
    err.status = 400;
    throw err;
  }

  return normalized;
}

module.exports = {
  buildEmailConfig,
  ensurePlainObject,
  isRtlLocale,
  normalizeEmailAddress,
  normalizeLocale,
  normalizeRecipients,
  normalizeSubject,
  parseBoolean,
  sanitizeUrl,
  validateProviderConfig,
  validateSendEmailInput,
};
