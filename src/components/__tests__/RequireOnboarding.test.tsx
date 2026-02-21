import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireOnboarding from "../RequireOnboarding";
import {
  LidarrContext,
  type LidarrContextValue,
} from "@/context/lidarrContextDef";

function renderWithContext(
  contextValue: Partial<LidarrContextValue>,
  initialPath = "/"
) {
  const defaultValue: LidarrContextValue = {
    options: { qualityProfiles: [], metadataProfiles: [], rootFolderPaths: [] },
    settings: {
      lidarrUrl: "",
      lidarrApiKey: "",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "",
      lidarrMetadataProfileId: 1,
      lastfmApiKey: "",
      plexUrl: "",
      plexToken: "",
      importPath: "",
      theme: "system",
    },
    isConnected: false,
    isLoading: false,
    saveSettings: vi.fn(),
    testConnection: vi.fn(),
    loadLidarrOptionValues: vi.fn(),
    ...contextValue,
  };

  return render(
    <LidarrContext.Provider value={defaultValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RequireOnboarding />}>
            <Route path="/" element={<div>Main App</div>} />
          </Route>
          <Route path="/onboarding" element={<div>Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    </LidarrContext.Provider>
  );
}

describe("RequireOnboarding", () => {
  it("renders nothing while loading", () => {
    const { container } = renderWithContext({ isLoading: true });
    expect(container.textContent).toBe("");
  });

  it("redirects to /onboarding when lidarrUrl is empty", () => {
    renderWithContext({ isLoading: false });
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
  });

  it("renders outlet when lidarrUrl is configured", () => {
    renderWithContext({
      isLoading: false,
      settings: {
        lidarrUrl: "http://lidarr:8686",
        lidarrApiKey: "key",
        lidarrQualityProfileId: 1,
        lidarrRootFolderPath: "/music",
        lidarrMetadataProfileId: 1,
        lastfmApiKey: "",
        plexUrl: "",
        plexToken: "",
        importPath: "",
        theme: "system",
      },
    });
    expect(screen.getByText("Main App")).toBeInTheDocument();
  });
});
