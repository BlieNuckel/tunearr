import fs from "fs";
import type { LogFile } from "./logFiles";
import type { LogEntry } from "./types";

type CachedFile = {
  size: number;
  mtimeMs: number;
  startOffset: number;
  entries: LogEntry[];
};

const closedFileCache = new Map<string, CachedFile>();

/** Parses newline-delimited JSON log entries, skipping lines that aren't valid JSON. */
export function parseLogLines(text: string): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line) as LogEntry);
    } catch {
      continue;
    }
  }
  return entries;
}

function readFrom(filePath: string, startOffset: number): string {
  if (startOffset === 0) return fs.readFileSync(filePath, "utf-8");

  const fd = fs.openSync(filePath, "r");
  try {
    const length = fs.fstatSync(fd).size - startOffset + 1;
    const buffer = Buffer.alloc(Math.max(0, length));
    fs.readSync(fd, buffer, 0, buffer.length, startOffset - 1);
    // Reading from the byte before the offset means a line that starts exactly
    // at the offset is kept whole: only the newline before it gets dropped.
    const firstNewline = buffer.indexOf(0x0a);
    return firstNewline === -1
      ? ""
      : buffer.subarray(firstNewline + 1).toString("utf-8");
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Reads a log file's entries in the order they were written. With a
 * `startOffset`, only the lines that start at or after that byte are read.
 */
export function readLogFile(file: LogFile, startOffset = 0): LogEntry[] {
  try {
    return parseLogLines(readFrom(file.path, startOffset));
  } catch {
    return [];
  }
}

/**
 * Reads a file the logger has rotated away from, reusing the parsed entries
 * while its size and modification time are unchanged. The returned array is
 * shared with the cache and must not be mutated.
 */
export function readClosedLogFile(file: LogFile, startOffset = 0): LogEntry[] {
  const cached = closedFileCache.get(file.path);
  if (
    cached &&
    cached.size === file.size &&
    cached.mtimeMs === file.mtimeMs &&
    cached.startOffset === startOffset
  ) {
    return cached.entries;
  }

  const entries = readLogFile(file, startOffset);
  closedFileCache.set(file.path, {
    size: file.size,
    mtimeMs: file.mtimeMs,
    startOffset,
    entries,
  });
  return entries;
}

/** Drops cached files that are no longer among the files being read. */
export function pruneLogCache(keep: Set<string>): void {
  for (const filePath of closedFileCache.keys()) {
    if (!keep.has(filePath)) closedFileCache.delete(filePath);
  }
}

export function clearLogCache(): void {
  closedFileCache.clear();
}
