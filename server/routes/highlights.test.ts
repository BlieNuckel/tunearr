import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetHighlights = vi.fn();
const mockDismissHighlight = vi.fn();

vi.mock("../services/highlights/highlights", () => ({
  HIGHLIGHT_KINDS: ["release", "live"],
  getHighlights: (...args: unknown[]) => mockGetHighlights(...args),
  dismissHighlight: (...args: unknown[]) => mockDismissHighlight(...args),
}));

import express from "express";
import request from "supertest";
import highlightsRouter from "./highlights";
import { ApiError } from "../middleware/ApiError";

const app = express();
app.use((req, _res, next) => {
  req.user = { id: 7, permissions: 9, username: "lasse" } as never;
  next();
});
app.use("/", highlightsRouter);
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const status = err instanceof ApiError ? err.status : 500;
    res.status(status).json({ error: err.message });
  }
);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetHighlights.mockResolvedValue({ items: [] });
  mockDismissHighlight.mockResolvedValue(true);
});

describe("GET /", () => {
  it("returns the signed-in user's highlights", async () => {
    const payload = { items: [{ kind: "release", key: "release:1" }] };
    mockGetHighlights.mockResolvedValue(payload);

    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
    expect(mockGetHighlights).toHaveBeenCalledWith(7);
  });
});

describe("POST /:kind/:id/dismiss", () => {
  it("dismisses the highlight for the signed-in user", async () => {
    const res = await request(app).post("/release/12/dismiss");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockDismissHighlight).toHaveBeenCalledWith(7, "release", 12);
  });

  it("dismisses a live date", async () => {
    await request(app).post("/live/34/dismiss");
    expect(mockDismissHighlight).toHaveBeenCalledWith(7, "live", 34);
  });

  it("rejects an unknown kind", async () => {
    const res = await request(app).post("/podcast/1/dismiss");

    expect(res.status).toBe(400);
    expect(mockDismissHighlight).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-3", "1.5"])("rejects the id %s", async (id) => {
    const res = await request(app).post(`/release/${id}/dismiss`);

    expect(res.status).toBe(400);
    expect(mockDismissHighlight).not.toHaveBeenCalled();
  });

  it("returns 404 when there is nothing of the user's to dismiss", async () => {
    mockDismissHighlight.mockResolvedValue(false);

    const res = await request(app).post("/release/12/dismiss");

    expect(res.status).toBe(404);
  });
});
