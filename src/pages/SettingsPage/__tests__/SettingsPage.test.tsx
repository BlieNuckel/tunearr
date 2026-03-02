import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

const mockFetchAccount = vi.fn();
const mockLogin = vi.fn();
const mockUsePlexLogin = vi.fn();
vi.mock("@/hooks/usePlexLogin", () => ({
  default: (opts: unknown) => mockUsePlexLogin(opts),
  fetchAccount: (...args: unknown[]) => mockFetchAccount(...args),
  pickBestServer: (servers: { local: boolean }[]) =>
    servers.find((s) => !s.local) ?? servers[0],
}));

vi.mock("@/utils/plexOAuth", () => ({
  getClientId: () => "test-client-id",
}));

import SettingsPage from "../SettingsPage";
import {
  LidarrContext,
  type LidarrContextValue,
} from "@/context/lidarrContextDef";
import { ThemeContext } from "@/context/themeContextDef";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";

const mockSaveSettings = vi.fn();
const mockSavePartialSettings = vi.fn();
const mockTestConnection = vi.fn();
const mockLoadOptions = vi.fn();
const mockLogout = vi.fn();

const mockAuthValue: AuthContextValue = {
  status: "authenticated",
  user: { id: 1, username: "testadmin", role: "admin", theme: "system" },
  login: vi.fn(),
  logout: mockLogout,
  setup: vi.fn(),
  updatePreferences: vi.fn(),
};

function renderSettingsPage(overrides: Partial<LidarrContextValue> = {}) {
  const defaultContext: LidarrContextValue = {
    options: { qualityProfiles: [], metadataProfiles: [], rootFolderPaths: [] },
    settings: {
      lidarrUrl: "http://lidarr:8686",
      lidarrApiKey: "key1",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "/music",
      lidarrMetadataProfileId: 1,
      lastfmApiKey: "lfm-key",
      plexUrl: "http://plex:32400",
      plexToken: "plex-token",
      importPath: "/imports",
      slskdUrl: "",
      slskdApiKey: "",
      slskdDownloadPath: "",
    },
    isConnected: true,
    isLoading: false,
    saveSettings: mockSaveSettings,
    savePartialSettings: mockSavePartialSettings,
    testConnection: mockTestConnection,
    loadLidarrOptionValues: mockLoadOptions,
    ...overrides,
  };

  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <LidarrContext.Provider value={defaultContext}>
        <ThemeContext.Provider
          value={{
            theme: "system",
            actualTheme: "light",
            setTheme: vi.fn(),
            isLoading: false,
          }}
        >
          <SettingsPage />
        </ThemeContext.Provider>
      </LidarrContext.Provider>
    </AuthContext.Provider>
  );
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadOptions.mockResolvedValue(undefined);
  mockFetchAccount.mockResolvedValue(null);
  mockFetch.mockResolvedValue({ ok: false });
  mockUsePlexLogin.mockReturnValue({ loading: false, login: mockLogin });
  mockSavePartialSettings.mockResolvedValue(undefined);
});

describe("SettingsPage", () => {
  it("shows loading state", () => {
    const { container } = renderSettingsPage({ isLoading: true });
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("renders the heading", () => {
    renderSettingsPage();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders General tab by default with Account, Theme and Import", () => {
    renderSettingsPage();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Manual Import")).toBeInTheDocument();
    expect(screen.queryByText("Lidarr Connection")).not.toBeInTheDocument();
  });

  it("shows Account section with username and Sign Out button", () => {
    renderSettingsPage();
    expect(screen.getByText("testadmin")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("shows Integrations sections when Integrations tab clicked", () => {
    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));

    expect(screen.getByText("Lidarr Connection")).toBeInTheDocument();
    expect(screen.getByText("Last.fm")).toBeInTheDocument();
    expect(screen.getByText("Plex")).toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
  });

  it("renders search input", () => {
    renderSettingsPage();
    expect(
      screen.getByPlaceholderText("Search settings...")
    ).toBeInTheDocument();
  });

  it("filters sections by search query across tabs", () => {
    renderSettingsPage();
    fireEvent.change(screen.getByPlaceholderText("Search settings..."), {
      target: { value: "lidarr" },
    });

    expect(screen.getByText("Lidarr Connection")).toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
  });

  it("hides tabs when searching", () => {
    renderSettingsPage();
    fireEvent.change(screen.getByPlaceholderText("Search settings..."), {
      target: { value: "plex" },
    });

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows tab-origin badges during search", () => {
    renderSettingsPage();
    fireEvent.change(screen.getByPlaceholderText("Search settings..."), {
      target: { value: "plex" },
    });

    expect(screen.getByText("Integrations")).toBeInTheDocument();
  });

  it("does not render the old Save button", () => {
    renderSettingsPage();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("calls testConnection when test button clicked", async () => {
    mockTestConnection.mockResolvedValue({ success: true, version: "2.0.0" });

    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });
  });

  it("shows test success result", async () => {
    mockTestConnection.mockResolvedValue({ success: true, version: "2.0.0" });

    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByText("Connected! Lidarr v2.0.0")).toBeInTheDocument();
    });
  });

  it("shows test failure result", async () => {
    mockTestConnection.mockResolvedValue({
      success: false,
      error: "Connection refused",
    });

    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(
        screen.getByText("Connection failed: Connection refused")
      ).toBeInTheDocument();
    });
  });

  it("auto-saves text fields after debounce", async () => {
    vi.useFakeTimers();

    renderSettingsPage();

    const importInput = screen.getByDisplayValue("/imports");
    fireEvent.change(importInput, { target: { value: "/new-imports" } });

    expect(mockSavePartialSettings).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mockSavePartialSettings).toHaveBeenCalledWith({
      importPath: "/new-imports",
    });

    vi.useRealTimers();
  });

  it("automatically saves settings when signing out of Plex", async () => {
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));

    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Sign out"));
    });

    await waitFor(() => {
      expect(mockSavePartialSettings).toHaveBeenCalledWith({
        plexToken: "",
        plexUrl: "",
      });
    });
  });

  it("automatically saves settings when signing in to Plex", async () => {
    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));

    await waitFor(() => {
      expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
    });

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];

    await act(async () => {
      hookOpts.onToken("new-token");
      hookOpts.onServers([
        { name: "My Server", uri: "http://plex:32400", local: true },
      ]);
      hookOpts.onLoginComplete("new-token", "http://plex:32400");
    });

    await waitFor(() => {
      expect(mockSavePartialSettings).toHaveBeenCalledWith({
        plexToken: "new-token",
        plexUrl: "http://plex:32400",
      });
    });
  });

  it("returns to previously active tab when clearing search", () => {
    renderSettingsPage();
    fireEvent.click(screen.getByText("Integrations"));

    fireEvent.change(screen.getByPlaceholderText("Search settings..."), {
      target: { value: "theme" },
    });
    expect(screen.getByText("Theme")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search settings..."), {
      target: { value: "" },
    });
    expect(screen.getByText("Lidarr Connection")).toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
  });
});
