import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Try to import OpenTelemetry API for trace context
let trace: any = null;
let context: any = null;
try {
  const otelApi = require('@opentelemetry/api');
  trace = otelApi.trace;
  context = otelApi.context;
} catch {
  // OpenTelemetry not available - trace context will not be included
}

function getTraceContext(): { trace_id?: string; span_id?: string } {
  if (!trace || !context) {
    return {};
  }

  try {
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      };
    }
  } catch {
    // Ignore errors getting trace context
  }
  return {};
}

/**
 * Map Winston log levels to OTEL severity numbers
 * https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
 */
function getSeverityNumber(level: string): number {
  const severityMap: Record<string, number> = {
    error: 17, // ERROR
    warn: 13, // WARN
    info: 9, // INFO
    http: 9, // INFO
    verbose: 5, // DEBUG
    debug: 5, // DEBUG
    silly: 1, // TRACE
  };
  return severityMap[level] || 9;
}

const otelFormat = winston.format((info) => {
  const traceContext = getTraceContext();
  if (traceContext.trace_id) {
    info.trace_id = traceContext.trace_id;
    info.span_id = traceContext.span_id;
  }

  info.severity = info.level.toUpperCase();
  info.severityNumber = getSeverityNumber(info.level);

  return info;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        const traceId = meta.trace_id as string | undefined;
        if (traceId) {
          msg = `${timestamp} [${level}] [trace:${traceId.substring(0, 8)}]: ${message}`;
        }
        const displayMeta = { ...meta };
        delete displayMeta.service;
        delete displayMeta.trace_id;
        delete displayMeta.span_id;
        delete displayMeta.severity;
        delete displayMeta.severityNumber;
        if (Object.keys(displayMeta).length > 0) {
          msg += ` ${JSON.stringify(displayMeta)}`;
        }
        return msg;
      })
    ),
  }),
];

let fileTransport: winston.transports.FileTransportInstance | null = null;
let fileLoggingError: Error | null = null;

if (config.logFile) {
  try {
    const logDir = path.dirname(config.logFile);

    console.log(`[Logger] Attempting to setup file logging...`);
    console.log(`[Logger]   LOG_FILE: ${config.logFile}`);
    console.log(`[Logger]   Log directory: ${logDir}`);

    if (!fs.existsSync(logDir)) {
      console.log(`[Logger]   Creating log directory...`);
      fs.mkdirSync(logDir, { recursive: true });
    }

    try {
      const testFile = path.join(logDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`[Logger]   Directory is writable`);
    } catch (writeError) {
      throw new Error(
        `Log directory is not writable: ${writeError instanceof Error ? writeError.message : writeError}`
      );
    }

    fileTransport = new winston.transports.File({
      filename: config.logFile,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
        otelFormat(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    });

    fileTransport.on('error', (error) => {
      console.error(`[Logger] File transport error: ${error.message}`);
      fileLoggingError = error;
    });

    transports.push(fileTransport);
    console.log(`[Logger] ✅ File logging enabled: ${config.logFile}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Logger] ❌ Failed to setup file logging: ${errorMsg}`);
    fileLoggingError = error instanceof Error ? error : new Error(errorMsg);
  }
} else {
  console.log(`[Logger] ℹ️  File logging disabled (LOG_FILE not set)`);
}

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    otelFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'flashpoint-web-backend' },
  transports,
});

export function getLoggingStatus(): {
  consoleEnabled: boolean;
  fileEnabled: boolean;
  filePath: string | null;
  fileError: string | null;
  logLevel: string;
  otelIntegration: boolean;
} {
  return {
    consoleEnabled: true,
    fileEnabled: fileTransport !== null && fileLoggingError === null,
    filePath: config.logFile || null,
    fileError: fileLoggingError?.message || null,
    logLevel: config.logLevel,
    otelIntegration: trace !== null,
  };
}

export function verifyFileLogging(): boolean {
  if (!config.logFile || !fileTransport) {
    return false;
  }

  try {
    logger.info('Log file verification - logging system initialized');
    // Sync check only - actual write is async, so this is best-effort
    return fs.existsSync(config.logFile);
  } catch (error) {
    console.error(`[Logger] Verification failed: ${error}`);
    return false;
  }
}
