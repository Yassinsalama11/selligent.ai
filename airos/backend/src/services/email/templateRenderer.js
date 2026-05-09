const { isRtlLocale, normalizeLocale, sanitizeUrl } = require('./emailValidators');

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
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? String(variables[key] ?? '')
      : '';
  });
}

function interpolateValue(value, variables = {}) {
  if (typeof value === 'string') return renderTemplateString(value, variables);
  if (Array.isArray(value)) return value.map((entry) => interpolateValue(entry, variables));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, interpolateValue(entry, variables)]),
    );
  }
  return value;
}

function joinTextSections(sections = []) {
  return sections.filter(Boolean).join('\n\n');
}

function renderFooterLinks(links = [], locale = 'en') {
  const align = isRtlLocale(locale) ? 'right' : 'left';

  return links
    .filter((entry) => entry?.label && entry?.url)
    .map((entry) => (
      `<a href="${escapeHtml(sanitizeUrl(entry.url))}" style="color:#6b7280;text-decoration:none;margin-${align === 'right' ? 'left' : 'right'}:12px;">${escapeHtml(entry.label)}</a>`
    ))
    .join('');
}

function renderParagraphs(sections = []) {
  return sections
    .filter(Boolean)
    .map((line) => (
      `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#111827;">${escapeHtml(line)}</p>`
    ))
    .join('');
}

function renderSecondaryLinks(links = [], locale = 'en') {
  const spacing = isRtlLocale(locale) ? 'margin-left:12px;' : 'margin-right:12px;';

  return links
    .filter((entry) => entry?.label && entry?.url)
    .map((entry) => (
      `<a href="${escapeHtml(sanitizeUrl(entry.url))}" style="display:inline-block;color:#4b5563;text-decoration:none;font-size:13px;line-height:20px;${spacing}">${escapeHtml(entry.label)}</a>`
    ))
    .join('');
}

function renderEmailLayout(content = {}, options = {}) {
  const locale = normalizeLocale(options.locale || content.locale);
  const rtl = isRtlLocale(locale);
  const align = rtl ? 'right' : 'left';
  const brandName = options.brandName || 'ChatorAI';
  const supportEmail = options.supportEmail || 'support@chatorai.com';
  const footerLinks = content.footerLinks || [];
  const preheader = String(content.preheader || '').trim();
  const ctaUrl = content.cta?.url ? sanitizeUrl(content.cta.url) : '';
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const supportText = content.supportText || `Need help? Reply to this email or contact ${supportEmail}.`;
  const trustText = content.trustText || '';
  const secondaryLinks = Array.isArray(content.secondaryLinks) ? content.secondaryLinks : [];

  const text = joinTextSections([
    content.title,
    content.intro,
    ...sections,
    ctaUrl ? `${content.cta.label}: ${ctaUrl}` : '',
    supportText,
    trustText,
    footerLinks.map((entry) => `${entry.label}: ${entry.url}`).join(' | '),
  ]);

  return {
    subject: String(content.subject || '').trim(),
    text,
    html: `
<!DOCTYPE html>
<html lang="${locale}" dir="${rtl ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escapeHtml(content.subject || '')}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .email-shell { width: 100% !important; }
        .email-card { border-radius: 0 !important; }
        .cta-link { display: block !important; width: 100% !important; box-sizing: border-box !important; }
        .email-padding { padding: 28px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" class="email-shell" style="width:640px;max-width:640px;">
            <tr>
              <td class="email-card" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td class="email-padding" style="padding:32px 40px 24px;text-align:${align};">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="text-align:${align};">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="width:14px;height:14px;border-radius:4px;background:#FF5A1F;"></td>
                                <td style="padding-${rtl ? 'right' : 'left'}:10px;font-size:17px;line-height:24px;font-weight:700;color:#111827;">${escapeHtml(brandName)}</td>
                              </tr>
                            </table>
                            ${content.statusLabel ? `<div style="margin-top:12px;font-size:12px;line-height:16px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#FF5A1F;">${escapeHtml(content.statusLabel)}</div>` : ''}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top:24px;">
                            <h1 style="margin:0 0 12px;font-size:30px;line-height:38px;font-weight:700;color:#111827;">${escapeHtml(content.title || '')}</h1>
                            ${content.intro ? `<p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#4b5563;">${escapeHtml(content.intro)}</p>` : ''}
                            ${renderParagraphs(sections)}
                          </td>
                        </tr>
                        ${ctaUrl ? `
                        <tr>
                          <td style="padding-top:8px;padding-bottom:24px;">
                            <a href="${escapeHtml(ctaUrl)}" class="cta-link" style="display:inline-block;background:#FF5A1F;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;padding:14px 22px;border-radius:10px;">${escapeHtml(content.cta.label || 'Open')}</a>
                            ${secondaryLinks.length ? `<div style="margin-top:14px;">${renderSecondaryLinks(secondaryLinks, locale)}</div>` : ''}
                          </td>
                        </tr>` : ''}
                        <tr>
                          <td style="padding:24px 0 0;border-top:1px solid #e5e7eb;">
                            <div style="font-size:13px;line-height:22px;color:#4b5563;">
                              <strong style="display:block;margin-bottom:6px;color:#111827;">${escapeHtml(content.supportTitle || 'Support')}</strong>
                              <div>${escapeHtml(supportText)}</div>
                              ${trustText ? `<div style="margin-top:8px;">${escapeHtml(trustText)}</div>` : ''}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 8px 0;text-align:${align};font-size:12px;line-height:20px;color:#6b7280;">
                <div style="margin-bottom:8px;">${renderFooterLinks(footerLinks, locale)}</div>
                <div>${escapeHtml(content.footerNote || `${brandName} • ${new Date().getUTCFullYear()}`)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim(),
  };
}

module.exports = {
  escapeHtml,
  interpolateValue,
  renderEmailLayout,
  renderTemplateString,
};
