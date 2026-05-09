const { logger } = require('../../core/logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableEmailError(error) {
  const code = String(error?.code || '').toUpperCase();
  return [
    'ETIMEDOUT',
    'ECONNRESET',
    'ESOCKET',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'EPROVIDER',
    'PROVIDER_5XX',
  ].includes(code);
}

async function deliverWithRetry({
  maxAttempts = 3,
  baseDelayMs = 750,
  attempt,
  onAttemptFailure = async () => {},
}) {
  let lastError = null;

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    try {
      return await attempt(attemptNumber);
    } catch (error) {
      lastError = error;
      await onAttemptFailure(error, attemptNumber);

      if (attemptNumber >= maxAttempts || !isRetriableEmailError(error)) break;

      const delayMs = baseDelayMs * attemptNumber;
      logger.warn('Retrying email delivery', {
        attempt: attemptNumber,
        nextDelayMs: delayMs,
        error: error.message,
      });
      await sleep(delayMs);
    }
  }

  throw lastError;
}

module.exports = {
  deliverWithRetry,
  isRetriableEmailError,
};
