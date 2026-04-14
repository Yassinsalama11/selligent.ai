function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplateString(template, variables = {}) {
  return String(template || '').replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawKey) => {
    const key = String(rawKey || '').trim();
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key] ?? '');
    }

    const numericKey = Number.parseInt(key, 10);
    if (Number.isInteger(numericKey) && Object.prototype.hasOwnProperty.call(variables, numericKey)) {
      return String(variables[numericKey] ?? '');
    }

    return '';
  });
}

function buildDefaultTemplateBody(template = {}, variables = {}) {
  const heading = template.name || 'Notification';
  const body = template.body
    || template.content
    || `Hello {{operator_name}},\n\nThis is an automated message from {{company_name}} for template "${heading}".\n\nRegards,\nAIROS`;

  const renderedText = renderTemplateString(body, variables);
  const renderedSubject = renderTemplateString(
    template.subject || `${heading} · {{company_name}}`,
    variables,
  );

  return {
    subject: renderedSubject,
    text: renderedText,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin-bottom:12px">${escapeHtml(renderedSubject)}</h2>
        ${renderedText
          .split('\n')
          .filter(Boolean)
          .map((line) => `<p style="margin:0 0 10px">${escapeHtml(line)}</p>`)
          .join('')}
      </div>
    `,
  };
}

async function sendWithResend({ to, subject, html, text, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = from || process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || process.env.MAIL_FROM;

  if (!apiKey || !sender) {
    throw new Error('Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Email provider returned HTTP ${response.status}`);
  }

  return {
    provider: 'resend',
    id: data.id || null,
  };
}

async function sendEmail({ to, subject, html, text, from }) {
  if (!to) throw new Error('Recipient email is required');
  if (!subject) throw new Error('Email subject is required');
  if (!html && !text) throw new Error('Email content is required');

  return sendWithResend({ to, subject, html, text, from });
}

module.exports = {
  buildDefaultTemplateBody,
  renderTemplateString,
  sendEmail,
};
