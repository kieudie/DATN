import * as winston from "winston";
import "winston-daily-rotate-file";

// Daily Rotate File Transports
const logInfo = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%-info.log",
  datePattern: "YYYY-MM-DD",
  level: "info",
  maxFiles: "14d",
});

const logDebug = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%-debug.log",
  datePattern: "YYYY-MM-DD",
  level: "debug",
  maxFiles: "14d",
});

const logError = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%-error.log",
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxFiles: "14d",
});

// Console Transport (for development)
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(
      ({ timestamp, level, context, message, filename, line }) => {
        const paddedContext = context ? `[${context}]` : "[UnknownContext]";
        const location =
          filename && line ? `[${filename}:${line}]` : "[unknown]";
        return `${timestamp} [${level}] ${paddedContext} ${location} ${message}`;
      }
    )
  ),
});

// Custom Log Format (ISO 8601 Timestamp)
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(
    ({ timestamp, level, context, message, filename, line }) => {
      const paddedContext = context ? `[${context}]` : "[UnknownContext]";
      const location = filename && line ? `[${filename}:${line}]` : "[unknown]";
      return `${timestamp} [${level.toUpperCase()}] ${paddedContext} ${location} ${message}`;
    }
  )
);

export class LoggerService {
  static logMode = process.env.LOG_MODE || "dev"; // Default to 'dev' if not set

  private context: string = "UnknownContext"; // Default context
  constructor(context?: string) {
    if (context) {
      this.context = context;
    }
  }

  private static loggerInfo = winston.createLogger({
    format: logFormat,
    transports:
      LoggerService.logMode == "dev" ? [logInfo, consoleTransport] : [logInfo], // Add console transport
  });

  private static loggerError = winston.createLogger({
    format: logFormat,
    transports:
      LoggerService.logMode == "dev" ? [logError, consoleTransport] : [logInfo], // Add console transport
  });

  private static loggerDebug = winston.createLogger({
    format: logFormat,
    transports:
      LoggerService.logMode === "dev"
        ? [logDebug, consoleTransport]
        : [logDebug], // Conditionally add console transport
  });

  private getCallerInfo() {
    const stack = new Error().stack;
    if (!stack) return { filename: "unknown", line: "unknown" };

    const stackLines = stack.split("\n");
    // Bỏ qua các dòng liên quan đến logger, node_modules, internal, và Error
    for (const line of stackLines) {
      if (
        !line.includes("logger.service.ts") &&
        !line.includes("node_modules") &&
        !line.includes("internal/") &&
        !line.includes("Error")
      ) {
        // Lấy thông tin file:line:column
        const match =
          line.match(/\(([^:]+):(\d+):(\d+)\)/) ||
          line.match(/at ([^:]+):(\d+):(\d+)/);
        if (match) {
          const [, filename, line] = match;
          return { filename, line };
        }
      }
    }
    return { filename: "unknown", line: "unknown" };
  }

  private prepareMeta(context?: string) {
    const callerInfo = this.getCallerInfo();
    return {
      context: context || this.context || "UnknownContext", // Auto-detect context if not provided
      filename: callerInfo.filename,
      line: callerInfo.line,
    };
  }

  error(message: string, trace?: string, context?: string) {
    const meta = this.prepareMeta(context);

    // Ensure objects and arrays are logged as JSON strings
    const formattedMessage =
      typeof message === "object" ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerError.error(formattedMessage, { ...meta, trace });
  }

  warn(message: string, context?: string) {
    const meta = this.prepareMeta(context);

    // Ensure objects and arrays are logged as JSON strings
    const formattedMessage =
      typeof message === "object" ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerInfo.warn(formattedMessage, meta);
  }

  log(message: any, context?: string) {
    const meta = this.prepareMeta(context);

    // Ensure objects and arrays are logged as JSON strings
    const formattedMessage =
      typeof message === "object" ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerInfo.info(formattedMessage, meta);
  }

  debug(message: any, context?: string) {
    const meta = this.prepareMeta(context);
    // Ensure objects and arrays are logged as JSON strings
    const formattedMessage =
      typeof message === "object" ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerDebug.debug(formattedMessage, meta);
  }

  verbose(message: string, context?: string) {
    const meta = this.prepareMeta(context);
    // Ensure objects and arrays are logged as JSON strings
    const formattedMessage =
      typeof message === "object" ? JSON.stringify(message, null, 2) : message;

    LoggerService.loggerInfo.verbose(formattedMessage, meta);
  }
}
