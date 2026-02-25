import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../logger";

const log = createLogger("ErrorHandler");

/** Generic error handler — must be registered after all routes */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500;
  const cause =
    err instanceof Error
      ? (err as NodeJS.ErrnoException & { cause?: unknown }).cause
      : undefined;
  const message =
    cause instanceof Error
      ? cause.message
      : err instanceof Error
        ? err.message
        : typeof (err as { message?: unknown })?.message === "string"
          ? (err as { message: string }).message
          : "Unknown error";

  log.error(`${status} ${message}`, err);

  res.status(status).json({ error: message });
}
