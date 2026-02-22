import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getPlexAccount } from "./account";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlexAccount", () => {
  it("returns username and thumb from plex.tv", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          username: "testuser",
          thumb: "https://plex.tv/users/abc/avatar",
        },
      }),
    });

    const account = await getPlexAccount("test-token", "client-123");

    expect(account).toEqual({
      username: "testuser",
      thumb: "https://plex.tv/users/abc/avatar",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://plex.tv/users/account.json",
      {
        headers: {
          Accept: "application/json",
          "X-Plex-Token": "test-token",
          "X-Plex-Client-Identifier": "client-123",
        },
      }
    );
  });

  it("throws when plex.tv returns an error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getPlexAccount("bad-token", "client-123")).rejects.toThrow(
      "Plex returned 401"
    );
  });
});
