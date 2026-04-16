type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  const payload = {
    level,
    message,
    service: 'apps-worker',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  if (level === 'warn') {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    emit('info', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    emit('warn', message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    emit('error', message, meta);
  },
};
