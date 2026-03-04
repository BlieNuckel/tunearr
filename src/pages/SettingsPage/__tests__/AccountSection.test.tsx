import { render, screen, fireEvent } from "@testing-library/react";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import AccountSection from "../components/AccountSection";

const mockLogout = vi.fn();

const mockAuthValue: AuthContextValue = {
  status: "authenticated",
  user: { id: 1, username: "testadmin", userType: "local", role: "admin", theme: "system", thumb: null },
  login: vi.fn(),
  plexLogin: vi.fn(),
  plexSetup: vi.fn(),
  logout: mockLogout,
  setup: vi.fn(),
  updatePreferences: vi.fn(),
};

function renderAccountSection(overrides: Partial<AuthContextValue> = {}) {
  return render(
    <AuthContext.Provider value={{ ...mockAuthValue, ...overrides }}>
      <AccountSection />
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountSection", () => {
  it("renders username and role", () => {
    renderAccountSection();
    expect(screen.getByText("testadmin")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders user role for non-admin users", () => {
    renderAccountSection({
      user: { id: 2, username: "regularuser", userType: "local", role: "user", theme: "system", thumb: null },
    });
    expect(screen.getByText("regularuser")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("calls logout on Sign Out click", () => {
    renderAccountSection();
    fireEvent.click(screen.getByText("Sign Out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("does not show Plex badge for local users", () => {
    renderAccountSection();
    expect(screen.queryByText("Plex")).not.toBeInTheDocument();
  });

  it("shows Plex badge for plex users", () => {
    renderAccountSection({
      user: { id: 3, username: "plexuser", userType: "plex", role: "user", theme: "system", thumb: "https://plex.tv/avatar.jpg" },
    });
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("shows plex avatar image when thumb is available", () => {
    renderAccountSection({
      user: { id: 3, username: "plexuser", userType: "plex", role: "user", theme: "system", thumb: "https://plex.tv/avatar.jpg" },
    });
    const avatar = screen.getByAltText("plexuser");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://plex.tv/avatar.jpg");
  });

  it("shows fallback icon when no thumb is available", () => {
    renderAccountSection();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
