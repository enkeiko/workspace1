/**
 * Winston Logger Configuration
 * 구조화된 로깅: debug/info/warn/error levels, file rotation
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'data', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'naver-place-seo' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // File transport - All logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 14, // Keep 14 days
    }),

    // File transport - Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 14,
    }),

    // File transport - CLI logs
    new winston.transports.File({
      filename: path.join(logsDir, 'cli.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 14,
    }),
  ],
});

// Add stream for SSE (Server-Sent Events) support
logger.stream = {
  listeners: [],
  on(event, callback) {
    if (event === 'log') {
      this.listeners.push(callback);
    }
  },
  emit(logEntry) {
    this.listeners.forEach(callback => {
      try {
        callback(logEntry);
      } catch (err) {
        // Ignore SSE stream errors
      }
    });
  }
};

// Hook into Winston's logging to emit SSE events
const originalLog = logger.log.bind(logger);
logger.log = function(...args) {
  const result = originalLog(...args);

  // Extract log entry for SSE
  if (args[0] && typeof args[0] === 'object') {
    logger.stream.emit({
      level: args[0].level || 'info',
      message: args[0].message || '',
      timestamp: new Date().toISOString(),
      ...args[0]
    });
  } else if (typeof args[0] === 'string' && typeof args[1] === 'string') {
    logger.stream.emit({
      level: args[0],
      message: args[1],
      timestamp: new Date().toISOString()
    });
  }

  return result;
};

// Development mode: More verbose logging
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

/**
 * Create a child logger with additional context
 * @param {Object} meta - Additional metadata for all logs
 * @returns {winston.Logger} Child logger instance
 */
export function createChildLogger(meta) {
  return logger.child(meta);
}

/**
 * Log progress for batch operations
 * @param {number} current - Current item number
 * @param {number} total - Total items
 * @param {string} operation - Operation description
 */
export function logProgress(current, total, operation) {
  const percentage = Math.round((current / total) * 100);
  logger.info(`Progress: [${current}/${total}] ${percentage}% - ${operation}`);
}

/**
 * Log error with error code
 * @param {string} code - Error code (e.g., E_L1_001)
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 */
export function logError(code, message, context = {}) {
  logger.error({
    code,
    message,
    ...context,
    timestamp: new Date().toISOString()
  });
}

export default logger;
