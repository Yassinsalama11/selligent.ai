const test = require('node:test');
const assert = require('node:assert/strict');

function loadEmailServiceHarness({ sendMailImpl } = {}) {
  const emailLogs = [];
  const emailTokens = [];
  const demoRequests = [];
  const tenants = new Map([
    ['tenant-1', {
      id: 'tenant-1',
      name: 'Acme',
      email: 'owner@acme.com',
      billing_email: 'billing@acme.com',
      plan: 'starter',
      status: 'trial',
      subscription_status: 'inactive',
      trial_started_at: new Date('2026-04-20T00:00:00Z').toISOString(),
      trial_ends_at: new Date('2026-04-27T00:00:00Z').toISOString(),
      settings: {},
    }],
  ]);
  const users = [
    { id: 'user-1', tenant_id: 'tenant-1', name: 'Owner', email: 'owner@acme.com', role: 'owner' },
    { id: 'admin-1', tenant_id: 'tenant-1', name: 'Admin', email: 'admin@acme.com', role: 'admin' },
  ];

  const moduleExports = {};
  const sendMail = sendMailImpl || (async (payload) => ({ messageId: `msg_${payload.to.address}` }));

  const queryAdmin = async (sql, params = []) => {
    const text = String(sql).replace(/\s+/g, ' ').trim();

    if (text.includes('SELECT id, name, email, plan, status, billing_email, trial_started_at, trial_ends_at, settings FROM tenants WHERE id = $1')) {
      return { rows: [tenants.get(params[0])].filter(Boolean) };
    }

    if (text.includes('SELECT id, name, email, plan, status, billing_email, stripe_customer_id, stripe_subscription_id, subscription_status, settings, trial_started_at, trial_ends_at FROM tenants WHERE id = $1')) {
      return { rows: [tenants.get(params[0])].filter(Boolean) };
    }

    if (text.includes('SELECT id, name, email FROM users WHERE tenant_id = $1')) {
      return { rows: users.filter((user) => user.tenant_id === params[0] && ['owner', 'admin'].includes(user.role)) };
    }

    if (text.includes('SELECT id, name, email, plan, status, billing_email, stripe_customer_id, stripe_subscription_id, subscription_status, settings, trial_started_at, trial_ends_at FROM tenants WHERE')) {
      const match = [...tenants.values()].find((tenant) => (
        (params.includes(tenant.stripe_subscription_id) && tenant.stripe_subscription_id)
        || (params.includes(tenant.stripe_customer_id) && tenant.stripe_customer_id)
        || params.includes((tenant.billing_email || tenant.email || '').toLowerCase())
      ));
      return { rows: match ? [match] : [] };
    }

    if (text.startsWith('UPDATE tenants SET plan = COALESCE($2, plan),')) {
      const tenant = tenants.get(params[0]);
      if (!tenant) return { rows: [] };
      Object.assign(tenant, {
        plan: params[1] || tenant.plan,
        status: params[2] || tenant.status,
        billing_email: params[3] || tenant.billing_email,
        stripe_customer_id: params[4] || tenant.stripe_customer_id,
        stripe_subscription_id: params[5] || tenant.stripe_subscription_id,
        subscription_status: params[6] || tenant.subscription_status,
        settings: JSON.parse(params[7]),
      });
      return { rows: [tenant] };
    }

    if (text.startsWith('UPDATE tenants SET settings = $2,')) {
      const tenant = tenants.get(params[0]);
      if (!tenant) return { rows: [] };
      tenant.settings = JSON.parse(params[1]);
      tenant.status = params[2] || tenant.status;
      return { rows: [tenant] };
    }

    if (text.includes('FROM channel_connections')) {
      return { rows: [] };
    }

    if (text.includes('FROM tenants t LEFT JOIN tenant_stats')) {
      return { rows: [] };
    }

    throw new Error(`Unhandled query: ${text}`);
  };

  const emailQueryStub = {
    async createEmailLog(entry) {
      const log = {
        id: `log-${emailLogs.length + 1}`,
        tenant_id: entry.tenantId,
        user_id: entry.userId,
        recipient: entry.recipient,
        template_name: entry.templateName,
        subject: entry.subject,
        status: entry.status,
        provider: entry.provider,
        metadata: entry.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      emailLogs.push(log);
      return log;
    },
    async updateEmailLogStatus(id, updates) {
      const log = emailLogs.find((entry) => entry.id === id);
      Object.assign(log, {
        status: updates.status,
        provider_message_id: updates.providerMessageId || log.provider_message_id,
        error_message: updates.errorMessage || log.error_message,
        metadata: updates.metadata !== undefined ? updates.metadata : log.metadata,
        updated_at: new Date().toISOString(),
      });
      return log;
    },
    async getEmailLogById(id) {
      return emailLogs.find((entry) => entry.id === id) || null;
    },
    async getEmailLogStats() {
      return {
        total: emailLogs.length,
        queued: emailLogs.filter((entry) => entry.status === 'queued').length,
        sent: emailLogs.filter((entry) => entry.status === 'sent').length,
        failed: emailLogs.filter((entry) => entry.status === 'failed').length,
        opened: 0,
        clicked: 0,
        template_count: new Set(emailLogs.map((entry) => entry.template_name)).size,
      };
    },
    async listEmailLogs() {
      return [...emailLogs];
    },
    async createEmailToken(entry) {
      const token = {
        id: `tok-${emailTokens.length + 1}`,
        tenant_id: entry.tenantId,
        user_id: entry.userId,
        email: entry.email,
        token_type: entry.tokenType,
        token_hash: entry.tokenHash,
        expires_at: entry.expiresAt,
        consumed_at: null,
        invalidated_at: null,
        metadata: entry.metadata || {},
      };
      emailTokens.push(token);
      return token;
    },
    async invalidateEmailTokens({ userId, email, tokenType, keepTokenId = null }) {
      for (const token of emailTokens) {
        if (token.consumed_at || token.invalidated_at) continue;
        if (userId && token.user_id !== userId) continue;
        if (email && token.email !== email) continue;
        if (tokenType && token.token_type !== tokenType) continue;
        if (keepTokenId && token.id === keepTokenId) continue;
        token.invalidated_at = new Date().toISOString();
      }
      return 1;
    },
    async getActiveEmailToken(tokenType, tokenHash) {
      return emailTokens.find((token) => (
        token.token_type === tokenType
        && token.token_hash === tokenHash
        && !token.consumed_at
        && !token.invalidated_at
      )) || null;
    },
    async consumeEmailToken(id) {
      const token = emailTokens.find((entry) => entry.id === id);
      token.consumed_at = new Date().toISOString();
      return token;
    },
    async createDemoRequest(entry) {
      const request = {
        id: `demo-${demoRequests.length + 1}`,
        ...entry,
      };
      demoRequests.push(request);
      return request;
    },
  };

  const nodemailerKey = require.resolve('nodemailer');
  const mocks = [
    [nodemailerKey, { createTransport: () => ({ sendMail }) }],
    [require.resolve('../src/db/pool'), { queryAdmin, adminWithTransaction: async (fn) => fn({ query: queryAdmin }) }],
    [require.resolve('../src/db/queries/email'), emailQueryStub],
    [require.resolve('../src/db/queries/audit'), { logAuditEvent: async () => ({}) }],
    [require.resolve('../src/core/logger'), { logger: { info() {}, warn() {}, error() {} } }],
  ];

  const target = require.resolve('../src/services/email/emailService');
  const resetModules = [
    target,
    require.resolve('../src/services/email/emailLogger'),
    require.resolve('../src/services/email/emailQueue'),
    require.resolve('../src/services/email/emailTemplates'),
    require.resolve('../src/services/email/templateRenderer'),
    require.resolve('../src/services/email/emailValidators'),
  ];
  const previous = new Map();
  for (const [key, value] of mocks) {
    previous.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports: value };
  }
  for (const key of resetModules) delete require.cache[key];
  moduleExports.emailService = require(target);

  function restore() {
    for (const key of resetModules) delete require.cache[key];
    for (const [key, value] of previous.entries()) {
      if (value) require.cache[key] = value;
      else delete require.cache[key];
    }
  }

  return {
    ...moduleExports,
    emailLogs,
    emailTokens,
    demoRequests,
    tenants,
    restore,
  };
}

