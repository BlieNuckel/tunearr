import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock("fs", () => ({
  default: {
    existsSync: (p: string) => mockExistsSync(p),
    readFileSync: (p: string, encoding: string) =>
      mockReadFileSync(p, encoding),
  },
  existsSync: (p: string) => mockExistsSync(p),
  readFileSync: (p: string, encoding: string) => mockReadFileSync(p, encoding),
}));

import express from "express";
import request from "supertest";
import logsRouter from "./logs";

const app = express();
app.use(express.json());
app.use("/logs", logsRouter);

const mockLogs = [
  {
    timestamp: "2026-03-01 10:00:00",
    level: "info",
    label: "Server",
    message: "Server started",
  },
  {
    timestamp: "2026-03-01 10:01:00",
    level: "warn",
    label: "API",
    message: "Rate limit approaching",
    data: { remaining: 5 },
  },
  {
    timestamp: "2026-03-01 10:02:00",
    level: "error",
    label: "Database",
    message: "Connection failed",
    data: { code: "ECONNREFUSED" },
  },
  {
    timestamp: "2026-03-01 10:03:00",
    level: "info",
    label: "Import",
    message: "Import completed",
  },
  {
    timestamp: "2026-03-01 10:04:00",
    level: "error",
    label: "API",
    message: "Request timeout",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /logs", () => {
  it("returns empty array when file doesn't exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      logs: [],
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
    });
  });

  it("returns all logs in reverse chronological order", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(5);
    expect(res.body.logs[0].message).toBe("Request timeout"); // Newest first
    expect(res.body.logs[4].message).toBe("Server started"); // Oldest last
    expect(res.body.totalCount).toBe(5);
    expect(res.body.totalPages).toBe(1);
  });

  it("filters by level (info)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?level=info");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs.every((log: any) => log.level === "info")).toBe(true);
    expect(res.body.totalCount).toBe(2);
  });

  it("filters by level (warn)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?level=warn");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].level).toBe("warn");
    expect(res.body.totalCount).toBe(1);
  });

  it("filters by level (error)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?level=error");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs.every((log: any) => log.level === "error")).toBe(true);
    expect(res.body.totalCount).toBe(2);
  });

  it("filters by search (case-insensitive, matches message)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?search=import");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].message).toBe("Import completed");
  });

  it("filters by search (case-insensitive, matches label)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?search=api");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs.every((log: any) => log.label === "API")).toBe(true);
  });

  it("paginates results (page 1)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?page=1&pageSize=2");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
    expect(res.body.totalCount).toBe(5);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.logs[0].message).toBe("Request timeout");
  });

  it("paginates results (page 2)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?page=2&pageSize=2");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.page).toBe(2);
    expect(res.body.logs[0].message).toBe("Connection failed");
  });

  it("enforces max page size of 100", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?pageSize=200");
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(100);
  });

  it("defaults to page 1 and pageSize 25", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(25);
  });

  it("skips invalid JSON lines silently", async () => {
    mockExistsSync.mockReturnValue(true);
    const validLog = JSON.stringify(mockLogs[0]);
    const invalidContent = `${validLog}\ninvalid json line\n${JSON.stringify(mockLogs[1])}`;
    mockReadFileSync.mockReturnValue(invalidContent);

    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.totalCount).toBe(2);
  });

  it("handles empty file", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("");

    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(0);
    expect(res.body.totalCount).toBe(0);
  });

  it("returns 500 on read error", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Read error");
    });

    const res = await request(app).get("/logs");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to read logs");
  });

  it("combines level filter and search", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      mockLogs.map((log) => JSON.stringify(log)).join("\n")
    );

    const res = await request(app).get("/logs?level=error&search=api");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].message).toBe("Request timeout");
    expect(res.body.logs[0].level).toBe("error");
    expect(res.body.logs[0].label).toBe("API");
  });
});
