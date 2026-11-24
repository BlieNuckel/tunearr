import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getLogs } from "./getLogs";
import { clearLogCache } from "./readLogFile";
import type { LogLevel } from "./types";

type Line = {
  message: string;
  level?: LogLevel;
  label?: string;
};

let dir: string;

function toJson({ message, level = "info", label = "Test" }: Line): string {
  return JSON.stringify({
    timestamp: "2026-11-23 10:00:00",
    level,
    label,
    message,
  });
}

function writeLog(name: string, lines: Line[]): number {
  const content = lines.map((l) => `${toJson(l)}\n`).join("");
  fs.writeFileSync(path.join(dir, name), content);
  return Buffer.byteLength(content);
}

function messagesOf(query: Parameters<typeof getLogs>[0], maxBytes?: number) {
  return getLogs(query, dir, maxBytes).logs.map((log) => log.message);
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "get-logs-"));
  clearLogCache();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("getLogs", () => {
  it("returns an empty page when there are no log files", () => {
    expect(getLogs({ page: 1, pageSize: 25 }, dir)).toEqual({
      logs: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
      truncated: false,
    });
  });

  it("merges rotated days and size parts newest first", () => {
    writeLog("tunearr-2026-11-21.json", [
      { message: "21a" },
      { message: "21b" },
    ]);
    writeLog("tunearr-2026-11-22.json", [{ message: "22a" }]);
    writeLog("tunearr-2026-11-23.json", [{ message: "23a" }]);
    writeLog("tunearr-2026-11-23.json.1", [{ message: "23b" }]);

    expect(messagesOf({ page: 1, pageSize: 25 })).toEqual([
      "23b",
      "23a",
      "22a",
      "21b",
      "21a",
    ]);
  });

  it("finds entries that were logged on an earlier day", () => {
    writeLog("tunearr-2026-11-22.json", [
      { message: "Could not resolve artist", label: "LiveEvents" },
    ]);
    writeLog("tunearr-2026-11-23.json", [{ message: "Server started" }]);

    const result = getLogs(
      { page: 1, pageSize: 25, search: "could not resolve" },
      dir
    );

    expect(result.logs.map((log) => log.message)).toEqual([
      "Could not resolve artist",
    ]);
    expect(result.totalCount).toBe(1);
  });

  it("filters by level and label across files", () => {
    writeLog("tunearr-2026-11-22.json", [
      { message: "old error", level: "error" },
      { message: "old info" },
    ]);
    writeLog("tunearr-2026-11-23.json", [
      { message: "new warning", level: "warn", label: "Poller" },
      { message: "new error", level: "error" },
    ]);

    expect(messagesOf({ page: 1, pageSize: 25, level: ["error"] })).toEqual([
      "new error",
      "old error",
    ]);
    expect(messagesOf({ page: 1, pageSize: 25, search: "poller" })).toEqual([
      "new warning",
    ]);
  });

  it("paginates across file boundaries", () => {
    writeLog("tunearr-2026-11-22.json", [{ message: "1" }, { message: "2" }]);
    writeLog("tunearr-2026-11-23.json", [{ message: "3" }, { message: "4" }]);

    const result = getLogs({ page: 2, pageSize: 3 }, dir);

    expect(result.logs.map((log) => log.message)).toEqual(["1"]);
    expect(result.totalCount).toBe(4);
    expect(result.totalPages).toBe(2);
  });

  it("always reads the current file in full, whatever the budget", () => {
    writeLog("tunearr-2026-11-23.json", [{ message: "a" }, { message: "b" }]);

    expect(messagesOf({ page: 1, pageSize: 25 }, 0)).toEqual(["b", "a"]);
  });

  it("reads older files only up to the byte budget and says so", () => {
    const olderBytes = writeLog("tunearr-2026-11-22.json", [
      { message: "22a" },
      { message: "22b" },
    ]);
    writeLog("tunearr-2026-11-21.json", [{ message: "21a" }]);
    writeLog("tunearr-2026-11-23.json", [{ message: "23a" }]);

    const result = getLogs({ page: 1, pageSize: 25 }, dir, olderBytes);

    expect(result.logs.map((log) => log.message)).toEqual([
      "23a",
      "22b",
      "22a",
    ]);
    expect(result.truncated).toBe(true);
  });

  it("keeps the newest part of an older file that crosses the budget", () => {
    const lineBytes = writeLog("tunearr-2026-11-22.json", [{ message: "x" }]);
    writeLog("tunearr-2026-11-22.json", [
      { message: "a" },
      { message: "b" },
      { message: "c" },
    ]);
    writeLog("tunearr-2026-11-23.json", [{ message: "today" }]);

    const result = getLogs({ page: 1, pageSize: 25 }, dir, lineBytes * 2);

    expect(result.logs.map((log) => log.message)).toEqual(["today", "c", "b"]);
    expect(result.truncated).toBe(true);
  });

  it("is not truncated when every older file fits the budget", () => {
    const olderBytes = writeLog("tunearr-2026-11-22.json", [{ message: "a" }]);
    writeLog("tunearr-2026-11-23.json", [{ message: "b" }]);

    expect(getLogs({ page: 1, pageSize: 25 }, dir, olderBytes).truncated).toBe(
      false
    );
  });

  it("picks up new entries in the current file between requests", () => {
    writeLog("tunearr-2026-11-22.json", [{ message: "old" }]);
    writeLog("tunearr-2026-11-23.json", [{ message: "first" }]);
    getLogs({ page: 1, pageSize: 25 }, dir);

    writeLog("tunearr-2026-11-23.json", [
      { message: "first" },
      { message: "second" },
    ]);

    expect(messagesOf({ page: 1, pageSize: 25 })).toEqual([
      "second",
      "first",
      "old",
    ]);
  });

  it("stops showing an older file once it has been deleted", () => {
    writeLog("tunearr-2026-11-22.json", [{ message: "old" }]);
    writeLog("tunearr-2026-11-23.json", [{ message: "new" }]);
    getLogs({ page: 1, pageSize: 25 }, dir);

    fs.rmSync(path.join(dir, "tunearr-2026-11-22.json"));

    expect(messagesOf({ page: 1, pageSize: 25 })).toEqual(["new"]);
  });
});
