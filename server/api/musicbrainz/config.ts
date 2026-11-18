import { resilientFetch } from "../resilientFetch";
import { isRetryableError, isRetryableStatus, retryAfterMs } from "../retry";
import {
  acquireMbSlot,
  getMbPauseRemainingMs,
  reportMbRefused,
  reportMbSuccess,
  type MbPriority,
  type MbRefusalKind,
} from "./queue";
import { getMbServer, type MbServer } from "./server";
import { markLoadFailed, markLoadNotFound } from "./loadContext";
import { MbUnavailableError } from "./errors";
import { TUNEARR_USER_AGENT } from "../userAgent";
import type { MbServerKind } from "../../../shared/musicbrainzServer";

/**
 * "outage" is a 503 from a server that isn't MusicBrainz's own: a mirror has no
 * load shedding, so a 503 there means it is down, not that we are too fast.
 */
type RefusalKind = MbRefusalKind | "outage";

export const MB_HEADERS = {
  "User-Agent": TUNEARR_USER_AGENT,
  Accept: "application/json",
};

/** First try plus retries, on either lane. Interactive retries also stop at the deadline. */
const MB_MAX_ATTEMPTS = 3;

/**
 * A page request gives up after this long, queue wait and retries included,
 * so a busy MusicBrainz costs a few seconds and a retryable 503, not 14s and a 500.
 */
export const MB_INTERACTIVE_DEADLINE_MS = 6000;

/** Pollers can afford to wait: a fault that isn't a rate signal is retried after 2s, then 4s. */
const BACKGROUND_RETRY_BASE_MS = 2000;

const DEFAULT_ATTEMPT_TIMEOUT_MS = 10_000;

/**
 * 404 means the entity doesn't exist and 400 means the MBID can never resolve —
 * both are real answers worth caching. Everything else (429, 5xx) is a statement
 * about MusicBrainz, not about the entity, so it throws rather than being cached
 * as a miss for the next month.
 */
const NOT_FOUND_STATUSES = new Set([400, 404]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How a refusal is read depends on who sent it. MusicBrainz's own servers send
 * 503 when shedding load (rest a second) and the MetaBrainz gateway sends 429
 * when it blocks an address (rest minutes). A mirror's 503 is an outage, and
 * its 429 can only be its own rate limit.
 */
export function classifyRefusal(
  status: number,
  serverKind: MbServerKind
): RefusalKind | null {
  if (status === 429) return serverKind === "official" ? "block" : "rate";
  if (status === 503) return serverKind === "official" ? "rate" : "outage";
  return null;
}

function recordResponse(
  response: Response,
  server: MbServer
): RefusalKind | null {
  const refusal = classifyRefusal(response.status, server.kind);
  if (refusal === "rate" || refusal === "block") {
    reportMbRefused(refusal, retryAfterMs(response));
  } else if (refusal === null) {
    reportMbSuccess();
  }
  return refusal;
}

function shouldRetryResponse(
  response: Response,
  refusal: RefusalKind | null,
  priority: MbPriority
): boolean {
  if (!isRetryableStatus(response.status)) return false;
  if (refusal === "block") return false;
  return !(priority === "interactive" && refusal === "outage");
}

function attemptTimeoutMs(deadlineAt: number | undefined): number {
  if (deadlineAt === undefined) return DEFAULT_ATTEMPT_TIMEOUT_MS;
  return Math.max(
    Math.min(deadlineAt - Date.now(), DEFAULT_ATTEMPT_TIMEOUT_MS),
    1
  );
}

/**
 * Rate and block refusals already paused the queue, so the next slot is the
 * wait. Anything else waits here on the background lane; a page retries at once
 * and lets the deadline decide.
 */
async function backOffBeforeRetry(
  priority: MbPriority,
  refusal: RefusalKind | null,
  attempt: number
): Promise<void> {
  if (priority !== "background") return;
  if (refusal === "rate" || refusal === "block") return;
  await delay(BACKGROUND_RETRY_BASE_MS * Math.pow(2, attempt));
}

/**
 * Fetch from MusicBrainz through the shared request queue. Every MusicBrainz
 * call must go through here — the queue is the only thing holding us to the
 * server's pace, so a single call that bypasses it turns a paced stream back
 * into a burst.
 *
 * `path` is relative to `/ws/2` (e.g. `/artist/<mbid>?fmt=json`) and resolved
 * against the configured server at call time, so a server change applies to the
 * next request.
 *
 * Each attempt takes its own slot, so a retry is paced like any other request
 * rather than firing straight back at a service that just refused us. Retries
 * are handled here instead of inside `resilientFetch` for exactly that reason.
 * Interactive requests run under MB_INTERACTIVE_DEADLINE_MS, queue wait
 * included; past it they reject with a retryable MbUnavailableError.
 */
export async function mbFetch(
  path: string,
  priority: MbPriority = "interactive",
  server: MbServer = getMbServer()
): Promise<Response> {
  const url = `${server.baseUrl}${path}`;
  const deadlineAt =
    priority === "interactive"
      ? Date.now() + MB_INTERACTIVE_DEADLINE_MS
      : undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < MB_MAX_ATTEMPTS; attempt += 1) {
    const isLast = attempt === MB_MAX_ATTEMPTS - 1;
    await acquireMbSlot(priority, deadlineAt);

    try {
      const response = await resilientFetch(
        url,
        { headers: MB_HEADERS },
        { retry: false, timeoutMs: attemptTimeoutMs(deadlineAt) }
      );
      const refusal = recordResponse(response, server);

      if (isLast || !shouldRetryResponse(response, refusal, priority)) {
        return response;
      }
      await backOffBeforeRetry(priority, refusal, attempt);
    } catch (error) {
      lastError = error;
      if (isLast || !isRetryableError(error)) throw error;
      await backOffBeforeRetry(priority, null, attempt);
    }
  }

  throw lastError;
}

function unavailableFromResponse(response: Response): MbUnavailableError {
  return new MbUnavailableError(
    `MusicBrainz is busy (returned ${response.status})`,
    Math.max(retryAfterMs(response) ?? 0, getMbPauseRemainingMs())
  );
}

/** A fault on the way to MusicBrainz is as retryable as a refusal from it. */
function unavailableFromError(error: unknown): unknown {
  if (error instanceof MbUnavailableError || !isRetryableError(error)) {
    return error;
  }
  return new MbUnavailableError(
    "MusicBrainz didn't answer in time",
    getMbPauseRemainingMs()
  );
}

/**
 * Fetch and parse a MusicBrainz JSON document. Returns null when it doesn't
 * exist. Throws a retryable MbUnavailableError (503) when MusicBrainz refuses,
 * fails or runs out of time. Reports a miss or a failure to the cached load it runs in, so a load
 * built from several calls knows not to cache an incomplete answer.
 */
export async function mbJson<T>(
  path: string,
  priority: MbPriority = "interactive"
): Promise<T | null> {
  let response: Response;
  try {
    response = await mbFetch(path, priority);
  } catch (error) {
    markLoadFailed();
    throw unavailableFromError(error);
  }

  if (NOT_FOUND_STATUSES.has(response.status)) {
    markLoadNotFound();
    return null;
  }
  if (!response.ok) {
    markLoadFailed();
    if (isRetryableStatus(response.status)) {
      throw unavailableFromResponse(response);
    }
    throw new Error(`MusicBrainz returned ${response.status}`);
  }

  return (await response.json()) as T;
}
