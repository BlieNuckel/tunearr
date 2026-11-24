import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockLogin = vi.fn();
vi.mock("@/utils/plexOAuth", () => ({
  login: () => mockLogin(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import usePlexConnection, { type PlexConnection } from "../usePlexConnection";

const disconnected: PlexConnection = {
  connected: false,
  account: null,
  serverUrl: "",
  owned: false,
  servers: [],
};

const connected: PlexConnection = {
  connected: true,
  account: { username: "owner", thumb: "" },
  serverUrl: "https://home.plex.direct:32400",
  owned: true,
  servers: [],
};

function respond(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

async function renderLoaded() {
  const hook = renderHook(() => usePlexConnection());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(respond(disconnected));
});

describe("usePlexConnection", () => {
  it("loads the connection", async () => {
    mockFetch.mockResolvedValueOnce(respond(connected));

    const { result } = await renderLoaded();

    expect(result.current.connection).toEqual(connected);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/plex/connection",
      expect.anything()
    );
  });

  it("connects with the token from the Plex sign-in", async () => {
    const { result } = await renderLoaded();
    mockLogin.mockResolvedValue("plex-auth");
    mockFetch.mockResolvedValueOnce(respond(connected));

    await act(() => result.current.connect());

    expect(mockFetch).toHaveBeenLastCalledWith("/api/plex/connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authToken: "plex-auth" }),
    });
    expect(result.current.connection).toEqual(connected);
  });

  it("does nothing when the Plex sign-in is abandoned", async () => {
    const { result } = await renderLoaded();
    mockLogin.mockResolvedValue(null);
    const callsBefore = mockFetch.mock.calls.length;

    await act(() => result.current.connect());

    expect(mockFetch.mock.calls.length).toBe(callsBefore);
    expect(result.current.connection).toEqual(disconnected);
  });

  it("selects another server", async () => {
    mockFetch.mockResolvedValueOnce(respond(connected));
    const { result } = await renderLoaded();
    const moved = { ...connected, serverUrl: "http://192.168.1.10:32400" };
    mockFetch.mockResolvedValueOnce(respond(moved));

    await act(() => result.current.selectServer("http://192.168.1.10:32400"));

    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/plex/connection/server",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ serverUrl: "http://192.168.1.10:32400" }),
      })
    );
    expect(result.current.connection).toEqual(moved);
  });

  it("disconnects", async () => {
    mockFetch.mockResolvedValueOnce(respond(connected));
    const { result } = await renderLoaded();
    mockFetch.mockResolvedValueOnce(respond({ success: true }));

    await act(() => result.current.disconnect());

    expect(mockFetch).toHaveBeenLastCalledWith("/api/plex/connection", {
      method: "DELETE",
    });
    expect(result.current.connection).toEqual(disconnected);
  });

  it("surfaces the server's reason when an action fails", async () => {
    const { result } = await renderLoaded();
    mockLogin.mockResolvedValue("plex-auth");
    mockFetch.mockResolvedValueOnce(
      respond({ error: "This Plex account has no media servers" }, false, 400)
    );

    await act(() => result.current.connect());

    expect(result.current.error).toBe("This Plex account has no media servers");
    expect(result.current.busy).toBe(false);
  });
});
