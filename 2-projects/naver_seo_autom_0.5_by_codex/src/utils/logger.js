const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
  }
  _log(level, ...args) {
    if (LOG_LEVELS[level] >= LOG_LEVELS[this.level]) {
      const ts = new Date().toISOString();
      const method = level === 'error' ? 'error' : (level === 'warn' ? 'warn' : 'log');
      console[method](`[${ts}] [${level.toUpperCase()}]`, ...args);
    }
  }
  debug(...a) { this._log('debug', ...a); }
  info(...a) { this._log('info', ...a); }
  warn(...a) { this._log('warn', ...a); }
  error(...a) { this._log('error', ...a); }
}

export const logger = new Logger();

