import { LOGS_PATH } from "../logger";
import { listLogFiles } from "./logFiles";
import { pruneLogCache, readClosedLogFile, readLogFile } from "./readLogFile";
import { LogEntry, LogLevel, LogsResponse } from "./types";

export type LogsQuery = {
  page: number;
  pageSize: number;
  level?: LogLevel[];
  search?: string;
};

type CollectedLogs = {
  newestFirst: LogEntry[];
  truncated: boolean;
};

/**
 * How many bytes of rotated log files are read and kept parsed, about 14-20 MB
 * of heap. The file being written is always read in full on top of this.
 */
export const MAX_OLDER_LOG_BYTES = 12 * 1024 * 1024;

function newestFirst(entries: LogEntry[]): LogEntry[] {
  return entries.slice().reverse();
}

function collectLogs(dir: string, maxOlderBytes: number): CollectedLogs {
  const [current, ...older] = listLogFiles(dir);
  if (!current) {
    pruneLogCache(new Set());
    return { newestFirst: [], truncated: false };
  }

  const chunks = [newestFirst(readLogFile(current))];
  const read = new Set<string>();
  let budget = maxOlderBytes;
  let truncated = false;

  for (const file of older) {
    if (budget <= 0) {
      truncated = true;
      break;
    }
    const startOffset = Math.max(0, file.size - budget);
    chunks.push(newestFirst(readClosedLogFile(file, startOffset)));
    read.add(file.path);
    budget -= file.size - startOffset;
    if (startOffset > 0) truncated = true;
  }

  pruneLogCache(read);
  return { newestFirst: chunks.flat(), truncated };
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

/** Returns one page of log entries, newest first, across the current and rotated log files. */
export function getLogs(
  { page, pageSize, level, search }: LogsQuery,
  dir = LOGS_PATH,
  maxOlderBytes = MAX_OLDER_LOG_BYTES
): LogsResponse {
  const { newestFirst: logs, truncated } = collectLogs(dir, maxOlderBytes);
  const filtered = filterLogs(logs, level, search);

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLogs = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    logs: paginatedLogs,
    page,
    pageSize,
    totalCount,
    totalPages,
    truncated,
  };
}
