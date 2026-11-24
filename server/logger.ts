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

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: unknown;
  errors?: unknown[];
};

/** Deep enough for undici's `fetch failed` → AggregateError → per-address errors. */
const MAX_CAUSE_DEPTH = 5;

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;
const isDevelopment = process.env.NODE_ENV !== "production";

const LOG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "config");
export const LOGS_PATH = path.join(LOG_DIR, "logs");

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
      const dataStr = isSerializedError(data)
        ? formatErrorText(data)
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

function isSerializedError(data: unknown): data is SerializedError {
  return typeof data === "object" && data !== null && "stack" in data;
}

function serializeError(error: Error, depth: number): SerializedError {
  const serialized: SerializedError = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  const code = (error as NodeJS.ErrnoException).code;
  if (typeof code === "string") serialized.code = code;
  if (depth >= MAX_CAUSE_DEPTH) return serialized;

  if (error.cause !== undefined) {
    serialized.cause = serializeValue(error.cause, depth + 1);
  }
  if (error instanceof AggregateError && error.errors.length > 0) {
    serialized.errors = error.errors.map((inner: unknown) =>
      serializeValue(inner, depth + 1)
    );
  }
  return serialized;
}

function serializeValue(value: unknown, depth: number): unknown {
  return value instanceof Error ? serializeError(value, depth) : value;
}

/** Keeps the `cause` chain, which is where `fetch failed` hides the real reason. */
export function serializeData(data: unknown): unknown {
  return serializeValue(data, 0);
}

function formatNested(value: unknown, indent: string): string {
  const text = isSerializedError(value)
    ? formatErrorText(value)
    : JSON.stringify(value);
  return text.replace(/\n/g, `\n${indent}`);
}

export function formatErrorText(error: SerializedError): string {
  const lines = [String(error.stack ?? `${error.name}: ${error.message}`)];
  if (error.code) lines.push(`  code: ${error.code}`);
  if (error.cause !== undefined) {
    lines.push(`Caused by: ${formatNested(error.cause, "")}`);
  }
  for (const inner of error.errors ?? []) {
    lines.push(`  - ${formatNested(inner, "    ")}`);
  }
  return lines.join("\n");
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
