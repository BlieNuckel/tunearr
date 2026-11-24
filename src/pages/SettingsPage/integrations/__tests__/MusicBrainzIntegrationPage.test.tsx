import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AppSettings } from "@/context/settingsContextDef";

const mockUpdateFields = vi.fn();

let settings: AppSettings;

function baseSettings(musicbrainz: AppSettings["musicbrainz"]): AppSettings {
  return {
    lidarrUrl: "",
    lidarrApiKey: "",
    lidarrQualityProfileId: 1,
    lidarrRootFolderPath: "",
    lidarrMetadataProfileId: 1,
    lastfmApiKey: "",
    importPath: "",
    slskdUrl: "",
    slskdApiKey: "",
    slskdDownloadPath: "",
    torznabApiKey: "",
    musicbrainz,
  };
}

vi.mock("@/context/useSettings", () => ({
  useSettings: () => ({
    options: { qualityProfiles: [], metadataProfiles: [], rootFolderPaths: [] },
    settings,
    isConnected: false,
    isLoading: false,
    saveSettings: vi.fn(),
    savePartialSettings: vi.fn(),
    testConnection: vi.fn(),
    testSlskdConnection: vi.fn(),
    loadLidarrOptionValues: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAutoSave", () => ({
  useAutoSave: () => ({
    fields: settings,
    saveStatus: "idle",
    saveError: null,
    updateField: vi.fn(),
    updateFields: mockUpdateFields,
  }),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "admin", permissions: 1 } }),
}));

vi.mock("@/hooks/useAutoSetupStatus", () => ({
  default: () => ({ status: null, loading: false, refetch: vi.fn() }),
}));

import IntegrationsSettingsPage from "../../pages/IntegrationsSettingsPage";
import MusicBrainzIntegrationPage from "../MusicBrainzIntegrationPage";

function renderGroup() {
  return render(
    <MemoryRouter initialEntries={["/settings/integrations/musicbrainz"]}>
      <Routes>
        <Route
          path="/settings/integrations"
          element={<IntegrationsSettingsPage />}
        >
          <Route path="musicbrainz" element={<MusicBrainzIntegrationPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  settings = baseSettings({ serverUrl: "", requestsPerSecond: 1 });
  vi.stubGlobal("fetch", mockFetch);
});

describe("MusicBrainzIntegrationPage", () => {
  it("shows the public server as the default and locks its pace", () => {
    renderGroup();

    expect(screen.getByLabelText("Server URL")).toHaveValue("");
    expect(screen.getByLabelText("Server URL")).toHaveAttribute(
      "placeholder",
      "https://musicbrainz.org"
    );
    expect(screen.getByLabelText("Requests per second")).toBeDisabled();
    expect(screen.getByLabelText("Requests per second")).toHaveValue(1);
    expect(screen.getByText(/can't be raised/)).toBeInTheDocument();
  });

  it("saves a typed server URL", () => {
    renderGroup();

    fireEvent.change(screen.getByLabelText("Server URL"), {
      target: { value: "http://mb.local:5000" },
    });

    expect(mockUpdateFields).toHaveBeenCalledWith({
      musicbrainz: { serverUrl: "http://mb.local:5000", requestsPerSecond: 1 },
    });
  });

  it("lets a custom server set its own pace, 0 meaning unpaced", () => {
    settings = baseSettings({
      serverUrl: "http://mb.local:5000",
      requestsPerSecond: 1,
    });
    renderGroup();

    const pace = screen.getByLabelText("Requests per second");
    expect(pace).toBeEnabled();
    expect(screen.getByText(/0 means unpaced/)).toBeInTheDocument();

    fireEvent.change(pace, { target: { value: "0" } });
    expect(mockUpdateFields).toHaveBeenCalledWith({
      musicbrainz: { serverUrl: "http://mb.local:5000", requestsPerSecond: 0 },
    });
  });

  it("does not save a cleared pace field", () => {
    settings = baseSettings({
      serverUrl: "http://mb.local:5000",
      requestsPerSecond: 5,
    });
    renderGroup();

    fireEvent.change(screen.getByLabelText("Requests per second"), {
      target: { value: "" },
    });

    expect(mockUpdateFields).not.toHaveBeenCalled();
  });

  it("flags an invalid URL and disables the test", () => {
    settings = baseSettings({ serverUrl: "mb.local", requestsPerSecond: 1 });
    renderGroup();

    expect(screen.getByRole("alert")).toHaveTextContent("full URL");
    expect(
      screen.getByRole("button", { name: "Test Connection" })
    ).toBeDisabled();
  });

  it("tests the server as typed and shows the result", async () => {
    settings = baseSettings({
      serverUrl: "http://mb.local:5000",
      requestsPerSecond: 0,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          serverUrl: "http://mb.local:5000",
          latencyMs: 42,
        }),
    });
    renderGroup();

    fireEvent.click(screen.getByRole("button", { name: "Test Connection" }));

    await waitFor(() =>
      expect(
        screen.getByText("Connected! http://mb.local:5000 answered in 42 ms")
      ).toBeInTheDocument()
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/settings/test-musicbrainz",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          serverUrl: "http://mb.local:5000",
          requestsPerSecond: 0,
        }),
      })
    );
  });

  it("shows a failed test", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () =>
        Promise.resolve({ error: "https://musicbrainz.org returned 503" }),
    });
    renderGroup();

    fireEvent.click(screen.getByRole("button", { name: "Test Connection" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Connection failed: https://musicbrainz.org returned 503"
        )
      ).toBeInTheDocument()
    );
  });
});
