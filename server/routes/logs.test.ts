import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetLogs = vi.fn();

vi.mock("../logs/getLogs", () => ({
  getLogs: (...args: unknown[]) => mockGetLogs(...args),
}));

import express from "express";
import request from "supertest";
import logsRouter from "./logs";

const app = express();
app.use("/", logsRouter);

const EMPTY = {
  logs: [],
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 0,
  truncated: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLogs.mockReturnValue(EMPTY);
});

describe("GET /", () => {
  it("returns the requested page with defaults", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(EMPTY);
    expect(mockGetLogs).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      level: undefined,
      search: undefined,
    });
  });

  it("passes levels, search and paging through", async () => {
    await request(app).get(
      "/?page=3&pageSize=50&level=warn&level=error&search=resolve"
    );

    expect(mockGetLogs).toHaveBeenCalledWith({
      page: 3,
      pageSize: 50,
      level: ["warn", "error"],
      search: "resolve",
    });
  });

  it("wraps a single level in a list", async () => {
    await request(app).get("/?level=error");

    expect(mockGetLogs).toHaveBeenCalledWith(
      expect.objectContaining({ level: ["error"] })
    );
  });

  it("clamps the page size and page number", async () => {
    await request(app).get("/?page=-2&pageSize=500");

    expect(mockGetLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 100 })
    );
  });

  it("answers 500 when the logs cannot be read", async () => {
    mockGetLogs.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const res = await request(app).get("/");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to read logs" });
  });
});
