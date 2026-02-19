import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "./errorHandler";
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
});
