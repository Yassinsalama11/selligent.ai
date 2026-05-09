require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getPlatformConfig } = require('../src/ai/completionClient');
const { buildEmailConfig } = require('../src/services/email/emailValidators');

function mask(value) {
  const text = String(value || '').trim();
  if (!text) return 'MISSING';
  if (text.length <= 8) return 'SET';
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

async function main() {
  const platform = await getPlatformConfig().catch((error) => ({ error: error.message }));
  const email = buildEmailConfig();

  console.log(JSON.stringify({
    env: {
      OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
      PLATFORM_OPENAI_API_KEY: mask(process.env.PLATFORM_OPENAI_API_KEY),
      ANTHROPIC_API_KEY: mask(process.env.ANTHROPIC_API_KEY),
      PLATFORM_ANTHROPIC_API_KEY: mask(process.env.PLATFORM_ANTHROPIC_API_KEY),
      ZEPTO_FROM_EMAIL: mask(process.env.ZEPTO_FROM_EMAIL),
      ZEPTO_FROM_NAME: mask(process.env.ZEPTO_FROM_NAME),
      ZEPTO_API_TOKEN: mask(process.env.ZEPTO_API_TOKEN),
      ZEPPTOMAIL_API_KEY: mask(process.env.ZEPPTOMAIL_API_KEY),
      SMTP_HOST: mask(process.env.SMTP_HOST),
      SMTP_PORT: mask(process.env.SMTP_PORT),
      SMTP_SECURE: mask(process.env.SMTP_SECURE),
      SMTP_USERNAME: mask(process.env.SMTP_USERNAME),
      SMTP_PASSWORD: mask(process.env.SMTP_PASSWORD),
    },
    platformConfig: platform.error ? platform : {
      provider: platform.provider,
      source: platform.source,
      activeOpenAI: mask(platform.openaiKey),
      activeAnthropic: mask(platform.anthropicKey),
      openaiModel: platform.openaiModel,
      anthropicModel: platform.anthropicModel,
    },
    emailConfig: {
      transport: email.transport,
      fromEmail: mask(email.fromEmail),
      fromName: email.fromName,
      smtpHost: mask(email.smtpHost),
      smtpPort: email.smtpPort,
      smtpSecure: email.smtpSecure,
      smtpUsername: mask(email.smtpUsername),
      smtpPassword: mask(email.smtpPassword),
      apiToken: mask(email.apiToken),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
