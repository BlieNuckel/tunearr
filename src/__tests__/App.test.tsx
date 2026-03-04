import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import {
  LidarrContext,
  type LidarrContextValue,
} from "@/context/lidarrContextDef";
import { ThemeContext } from "@/context/themeContextDef";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";

const connectedContext: LidarrContextValue = {
  options: { qualityProfiles: [], metadataProfiles: [], rootFolderPaths: [] },
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
  isConnected: true,
  isLoading: false,
  saveSettings: vi.fn(),
  savePartialSettings: vi.fn(),
  testConnection: vi.fn(),
  loadLidarrOptionValues: vi.fn(),
};

const unconfiguredContext: LidarrContextValue = {
  ...connectedContext,
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
};

const authenticatedAuth: AuthContextValue = {
  status: "authenticated",
  user: {
    id: 1,
    username: "admin",
    userType: "local",
    role: "admin",
    theme: "system",
    thumb: null,
  },
  login: vi.fn(),
  plexLogin: vi.fn(),
  plexSetup: vi.fn(),
  linkPlex: vi.fn(),
  logout: vi.fn(),
  setup: vi.fn(),
  updatePreferences: vi.fn(),
};

vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })))
);

function renderApp(path: string, context = connectedContext) {
  return render(
    <AuthContext.Provider value={authenticatedAuth}>
      <LidarrContext.Provider value={context}>
        <ThemeContext.Provider
          value={{
            theme: "system",
            actualTheme: "light",
            setTheme: vi.fn(),
            isLoading: false,
          }}
        >
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </ThemeContext.Provider>
      </LidarrContext.Provider>
    </AuthContext.Provider>
  );
}

describe("App", () => {
  it("renders discover page at /", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { level: 1, name: "Discover" })
    ).toBeInTheDocument();
  });

  it("renders search page at /search", () => {
    renderApp("/search");
    expect(
      screen.getByRole("heading", { level: 1, name: "Search Albums" })
    ).toBeInTheDocument();
  });

  it("renders settings page at /settings", () => {
    renderApp("/settings");
    expect(
      screen.getByRole("heading", { level: 1, name: "Settings" })
    ).toBeInTheDocument();
  });

  it("renders onboarding at /onboarding for unconfigured", () => {
    renderApp("/onboarding", unconfiguredContext);
    expect(screen.getByText("Welcome to Tunearr")).toBeInTheDocument();
  });

  it("redirects to onboarding when not configured", () => {
    renderApp("/", unconfiguredContext);
    expect(screen.getByText("Welcome to Tunearr")).toBeInTheDocument();
  });
});
