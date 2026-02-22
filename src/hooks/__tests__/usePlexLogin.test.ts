import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockLogin = vi.fn();
vi.mock("@/utils/plexOAuth", () => ({
  login: () => mockLogin(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import usePlexLogin from "../usePlexLogin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlexLogin", () => {
  it("calls onToken and onServers after successful login", async () => {
    const onToken = vi.fn();
    const onServers = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        servers: [{ name: "My Server", uri: "http://plex:32400", local: true }],
      }),
    });

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onServers }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onToken).toHaveBeenCalledWith("my-token");
    expect(onServers).toHaveBeenCalledWith([
      { name: "My Server", uri: "http://plex:32400", local: true },
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/plex/servers?token=my-token",
    );
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

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ servers: [] }),
    });

    await act(async () => {
      resolveLogin!("token");
      await loginPromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it("handles server fetch failure gracefully", async () => {
    const onToken = vi.fn();
    const onServers = vi.fn();
    mockLogin.mockResolvedValue("my-token");
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() =>
      usePlexLogin({ onToken, onServers }),
    );

    await act(async () => {
      result.current.login();
    });

    expect(onToken).toHaveBeenCalledWith("my-token");
    expect(onServers).not.toHaveBeenCalled();
  });
});
