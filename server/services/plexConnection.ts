import {
  DEFAULT_PLEX_CONNECTION,
  getConfig,
  setConfig,
  type PlexConnectionConfig,
} from "../config";
import { getPlexAccountFull } from "../api/plex/account";
import {
  getServerResources,
  listServerConnections,
  type PlexServer,
  type PlexServerResource,
} from "../api/plex/servers";
import { TUNEARR_SERVER_CLIENT_ID } from "../api/plex/config";
import { ApiError } from "../middleware/ApiError";

export type PlexConnectionStatus = {
  connected: boolean;
  account: { username: string; thumb: string } | null;
  serverUrl: string;
  /** Whether the connected account owns the selected server; live sessions need it. */
  owned: boolean;
  servers: PlexServer[];
};

/** What server-level reads need: a token the server accepts, and whose account it calls `1`. */
export type PlexServerAccess = {
  token: string;
  ownerAccountId: string;
};

type ServerChoice = { resource: PlexServerResource; uri: string };

const normalizeUrl = (url: string): string => url.trim().replace(/\/+$/, "");

function findConnection(
  resources: PlexServerResource[],
  url: string
): ServerChoice | null {
  const wanted = normalizeUrl(url);
  if (!wanted) return null;
  for (const resource of resources) {
    const match = resource.connections.find(
      (c) => normalizeUrl(c.uri) === wanted
    );
    if (match) return { resource, uri: match.uri };
  }
  return null;
}

function pickDefaultConnection(
  resources: PlexServerResource[]
): ServerChoice | null {
  const all = resources.flatMap((resource) =>
    resource.connections.map((c) => ({ resource, uri: c.uri, local: c.local }))
  );
  const choice = all.find((c) => !c.local) ?? all[0];
  return choice ? { resource: choice.resource, uri: choice.uri } : null;
}

function ownerOf(resource: PlexServerResource, accountId: string): string {
  return resource.owned ? accountId : resource.ownerId;
}

function saveSelection(
  connection: PlexConnectionConfig,
  choice: ServerChoice
): void {
  setConfig({
    plexUrl: choice.uri,
    plexConnection: {
      ...connection,
      serverToken: choice.resource.accessToken,
      ownerAccountId: ownerOf(choice.resource, connection.accountId),
    },
  });
}

async function loadServers(accountToken: string): Promise<PlexServer[]> {
  try {
    return listServerConnections(
      await getServerResources(accountToken, TUNEARR_SERVER_CLIENT_ID)
    );
  } catch {
    return [];
  }
}

/**
 * The connection as the settings page shows it. Never carries a token. The server list is
 * read live from plex.tv, and an unreachable plex.tv leaves the picker empty rather than
 * failing the page.
 */
export async function getPlexConnectionStatus(): Promise<PlexConnectionStatus> {
  const { plexUrl, plexConnection } = getConfig();
  const connected = Boolean(plexConnection.serverToken);

  return {
    connected,
    account: connected
      ? { username: plexConnection.username, thumb: plexConnection.thumb }
      : null,
    serverUrl: plexUrl,
    owned:
      connected &&
      Boolean(plexConnection.accountId) &&
      plexConnection.ownerAccountId === plexConnection.accountId,
    servers: connected ? await loadServers(plexConnection.accountToken) : [],
  };
}

/**
 * Connect the Plex account behind `authToken`. Keeps the configured server when the account
 * can reach it, so signing in again does not move an install to another server.
 */
export async function connectPlex(
  authToken: string
): Promise<PlexConnectionStatus> {
  const [account, resources] = await Promise.all([
    getPlexAccountFull(authToken, TUNEARR_SERVER_CLIENT_ID),
    getServerResources(authToken, TUNEARR_SERVER_CLIENT_ID),
  ]);

  const choice =
    findConnection(resources, getConfig().plexUrl) ??
    pickDefaultConnection(resources);
  if (!choice) {
    throw new ApiError(400, "This Plex account has no media servers");
  }

  saveSelection(
    {
      ...DEFAULT_PLEX_CONNECTION,
      accountToken: authToken,
      accountId: String(account.id),
      username: account.username,
      thumb: account.thumb,
    },
    choice
  );
  return getPlexConnectionStatus();
}

export async function selectPlexServer(
  serverUrl: string
): Promise<PlexConnectionStatus> {
  const { plexConnection } = getConfig();
  if (!plexConnection.accountToken) {
    throw new ApiError(409, "Connect a Plex account first");
  }

  const resources = await getServerResources(
    plexConnection.accountToken,
    TUNEARR_SERVER_CLIENT_ID
  );
  const choice = findConnection(resources, serverUrl);
  if (!choice) {
    throw new ApiError(
      400,
      "That server is not available to the connected Plex account"
    );
  }

  saveSelection(plexConnection, choice);
  return getPlexConnectionStatus();
}

export function disconnectPlex(): void {
  setConfig({ plexUrl: "", plexConnection: { ...DEFAULT_PLEX_CONNECTION } });
}

/** Null until an admin has connected Plex and a server is selected. */
export function getPlexServerAccess(): PlexServerAccess | null {
  const { plexUrl, plexConnection } = getConfig();
  if (!plexUrl || !plexConnection.serverToken) return null;
  return {
    token: plexConnection.serverToken,
    ownerAccountId: plexConnection.ownerAccountId,
  };
}
