const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { queryAdmin } = require('../../db/pool');
const { logAuditEvent } = require('../../db/queries/audit');
const {
  consumeEmailToken,
  createDemoRequest,
  createEmailToken,
  getActiveEmailToken,
  invalidateEmailTokens,
} = require('../../db/queries/email');
const { logger } = require('../../core/logger');
const { getEmailTemplate, listEmailTemplates } = require('./emailTemplates');
const emailLogger = require('./emailLogger');
const { deliverWithRetry } = require('./emailQueue');
const { renderEmailLayout } = require('./templateRenderer');
const {
  buildEmailConfig,
  normalizeRecipients,
  normalizeSubject,
  sanitizeUrl,
  validateProviderConfig,
  validateSendEmailInput,
} = require('./emailValidators');
const {
  recordBillingEvent,
  updateTenantBillingProfile,
} = require('../billingService');

let cachedTransport = null;
let cachedTransportKey = null;
const PLAN_LIMITS = {
  starter: { conversations: 1000, messages: 10000 },
  growth: { conversations: 5000, messages: 50000 },
  pro: { conversations: 20000, messages: 200000 },
  enterprise: { conversations: 100000, messages: 1000000 },
};

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function buildTransportKey(config) {
  return [
    config.transport,
    config.smtpHost,
    config.smtpPort,
    config.smtpUsername,
    config.fromEmail,
    config.apiUrl,
    config.apiToken ? 'api-token-set' : 'api-token-missing',
  ].join(':');
}

function resolveEmailConfig() {
  const config = buildEmailConfig();
  if (config.transport === 'auto') {
    config.transport = config.apiToken ? 'api' : 'smtp';
  }
  return validateProviderConfig(config);
}

function getSmtpTransport(config) {
  const transportKey = buildTransportKey(config);
  if (cachedTransport && cachedTransportKey === transportKey) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    },
  });
  cachedTransportKey = transportKey;
  return cachedTransport;
}

async function sendViaSmtp(config, payload, recipient) {
  const transport = getSmtpTransport(config);
  const info = await transport.sendMail({
    from: { address: config.fromEmail, name: config.fromName },
    to: { address: recipient.address, name: recipient.name || undefined },
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo ? { address: payload.replyTo.address, name: payload.replyTo.name || undefined } : undefined,
    headers: payload.headers || undefined,
  });

  return {
    provider: 'zepto',
    providerMessageId: info.messageId || info.response || null,
    raw: info,
  };
}

