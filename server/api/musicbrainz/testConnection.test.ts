import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMbFetch = vi.fn();

vi.mock("./config", () => ({
  mbFetch: (...args: unknown[]) => mockMbFetch(...args),
}));

vi.mock("../../config", () => ({
  getConfigValue: () => ({ serverUrl: "", requestsPerSecond: 1 }),
}));

import { testMbConnection } from "./testConnection";

const KNOWN = "a74b1b7f-71a5-4011-9441-d0b5e4122711";

function response(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("testMbConnection", () => {
  it("fetches a known artist through the given server and pace", async () => {
    mockMbFetch.mockResolvedValue(response(200, { id: KNOWN }));

    const result = await testMbConnection({
      serverUrl: "http://mb.local:5000/",
      requestsPerSecond: 0,
    });

    expect(result).toMatchObject({
      success: true,
      serverUrl: "http://mb.local:5000",
    });
    expect(mockMbFetch).toHaveBeenCalledWith(
      `/artist/${KNOWN}?fmt=json`,
      "interactive",
      {
        root: "http://mb.local:5000",
        baseUrl: "http://mb.local:5000/ws/2",
        kind: "custom",
        intervalMs: 0,
      }
    );
  });

  it("uses the public server when the URL is blank", async () => {
    mockMbFetch.mockResolvedValue(response(200, { id: KNOWN }));

    const result = await testMbConnection({
      serverUrl: "",
      requestsPerSecond: 1,
    });

    expect(result).toMatchObject({
      success: true,
      serverUrl: "https://musicbrainz.org",
    });
  });

  it("reports a non-OK status", async () => {
    mockMbFetch.mockResolvedValue(response(503));

    expect(
      await testMbConnection({
        serverUrl: "http://mb.local",
        requestsPerSecond: 1,
      })
    ).toEqual({ error: "http://mb.local returned 503", status: 502 });
  });

  it("reports an answer that isn't MusicBrainz data", async () => {
    mockMbFetch.mockResolvedValue(response(200, { hello: "world" }));

    const result = await testMbConnection({
      serverUrl: "http://mb.local",
      requestsPerSecond: 1,
    });

    expect(result).toMatchObject({ status: 502 });
    expect((result as { error: string }).error).toMatch("not with MusicBrainz");
  });

  it("reports a network failure", async () => {
    mockMbFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    expect(
      await testMbConnection({
        serverUrl: "http://mb.local",
        requestsPerSecond: 1,
      })
    ).toEqual({ error: "ECONNREFUSED", status: 502 });
  });
});
