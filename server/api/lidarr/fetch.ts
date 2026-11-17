import { Agent, fetch as undiciFetch } from "undici";
import { resilientFetch } from "../resilientFetch";

const agent = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * Fetch through undici's own `fetch` so we can skip TLS verification for self-signed/local
 * certs. Node's global `fetch` bundles an older undici whose handler API a newer `Agent`
 * rejects ("invalid onRequestStart method"), so the agent and the fetch must come from the
 * same package.
 */
function rawFetch(
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  return undiciFetch(url as Parameters<typeof undiciFetch>[0], {
    ...(init as Parameters<typeof undiciFetch>[1]),
    dispatcher: agent,
  }) as unknown as Promise<Response>;
}

/** Resilient fetch wrapper for Lidarr with TLS skip + timeout + retry */
export function lidarrFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return resilientFetch(url, init, { fetchFn: rawFetch });
}
