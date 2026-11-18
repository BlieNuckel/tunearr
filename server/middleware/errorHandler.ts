import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../logger";

const log = createLogger("ErrorHandler");

type ErrorBody = {
  error: string;
  retryable?: true;
  retryAfterMs?: number;
};

function statusOf(err: unknown): number {
  return typeof (err as { status?: unknown })?.status === "number"
    ? (err as { status: number }).status
    : 500;
}

function messageOf(err: unknown): string {
  const cause =
    err instanceof Error
      ? (err as NodeJS.ErrnoException & { cause?: unknown }).cause
      : undefined;
  if (cause instanceof Error) return cause.message;
  if (err instanceof Error) return err.message;
  if (typeof (err as { message?: unknown })?.message === "string") {
    return (err as { message: string }).message;
  }
  return "Unknown error";
}

/**
 * A retryable error tells the client it may ask again on its own, and when.
 * Anything else carries only its message.
 */
function bodyOf(err: unknown, message: string): ErrorBody {
  const { retryable, retryAfterMs } = (err ?? {}) as {
    retryable?: unknown;
    retryAfterMs?: unknown;
  };
  if (retryable !== true) return { error: message };

  return {
    error: message,
    retryable: true,
    ...(typeof retryAfterMs === "number" ? { retryAfterMs } : {}),
  };
}

/** Generic error handler — must be registered after all routes */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = statusOf(err);
  const message = messageOf(err);
  const body = bodyOf(err, message);

  if (body.retryable) {
    log.warn(`${status} ${message} (retryable)`);
  } else {
    log.error(`${status} ${message}`, err);
  }

  res.status(status).json(body);
}
