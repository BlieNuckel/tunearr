import { resilientFetch } from "../resilientFetch";
import { getConfig } from "../../config";

type PlexResource = {
  name: string;
  provides: string;
  accessToken: string;
  connections: { uri: string; local: boolean }[];
};

export type PlexServer = {
  name: string;
  uri: string;
  local: boolean;
};

async function fetchResources(
  token: string,
  clientId: string
): Promise<PlexResource[]> {
  const res = await resilientFetch(
    "https://plex.tv/api/v2/resources?includeHttps=1",
    {
      headers: {
        Accept: "application/json",
        "X-Plex-Token": token,
        "X-Plex-Client-Identifier": clientId,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Plex returned ${res.status}`);
  }

  return res.json();
}

export async function getPlexServers(
  token: string,
  clientId: string
): Promise<PlexServer[]> {
  const resources = await fetchResources(token, clientId);

  return resources
    .filter((r) => r.provides.includes("server"))
    .flatMap((r) =>
      r.connections.map((c) => ({
        name: r.name,
        uri: c.uri,
        local: c.local,
      }))
    );
}

/**
 * For shared/friend users, the plex.tv account token cannot access the media
 * server directly. Each resource in the resources API has a server-specific
 * `accessToken` that must be used instead. This function finds the resource
 * matching the configured plexUrl and returns its accessToken.
 * Falls back to the original account token if no match is found (server owner case).
 */
export async function getServerAccessToken(
  accountToken: string,
  clientId: string
): Promise<string> {
  const config = getConfig();
  if (!config.plexUrl) return accountToken;

  const normalizedPlexUrl = config.plexUrl.replace(/\/+$/, "");

  try {
    const resources = await fetchResources(accountToken, clientId);
    const serverResource = resources
      .filter((r) => r.provides.includes("server"))
      .find((r) =>
        r.connections.some(
          (c) => c.uri.replace(/\/+$/, "") === normalizedPlexUrl
        )
      );

    return serverResource?.accessToken ?? accountToken;
  } catch {
    return accountToken;
  }
}
