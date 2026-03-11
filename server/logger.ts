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

if (!isTest && !fs.existsSync(LOGS_PATH)) {
  fs.mkdirSync(LOGS_PATH, { recursive: true });
}

const textFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, label, message, data } = info;
    const levelLabel = level.toUpperCase();
    const baseMessage = `${timestamp} [${levelLabel}] [${label}] ${message}`;
    if (data !== undefined) {
      const dataStr =
        typeof data === "object" && data !== null && "stack" in data
          ? String((data as Record<string, unknown>).stack)
          : JSON.stringify(data, null, 2);
      return `${baseMessage}\n${dataStr}`;
    }
    return baseMessage;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.json()
);

const transports: winston.transport[] = [];

if (!isTest) {
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

  textTransport.on("error", () => {});

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

  jsonTransport.on("error", () => {});

  transports.push(textTransport, jsonTransport);
}

if (isDevelopment && !isTest) {
  const consoleTransport = new winston.transports.Console({
    format: textFormat,
  });
  transports.push(consoleTransport);
}

const winstonLogger = winston.createLogger({
  level: "info",
  transports,
});

function serializeData(data: unknown): unknown {
  if (data instanceof Error) {
    return { name: data.name, message: data.message, stack: data.stack };
  }
  return data;
}

export function createLogger(label: string): Logger {
  return {
    debug(message: string, data?: unknown) {
      winstonLogger.debug({
        label,
        message,
        ...(data !== undefined && { data: serializeData(data) }),
      });
    },

    info(message: string, data?: unknown) {
      winstonLogger.info({
        label,
        message,
        ...(data !== undefined && { data: serializeData(data) }),
      });
    },

    warn(message: string, data?: unknown) {
      winstonLogger.warn({
        label,
        message,
        ...(data !== undefined && { data: serializeData(data) }),
      });
    },

    error(message: string, data?: unknown) {
      winstonLogger.error({
        label,
        message,
        ...(data !== undefined && { data: serializeData(data) }),
      });
    },
  };
}
