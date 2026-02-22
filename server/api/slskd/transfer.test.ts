import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSlskdConfig = vi.fn();

vi.mock("./config", () => ({
  getSlskdConfig: (...args: unknown[]) => mockGetSlskdConfig(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { enqueueDownload, getDownloadTransfers, cancelDownload } from "./transfer";

const CONFIG = {
  baseUrl: "http://slskd:5030",
  headers: { "X-API-Key": "test-key", "Content-Type": "application/json", Accept: "application/json" },
  downloadPath: "/downloads",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSlskdConfig.mockReturnValue(CONFIG);
});

describe("enqueueDownload", () => {
  it("posts download request for user", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const files = [{ filename: "@@user\\Music\\song.flac", size: 1000 }];

    await enqueueDownload("testuser", files);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/transfers/downloads/testuser",
      expect.objectContaining({
        method: "POST",
        headers: CONFIG.headers,
        body: JSON.stringify(files),
      })
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(enqueueDownload("user", [])).rejects.toThrow("slskd enqueue download failed: 500");
  });
});

describe("getDownloadTransfers", () => {
  it("returns transfer groups", async () => {
    const groups = [{ username: "user1", directories: [] }];
    mockFetch.mockResolvedValue({ ok: true, json: async () => groups });

    const result = await getDownloadTransfers();
    expect(result).toEqual(groups);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/transfers/downloads",
      { headers: CONFIG.headers }
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(getDownloadTransfers()).rejects.toThrow("slskd get transfers failed: 500");
  });
});

describe("cancelDownload", () => {
  it("sends delete request for specific transfer", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await cancelDownload("testuser", "transfer-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/transfers/downloads/testuser/transfer-123",
      { method: "DELETE", headers: CONFIG.headers }
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(cancelDownload("user", "id")).rejects.toThrow("slskd cancel download failed: 404");
  });
});
