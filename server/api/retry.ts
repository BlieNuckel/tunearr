export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
]);

function hasRetryableCode(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (typeof code === "string" && RETRYABLE_NETWORK_CODES.has(code))
    return true;

  const cause = (error as { cause?: unknown })?.cause;
  if (cause && typeof cause === "object") {
    const causeCode = (cause as NodeJS.ErrnoException).code;
    if (typeof causeCode === "string" && RETRYABLE_NETWORK_CODES.has(causeCode))
      return true;
  }

  return false;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;

  if (hasRetryableCode(error)) return true;

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return RETRYABLE_STATUS_CODES.has((error as { status: number }).status);
  }

  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const retries = options?.retries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const retryOn = options?.retryOn ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries || !retryOn(error)) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
