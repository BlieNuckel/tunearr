import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import AccountSection from "../sections/general/AccountSection";

const mockLogout = vi.fn();

const mockAuthValue: AuthContextValue = {
  status: "authenticated",
  user: {
    id: 1,
    username: "testadmin",
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
  logout: mockLogout,
  setup: vi.fn(),
  updatePreferences: vi.fn(),
  refreshUser: vi.fn(),
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
  it("renders username and permission badges", () => {
    renderAccountSection();
    expect(screen.getByText("testadmin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders permission badges for non-admin users", () => {
    renderAccountSection({
      user: {
        id: 2,
        username: "regularuser",
        userType: "local",
        permissions: 8,
        theme: "system",
        thumb: null,
        hasPlexToken: false,
      },
    });
    expect(screen.getByText("regularuser")).toBeInTheDocument();
    expect(screen.getByText("Request")).toBeInTheDocument();
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
      user: {
        id: 3,
        username: "plexuser",
        userType: "plex",
        permissions: 8,
        theme: "system",
        thumb: "https://plex.tv/avatar.jpg",
        hasPlexToken: true,
      },
    });
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("shows plex avatar image when thumb is available", () => {
    renderAccountSection({
      user: {
        id: 3,
        username: "plexuser",
        userType: "plex",
        permissions: 8,
        theme: "system",
        thumb: "https://plex.tv/avatar.jpg",
        hasPlexToken: true,
      },
    });
    const avatar = screen.getByAltText("plexuser");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://plex.tv/avatar.jpg");
  });

  it("shows fallback icon when no thumb is available", () => {
    renderAccountSection();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows Connect Plex button for local users", () => {
    renderAccountSection();
    expect(screen.getByText("Connect Plex")).toBeInTheDocument();
  });

  it("does not show Connect Plex button for plex users", () => {
    renderAccountSection({
      user: {
        id: 3,
        username: "plexuser",
        userType: "plex",
        permissions: 8,
        theme: "system",
        thumb: "https://plex.tv/avatar.jpg",
        hasPlexToken: true,
      },
    });
    expect(screen.queryByText("Connect Plex")).not.toBeInTheDocument();
  });

  it("calls linkPlex on Connect Plex click", async () => {
    const mockLinkPlex = vi.fn();
    renderAccountSection({ linkPlex: mockLinkPlex });

    const user = userEvent.setup();
    await user.click(screen.getByText("Connect Plex"));
    expect(mockLinkPlex).toHaveBeenCalledOnce();
  });

  it("shows loading state during Plex linking", async () => {
    let resolveLink: () => void;
    const mockLinkPlex = vi.fn(
      () => new Promise<void>((r) => (resolveLink = r))
    );
    renderAccountSection({ linkPlex: mockLinkPlex });

    const user = userEvent.setup();
    await user.click(screen.getByText("Connect Plex"));

    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(screen.getByText("Connecting…")).toBeDisabled();

    resolveLink!();
    await waitFor(() => {
      expect(screen.getByText("Connect Plex")).toBeInTheDocument();
    });
  });

  it("shows error message when Plex linking fails", async () => {
    const mockLinkPlex = vi
      .fn()
      .mockRejectedValue(
        new Error("This Plex account is already linked to another user")
      );
    renderAccountSection({ linkPlex: mockLinkPlex });

    const user = userEvent.setup();
    await user.click(screen.getByText("Connect Plex"));

    await waitFor(() => {
      expect(
        screen.getByText("This Plex account is already linked to another user")
      ).toBeInTheDocument();
    });
  });
});
