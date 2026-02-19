import type { Request, Response, NextFunction } from "express";

/** Generic error handler — must be registered after all routes */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Unknown error";
  res.status(500).json({ error: message });
}
