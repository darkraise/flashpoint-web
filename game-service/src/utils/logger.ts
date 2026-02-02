import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Configuration
// In Docker (production): defaults to /app/logs/game-service.log
// In local dev: no file logging unless LOG_FILE is explicitly set
const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || (process.env.NODE_ENV === 'production' ? '/app/logs/game-service.log' : undefined);

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

/**
 * Get current trace context from OpenTelemetry
 * Returns trace_id and span_id if available
 */
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
        span_id: spanContext.spanId
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
    error: 17,   // ERROR
    warn: 13,    // WARN
    info: 9,     // INFO
    http: 9,     // INFO
    verbose: 5,  // DEBUG
    debug: 5,    // DEBUG
    silly: 1     // TRACE
  };
  return severityMap[level] || 9;
}

/**
 * Custom format that adds OTEL-compatible fields
 */
const otelFormat = winston.format((info) => {
  // Add trace context if available
  const traceContext = getTraceContext();
  if (traceContext.trace_id) {
    info.trace_id = traceContext.trace_id;
    info.span_id = traceContext.span_id;
  }

  // Add OTEL severity fields
  info.severity = info.level.toUpperCase();
  info.severityNumber = getSeverityNumber(info.level);

  return info;
});

// Build transports array
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        // Include trace_id in console output if present
        const traceId = meta.trace_id as string | undefined;
        if (traceId) {
          msg = `${timestamp} [${level}] [trace:${traceId.substring(0, 8)}]: ${message}`;
        }
        // Filter out internal fields for console display
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
    )
  })
];

// Track file transport for diagnostics
let fileTransport: winston.transports.FileTransportInstance | null = null;
let fileLoggingError: Error | null = null;

// Add file transport if LOG_FILE is configured
if (logFile) {
  try {
    // Ensure log directory exists
    const logDir = path.dirname(logFile);

    console.log(`[Logger] Attempting to setup file logging...`);
    console.log(`[Logger]   LOG_FILE: ${logFile}`);
    console.log(`[Logger]   Log directory: ${logDir}`);

    if (!fs.existsSync(logDir)) {
      console.log(`[Logger]   Creating log directory...`);
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Check if directory is writable
    try {
      const testFile = path.join(logDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`[Logger]   Directory is writable`);
    } catch (writeError) {
      throw new Error(`Log directory is not writable: ${writeError instanceof Error ? writeError.message : writeError}`);
    }

    // Create file transport with OTEL-compatible JSON format
    fileTransport = new winston.transports.File({
      filename: logFile,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
        winston.format.errors({ stack: true }),
        otelFormat(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    });

    // Add error handler to catch write failures
    fileTransport.on('error', (error) => {
      console.error(`[Logger] File transport error: ${error.message}`);
      fileLoggingError = error;
    });

    transports.push(fileTransport);
    console.log(`[Logger] ✅ File logging enabled: ${logFile}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Logger] ❌ Failed to setup file logging: ${errorMsg}`);
    fileLoggingError = error instanceof Error ? error : new Error(errorMsg);
  }
} else {
  console.log(`[Logger] ℹ️  File logging disabled (LOG_FILE not set)`);
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    otelFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'flashpoint-game-service' },
  transports
});

/**
 * Get logging status for diagnostics
 */
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
    filePath: logFile || null,
    fileError: fileLoggingError?.message || null,
    logLevel,
    otelIntegration: trace !== null
  };
}

/**
 * Verify file logging is working by writing a test entry
 */
export function verifyFileLogging(): boolean {
  if (!logFile || !fileTransport) {
    return false;
  }

  try {
    // Write a verification entry
    logger.info('Log file verification - logging system initialized');

    // Give winston a moment to flush, then check if file exists
    // Note: This is a sync check, actual write is async
    return fs.existsSync(logFile);
  } catch (error) {
    console.error(`[Logger] Verification failed: ${error}`);
    return false;
  }
}
