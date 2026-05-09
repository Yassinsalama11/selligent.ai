const { renderEmailLayout, renderTemplateString } = require('../services/email/templateRenderer');
const { sendEmail: sendTransactionalEmail } = require('../services/email/emailService');

function buildDefaultTemplateBody(template = {}, variables = {}) {
  const heading = template.name || 'Notification';
  const body = template.body
    || template.content
    || `Hello {{operator_name}},\n\nThis is an automated message from {{company_name}}.\n\nRegards,\nChatorAI`;

  const subject = renderTemplateString(
    template.subject || `${heading} · {{company_name}}`,
    variables,
  );

  const sections = renderTemplateString(body, variables)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return renderEmailLayout({
    subject,
    title: subject,
    intro: sections.shift() || '',
    sections,
    supportText: `Need help? Reply to this email or contact ${variables.support_email || process.env.SUPPORT_EMAIL || 'support@chatorai.com'}.`,
    footerNote: 'ChatorAI transactional notification',
  }, {
    locale: variables.locale || 'en',
    brandName: process.env.ZEPTO_FROM_NAME || 'ChatorAI',
    supportEmail: variables.support_email || process.env.SUPPORT_EMAIL || 'support@chatorai.com',
  });
}

async function sendEmail({ to, subject, html, text, tenantId = null, userId = null, metadata = {} }) {
  return sendTransactionalEmail({
    to,
    subject,
    html,
    text,
    tenantId,
    userId,
    metadata,
  });
}

module.exports = {
  buildDefaultTemplateBody,
  renderTemplateString,
  sendEmail,
};
