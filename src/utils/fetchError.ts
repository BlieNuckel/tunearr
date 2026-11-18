/**
 * What kind of failure a section hit, which decides its copy: a missing entity,
 * a busy upstream worth retrying, or anything else.
 */
export type ErrorKind = "notFound" | "busy" | "other";

type ErrorBody = {
  error?: string;
  retryable?: boolean;
  retryAfterMs?: number;
};

/**
 * A failed API response, keeping what the server said about retrying. The
 * server marks MusicBrainz refusals `retryable` with a `retryAfterMs`.
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable = false,
    public retryAfterMs?: number
  ) {
    super(message);
    this.name = "FetchError";
  }
}

/** Build a FetchError from a non-OK response, reading the server's error body. */
export async function responseError(
  res: Response,
  fallback: string
): Promise<FetchError> {
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  return new FetchError(
    body.error || fallback,
    res.status,
    body.retryable === true,
    typeof body.retryAfterMs === "number" ? body.retryAfterMs : undefined
  );
}

export function isRetryableError(error: unknown): error is FetchError {
  return error instanceof FetchError && error.retryable;
}

export function errorKindOf(error: unknown): ErrorKind {
  if (error instanceof FetchError) {
    if (error.status === 404) return "notFound";
    if (error.retryable) return "busy";
  }
  return "other";
}
