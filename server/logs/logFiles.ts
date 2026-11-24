import fs from "fs";
import path from "path";

export type LogFile = {
  path: string;
  size: number;
  mtimeMs: number;
};

type ParsedName = {
  name: string;
  date: string;
  part: number;
};

/**
 * Matches the JSON transport's files. A day that passes `maxSize` continues in
 * parts the rotator names by appending a counter after the extension
 * (`tunearr-2026-11-23.json.1`), so the plain file is part 0.
 */
const LOG_FILE_PATTERN = /^tunearr-(\d{4}-\d{2}-\d{2})\.json(?:\.(\d+))?$/;

function parseName(name: string): ParsedName | null {
  const match = LOG_FILE_PATTERN.exec(name);
  if (!match) return null;
  return { name, date: match[1], part: match[2] ? Number(match[2]) : 0 };
}

function compareNewestFirst(a: ParsedName, b: ParsedName): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return b.part - a.part;
}

function statLogFile(filePath: string): LogFile | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    return { path: filePath, size: stat.size, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

/** Lists the JSON log files in `dir`, newest first, so the first one is being written. */
export function listLogFiles(dir: string): LogFile[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .map(parseName)
    .filter((parsed): parsed is ParsedName => parsed !== null)
    .sort(compareNewestFirst)
    .map((parsed) => statLogFile(path.join(dir, parsed.name)))
    .filter((file): file is LogFile => file !== null);
}
