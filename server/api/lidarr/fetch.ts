import { Agent } from "undici";

const agent = new Agent({ connect: { rejectUnauthorized: false } });

/** fetch wrapper for lidarr so we can skip TLS verification for self-signed/local certs */
export function lidarrFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...init,
    dispatcher: agent,
  } as RequestInit & { dispatcher: Agent });
}
