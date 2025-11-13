/**
 * Simple logger utility
 * TODO: 향후 winston 또는 pino로 교체 고려
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
  }

  _log(level, ...args) {
    if (LOG_LEVELS[level] >= LOG_LEVELS[this.level]) {
      const timestamp = new Date().toISOString();
      console[level === 'error' ? 'error' : 'log'](
        `[${timestamp}] [${level.toUpperCase()}]`,
        ...args
      );
    }
  }

  debug(...args) {
    this._log('debug', ...args);
  }

  info(...args) {
    this._log('info', ...args);
  }

  warn(...args) {
    this._log('warn', ...args);
  }

  error(...args) {
    this._log('error', ...args);
  }
}

export const logger = new Logger();
