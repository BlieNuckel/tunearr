import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSlskdConfig = vi.fn();

vi.mock("./config", () => ({
  getSlskdConfig: (...args: unknown[]) => mockGetSlskdConfig(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  startSearch,
  waitForSearch,
  getSearchResponses,
  deleteSearch,
} from "./search";

const CONFIG = {
  baseUrl: "http://slskd:5030",
  headers: {
    "X-API-Key": "test-key",
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  downloadPath: "/downloads",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSlskdConfig.mockReturnValue(CONFIG);
});

describe("startSearch", () => {
  it("posts search request and returns state", async () => {
    const searchState = {
      id: "abc",
      searchText: "test",
      isComplete: false,
      responseCount: 0,
      fileCount: 0,
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => searchState });

    const result = await startSearch("test");
    expect(result).toEqual(searchState);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/searches",
      expect.objectContaining({ method: "POST", headers: CONFIG.headers })
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(startSearch("test")).rejects.toThrow(
      "slskd search failed: 500"
    );
  });
});

describe("waitForSearch", () => {
  it("resolves when search is complete", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "abc", isComplete: true }),
    });

    await waitForSearch("abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/searches/abc",
      { headers: CONFIG.headers }
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(waitForSearch("abc")).rejects.toThrow(
      "slskd search status failed: 404"
    );
  });
});

describe("getSearchResponses", () => {
  it("returns search responses", async () => {
    const responses = [{ username: "user1", files: [] }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => responses });

    const result = await getSearchResponses("abc");
    expect(result).toEqual(responses);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/searches/abc/responses",
      { headers: CONFIG.headers }
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(getSearchResponses("abc")).rejects.toThrow(
      "slskd search responses failed: 500"
    );
  });
});

describe("deleteSearch", () => {
  it("sends delete request", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await deleteSearch("abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/searches/abc",
      { method: "DELETE", headers: CONFIG.headers }
    );
  });
});
