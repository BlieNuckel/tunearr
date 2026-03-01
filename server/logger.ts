import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;
const isDevelopment = process.env.NODE_ENV !== "production";

const LOG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
const LOGS_PATH = path.join(LOG_DIR, "logs");

// Ensure logs directory exists (skip in test environment)
if (!isTest && !fs.existsSync(LOGS_PATH)) {
  fs.mkdirSync(LOGS_PATH, { recursive: true });
}

// Text format for human-readable logs
const textFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, label, message, data } = info;
    const levelLabel = level.toUpperCase();
    const baseMessage = `${timestamp} [${levelLabel}] [${label}] ${message}`;
    if (data !== undefined) {
      const dataStr =
        data instanceof Error
          ? data.stack || `${data.name}: ${data.message}`
          : JSON.stringify(data, null, 2);
      return `${baseMessage}\n${dataStr}`;
    }
    return baseMessage;
  })
);

// JSON format for machine-readable logs (UI)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.json()
);

// Configure transports based on environment
const transports: winston.transport[] = [];

if (!isTest) {
  // Text logs transport
  const textTransport = new DailyRotateFile({
    filename: path.join(LOGS_PATH, "tunearr-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "7d",
    format: textFormat,
    createSymlink: true,
    symlinkName: "tunearr.log",
    handleExceptions: false,
    handleRejections: false,
  });

  // Suppress errors from file transport
  textTransport.on("error", () => {
    // Silently ignore transport errors
  });

  // JSON logs transport
  const jsonTransport = new DailyRotateFile({
    filename: path.join(LOGS_PATH, "tunearr-%DATE%.json"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "7d",
    format: jsonFormat,
    createSymlink: true,
    symlinkName: "tunearr.json",
    handleExceptions: false,
    handleRejections: false,
  });

  // Suppress errors from file transport
  jsonTransport.on("error", () => {
    // Silently ignore transport errors
  });

  transports.push(textTransport, jsonTransport);
}

// Console transport (development only)
if (isDevelopment && !isTest) {
  const consoleTransport = new winston.transports.Console({
    format: textFormat,
  });
  transports.push(consoleTransport);
}

const winstonLogger = winston.createLogger({
  level: "info", // Default to info (no debug by default)
  transports,
});

export function createLogger(label: string): Logger {
  return {
    debug(message: string, data?: unknown) {
      winstonLogger.debug({
        label,
        message,
        ...(data !== undefined && { data }),
      });
    },

    info(message: string, data?: unknown) {
      winstonLogger.info({
        label,
        message,
        ...(data !== undefined && { data }),
      });
    },

    warn(message: string, data?: unknown) {
      winstonLogger.warn({
        label,
        message,
        ...(data !== undefined && { data }),
      });
    },

    error(message: string, data?: unknown) {
      winstonLogger.error({
        label,
        message,
        ...(data !== undefined && { data }),
      });
    },
  };
}
