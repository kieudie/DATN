import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logInfo = new winston.transports.DailyRotateFile({
  filename: 'logs/%DATE%-info.log',
  datePattern: 'YYYY-MM-DD',
  level: 'info',
  maxFiles: '14d',
});

const logDebug = new winston.transports.DailyRotateFile({
  filename: 'logs/%DATE%-debug.log',
  datePattern: 'YYYY-MM-DD',
  level: 'debug',
  maxFiles: '14d',
});

const logError = new winston.transports.DailyRotateFile({
  filename: 'logs/%DATE%-error.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '14d',
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(
      ({ timestamp, level, context, message, filename, line }) => {
        const paddedContext = context ? `[${context}]` : '[UnknownContext]';
        const location =
          filename && line ? `[${filename}:${line}]` : '[unknown]';

        return `${timestamp} [${level}] ${paddedContext} ${location} ${message}`;
      },
    ),
  ),
});

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(
    ({ timestamp, level, context, message, filename, line }) => {
      const paddedContext = context ? `[${context}]` : '[UnknownContext]';
      const location = filename && line ? `[${filename}:${line}]` : '[unknown]';

      return `${timestamp} [${String(level).toUpperCase()}] ${paddedContext} ${location} ${message}`;
    },
  ),
);

@Injectable()
export class LoggerService {
  static logMode = process.env.LOG_MODE || 'dev';

  private context = 'UnknownContext';

  private static loggerInfo = winston.createLogger({
    format: logFormat,
    transports:
      LoggerService.logMode === 'dev' ? [logInfo, consoleTransport] : [logInfo],
  });

  private static loggerError = winston.createLogger({
    format: logFormat,
    transports:
      LoggerService.logMode === 'dev'
        ? [logError, consoleTransport]
        : [logError],
  });

  private static loggerDebug = winston.createLogger({
    format: logFormat,
    transports:
      LoggerService.logMode === 'dev'
        ? [logDebug, consoleTransport]
        : [logDebug],
  });

  setContext(context: string): void {
    this.context = context;
  }

  private getCallerInfo() {
    const stack = new Error().stack;

    if (!stack) {
      return {
        filename: 'unknown',
        line: 'unknown',
      };
    }

    const stackLines = stack.split('\n');

    for (const line of stackLines) {
      if (
        !line.includes('logger.service.ts') &&
        !line.includes('node_modules') &&
        !line.includes('internal/') &&
        !line.includes('Error')
      ) {
        const match =
          line.match(/\(([^:]+):(\d+):(\d+)\)/) ||
          line.match(/at ([^:]+):(\d+):(\d+)/);

        if (match) {
          const [, filename, lineNumber] = match;

          return {
            filename,
            line: lineNumber,
          };
        }
      }
    }

    return {
      filename: 'unknown',
      line: 'unknown',
    };
  }

  private prepareMeta(context?: string) {
    const callerInfo = this.getCallerInfo();

    return {
      context: context || this.context || 'UnknownContext',
      filename: callerInfo.filename,
      line: callerInfo.line,
    };
  }

  error(message: any, trace?: string, context?: string): void {
    const meta = this.prepareMeta(context);
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerError.error(formattedMessage, {
      ...meta,
      trace,
    });
  }

  warn(message: any, context?: string): void {
    const meta = this.prepareMeta(context);
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerInfo.warn(formattedMessage, meta);
  }

  log(message: any, context?: string): void {
    const meta = this.prepareMeta(context);
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerInfo.info(formattedMessage, meta);
  }

  debug(message: any, context?: string): void {
    const meta = this.prepareMeta(context);
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerDebug.debug(formattedMessage, meta);
  }

  verbose(message: any, context?: string): void {
    const meta = this.prepareMeta(context);
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerInfo.verbose(formattedMessage, meta);
  }
}