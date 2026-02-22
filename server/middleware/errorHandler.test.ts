import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "./errorHandler";
import { ApiError } from "./ApiError";
import type { Request, Response, NextFunction } from "express";

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("errorHandler", () => {
  it("sends 500 with Error message", () => {
    const res = createMockRes();
    errorHandler(
      new Error("Something broke"),
      {} as Request,
      res,
      vi.fn() as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Something broke" });
  });

  it('sends 500 with "Unknown error" for non-Error', () => {
    const res = createMockRes();
    errorHandler("string error", {} as Request, res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Unknown error" });
  });

  it("respects status property on error objects", () => {
    const res = createMockRes();
    const err = new ApiError(404, "Album not found");
    errorHandler(err, {} as Request, res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Album not found" });
  });

  it("respects status on plain objects with status and message", () => {
    const res = createMockRes();
    errorHandler(
      { status: 403, message: "Forbidden" },
      {} as Request,
      res,
      vi.fn() as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("defaults to 500 when status is not a number", () => {
    const res = createMockRes();
    const err = Object.assign(new Error("bad"), { status: "not a number" });
    errorHandler(err, {} as Request, res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("uses cause message when available", () => {
    const res = createMockRes();
    const err = Object.assign(new Error("wrapper"), {
      cause: new Error("root cause"),
    });
    errorHandler(err, {} as Request, res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "root cause" });
  });
});