test('sendEmail sends and logs a template email', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.ZEPTO_FROM_NAME = 'ChatorAI';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';

  const harness = loadEmailServiceHarness();
  const result = await harness.emailService.sendEmail({
    template: 'welcome_email',
    to: 'owner@acme.com',
    tenantId: 'tenant-1',
    variables: {
      user_name: 'Owner',
      workspace_name: 'Acme',
    },
  });

  assert.equal(result.results[0].status, 'sent');
  assert.equal(harness.emailLogs[0].status, 'sent');
  harness.restore();
});

test('sendEmail surfaces failed delivery after retries', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.ZEPTO_FROM_NAME = 'ChatorAI';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';

  const harness = loadEmailServiceHarness({
    sendMailImpl: async () => {
      const error = new Error('socket failure');
      error.code = 'ECONNRESET';
      throw error;
    },
  });

  await assert.rejects(
    harness.emailService.sendEmail({
      template: 'welcome_email',
      to: 'owner@acme.com',
      tenantId: 'tenant-1',
      variables: { user_name: 'Owner', workspace_name: 'Acme' },
    }),
    /socket failure/,
  );
  assert.equal(harness.emailLogs[0].status, 'failed');
  harness.restore();
});

test('sendEmail rejects invalid email addresses', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';

  const harness = loadEmailServiceHarness();
  await assert.rejects(
    harness.emailService.sendEmail({
      template: 'welcome_email',
      to: 'not-an-email',
      tenantId: 'tenant-1',
      variables: { user_name: 'Owner', workspace_name: 'Acme' },
    }),
    /Invalid email address/,
  );
  harness.restore();
});

