type Logger = { error(message: string, data?: unknown): void };

const MAX_CAUSE_DEPTH = 5;

const FAILURE_REASONS: Record<string, string> = {
  ECONNREFUSED: "connection refused, is slskd running?",
  ENOTFOUND: "host not found, check the slskd URL",
  EAI_AGAIN: "host name lookup failed, check the slskd URL and DNS",
  EHOSTUNREACH: "host unreachable",
  ENETUNREACH: "network unreachable",
  ETIMEDOUT: "connection timed out",
  UND_ERR_CONNECT_TIMEOUT: "connection timed out",
  ECONNRESET: "connection reset",
  UND_ERR_SOCKET: "connection closed unexpectedly",
  TimeoutError: "no response before the request timed out",
};

/**
 * slskd could not be reached at all, as opposed to answering with an error
 * status. Its message names the URL and the reason in one readable line.
 */
export class SlskdUnreachableError extends Error {
  /**
   * @param {string} baseUrl
   * @param {unknown} cause
   */
  constructor(baseUrl: string, cause: unknown) {
    super(
      `slskd unreachable at ${baseUrl}: ${describeConnectionFailure(cause)}`,
      {
        cause,
      }
    );
    this.name = "SlskdUnreachableError";
  }
}

/**
 * @param {unknown} error
 * @returns {string | undefined}
 */
function ownCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { code, name } = error as { code?: unknown; name?: unknown };
  if (typeof code === "string" && code in FAILURE_REASONS) return code;
  if (typeof name === "string" && name in FAILURE_REASONS) return name;
  return undefined;
}

/**
 * Walks undici's `fetch failed` → cause → AggregateError chain for the first
 * error code we can explain.
 * @param {unknown} error
 * @param {number} depth
 * @returns {string | undefined}
 */
function findFailureCode(error: unknown, depth = 0): string | undefined {
  if (!error || typeof error !== "object" || depth > MAX_CAUSE_DEPTH) {
    return undefined;
  }

  const code = ownCode(error);
  if (code) return code;

  const { cause, errors } = error as { cause?: unknown; errors?: unknown };
  const fromCause = findFailureCode(cause, depth + 1);
  if (fromCause) return fromCause;

  if (Array.isArray(errors)) {
    for (const inner of errors) {
      const fromInner = findFailureCode(inner, depth + 1);
      if (fromInner) return fromInner;
    }
  }
  return undefined;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function innermostMessage(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    const cause = (current as { cause?: unknown } | null)?.cause;
    if (!(cause instanceof Error)) break;
    current = cause;
  }
  return current instanceof Error ? current.message : String(current);
}

/**
 * Turns a thrown fetch error into a short human reason, e.g. "connection
 * refused, is slskd running?".
 * @param {unknown} error
 * @returns {string}
 */
export function describeConnectionFailure(error: unknown): string {
  const code = findFailureCode(error);
  return code ? FAILURE_REASONS[code] : innermostMessage(error);
}

/**
 * Logs a failed slskd operation, except when slskd is unreachable: that is
 * logged once per outage by `slskdFetch`, not once per caller and poll.
 * @param {Logger} log
 * @param {string} message
 * @param {unknown} error
 */
export function logSlskdFailure(
  log: Logger,
  message: string,
  error: unknown
): void {
  if (error instanceof SlskdUnreachableError) return;
  log.error(message, error);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
