import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Build transports array
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0 && meta.service !== 'flashpoint-web-api') {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    )
  })
];

// Add file transport if LOG_FILE is configured
if (config.logFile) {
  try {
    // Ensure log directory exists
    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Add file transport with JSON format
    transports.push(
      new winston.transports.File({
        filename: config.logFile,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    console.log(`[Logger] File logging enabled: ${config.logFile}`);
  } catch (error) {
    console.error(`[Logger] Failed to setup file logging: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'flashpoint-web-api' },
  transports
});
