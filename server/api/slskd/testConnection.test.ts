import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { testSlskdConnection } from "./testConnection";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("testSlskdConnection", () => {
  it("returns success with version and soulseek state from isLoggedIn", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: { full: "0.21.0" },
        server: { isConnected: true, isLoggedIn: true },
      }),
    });

    const result = await testSlskdConnection("http://slskd:5030/", "key");

    expect(result).toEqual({
      success: true,
      version: "0.21.0",
      soulseekConnected: true,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/application",
      expect.objectContaining({ headers: { "X-API-Key": "key" } })
    );
  });

  it("reports not connected when slskd is not logged into Soulseek", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: { full: "0.21.0" },
        server: { isConnected: false, isLoggedIn: false },
      }),
    });

    const result = await testSlskdConnection("http://slskd:5030", "key");

    expect(result).toEqual({
      success: true,
      version: "0.21.0",
      soulseekConnected: false,
    });
  });

  it("derives soulseek state from server.state string when isLoggedIn missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: "0.20.0",
        server: { state: "Connected, LoggedIn" },
      }),
    });

    const result = await testSlskdConnection("http://slskd:5030", "key");

    expect(result).toEqual({
      success: true,
      version: "0.20.0",
      soulseekConnected: true,
    });
  });

  it("returns null version when version is absent", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ server: { isLoggedIn: true } }),
    });

    const result = await testSlskdConnection("http://slskd:5030", "key");

    expect(result).toEqual({
      success: true,
      version: null,
      soulseekConnected: true,
    });
  });

  it("returns error with status on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const result = await testSlskdConnection("http://slskd:5030", "badkey");

    expect(result).toEqual({ error: "slskd returned 401", status: 401 });
  });

  it("returns 502 error when slskd is unreachable", async () => {
    mockFetch.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const result = await testSlskdConnection("http://slskd:5030", "key");

    expect(result).toEqual({ error: "connect ECONNREFUSED", status: 502 });
  });
});
