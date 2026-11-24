import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlexServerResource } from "../api/plex/servers";

const mockGetPlexAccountFull = vi.fn();
const mockGetServerResources = vi.fn();

vi.mock("../api/plex/account", () => ({
  getPlexAccountFull: (...args: unknown[]) => mockGetPlexAccountFull(...args),
}));
vi.mock("../api/plex/servers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/plex/servers")>()),
  getServerResources: (...args: unknown[]) => mockGetServerResources(...args),
}));

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: { current: {} as Record<string, unknown> },
}));

vi.mock("../config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config")>();
  return {
    ...actual,
    getConfig: () => mockConfig.current,
    setConfig: (patch: Record<string, unknown>) => {
      const current = mockConfig.current as {
        plexConnection: Record<string, unknown>;
      };
      mockConfig.current = {
        ...current,
        ...patch,
        plexConnection: {
          ...current.plexConnection,
          ...((patch.plexConnection as object) ?? {}),
        },
      };
    },
  };
});

import {
  connectPlex,
  disconnectPlex,
  getPlexConnectionStatus,
  getPlexServerAccess,
  selectPlexServer,
} from "./plexConnection";
import { DEFAULT_PLEX_CONNECTION } from "../config";

const ownedServer: PlexServerResource = {
  name: "Home",
  accessToken: "home-token",
  owned: true,
  ownerId: "",
  connections: [
    { uri: "http://192.168.1.10:32400", local: true },
    { uri: "https://home.plex.direct:32400", local: false },
  ],
};

const friendServer: PlexServerResource = {
  name: "Friend",
  accessToken: "friend-token",
  owned: false,
  ownerId: "900",
  connections: [{ uri: "https://friend.plex.direct:32400", local: false }],
};

function config() {
  return mockConfig.current as {
    plexUrl: string;
    plexConnection: typeof DEFAULT_PLEX_CONNECTION;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.current = {
    plexUrl: "",
    plexConnection: { ...DEFAULT_PLEX_CONNECTION },
  };
  mockGetPlexAccountFull.mockResolvedValue({
    id: 42,
    username: "owner",
    email: "owner@example.com",
    thumb: "https://plex.tv/thumb",
  });
  mockGetServerResources.mockResolvedValue([ownedServer, friendServer]);
});

describe("connectPlex", () => {
  it("stores the account and the selected server's token", async () => {
    await connectPlex("auth-token");

    expect(config().plexUrl).toBe("https://home.plex.direct:32400");
    expect(config().plexConnection).toEqual({
      accountToken: "auth-token",
      serverToken: "home-token",
      accountId: "42",
      username: "owner",
      thumb: "https://plex.tv/thumb",
      ownerAccountId: "42",
    });
  });

  it("keeps the configured server when the account can reach it", async () => {
    mockConfig.current.plexUrl = "https://friend.plex.direct:32400/";

    const status = await connectPlex("auth-token");

    expect(config().plexUrl).toBe("https://friend.plex.direct:32400");
    expect(config().plexConnection.serverToken).toBe("friend-token");
    expect(config().plexConnection.ownerAccountId).toBe("900");
    expect(status.owned).toBe(false);
  });

  it("refuses an account with no servers", async () => {
    mockGetServerResources.mockResolvedValue([]);

    await expect(connectPlex("auth-token")).rejects.toMatchObject({
      status: 400,
    });
    expect(config().plexConnection.serverToken).toBe("");
  });
});

describe("selectPlexServer", () => {
  it("switches to another server with that server's token and owner", async () => {
    await connectPlex("auth-token");

    await selectPlexServer("https://friend.plex.direct:32400");

    expect(config().plexUrl).toBe("https://friend.plex.direct:32400");
    expect(config().plexConnection).toMatchObject({
      accountToken: "auth-token",
      serverToken: "friend-token",
      ownerAccountId: "900",
    });
  });

  it("refuses a server the account cannot reach", async () => {
    await connectPlex("auth-token");

    await expect(
      selectPlexServer("http://elsewhere:32400")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses before any account is connected", async () => {
    await expect(
      selectPlexServer("https://home.plex.direct:32400")
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("getPlexConnectionStatus", () => {
  it("reports no connection and lists no servers", async () => {
    expect(await getPlexConnectionStatus()).toEqual({
      connected: false,
      account: null,
      serverUrl: "",
      owned: false,
      servers: [],
    });
    expect(mockGetServerResources).not.toHaveBeenCalled();
  });

  it("describes the connection without any token", async () => {
    await connectPlex("auth-token");

    const status = await getPlexConnectionStatus();

    expect(status).toMatchObject({
      connected: true,
      account: { username: "owner", thumb: "https://plex.tv/thumb" },
      serverUrl: "https://home.plex.direct:32400",
      owned: true,
    });
    expect(status.servers).toHaveLength(3);
    expect(JSON.stringify(status)).not.toContain("token");
  });

  it("leaves the picker empty when plex.tv is unreachable", async () => {
    await connectPlex("auth-token");
    mockGetServerResources.mockRejectedValue(new Error("Plex returned 503"));

    const status = await getPlexConnectionStatus();

    expect(status.connected).toBe(true);
    expect(status.servers).toEqual([]);
  });
});

describe("getPlexServerAccess", () => {
  it("is null until a server is connected", () => {
    expect(getPlexServerAccess()).toBeNull();
  });

  it("hands out the server token and its owner", async () => {
    await connectPlex("auth-token");
    expect(getPlexServerAccess()).toEqual({
      token: "home-token",
      ownerAccountId: "42",
    });
  });

  it("is null again after disconnecting, which also clears the server URL", async () => {
    await connectPlex("auth-token");

    disconnectPlex();

    expect(getPlexServerAccess()).toBeNull();
    expect(config().plexUrl).toBe("");
    expect(config().plexConnection).toEqual(DEFAULT_PLEX_CONNECTION);
  });
});
