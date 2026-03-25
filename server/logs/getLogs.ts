import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LogEntry, LogLevel, LogsResponse } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "..", "config");
const JSON_LOG_PATH = path.join(LOG_DIR, "logs", "tunearr.json");

function readLogs(): LogEntry[] {
  if (!fs.existsSync(JSON_LOG_PATH)) return [];

  const fileContent = fs.readFileSync(JSON_LOG_PATH, "utf-8");
  const lines = fileContent.trim().split("\n");
  const logs: LogEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      logs.push(JSON.parse(line) as LogEntry);
    } catch {
      continue;
    }
  }

  return logs;
}

function filterLogs(
  logs: LogEntry[],
  level?: LogLevel[],
  search?: string
): LogEntry[] {
  let filtered = logs;
  if (level && level.length > 0)
    filtered = filtered.filter((log) => level.includes(log.level));
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (log) =>
        log.message.toLowerCase().includes(searchLower) ||
        log.label.toLowerCase().includes(searchLower)
    );
  }
  return filtered;
}

export function getLogs(
  page: number,
  pageSize: number,
  level?: LogLevel[],
  search?: string
): LogsResponse {
  const allLogs = readLogs();
  const filtered = filterLogs(allLogs, level, search).reverse();

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLogs = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { logs: paginatedLogs, page, pageSize, totalCount, totalPages };
}
