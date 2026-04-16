export function initTelemetry() {
  try {
    if (process.env.OTEL_ENABLED !== '1') {
      return { enabled: false, reason: 'OTEL_ENABLED is not set' };
    }

    // Optional dependency pattern so local development does not break if
    // OpenTelemetry packages are not installed yet in this scaffold.
    require('@opentelemetry/auto-instrumentations-node');
    return { enabled: true };
  } catch (error) {
    return { enabled: false, reason: (error as Error).message };
  }
}
