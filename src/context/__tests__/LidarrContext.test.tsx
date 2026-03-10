import { render, screen, waitFor } from "@testing-library/react";
import { LidarrContextProvider } from "../LidarrContext";
import { useLidarrContext } from "../useLidarrContext";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "../authContextDef";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeAuthValue(
  overrides: Partial<AuthContextValue> = {}
): AuthContextValue {
  return {
    status: "authenticated" as AuthStatus,
    user: {
      id: 1,
      username: "admin",
      userType: "local",
      permissions: 1,
      theme: "system",
      thumb: null,
      hasPlexToken: false,
    },
    login: vi.fn(),
    plexLogin: vi.fn(),
    plexSetup: vi.fn(),
    linkPlex: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
    updatePreferences: vi.fn(),
    refreshUser: vi.fn(),
    ...overrides,
  };
}

function TestConsumer() {
  const ctx = useLidarrContext();
  return (
    <div>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <span data-testid="connected">{String(ctx.isConnected)}</span>
      <span data-testid="url">{ctx.settings.lidarrUrl}</span>
    </div>
  );
}

function renderWithAuth(authOverrides: Partial<AuthContextValue> = {}) {
  return render(
    <AuthContext.Provider value={makeAuthValue(authOverrides)}>
      <LidarrContextProvider>
        <TestConsumer />
      </LidarrContextProvider>
    </AuthContext.Provider>
  );
}

describe("LidarrContextProvider", () => {
  it("provides initial loading state", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    renderWithAuth();

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
  });

  it("sets isLoading false when not authenticated", () => {
    renderWithAuth({ status: "unauthenticated", user: null });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches config status instead of full settings for non-admin users", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ configured: true }), { status: 200 })
    );

    renderWithAuth({
      user: {
        id: 2,
        username: "plexuser",
        userType: "plex",
        permissions: 8,
        theme: "system",
        thumb: null,
        hasPlexToken: true,
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(fetch).toHaveBeenCalledWith("/api/settings/status");
    expect(screen.getByTestId("url")).toHaveTextContent("configured");
  });

  it("loads settings on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          lidarrUrl: "http://lidarr:8686",
          lidarrApiKey: "key1",
        }),
        { status: 200 }
      )
    );

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("url")).toHaveTextContent("http://lidarr:8686");
  });

  it("does not test connection on load", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          lidarrUrl: "http://lidarr:8686",
          lidarrApiKey: "key1",
        }),
        { status: 200 }
      )
    );

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("handles settings load failure gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
  });
});