test('sendEmail protects against missing SMTP env', async () => {
  delete process.env.ZEPTO_FROM_EMAIL;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USERNAME;
  delete process.env.SMTP_PASSWORD;

  const harness = loadEmailServiceHarness();
  await assert.rejects(
    harness.emailService.sendEmail({
      template: 'welcome_email',
      to: 'owner@acme.com',
      tenantId: 'tenant-1',
      variables: { user_name: 'Owner', workspace_name: 'Acme' },
    }),
    /ZEPTO_FROM_EMAIL is required|SMTP_HOST/,
  );
  harness.restore();
});

test('password reset token is issued and consumed once', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';

  const harness = loadEmailServiceHarness();
  await harness.emailService.sendPasswordResetEmail({
    user: { id: 'user-1', tenant_id: 'tenant-1', email: 'owner@acme.com', name: 'Owner' },
    tenant: harness.tenants.get('tenant-1'),
  });

  assert.equal(harness.emailTokens.length, 1);
  const link = new URL(harness.emailLogs[0].metadata.variables.reset_link);
  const rawToken = link.searchParams.get('token');
  const consumed = await harness.emailService.consumeEmailActionToken('password_reset', rawToken);
  assert.equal(consumed.token_type, 'password_reset');
  await assert.rejects(
    harness.emailService.consumeEmailActionToken('password_reset', rawToken),
    /invalid or expired/i,
  );
  harness.restore();
});

test('team invitation flow generates invitation email', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';

  const harness = loadEmailServiceHarness();
  await harness.emailService.sendTeamInvitationEmail({
    invitedUser: { id: 'user-2', tenant_id: 'tenant-1', email: 'invitee@acme.com', name: 'Invitee', role: 'agent' },
    tenant: harness.tenants.get('tenant-1'),
    inviter: { id: 'user-1', email: 'owner@acme.com', name: 'Owner' },
  });

  assert.equal(harness.emailLogs.at(-1).template_name, 'team_invitation');
  assert.equal(harness.emailTokens.at(-1).token_type, 'team_invite');
  harness.restore();
});

test('demo booking sends customer and internal emails', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';
  process.env.SALES_NOTIFICATION_EMAILS = 'sales@chatorai.com,admin@chatorai.com';

  const harness = loadEmailServiceHarness();
  await harness.emailService.sendBookDemoEmails({
    fullName: 'Demo User',
    email: 'demo@acme.com',
    company: 'Acme',
    teamSize: 'medium',
  });

  assert.equal(harness.demoRequests.length, 1);
  assert.equal(harness.emailLogs.filter((entry) => entry.template_name === 'demo_submission_confirmation').length, 1);
  assert.equal(harness.emailLogs.filter((entry) => entry.template_name === 'demo_internal_notification').length, 2);
  harness.restore();
});

test('checkout completion updates billing state and sends payment email', async () => {
  process.env.ZEPTO_FROM_EMAIL = 'noreply@chatorai.com';
  process.env.SMTP_HOST = 'smtp.zeptomail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USERNAME = 'emailapikey';
  process.env.SMTP_PASSWORD = 'secret';
  process.env.FRONTEND_URL = 'https://chatorai.com';

  const harness = loadEmailServiceHarness();
  const tenant = harness.tenants.get('tenant-1');
  tenant.billing_email = 'billing@acme.com';

  await harness.emailService.handleStripeEmailEvent({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test',
        customer_email: 'billing@acme.com',
        customer: 'cus_123',
        subscription: 'sub_123',
        amount_total: 14900,
        currency: 'eur',
        metadata: { plan: 'pro' },
      },
    },
  });

  assert.equal(harness.tenants.get('tenant-1').plan, 'pro');
  assert.equal(harness.tenants.get('tenant-1').subscription_status, 'active');
  assert.equal(harness.emailLogs.at(-1).template_name, 'payment_success');
  harness.restore();
});
