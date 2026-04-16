declare const require: NodeRequire;

function registerOpenTelemetry() {
  if (process.env.OTEL_ENABLED !== '1') {
    return;
  }

  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = require('@opentelemetry/resources');
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

    const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
      || (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces`
        : undefined);

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'apps-api',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      instrumentations: [getNodeAutoInstrumentations()],
      traceExporter: endpoint ? new OTLPTraceExporter({ url: endpoint }) : undefined,
    });

    Promise.resolve(sdk.start()).catch(() => undefined);

    const shutdown = () => {
      Promise.resolve(sdk.shutdown()).catch(() => undefined);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.warn('[apps/api] OpenTelemetry bootstrap unavailable', {
      error: (error as Error).message,
    });
  }
}

registerOpenTelemetry();
