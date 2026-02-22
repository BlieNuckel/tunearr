import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockLogin = vi.fn();
vi.mock("@/utils/plexOAuth", () => ({
  login: () => mockLogin(),
  getClientId: () => "test-client-id",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import usePlexLogin, { fetchAccount } from "../usePlexLogin";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockFetchResponses(
  servers: { ok: boolean; data?: unknown },
  account: { ok: boolean; data?: unknown },
) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/plex/servers")) {
      return Promise.resolve({
        ok: servers.ok,
        json: async () => servers.data,
      });
    }
    if (url.includes("/api/plex/account")) {
      return Promise.resolve({
        ok: account.ok,
        json: async () => account.data,
      });
    }
    return Promise.resolve({ ok: false });
  });
}

describe("usePlexLogin", () => {
  it("calls onToken, onServers, and onAccount after successful login", async () => {
    const onToken = vi.fn();
    const onServers = vi.fn();
    const onAccount = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetchResponses(
      {
        ok: true,
        data: {
          servers: [
            { name: "My Server", uri: "http://plex:32400", local: true },
          ],
        },
      },
      {
        ok: true,
        data: { username: "testuser", thumb: "https://plex.tv/thumb" },
      },
    );

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onServers, onAccount }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onToken).toHaveBeenCalledWith("my-token");
    expect(onServers).toHaveBeenCalledWith([
      { name: "My Server", uri: "http://plex:32400", local: true },
    ]);
    expect(onAccount).toHaveBeenCalledWith({
      username: "testuser",
      thumb: "https://plex.tv/thumb",
    });
  });

  it("does not call callbacks when login returns null", async () => {
    const onToken = vi.fn();
    mockLogin.mockResolvedValue(null);

    const { result } = renderHook(() => usePlexLogin({ onToken }));

    await act(async () => {
      result.current.login();
    });

    expect(onToken).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets loading during login", async () => {
    const onToken = vi.fn();
    let resolveLogin: (v: string) => void;
    mockLogin.mockReturnValue(
      new Promise((r) => {
        resolveLogin = r;
      }),
    );

    const { result } = renderHook(() => usePlexLogin({ onToken }));

    expect(result.current.loading).toBe(false);

    let loginPromise: Promise<void>;
    act(() => {
      loginPromise = result.current.login() as unknown as Promise<void>;
    });

    expect(result.current.loading).toBe(true);

    mockFetchResponses(
      { ok: true, data: { servers: [] } },
      { ok: false },
    );

    await act(async () => {
      resolveLogin!("token");
      await loginPromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it("handles server fetch failure gracefully", async () => {
    const onToken = vi.fn();
    const onServers = vi.fn();
    const onAccount = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetchResponses(
      { ok: false },
      {
        ok: true,
        data: { username: "testuser", thumb: "https://plex.tv/thumb" },
      },
    );

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onServers, onAccount }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onToken).toHaveBeenCalledWith("my-token");
    expect(onServers).not.toHaveBeenCalled();
    expect(onAccount).toHaveBeenCalled();
  });

  it("handles account fetch failure gracefully", async () => {
    const onToken = vi.fn();
    const onAccount = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetchResponses(
      { ok: true, data: { servers: [] } },
      { ok: false },
    );

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onAccount }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onToken).toHaveBeenCalledWith("my-token");
    expect(onAccount).not.toHaveBeenCalled();
  });

  it("calls onLoginComplete with token and serverUrl after successful login", async () => {
    const onToken = vi.fn();
    const onLoginComplete = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetchResponses(
      {
        ok: true,
        data: {
          servers: [
            { name: "My Server", uri: "http://plex:32400", local: true },
          ],
        },
      },
      { ok: true, data: { username: "test", thumb: "url" } },
    );

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onLoginComplete }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onLoginComplete).toHaveBeenCalledWith(
      "my-token",
      "http://plex:32400",
    );
  });

  it("calls onLoginComplete with empty serverUrl when no servers available", async () => {
    const onToken = vi.fn();
    const onLoginComplete = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetchResponses(
      { ok: true, data: { servers: [] } },
      { ok: true, data: { username: "test", thumb: "url" } },
    );

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onLoginComplete }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onLoginComplete).toHaveBeenCalledWith("my-token", "");
  });
});

describe("fetchAccount", () => {
  it("returns account data on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ username: "user1", thumb: "https://thumb.url" }),
    });

    const account = await fetchAccount("my-token");
    expect(account).toEqual({ username: "user1", thumb: "https://thumb.url" });
  });

  it("returns null on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const account = await fetchAccount("bad-token");
    expect(account).toBeNull();
  });
});
