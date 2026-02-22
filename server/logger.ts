type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

function formatMessage(
  level: LogLevel,
  label: string,
  message: string
): string {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${LEVEL_LABELS[level]}] [${label}] ${message}`;
}

export function createLogger(label: string): Logger {
  return {
    debug(_message: string, _data?: unknown) {
      // no-op by default
    },

    info(message: string, data?: unknown) {
      const line = formatMessage("info", label, message);
      if (data !== undefined) {
        console.log(line, "\n" + JSON.stringify(data, null, 2));
      } else {
        console.log(line);
      }
    },

    warn(message: string, data?: unknown) {
      const line = formatMessage("warn", label, message);
      if (data !== undefined) {
        console.warn(line, "\n" + JSON.stringify(data, null, 2));
      } else {
        console.warn(line);
      }
    },

    error(message: string, data?: unknown) {
      const line = formatMessage("error", label, message);
      if (data !== undefined) {
        console.error(line, "\n" + JSON.stringify(data, null, 2));
      } else {
        console.error(line);
      }
    },
  };
}
