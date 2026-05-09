const emailQueries = require('../../db/queries/email');
const { logger } = require('../../core/logger');

async function logQueuedEmail(entry) {
  const log = await emailQueries.createEmailLog(entry);
  logger.info('Email queued', {
    emailLogId: log.id,
    template: log.template_name,
    recipient: log.recipient,
    tenantId: log.tenant_id,
  });
  return log;
}

async function logSentEmail(id, result = {}, metadata = undefined) {
  const log = await emailQueries.updateEmailLogStatus(id, {
    status: 'sent',
    providerMessageId: result.providerMessageId || result.id || null,
    metadata,
  });
  logger.info('Email sent', {
    emailLogId: id,
    providerMessageId: result.providerMessageId || result.id || null,
    recipient: log?.recipient,
  });
  return log;
}

async function logFailedEmail(id, error, metadata = undefined) {
  const log = await emailQueries.updateEmailLogStatus(id, {
    status: 'failed',
    errorMessage: error?.message || 'Unknown email error',
    metadata,
  });
  logger.error('Email failed', {
    emailLogId: id,
    recipient: log?.recipient,
    error: error?.message || 'Unknown email error',
  });
  return log;
}

module.exports = {
  ...emailQueries,
  logFailedEmail,
  logQueuedEmail,
  logSentEmail,
};
