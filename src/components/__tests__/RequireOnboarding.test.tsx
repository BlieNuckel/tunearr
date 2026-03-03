import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireOnboarding from "../RequireOnboarding";
import {
  LidarrContext,
  type LidarrContextValue,
} from "@/context/lidarrContextDef";

type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "user";
  theme: "light" | "dark" | "system";
  thumb: string | null;
};

const mockUseAuth = vi.fn();

vi.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

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
      slskdUrl: "",
      slskdApiKey: "",
      slskdDownloadPath: "",
    },
    isConnected: false,
    isLoading: false,
    saveSettings: vi.fn(),
    savePartialSettings: vi.fn(),
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
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("admin user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, username: "admin", role: "admin", theme: "system", thumb: null } as AuthUser,
      });
    });

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
          slskdUrl: "",
          slskdApiKey: "",
          slskdDownloadPath: "",
        },
      });
      expect(screen.getByText("Main App")).toBeInTheDocument();
    });
  });

  describe("non-admin user", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 2, username: "user", role: "user", theme: "system", thumb: null } as AuthUser,
      });
    });

    it("renders nothing while waiting for app-status", () => {
      vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

      const { container } = renderWithContext({ isLoading: false });
      expect(container.textContent).toBe("");
    });

    it("renders outlet when lidarr is configured", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ lidarrConfigured: true }), { status: 200 })
      );

      renderWithContext({ isLoading: false });

      expect(await screen.findByText("Main App")).toBeInTheDocument();
    });

    it("redirects to /onboarding when lidarr is not configured", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ lidarrConfigured: false }), { status: 200 })
      );

      renderWithContext({ isLoading: false });

      expect(await screen.findByText("Onboarding")).toBeInTheDocument();
    });
  });
});
