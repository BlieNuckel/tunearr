import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockGetConfig = vi.fn();
vi.mock("../../config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

import { getPlexServers, getServerAccessToken } from "./servers";

beforeEach(() => {
  vi.clearAllMocks();
});

const serverResource = {
  name: "My Server",
  provides: "server",
  accessToken: "server-specific-token",
  connections: [
    { uri: "https://my-server.plex.direct:32400", local: false },
    { uri: "http://192.168.1.10:32400", local: true },
  ],
};

const playerResource = {
  name: "My Player",
  provides: "player",
  accessToken: "player-token",
  connections: [{ uri: "http://player:32500", local: true }],
};

function mockResourcesResponse(resources: unknown[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => resources,
  });
}

describe("getPlexServers", () => {
  it("returns server connections filtered from resources", async () => {
    mockResourcesResponse([serverResource, playerResource]);

    const servers = await getPlexServers("test-token", "client-123");

    expect(servers).toEqual([
      {
        name: "My Server",
        uri: "https://my-server.plex.direct:32400",
        local: false,
      },
      { name: "My Server", uri: "http://192.168.1.10:32400", local: true },
    ]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://plex.tv/api/v2/resources?includeHttps=1",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          "X-Plex-Token": "test-token",
          "X-Plex-Client-Identifier": "client-123",
        },
      })
    );
  });

  it("returns empty array when no servers found", async () => {
    mockResourcesResponse([playerResource]);

    const servers = await getPlexServers("token", "client-123");
    expect(servers).toEqual([]);
  });

  it("throws when plex.tv returns an error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getPlexServers("bad-token", "client-123")).rejects.toThrow(
      "Plex returned 401"
    );
  });
});

describe("getServerAccessToken", () => {
  it("returns server-specific accessToken when plexUrl matches a connection", async () => {
    mockGetConfig.mockReturnValue({
      plexUrl: "https://my-server.plex.direct:32400",
    });
    mockResourcesResponse([serverResource, playerResource]);

    const token = await getServerAccessToken("account-token", "client-123");
    expect(token).toBe("server-specific-token");
  });

  it("matches plexUrl with trailing slash", async () => {
    mockGetConfig.mockReturnValue({
      plexUrl: "http://192.168.1.10:32400/",
    });
    mockResourcesResponse([serverResource]);

    const token = await getServerAccessToken("account-token", "client-123");
    expect(token).toBe("server-specific-token");
  });

  it("falls back to account token when no server matches plexUrl", async () => {
    mockGetConfig.mockReturnValue({
      plexUrl: "https://unknown-server:32400",
    });
    mockResourcesResponse([serverResource]);

    const token = await getServerAccessToken("account-token", "client-123");
    expect(token).toBe("account-token");
  });

  it("falls back to account token when plexUrl is not configured", async () => {
    mockGetConfig.mockReturnValue({ plexUrl: "" });

    const token = await getServerAccessToken("account-token", "client-123");
    expect(token).toBe("account-token");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("falls back to account token when resources fetch fails", async () => {
    mockGetConfig.mockReturnValue({
      plexUrl: "https://my-server.plex.direct:32400",
    });
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const token = await getServerAccessToken("account-token", "client-123");
    expect(token).toBe("account-token");
  });
});
