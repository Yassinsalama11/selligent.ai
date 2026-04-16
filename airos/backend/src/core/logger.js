/**
 * Structured Logger for ChatOrAI
 * JSON format with tenant_id, request_id threading through all logs
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class StructuredLogger {
  constructor(defaultMeta = {}) {
    this.defaultMeta = defaultMeta;
  }

  child(meta) {
    return new StructuredLogger({ ...this.defaultMeta, ...meta });
  }

  _format(level, message, meta = {}) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.defaultMeta,
      ...meta,
    };
    // Strip undefined values
    return Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined)
    );
  }

  debug(message, meta = {}) {
    if (this._shouldLog('DEBUG')) {
      console.log(JSON.stringify(this._format('debug', message, meta)));
    }
  }

  info(message, meta = {}) {
    if (this._shouldLog('INFO')) {
      console.log(JSON.stringify(this._format('info', message, meta)));
    }
  }

  warn(message, meta = {}) {
    if (this._shouldLog('WARN')) {
      console.warn(JSON.stringify(this._format('warn', message, meta)));
    }
  }

  error(message, meta = {}) {
    if (this._shouldLog('ERROR')) {
      console.error(JSON.stringify(this._format('error', message, meta)));
    }
  }

  _shouldLog(level) {
    const minLevel = process.env.LOG_LEVEL || 'info';
    return LOG_LEVELS[level.toUpperCase()] >= LOG_LEVELS[minLevel.toUpperCase()];
  }
}

// Create root logger instance
const logger = new StructuredLogger({
  service: 'chatorai-backend',
  environment: process.env.NODE_ENV || 'development',
});

// Request ID generator — creates unique ID per request
function generateRequestId() {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

module.exports = { logger, StructuredLogger, generateRequestId };
