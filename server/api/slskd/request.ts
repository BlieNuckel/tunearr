import { getSlskdConfig } from "./config";
import { SlskdUnreachableError } from "./errors";
import { resilientFetch } from "../resilientFetch";
import { createLogger } from "../../logger";

const log = createLogger("slskd");

let unreachableSince: number | null = null;

/**
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * @param {SlskdUnreachableError} error
 */
function markUnreachable(error: SlskdUnreachableError): void {
  if (unreachableSince !== null) return;
  unreachableSince = Date.now();
  log.error(error.message);
}

/**
 * @param {string} baseUrl
 */
function markReachable(baseUrl: string): void {
  if (unreachableSince === null) return;
  const downFor = formatDuration(Date.now() - unreachableSince);
  unreachableSince = null;
  log.info(`slskd reachable again at ${baseUrl} after ${downFor}`);
}

/**
 * Calls slskd's API with the configured URL and key. A request that never
 * gets an answer throws `SlskdUnreachableError`; the first one of an outage is
 * logged, as is the first answer after it.
 * @param {string} path path under the slskd base URL, e.g. `/api/v0/searches`
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function slskdFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const { baseUrl, headers } = getSlskdConfig();

  let response: Response;
  try {
    response = await resilientFetch(`${baseUrl}${path}`, { ...init, headers });
  } catch (err) {
    const unreachable = new SlskdUnreachableError(baseUrl, err);
    markUnreachable(unreachable);
    throw unreachable;
  }

  markReachable(baseUrl);
  return response;
}
