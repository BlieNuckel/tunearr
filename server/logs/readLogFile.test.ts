import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type { LogFile } from "./logFiles";
import {
  clearLogCache,
  parseLogLines,
  pruneLogCache,
  readClosedLogFile,
  readLogFile,
} from "./readLogFile";

let dir: string;

function line(message: string): string {
  return JSON.stringify({
    timestamp: "2026-11-23 10:00:00",
    level: "info",
    label: "Test",
    message,
  });
}

function writeLog(name: string, content: string): LogFile {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  const stat = fs.statSync(filePath);
  return { path: filePath, size: stat.size, mtimeMs: stat.mtimeMs };
}

function messages(entries: { message: string }[]): string[] {
  return entries.map((entry) => entry.message);
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "read-log-file-"));
  clearLogCache();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("parseLogLines", () => {
  it("skips blank and malformed lines", () => {
    const text = [line("a"), "", "{not json", line("b"), ""].join("\n");

    expect(messages(parseLogLines(text))).toEqual(["a", "b"]);
  });
});

describe("readLogFile", () => {
  it("reads a whole file in written order", () => {
    const file = writeLog("t.json", `${line("a")}\n${line("b")}\n`);

    expect(messages(readLogFile(file))).toEqual(["a", "b"]);
  });

  it("returns nothing for a file that has disappeared", () => {
    const file = writeLog("t.json", `${line("a")}\n`);
    fs.rmSync(file.path);

    expect(readLogFile(file)).toEqual([]);
  });

  it("drops the line cut by the start offset", () => {
    const first = line("a");
    const file = writeLog("t.json", `${first}\n${line("b")}\n${line("c")}\n`);

    expect(messages(readLogFile(file, 5))).toEqual(["b", "c"]);
  });

  it("keeps a line that starts exactly at the offset", () => {
    const first = line("a");
    const file = writeLog("t.json", `${first}\n${line("b")}\n`);

    expect(messages(readLogFile(file, first.length + 1))).toEqual(["b"]);
  });

  it("returns nothing when the offset lands inside the last line", () => {
    const file = writeLog("t.json", line("a"));

    expect(readLogFile(file, 3)).toEqual([]);
  });
});

describe("readClosedLogFile", () => {
  it("reuses parsed entries while the file is unchanged", () => {
    const file = writeLog("t.json", `${line("a")}\n`);
    const first = readClosedLogFile(file);

    fs.writeFileSync(file.path, `${line("changed")}\n`);

    expect(readClosedLogFile(file)).toBe(first);
  });

  it("re-reads a file whose size or modification time changed", () => {
    const file = writeLog("t.json", `${line("a")}\n`);
    readClosedLogFile(file);

    const updated = writeLog("t.json", `${line("a")}\n${line("b")}\n`);

    expect(messages(readClosedLogFile(updated))).toEqual(["a", "b"]);
  });

  it("re-reads when asked for a different start offset", () => {
    const first = line("a");
    const file = writeLog("t.json", `${first}\n${line("b")}\n`);
    readClosedLogFile(file);

    expect(messages(readClosedLogFile(file, first.length + 1))).toEqual(["b"]);
  });

  it("forgets files that were pruned", () => {
    const file = writeLog("t.json", `${line("a")}\n`);
    const first = readClosedLogFile(file);

    pruneLogCache(new Set());

    expect(readClosedLogFile(file)).not.toBe(first);
  });
});
