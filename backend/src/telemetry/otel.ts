import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { logger } from '../utils/logger';

/**
 * OpenTelemetry Configuration
 *
 * Configurable via environment variables:
 * - OTEL_ENABLED: Enable/disable telemetry (true/false)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint (e.g., http://localhost:4318)
 * - OTEL_SERVICE_NAME: Service name (default: flashpoint-web-backend)
 * - OTEL_TRACES_ENABLED: Enable traces (default: true)
 * - OTEL_METRICS_ENABLED: Enable metrics (default: true)
 * - OTEL_METRICS_EXPORT_INTERVAL: Metrics export interval in ms (default: 60000)
 * - OTEL_LOG_LEVEL: Log level for OTel (default: info)
 *
 * Compatible with:
 * - Jaeger (traces)
 * - Prometheus (metrics via OTLP)
 * - Grafana Cloud
 * - New Relic
 * - Datadog
 * - Any OTLP-compatible backend
 */

let sdk: NodeSDK | null = null;

/**
 * Get OpenTelemetry configuration from environment
 */
function getOtelConfig() {
  return {
    enabled: process.env.OTEL_ENABLED === 'true',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    serviceName: process.env.OTEL_SERVICE_NAME || 'flashpoint-web-backend',
    serviceVersion: process.env.npm_package_version || '1.0.0',
    tracesEnabled: process.env.OTEL_TRACES_ENABLED !== 'false',
    metricsEnabled: process.env.OTEL_METRICS_ENABLED !== 'false',
    metricsExportInterval: parseInt(process.env.OTEL_METRICS_EXPORT_INTERVAL || '60000', 10),
    logLevel: process.env.OTEL_LOG_LEVEL || 'info'
  };
}

/**
 * Initialize OpenTelemetry SDK
 *
 * Should be called before any other code to ensure instrumentation works correctly
 */
export function initializeTelemetry(): void {
  const config = getOtelConfig();

  if (!config.enabled) {
    logger.info('[OpenTelemetry] Telemetry disabled via OTEL_ENABLED=false');
    return;
  }

  try {
    logger.info('[OpenTelemetry] Initializing telemetry...', {
      endpoint: config.endpoint,
      service: config.serviceName,
      traces: config.tracesEnabled,
      metrics: config.metricsEnabled
    });

    // Create resource (service metadata)
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
      environment: process.env.NODE_ENV || 'development'
    });

    // Configure trace exporter
    const traceExporter = config.tracesEnabled
      ? new OTLPTraceExporter({
          url: `${config.endpoint}/v1/traces`,
          headers: {},
        })
      : undefined;

    // Configure metric exporter
    const metricReader = config.metricsEnabled
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${config.endpoint}/v1/metrics`,
            headers: {},
          }),
          exportIntervalMillis: config.metricsExportInterval,
        })
      : undefined;

    // Initialize SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable specific instrumentations if needed
          '@opentelemetry/instrumentation-fs': {
            enabled: false // File system instrumentation can be noisy
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false
          },
          // HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            // Ignore health check endpoints
            ignoreIncomingRequestHook: (request) => {
              const url = request.url || '';
              return url.includes('/health') || url.includes('/metrics');
            },
            // Capture request/response headers
            headersToSpanAttributes: {
              server: {
                requestHeaders: ['user-agent', 'content-type'],
                responseHeaders: ['content-type']
              }
            }
          },
          // Express instrumentation
          '@opentelemetry/instrumentation-express': {
            enabled: true
          }
        })
      ]
    });

    // Start SDK
    sdk.start();

    logger.info('[OpenTelemetry] Telemetry initialized successfully', {
      traces: config.tracesEnabled ? 'enabled' : 'disabled',
      metrics: config.metricsEnabled ? 'enabled' : 'disabled'
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      shutdownTelemetry();
    });

  } catch (error) {
    logger.error('[OpenTelemetry] Failed to initialize telemetry:', error);
    // Non-fatal - application continues without telemetry
  }
}

/**
 * Shutdown OpenTelemetry SDK
 * Flushes pending telemetry data
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    logger.info('[OpenTelemetry] Shutting down telemetry...');
    await sdk.shutdown();
    logger.info('[OpenTelemetry] Telemetry shutdown complete');
  } catch (error) {
    logger.error('[OpenTelemetry] Error during telemetry shutdown:', error);
  }
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return getOtelConfig().enabled;
}

/**
 * Get current telemetry configuration
 */
export function getTelemetryConfig(): ReturnType<typeof getOtelConfig> {
  return getOtelConfig();
}
