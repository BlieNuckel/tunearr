import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockOpen = vi.fn();
vi.stubGlobal("open", mockOpen);

const mockCrypto = {
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i + 1;
    return arr;
  }),
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

const originalUserAgent = navigator.userAgent;

function createPopup() {
  return { closed: false, close: vi.fn(), location: { href: "" } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.clear();
  vi.useFakeTimers();
  Object.defineProperty(navigator, "userAgent", {
    value: originalUserAgent,
    configurable: true,
  });
});

describe("plexOAuth", () => {
  describe("login", () => {
    it("opens a blank window first, then navigates to plex auth after PIN", async () => {
      const popup = createPopup();
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: null }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: "mytoken" }),
      });

      const promise = login();

      expect(mockOpen).toHaveBeenCalledWith(
        "about:blank",
        "PlexAuth",
        expect.stringContaining("width=")
      );

      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(popup.location.href).toContain("app.plex.tv/auth");
      expect(popup.location.href).toContain("code=abc123");
      expect(mockFetch.mock.calls[0][0]).toContain(
        "https://plex.tv/api/v2/pins?strong=true"
      );
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
      expect(token).toBe("mytoken");
      expect(popup.close).toHaveBeenCalled();
    });

    it("returns null when popup is closed before auth", async () => {
      const popup = { closed: true, close: vi.fn(), location: { href: "" } };
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: null }),
      });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(token).toBeNull();
    });

    it("closes popup and throws when PIN creation fails", async () => {
      const popup = createPopup();
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(login()).rejects.toThrow("Failed to create Plex PIN: 500");
      expect(popup.close).toHaveBeenCalled();
    });

    it("generates and persists a client ID", async () => {
      mockOpen.mockReturnValue({
        closed: true,
        close: vi.fn(),
        location: { href: "" },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, code: "x", authToken: null }),
      });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "tunearr-plex-client-id",
        expect.stringMatching(/^[0-9a-f-]+$/)
      );
    });

    it("polls until token is received", async () => {
      const popup = createPopup();
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc", authToken: null }),
      });
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

    it("opens a plain tab on mobile", async () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        configurable: true,
      });

      const popup = {
        closed: true,
        close: vi.fn(),
        location: { href: "" },
      };
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc123", authToken: null }),
      });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(mockOpen).toHaveBeenCalledWith("about:blank", "_blank");
      expect(popup.location.href).toContain("app.plex.tv/auth");
    });

    it("returns null when poll request fails", async () => {
      const popup = createPopup();
      mockOpen.mockReturnValue(popup);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, code: "abc", authToken: null }),
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const promise = login();
      await vi.advanceTimersByTimeAsync(1000);
      const token = await promise;

      expect(token).toBeNull();
    });
  });
});
