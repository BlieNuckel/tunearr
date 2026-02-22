import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getPlexServers } from "./servers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlexServers", () => {
  it("returns server connections filtered from resources", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: "My Server",
          provides: "server",
          connections: [
            { uri: "https://my-server.plex.direct:32400", local: false },
            { uri: "http://192.168.1.10:32400", local: true },
          ],
        },
        {
          name: "My Player",
          provides: "player",
          connections: [{ uri: "http://player:32500", local: true }],
        },
      ],
    });

    const servers = await getPlexServers("test-token");

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
      {
        headers: {
          Accept: "application/json",
          "X-Plex-Token": "test-token",
        },
      },
    );
  });

  it("returns empty array when no servers found", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: "Player",
          provides: "player",
          connections: [{ uri: "http://x:32500", local: true }],
        },
      ],
    });

    const servers = await getPlexServers("token");
    expect(servers).toEqual([]);
  });

  it("throws when plex.tv returns an error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getPlexServers("bad-token")).rejects.toThrow(
      "Plex returned 401",
    );
  });
});
