import { ApiError } from "../../middleware/ApiError";

/** Nothing we can ask a client to wait for is shorter than this. */
const MIN_RETRY_AFTER_MS = 1000;

/**
 * MusicBrainz refused, failed or ran out of time. Surfaces as a retryable 503,
 * not a 500: it says nothing about the request, only about the server right now.
 */
export class MbUnavailableError extends ApiError {
  constructor(message: string, retryAfterMs: number) {
    super(503, message, {
      retryable: true,
      retryAfterMs: Math.max(Math.round(retryAfterMs), MIN_RETRY_AFTER_MS),
    });
    this.name = "MbUnavailableError";
  }
}

export function isMbUnavailableError(
  error: unknown
): error is MbUnavailableError {
  return error instanceof MbUnavailableError;
}
