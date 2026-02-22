import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockOpen = vi.fn();
vi.stubGlobal("open", mockOpen);

const mockCrypto = {
  randomUUID: vi.fn(() => "test-uuid-1234"),
};
vi.stubGlobal("crypto", mockCrypto);

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();
vi.stubGlobal("localStorage", mockLocalStorage);

import { login } from "../plexOAuth";

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.clear();
  vi.useFakeTimers();
});

describe("plexOAuth", () => {
  describe("login", () => {
    it("creates a PIN and opens a popup", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: null }),
      });

      const popup = { closed: false, close: vi.fn() };
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: "mytoken" }),
      });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain(
        "https://plex.tv/api/v2/pins?strong=true",
      );
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
      expect(mockOpen).toHaveBeenCalledTimes(1);
      expect(mockOpen.mock.calls[0][0]).toContain("app.plex.tv/auth");
      expect(mockOpen.mock.calls[0][0]).toContain("code=abc123");
      expect(token).toBe("mytoken");
      expect(popup.close).toHaveBeenCalled();
    });

    it("returns null when popup is closed before auth", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: null }),
      });

      const popup = { closed: true, close: vi.fn() };
      mockOpen.mockReturnValue(popup);

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(token).toBeNull();
    });

    it("throws when PIN creation fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(login()).rejects.toThrow("Failed to create Plex PIN: 500");
    });

    it("generates and persists a client ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, code: "x", authToken: null }),
      });
      mockOpen.mockReturnValue({ closed: true, close: vi.fn() });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "tunearr-plex-client-id",
        "test-uuid-1234",
      );
    });

    it("polls until token is received", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc", authToken: null }),
      });

      const popup = { closed: false, close: vi.fn() };
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc", authToken: null }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc", authToken: "token123" }),
      });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(token).toBe("token123");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("returns null when poll request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc", authToken: null }),
      });

      const popup = { closed: false, close: vi.fn() };
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(token).toBeNull();
    });
  });
});
