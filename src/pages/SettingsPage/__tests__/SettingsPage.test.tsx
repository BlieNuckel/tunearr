import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../SettingsPage";
import {
  LidarrContext,
  type LidarrContextValue,
} from "@/context/lidarrContextDef";

const mockSaveSettings = vi.fn();
const mockTestConnection = vi.fn();
const mockLoadOptions = vi.fn();

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
      theme: "system",
    },
    isConnected: true,
    isLoading: false,
    saveSettings: mockSaveSettings,
    testConnection: mockTestConnection,
    loadLidarrOptionValues: mockLoadOptions,
    ...overrides,
  };

  return render(
    <LidarrContext.Provider value={defaultContext}>
      <SettingsPage />
    </LidarrContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadOptions.mockResolvedValue(undefined);
});

describe("SettingsPage", () => {
  it("shows loading state", () => {
    renderSettingsPage({ isLoading: true });
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    renderSettingsPage();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders all sections", () => {
    renderSettingsPage();
    expect(screen.getByText("Lidarr Connection")).toBeInTheDocument();
    expect(screen.getByText("Last.fm")).toBeInTheDocument();
    expect(screen.getByText("Plex")).toBeInTheDocument();
    expect(screen.getByText("Manual Import")).toBeInTheDocument();
  });

  it("renders save button", () => {
    renderSettingsPage();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("calls testConnection when test button clicked", async () => {
    mockTestConnection.mockResolvedValue({ success: true, version: "2.0.0" });

    renderSettingsPage();
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });
  });

  it("shows test success result", async () => {
    mockTestConnection.mockResolvedValue({ success: true, version: "2.0.0" });

    renderSettingsPage();
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
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(
        screen.getByText("Connection failed: Connection refused")
      ).toBeInTheDocument();
    });
  });

  it("calls saveSettings on form submit", async () => {
    mockSaveSettings.mockResolvedValue(undefined);

    renderSettingsPage();
    fireEvent.submit(screen.getByText("Save").closest("form")!);

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalled();
    });
  });

  it("shows error on save failure", async () => {
    mockSaveSettings.mockRejectedValue(new Error("Save failed"));

    renderSettingsPage();
    fireEvent.submit(screen.getByText("Save").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeInTheDocument();
    });
  });
});