async function sendViaApi(config, payload, recipient) {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-enczapikey ${config.apiToken}`,
    },
    body: JSON.stringify({
      from: { address: config.fromEmail, name: config.fromName },
      to: [{ email_address: { address: recipient.address, name: recipient.name || recipient.address } }],
      subject: payload.subject,
      htmlbody: payload.html,
      textbody: payload.text,
      reply_to: payload.replyTo ? [{ address: payload.replyTo.address, name: payload.replyTo.name || '' }] : undefined,
      track_opens: config.trackOpens,
      track_clicks: config.trackClicks,
      client_reference: payload.clientReference || undefined,
      mime_headers: payload.headers || undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `Email provider returned HTTP ${response.status}`);
    error.code = response.status >= 500 ? 'PROVIDER_5XX' : 'EPROVIDER';
    throw error;
  }

  return {
    provider: 'zepto',
    providerMessageId: data?.request_id || data?.message_id || null,
    raw: data,
  };
}

async function sendThroughProvider(config, payload, recipient) {
  return config.transport === 'api'
    ? sendViaApi(config, payload, recipient)
    : sendViaSmtp(config, payload, recipient);
}

function buildBaseVariables(overrides = {}, config = resolveEmailConfig()) {
  return {
    locale: 'en',
    website_url: config.websiteUrl,
    support_email: config.supportEmail,
    privacy_url: config.privacyUrl,
    terms_url: config.termsUrl,
    setup_link: `${config.frontendUrl}/dashboard/onboarding`,
    dashboard_link: `${config.frontendUrl}/dashboard`,
    billing_link: `${config.frontendUrl}/dashboard/billing`,
    security_link: `${config.frontendUrl}/login`,
    ...overrides,
  };
}

function buildActionLink(pathname, token, config = resolveEmailConfig()) {
  const url = new URL(pathname, config.frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

async function sendEmail(input = {}) {
  const validated = validateSendEmailInput(input);
  const config = resolveEmailConfig();

  if (config.disabled) {
    console.warn(
      '[Email] SKIPPED — SMTP not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in Railway.\n' +
      '  Template: ' + validated.template + '\n' +
      '  To: ' + JSON.stringify(validated.to) + '\n' +
      '  Variables: ' + JSON.stringify(validated.variables || {})
    );
    return { skipped: true, reason: 'smtp_not_configured' };
  }
  const recipients = normalizeRecipients(validated.to);
  const variables = buildBaseVariables(validated.variables, config);
  const templateRenderer = validated.template ? getEmailTemplate(validated.template) : null;
  const rendered = templateRenderer
    ? renderEmailLayout(templateRenderer(variables), {
        locale: validated.locale,
        brandName: config.fromName || 'ChatorAI',
        supportEmail: config.supportEmail,
      })
    : {
        subject: normalizeSubject(validated.subject),
        html: String(input.html || '').trim(),
        text: String(input.text || '').trim(),
      };

  if (!rendered.subject || (!rendered.html && !rendered.text)) {
    const err = new Error('Rendered email content is incomplete');
    err.code = 'EMAIL_RENDER_FAILED';
    err.status = 500;
    throw err;
  }

  const results = [];
  for (const recipient of recipients) {
      const logEntry = await emailLogger.logQueuedEmail({
      tenantId: validated.tenantId,
      userId: validated.userId,
      recipient: recipient.address,
      templateName: validated.template || 'custom',
      subject: rendered.subject,
      status: 'queued',
      provider: config.provider,
      metadata: {
        ...validated.metadata,
        locale: validated.locale,
        subject: rendered.subject,
        variables,
        html: validated.template ? undefined : rendered.html,
        text: validated.template ? undefined : rendered.text,
      },
      });

      try {
      const delivery = await deliverWithRetry({
        maxAttempts: 3,
        attempt: async (attemptNumber) => sendThroughProvider(config, {
          ...rendered,
          replyTo: input.replyTo || null,
          headers: {
            'X-ChatorAI-Template': validated.template || 'custom',
            'X-ChatorAI-Email-Log-Id': logEntry.id,
            'X-ChatorAI-Attempt': String(attemptNumber),
          },
          clientReference: logEntry.id,
        }, recipient),
        onAttemptFailure: async (error, attemptNumber) => {
          await emailLogger.updateEmailLogStatus(logEntry.id, {
            status: attemptNumber >= 3 ? 'failed' : 'queued',
            errorMessage: error.message,
            metadata: {
              ...validated.metadata,
              attempt: attemptNumber,
            },
          });
        },
      });

        await emailLogger.logSentEmail(logEntry.id, delivery, {
          ...(logEntry.metadata || {}),
          ...validated.metadata,
          locale: validated.locale,
        });
        results.push({
        logId: logEntry.id,
        recipient: recipient.address,
        providerMessageId: delivery.providerMessageId,
        status: 'sent',
      });
      } catch (error) {
        await emailLogger.logFailedEmail(logEntry.id, error, {
          ...(logEntry.metadata || {}),
          ...validated.metadata,
          locale: validated.locale,
        });
        throw error;
      }
  }

  return {
    provider: config.provider,
    template: validated.template || 'custom',
    results,
  };
}

async function issueEmailToken({
  tenantId = null,
  userId,
  email,
  tokenType,
  ttlMinutes = 60,
  metadata = {},
}) {
  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await invalidateEmailTokens({ userId, email, tokenType });

  const stored = await createEmailToken({
    tenantId,
    userId,
    email,
    tokenType,
    tokenHash: hashToken(rawToken),
    expiresAt,
    metadata,
  });

  return {
    token: rawToken,
    record: stored,
    expiresAt,
  };
}

async function consumeEmailActionToken(tokenType, rawToken) {
  const token = await getActiveEmailToken(tokenType, hashToken(rawToken));
  if (!token) {
    const err = new Error('Token is invalid or expired');
    err.code = 'TOKEN_INVALID';
    err.status = 400;
    throw err;
  }

  await consumeEmailToken(token.id);
  await invalidateEmailTokens({
    userId: token.user_id,
    email: token.email,
    tokenType,
    keepTokenId: token.id,
  });
  return token;
}

async function getTenantById(tenantId) {
  const result = await queryAdmin(
    `SELECT id, name, email, plan, status, billing_email, stripe_customer_id, stripe_subscription_id, subscription_status, settings, trial_started_at, trial_ends_at
     FROM tenants
     WHERE id = $1
     LIMIT 1`,
    [tenantId],
  );
  return result.rows[0] || null;
}

async function listTenantAdminRecipients(tenantId) {
  const result = await queryAdmin(
    `SELECT id, name, email
     FROM users
     WHERE tenant_id = $1
       AND role IN ('owner', 'admin')
     ORDER BY created_at ASC`,
    [tenantId],
  );

  return result.rows
    .filter((row) => row.email)
    .map((row) => ({ id: row.id, name: row.name || '', email: row.email }));
}

async function sendVerificationEmail({ user, tenant, locale = 'en' }) {
  const issued = await issueEmailToken({
    tenantId: tenant.id,
    userId: user.id,
    email: user.email,
    tokenType: 'email_verification',
    ttlMinutes: 24 * 60,
    metadata: { reason: 'verification' },
  });

  return sendEmail({
    template: 'email_verification',
    to: user.email,
    tenantId: tenant.id,
    userId: user.id,
    locale,
    variables: {
      user_name: user.name || user.email,
      workspace_name: tenant.name,
      verification_link: buildActionLink('/verify-email', issued.token),
    },
    metadata: { tokenType: 'email_verification' },
  });
}

async function sendWelcomeEmail({ user, tenant, locale = 'en' }) {
  return sendEmail({
    template: 'welcome_email',
    to: user.email,
    tenantId: tenant.id,
    userId: user.id,
    locale,
    variables: {
      user_name: user.name || user.email,
      workspace_name: tenant.name,
    },
    metadata: { reason: 'welcome' },
  });
}

async function sendTrialStartedEmail({ user, tenant, locale = 'en' }) {
  return sendEmail({
    template: 'trial_started',
    to: user.email,
    tenantId: tenant.id,
    userId: user.id,
    locale,
    variables: {
      user_name: user.name || user.email,
      workspace_name: tenant.name,
      trial_end_date: tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toISOString().slice(0, 10) : 'soon',
    },
    metadata: { reason: 'trial_started' },
  });
}

async function sendPasswordResetEmail({ user, tenant, locale = 'en', ip = '', userAgent = '' }) {
  const issued = await issueEmailToken({
    tenantId: tenant.id,
    userId: user.id,
    email: user.email,
    tokenType: 'password_reset',
    ttlMinutes: 60,
    metadata: { ip, userAgent },
  });

  await logAuditEvent({
    tenantId: tenant.id,
    actorType: 'user',
    actorId: user.id,
    action: 'auth.password_reset.requested',
    entityType: 'user',
    entityId: user.id,
    metadata: { ip, userAgent },
  }).catch(() => {});

  return sendEmail({
    template: 'password_reset',
    to: user.email,
    tenantId: tenant.id,
    userId: user.id,
    locale,
    variables: {
      user_name: user.name || user.email,
      workspace_name: tenant.name,
      expiry_minutes: 60,
      reset_link: buildActionLink('/reset-password', issued.token),
    },
    metadata: { tokenType: 'password_reset' },
  });
}

async function sendPasswordChangedAlert({ user, tenant, locale = 'en' }) {
  return sendEmail({
    template: 'password_changed_alert',
    to: user.email,
    tenantId: tenant.id,
    userId: user.id,
    locale,
    variables: {
      user_name: user.name || user.email,
      workspace_name: tenant.name,
    },
    metadata: { reason: 'password_changed' },
  });
}

async function sendTeamInvitationEmail({
  invitedUser,
  tenant,
  inviter,
  locale = 'en',
}) {
  const issued = await issueEmailToken({
    tenantId: tenant.id,
    userId: invitedUser.id,
    email: invitedUser.email,
    tokenType: 'team_invite',
    ttlMinutes: 7 * 24 * 60,
    metadata: { invitedBy: inviter.id, role: invitedUser.role },
  });

  return sendEmail({
    template: 'team_invitation',
    to: invitedUser.email,
    tenantId: tenant.id,
    userId: invitedUser.id,
    locale,
    variables: {
      inviter_name: inviter.name || inviter.email,
      workspace_name: tenant.name,
      role_name: invitedUser.role,
      invite_expiry: issued.expiresAt.toISOString().slice(0, 10),
      invite_link: buildActionLink('/accept-invite', issued.token),
    },
    metadata: { tokenType: 'team_invite' },
  });
}

function getSalesNotificationRecipients() {
  const DEFAULT_RECIPIENT = 'ymohamed@sinaitaxi.com';
  const fromEnv = String(
    process.env.SALES_NOTIFICATION_EMAILS
      || process.env.DEMO_NOTIFICATION_EMAILS
      || '',
  )
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const all = [...new Set([DEFAULT_RECIPIENT, ...fromEnv])];
  return all;
}

async function sendBookDemoEmails({
  fullName,
  email,
  company,
  phone = '',
  teamSize = 'small',
  preferredDate = null,
  locale = 'en',
  comments = '',
  metadata = {},
}) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://chatorai.com').replace(/\/$/, '');

  const request = await createDemoRequest({
    fullName,
    email,
    company,
    phone,
    teamSize,
    preferredDate,
    locale,
    comments,
    metadata,
  });

  // Always log submission so it's visible in Railway logs even if email fails
  console.log(
    '[DemoRequest] New submission saved — ID:', request.id, '\n' +
    '  Name:', fullName, '| Email:', email, '| Company:', company, '\n' +
    '  Phone:', phone || 'N/A', '| Size:', teamSize, '\n' +
    '  Comments:', comments || 'None' + '\n' +
    '  Notifying:', getSalesNotificationRecipients().join(', ')
  );

  const demoDetailsLink = `${frontendUrl}/demo?request=${request.id}`;
  const adminDemoLink = `${frontendUrl}/admin?demo=${request.id}`;

  // Customer confirmation — fire and forget (bad customer email shouldn't block)
  sendEmail({
    template: 'demo_submission_confirmation',
    to: email,
    locale,
    variables: {
      user_name: fullName,
      company_name: company,
      demo_details_link: demoDetailsLink,
    },
    metadata: { demoRequestId: request.id, audience: 'customer' },
  }).catch((err) => console.error('[DemoEmail] customer confirmation failed:', err.message));

  // Internal notification — awaited so SMTP errors surface in Railway logs
  try {
    await sendEmail({
      template: 'demo_internal_notification',
      to: getSalesNotificationRecipients(),
      locale: 'en',
      variables: {
        user_name: fullName,
        user_email: email,
        company_name: company,
        team_size: teamSize,
        phone_display: phone || 'Not provided',
        comments_display: comments || 'No comments provided',
        admin_demo_link: adminDemoLink,
      },
      metadata: { demoRequestId: request.id, audience: 'internal' },
    });
    console.log('[DemoEmail] internal notification sent to:', getSalesNotificationRecipients().join(', '));
  } catch (err) {
    console.error('[DemoEmail] internal notification FAILED:', err.message, '— check SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in Railway');
  }

  return request;
}

async function sendChannelConnectedEmail({ tenantId, channel, locale = 'en' }) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;

  const admins = await listTenantAdminRecipients(tenantId);
  if (!admins.length) return null;

  const templateMap = {
    whatsapp: 'whatsapp_connected',
    instagram: 'instagram_connected',
    messenger: 'messenger_connected',
  };
  const template = templateMap[String(channel || '').trim().toLowerCase()];
  if (!template) return null;

  return sendEmail({
    template,
    to: admins.map((admin) => admin.email),
    tenantId,
    locale,
    variables: { workspace_name: tenant.name },
    metadata: { channel },
  });
}

async function sendHumanTakeoverAlert({
  tenantId,
  customerName,
  handoffReason,
  conversationLink,
}) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const admins = await listTenantAdminRecipients(tenantId);
  if (!admins.length) return null;

  return sendEmail({
    template: 'human_takeover_required',
    to: admins.map((admin) => admin.email),
    tenantId,
    variables: {
      workspace_name: tenant.name,
      customer_name: customerName || 'Unknown customer',
      handoff_reason: handoffReason || 'No reason provided',
      conversation_link: sanitizeUrl(conversationLink),
    },
    metadata: { alert: 'handoff_required' },
  });
}

async function sendFailedTriggerAlert({
  tenantId,
  triggerName,
  errorSummary,
}) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const admins = await listTenantAdminRecipients(tenantId);
  if (!admins.length) return null;

  return sendEmail({
    template: 'failed_trigger_alert',
    to: admins.map((admin) => admin.email),
    tenantId,
    variables: {
      workspace_name: tenant.name,
      trigger_name: triggerName || 'Unknown trigger',
      error_summary: errorSummary || 'Unexpected failure',
    },
    metadata: { alert: 'trigger_failed' },
  });
}

async function sendRevenueAlert({
  tenantId,
  template,
  customerName,
  leadScore,
  channelName,
  estimatedValue,
  currency,
  conversationLink,
}) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const admins = await listTenantAdminRecipients(tenantId);
  if (!admins.length) return null;

  return sendEmail({
    template,
    to: admins.map((admin) => admin.email),
    tenantId,
    variables: {
      workspace_name: tenant.name,
      customer_name: customerName || 'Unknown customer',
      lead_score: leadScore ?? '',
      channel_name: channelName || 'Unknown',
      estimated_value: estimatedValue ?? '',
      currency: currency || 'USD',
      conversation_link: sanitizeUrl(conversationLink),
    },
    metadata: { alert: template },
  });
}

async function updateTenantBillingState(tenantId, updates = {}) {
  const summary = await updateTenantBillingProfile(tenantId, {
    plan: updates.plan,
    status: updates.status,
    billingEmail: updates.billingEmail,
    stripeCustomerId: updates.stripeCustomerId,
    stripeSubscriptionId: updates.stripeSubscriptionId,
    subscriptionStatus: updates.subscriptionStatus,
    billing: updates.billing,
    paymentMethodStatus: updates.paymentMethodStatus,
    invoiceStatus: updates.invoiceStatus,
    failedPaymentCount: updates.failedPaymentCount,
    lastPaymentAt: updates.lastPaymentAt,
    lastInvoiceAt: updates.lastInvoiceAt,
    cancelledAt: updates.cancelledAt,
  });
  return summary ? getTenantById(tenantId) : null;
}

async function updateTenantSettings(tenantId, mutate, status = null) {
  const current = await getTenantById(tenantId);
  if (!current) return null;

  const nextSettings = typeof mutate === 'function'
    ? mutate({ ...(current.settings || {}) })
    : { ...(current.settings || {}), ...(mutate || {}) };

  const result = await queryAdmin(
    `UPDATE tenants
     SET settings = $2,
         status = COALESCE($3, status)
     WHERE id = $1
     RETURNING id, name, email, plan, status, billing_email, stripe_customer_id, stripe_subscription_id, subscription_status, settings, trial_started_at, trial_ends_at`,
    [tenantId, JSON.stringify(nextSettings), status],
  );

  return result.rows[0] || null;
}

async function findBillingTenant({ email = '', stripeCustomerId = '', stripeSubscriptionId = '' }) {
  const params = [];
  const filters = [];

  if (stripeSubscriptionId) {
    params.push(stripeSubscriptionId);
    filters.push(`stripe_subscription_id = $${params.length}`);
  }

  if (stripeCustomerId) {
    params.push(stripeCustomerId);
    filters.push(`stripe_customer_id = $${params.length}`);
  }

  if (email) {
    params.push(String(email).trim().toLowerCase());
    filters.push(`LOWER(COALESCE(billing_email, email)) = $${params.length}`);
  }

  if (!filters.length) return null;

  const result = await queryAdmin(
    `SELECT id, name, email, plan, status, billing_email, stripe_customer_id, stripe_subscription_id, subscription_status, settings, trial_started_at, trial_ends_at
     FROM tenants
     WHERE ${filters.join(' OR ')}
     ORDER BY created_at ASC
     LIMIT 1`,
    params,
  );

  return result.rows[0] || null;
}

async function sendBillingEmail(template, tenant, variables = {}) {
  const recipient = tenant.billing_email || tenant.email;
  if (!recipient) return null;

  return sendEmail({
    template,
    to: recipient,
    tenantId: tenant.id,
    variables: {
      workspace_name: tenant.name,
      ...variables,
    },
    metadata: { billingTemplate: template },
  });
}

async function sendWebhookFailureAlert({ tenantId, webhookSource, errorSummary }) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const admins = await listTenantAdminRecipients(tenantId);
  if (!admins.length) return null;

  return sendEmail({
    template: 'webhook_failure_alert',
    to: admins.map((admin) => admin.email),
    tenantId,
    variables: {
      workspace_name: tenant.name,
      webhook_source: webhookSource || 'unknown',
      error_summary: errorSummary || 'Unknown webhook failure',
    },
    metadata: { alert: 'webhook_failure' },
  });
}

async function sendTokenExpiredAlert({ tenantId, channelName }) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const admins = await listTenantAdminRecipients(tenantId);
  if (!admins.length) return null;

  return sendEmail({
    template: 'token_expired_alert',
    to: admins.map((admin) => admin.email),
    tenantId,
    variables: {
      workspace_name: tenant.name,
      channel_name: channelName,
    },
    metadata: { alert: 'token_expired', channel: channelName },
  });
}

async function sendLifecycleEmail({
  tenant,
  template,
  variables = {},
  markerKey,
}) {
  const admins = await listTenantAdminRecipients(tenant.id);
  const recipients = admins.length ? admins.map((admin) => admin.email) : [tenant.billing_email || tenant.email].filter(Boolean);
  if (!recipients.length) return null;

  await sendEmail({
    template,
    to: recipients,
    tenantId: tenant.id,
    variables: {
      workspace_name: tenant.name,
      ...variables,
    },
    metadata: { lifecycleMarker: markerKey },
  });

  return updateTenantSettings(tenant.id, (settings) => ({
    ...settings,
    emailAutomation: {
      ...(settings.emailAutomation || {}),
      [markerKey]: new Date().toISOString(),
    },
  }));
}

async function runLifecycleEmailSweep() {
  const tenants = await queryAdmin(
    `SELECT
       t.id,
       t.name,
       t.email,
       t.billing_email,
       t.plan,
       t.status,
       t.settings,
       t.subscription_status,
       t.trial_started_at,
       t.trial_ends_at,
       COALESCE(s.last_activity_at, t.created_at) AS last_activity_at,
       COALESCE(s.channels_count, 0) AS channels_count,
       COALESCE(s.messages_count, 0) AS messages_count,
       COALESCE(s.conversations_count, 0) AS conversations_count
     FROM tenants t
     LEFT JOIN tenant_stats s ON s.tenant_id = t.id
     WHERE COALESCE(t.subscription_status, 'trialing') IN ('trialing', 'payment_due', 'active', 'overdue', 'suspended', 'cancelled')`,
  ).then((result) => result.rows);

  const now = Date.now();

  for (const tenant of tenants) {
    const settings = tenant.settings || {};
    const markers = settings.emailAutomation || {};
    const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() : null;
    const lastActivityAt = tenant.last_activity_at ? new Date(tenant.last_activity_at).getTime() : null;
    const createdAt = tenant.trial_started_at ? new Date(tenant.trial_started_at).getTime() : now;
    const ageMs = now - createdAt;

    if (
      tenant.subscription_status === 'trialing'
      && ageMs >= 3 * 24 * 60 * 60 * 1000
      && !markers.trialValueReminder
    ) {
      await sendLifecycleEmail({
        tenant,
        template: 'feature_adoption_reminder',
        markerKey: 'trialValueReminder',
        variables: {
          feature_name: 'Your live AI workspace',
          dashboard_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
        },
      }).catch((err) => logger.warn('Trial value reminder failed', { tenantId: tenant.id, error: err.message }));
    }

    if (
      tenant.subscription_status === 'trialing'
      && trialEndsAt
      && trialEndsAt > now
      && trialEndsAt - now <= 24 * 60 * 60 * 1000
      && !markers.trialEndingToday
    ) {
      await sendLifecycleEmail({
        tenant,
        template: 'trial_ending_soon',
        markerKey: 'trialEndingToday',
        variables: {
          trial_end_date: new Date(trialEndsAt).toISOString().slice(0, 10),
          upgrade_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
        },
      }).catch((err) => logger.warn('Trial ending today email failed', { tenantId: tenant.id, error: err.message }));
    }

    if (
      tenant.subscription_status === 'trialing'
      && trialEndsAt
      && trialEndsAt > now
      && trialEndsAt - now <= 2 * 24 * 60 * 60 * 1000
      && trialEndsAt - now > 24 * 60 * 60 * 1000
      && !markers.trialPaymentWarning
    ) {
      await sendLifecycleEmail({
        tenant,
        template: 'trial_ending_soon',
        markerKey: 'trialPaymentWarning',
        variables: {
          trial_end_date: new Date(trialEndsAt).toISOString().slice(0, 10),
          upgrade_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
        },
      }).catch((err) => logger.warn('Trial payment warning failed', { tenantId: tenant.id, error: err.message }));
    }

    if (
      tenant.subscription_status === 'trialing'
      && trialEndsAt
      && trialEndsAt <= now
      && !markers.trialExpired
    ) {
      await sendLifecycleEmail({
        tenant,
        template: 'trial_expired',
        markerKey: 'trialExpired',
        variables: {
          upgrade_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
        },
      }).catch((err) => logger.warn('Trial expired email failed', { tenantId: tenant.id, error: err.message }));
      await updateTenantBillingProfile(tenant.id, {
        subscriptionStatus: 'payment_due',
        invoiceStatus: 'payment_required',
      }).catch(() => {});
    }

    if (ageMs >= 24 * 60 * 60 * 1000 && Number(tenant.channels_count || 0) === 0 && !markers.connectFirstChannel) {
      await sendLifecycleEmail({
        tenant,
        template: 'connect_first_channel_reminder',
        markerKey: 'connectFirstChannel',
        variables: {
          dashboard_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
        },
      }).catch((err) => logger.warn('Channel reminder email failed', { tenantId: tenant.id, error: err.message }));
    }

    if (lastActivityAt && now - lastActivityAt >= 7 * 24 * 60 * 60 * 1000 && !markers.noActivity) {
      await sendLifecycleEmail({
        tenant,
        template: 'no_activity_reminder',
        markerKey: 'noActivity',
        variables: {
          dashboard_link: `${resolveEmailConfig().frontendUrl}/dashboard`,
        },
      }).catch((err) => logger.warn('No activity email failed', { tenantId: tenant.id, error: err.message }));
    }

    if (lastActivityAt && now - lastActivityAt >= 14 * 24 * 60 * 60 * 1000 && !markers.reEngagement) {
      await sendLifecycleEmail({
        tenant,
        template: 're_engagement_email',
        markerKey: 'reEngagement',
        variables: {
          dashboard_link: `${resolveEmailConfig().frontendUrl}/dashboard`,
        },
      }).catch((err) => logger.warn('Re-engagement email failed', { tenantId: tenant.id, error: err.message }));
    }

    const planLimits = PLAN_LIMITS[String(tenant.plan || 'growth').toLowerCase()] || PLAN_LIMITS.growth;
    const usagePairs = [
      ['Conversations', Number(tenant.conversations_count || 0), Number(planLimits.conversations || 0)],
      ['Messages', Number(tenant.messages_count || 0), Number(planLimits.messages || 0)],
    ];

    for (const [metricName, used, limit] of usagePairs) {
      if (!limit || used / limit < 0.8) continue;
      const usageKey = `usageWarning:${metricName.toLowerCase()}`;
      if (markers[usageKey]) continue;

      await sendLifecycleEmail({
        tenant,
        template: 'usage_limit_warning',
        markerKey: usageKey,
        variables: {
          metric_name: metricName,
          percent_used: Math.round((used / limit) * 100),
          plan_name: tenant.plan,
          billing_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
        },
      }).catch((err) => logger.warn('Usage warning email failed', { tenantId: tenant.id, error: err.message }));
    }

    const hasScheduledReports = Array.isArray(settings.schedReports) && settings.schedReports.some((entry) => entry?.active !== false);
    if (Number(tenant.channels_count || 0) > 0 && !hasScheduledReports && !markers.featureAdoptionReports) {
      await sendLifecycleEmail({
        tenant,
        template: 'feature_adoption_reminder',
        markerKey: 'featureAdoptionReports',
        variables: {
          feature_name: 'Scheduled reports',
          dashboard_link: `${resolveEmailConfig().frontendUrl}/dashboard/reports`,
        },
      }).catch((err) => logger.warn('Feature adoption email failed', { tenantId: tenant.id, error: err.message }));
    }
  }

  const expiredTokens = await queryAdmin(
    `SELECT tenant_id, channel, credentials
     FROM channel_connections
     WHERE status = 'active'
       AND COALESCE(credentials->>'token_expires_at', '') <> ''
       AND (credentials->>'token_expires_at')::timestamptz <= NOW()`,
  ).then((result) => result.rows).catch(() => []);

  for (const connection of expiredTokens) {
    const tenant = await getTenantById(connection.tenant_id);
    const markerKey = `tokenExpired:${connection.channel}`;
    if (!tenant || tenant.settings?.emailAutomation?.[markerKey]) continue;

    await sendTokenExpiredAlert({
      tenantId: connection.tenant_id,
      channelName: connection.channel,
    }).catch((err) => logger.warn('Token expired email failed', { tenantId: connection.tenant_id, error: err.message }));

    await updateTenantSettings(connection.tenant_id, (settings) => ({
      ...settings,
      emailAutomation: {
        ...(settings.emailAutomation || {}),
        [markerKey]: new Date().toISOString(),
      },
    })).catch(() => {});
  }
}

async function handleStripeEmailEvent(event) {
  const type = event?.type;
  if (!type) return null;

  if (type === 'checkout.session.completed') {
    const session = event.data.object;
    const tenant = await findBillingTenant({
      email: session.customer_email,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
    });
    if (!tenant) return null;

    const updated = await updateTenantBillingState(tenant.id, {
      plan: session.metadata?.plan || tenant.plan,
      status: 'active',
      billingEmail: session.customer_email || tenant.billing_email || tenant.email,
      stripeCustomerId: session.customer || null,
      stripeSubscriptionId: session.subscription || null,
      subscriptionStatus: 'active',
      billing: {
        lastCheckoutSessionId: session.id,
      },
    });
    await recordBillingEvent({
      tenantId: tenant.id,
      actorType: 'system',
      eventType: 'trial_converted',
      status: 'paid',
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: String(session.currency || 'EUR').toUpperCase(),
      metadata: { checkout_session_id: session.id },
    }).catch(() => {});

    await sendBillingEmail('payment_success', updated, {
      plan_name: updated.plan,
      billing_amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : '',
      billing_currency: String(session.currency || 'EUR').toUpperCase(),
      invoice_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
    });
    return updated;
  }

  if (type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const tenant = await findBillingTenant({
      email: invoice.customer_email,
      stripeCustomerId: invoice.customer,
      stripeSubscriptionId: invoice.subscription,
    });
    if (!tenant) return null;

    const updated = await updateTenantBillingState(tenant.id, {
      billingEmail: invoice.customer_email || tenant.billing_email || tenant.email,
      stripeCustomerId: invoice.customer || null,
      stripeSubscriptionId: invoice.subscription || null,
      subscriptionStatus: 'active',
      failedPaymentCount: 0,
      paymentMethodStatus: 'ready',
      invoiceStatus: 'paid',
      lastPaymentAt: new Date().toISOString(),
      lastInvoiceAt: new Date().toISOString(),
      billing: {
        lastInvoiceId: invoice.id,
      },
    });
    await recordBillingEvent({
      tenantId: tenant.id,
      actorType: 'system',
      eventType: 'payment_succeeded',
      status: 'paid',
      amount: invoice.amount_paid ? invoice.amount_paid / 100 : null,
      currency: String(invoice.currency || 'EUR').toUpperCase(),
      metadata: { invoice_id: invoice.id, invoice_number: invoice.number || null },
    }).catch(() => {});

    await sendBillingEmail('payment_success', updated, {
      plan_name: updated.plan,
      billing_amount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : '',
      billing_currency: String(invoice.currency || 'EUR').toUpperCase(),
      invoice_link: invoice.hosted_invoice_url || `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
    });
    await sendBillingEmail('invoice_receipt', updated, {
      billing_amount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : '',
      billing_currency: String(invoice.currency || 'EUR').toUpperCase(),
      invoice_number: invoice.number || invoice.id,
      invoice_link: invoice.hosted_invoice_url || `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
    });
    return updated;
  }

  if (type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const tenant = await findBillingTenant({
      email: invoice.customer_email,
      stripeCustomerId: invoice.customer,
      stripeSubscriptionId: invoice.subscription,
    });
    if (!tenant) return null;

    const updated = await updateTenantBillingState(tenant.id, {
      billingEmail: invoice.customer_email || tenant.billing_email || tenant.email,
      stripeCustomerId: invoice.customer || null,
      stripeSubscriptionId: invoice.subscription || null,
      subscriptionStatus: 'overdue',
      failedPaymentCount: Number(tenant.failed_payment_count || 0) + 1,
      paymentMethodStatus: 'requires_action',
      invoiceStatus: 'failed',
      lastInvoiceAt: new Date().toISOString(),
    });
    await recordBillingEvent({
      tenantId: tenant.id,
      actorType: 'system',
      eventType: 'payment_failed',
      status: 'failed',
      amount: invoice.amount_due ? invoice.amount_due / 100 : null,
      currency: String(invoice.currency || 'EUR').toUpperCase(),
      metadata: { invoice_id: invoice.id },
    }).catch(() => {});

    await sendBillingEmail('payment_failed', updated, {
      billing_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
    });
    return updated;
  }

  if (type === 'invoice.upcoming') {
    const invoice = event.data.object;
    const tenant = await findBillingTenant({
      email: invoice.customer_email,
      stripeCustomerId: invoice.customer,
      stripeSubscriptionId: invoice.subscription,
    });
    if (!tenant) return null;

    await sendBillingEmail('subscription_renewal_notice', tenant, {
      renewal_date: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString().slice(0, 10)
        : 'soon',
      billing_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
    });
    return tenant;
  }

  if (type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const tenant = await findBillingTenant({
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
    });
    if (!tenant) return null;

    const updated = await updateTenantBillingState(tenant.id, {
      stripeCustomerId: subscription.customer || null,
      stripeSubscriptionId: subscription.id || null,
      subscriptionStatus: 'cancelled',
      status: 'cancelled',
    });
    await sendBillingEmail('cancellation_confirmation', updated, {
      billing_link: `${resolveEmailConfig().frontendUrl}/dashboard/billing`,
    });
    return updated;
  }

  return null;
}

async function sendAdminProvisionedEmail({ user, tenant, locale = 'en' }) {
  const issued = await issueEmailToken({
    tenantId: tenant.id,
    userId: user.id,
    email: user.email,
    tokenType: 'password_reset',
    ttlMinutes: 7 * 24 * 60, // 7 days
    metadata: { reason: 'admin_provisioned' },
  });

  return sendEmail({
    template: 'admin_provisioned',
    to: user.email,
    tenantId: tenant.id,
    userId: user.id,
    locale,
    variables: {
      user_name: user.name || user.email,
      workspace_name: tenant.name,
      set_password_link: buildActionLink('/set-password', issued.token),
      expiry_days: 7,
    },
    metadata: { tokenType: 'password_reset', reason: 'admin_provisioned' },
  });
}

module.exports = {
  buildActionLink,
  consumeEmailActionToken,
  sendAdminProvisionedEmail,
  getEmailConfig: resolveEmailConfig,
  getEmailTemplate,
  getTenantById,
  handleStripeEmailEvent,
  issueEmailToken,
  listEmailTemplates,
  listTenantAdminRecipients,
  runLifecycleEmailSweep,
  sendBookDemoEmails,
  sendChannelConnectedEmail,
  sendEmail,
  sendFailedTriggerAlert,
  sendHumanTakeoverAlert,
  sendPasswordChangedAlert,
  sendPasswordResetEmail,
  sendRevenueAlert,
  sendTeamInvitationEmail,
  sendTokenExpiredAlert,
  sendTrialStartedEmail,
  sendVerificationEmail,
  sendWebhookFailureAlert,
  sendWelcomeEmail,
};
