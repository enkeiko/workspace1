/**
 * 🔍 로거 모듈
 *
 * 실시간 로그 스트리밍 및 파일 저장 기능
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.logFile = options.logFile || null;
    this.listeners = [];
    this.logs = [];
    this.maxLogs = options.maxLogs || 1000;

    // 로그 레벨 우선순위
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    // 로그 파일 초기화
    if (this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * 로그 리스너 추가 (실시간 스트리밍용)
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * 로그 리스너 제거
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * 로그 메시지 생성
   */
  _createLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      level,
      message,
      data
    };

    // 메모리에 저장 (최대 개수 제한)
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 리스너에게 전달 (실시간 스트리밍)
    this.listeners.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        console.error('로그 리스너 오류:', error);
      }
    });

    // 파일에 저장
    if (this.logFile) {
      const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
      fs.appendFileSync(this.logFile, logLine, 'utf-8');
    }

    return log;
  }

  /**
   * 콘솔 출력 (색상 포함)
   */
  _printToConsole(level, message, data = null) {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m'  // red
    };

    const icons = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };

    const reset = '\x1b[0m';
    const color = colors[level] || '';
    const icon = icons[level] || '';
    const timestamp = new Date().toLocaleTimeString('ko-KR');

    console.log(`${color}${icon} [${timestamp}] ${message}${reset}`);
    if (data) {
      console.log(color + JSON.stringify(data, null, 2) + reset);
    }
  }

  /**
   * 로그 출력 (레벨 체크)
   */
  _log(level, message, data = null) {
    if (this.levels[level] < this.levels[this.logLevel]) {
      return;
    }

    this._createLog(level, message, data);
    this._printToConsole(level, message, data);
  }

  /**
   * 디버그 로그
   */
  debug(message, data = null) {
    this._log('debug', message, data);
  }

  /**
   * 정보 로그
   */
  info(message, data = null) {
    this._log('info', message, data);
  }

  /**
   * 경고 로그
   */
  warn(message, data = null) {
    this._log('warn', message, data);
  }

  /**
   * 에러 로그
   */
  error(message, data = null) {
    this._log('error', message, data);
  }

  /**
   * 프로그레스 로그 (진행률 표시)
   */
  progress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    const progressMsg = `[${current}/${total}] ${bar} ${percentage}% ${message}`;

    this._log('info', progressMsg);
  }

  /**
   * 저장된 모든 로그 가져오기
   */
  getAllLogs() {
    return this.logs;
  }

  /**
   * 로그 레벨별 필터링
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 로그 초기화
   */
  clear() {
    this.logs = [];
    if (this.logFile && fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '', 'utf-8');
    }
  }
}

module.exports = Logger;
