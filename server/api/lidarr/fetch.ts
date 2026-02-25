import { Agent } from "undici";
import { resilientFetch } from "../resilientFetch";

const agent = new Agent({ connect: { rejectUnauthorized: false } });

/** fetch via undici agent so we can skip TLS verification for self-signed/local certs */
function rawFetch(
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...init,
    dispatcher: agent,
  } as RequestInit & { dispatcher: Agent });
}

/** Resilient fetch wrapper for Lidarr with TLS skip + timeout + retry */
export function lidarrFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return resilientFetch(url, init, { fetchFn: rawFetch });
}
