
const fs = require('fs');
const path = require('path');
const globals = require('../globals');

class Logger {
  static LEVELS = {
    NONE: 0,
    ERROR: 1,
    ESSENTIAL: 2,
    DETAILED: 3
  };

  static currentLevel = Logger.LEVELS.DETAILED;
  static logPath = null;

  static init() {
    this.logPath = globals.config.log_path;
    console.log(this.logPath);

    if (!this.logPath) return;

    const envLevel = globals.log_level;

    this.currentLevel = Logger.LEVELS[envLevel] ?? Logger.LEVELS.DETAILED;

    fs.mkdirSync(this.logPath, { recursive: true });
  }

  static error(message) {
    Logger._write('ERROR', message);
  }

  static essential(message) {
    Logger._write('ESSENTIAL', message);
  }

  static detailed(message) {
    Logger._write('DETAILED', message);
  }

  static _write(level, message) {
    if (Logger.LEVELS[level] > this.currentLevel) return;

    const logLine =
      `[${new Date().toISOString()}] ` +
      `[${level}] ${message}`;

    // Console logging (DETAILED is suppressed)
    switch (level) {
      case 'ERROR':
        console.error(logLine);
        break;

      case 'ESSENTIAL':
        console.log(logLine);
        break;

      case 'NONE':
      case 'DETAILED':
        break;
    }

    // File logging
    if (this.logPath) {
      this._logToFile(logLine + '\n');
    }
  }

  static _logToFile(logLine) {
    try {
      const logFilePath = path.join(this.logPath, Logger._getLogFileName());

      fs.appendFileSync(logFilePath, logLine, 'utf8');

    } catch (err) {
      console.error('Failed to write log:', err);
    }
  }

  static _getLogFileName() {
    const date = new Date();

    const formatted = date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).replace(/ /g, '-');

    return `logs-${formatted}.log`;
  }
}

module.exports = Logger;
