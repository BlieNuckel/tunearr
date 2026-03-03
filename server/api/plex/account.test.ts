import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getPlexAccount, getPlexAccountFull } from "./account";

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
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          "X-Plex-Token": "test-token",
          "X-Plex-Client-Identifier": "client-123",
        },
      })
    );
  });

  it("throws when plex.tv returns an error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(getPlexAccount("bad-token", "client-123")).rejects.toThrow(
      "Plex returned 401"
    );
  });
});

describe("getPlexAccountFull", () => {
  it("returns id, username, email, and thumb from plex.tv", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 12345,
          username: "testuser",
          email: "test@example.com",
          thumb: "https://plex.tv/users/abc/avatar",
        },
      }),
    });

    const account = await getPlexAccountFull("test-token", "client-123");

    expect(account).toEqual({
      id: 12345,
      username: "testuser",
      email: "test@example.com",
      thumb: "https://plex.tv/users/abc/avatar",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://plex.tv/users/account.json",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          "X-Plex-Token": "test-token",
          "X-Plex-Client-Identifier": "client-123",
        },
      })
    );
  });

  it("throws when plex.tv returns an error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(
      getPlexAccountFull("bad-token", "client-123")
    ).rejects.toThrow("Plex returned 401");
  });
});
