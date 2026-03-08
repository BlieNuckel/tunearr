import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import LibraryPage from "../LibraryPage";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import { Permission } from "@shared/permissions";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify([]), { status: 200 })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeAuthContext(permissions: number): AuthContextValue {
  return {
    status: "authenticated",
    user: {
      id: 1,
      username: "testuser",
      userType: "local",
      permissions,
      theme: "system",
      thumb: null,
    },
    login: vi.fn(),
    plexLogin: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
    plexSetup: vi.fn(),
    linkPlex: vi.fn(),
    updatePreferences: vi.fn(),
  };
}

function renderWithAuth(permissions: number) {
  return render(
    <AuthContext.Provider value={makeAuthContext(permissions)}>
      <LibraryPage />
    </AuthContext.Provider>
  );
}

describe("LibraryPage", () => {
  it("renders page title", async () => {
    renderWithAuth(Permission.REQUEST);

    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  it("shows My Requests tab for basic users", async () => {
    renderWithAuth(Permission.REQUEST);

    expect(
      screen.getByRole("tab", { name: "My Requests" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "All Requests" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Downloads" })
    ).not.toBeInTheDocument();
  });

  it("shows All Requests tab for users with REQUEST_VIEW permission", async () => {
    renderWithAuth(Permission.REQUEST | Permission.REQUEST_VIEW);

    expect(
      screen.getByRole("tab", { name: "My Requests" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "All Requests" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Downloads" })
    ).not.toBeInTheDocument();
  });

  it("shows All Requests tab for users with MANAGE_REQUESTS permission", async () => {
    renderWithAuth(Permission.REQUEST | Permission.MANAGE_REQUESTS);

    expect(
      screen.getByRole("tab", { name: "All Requests" })
    ).toBeInTheDocument();
  });

  it("shows all tabs for admins", async () => {
    renderWithAuth(Permission.ADMIN);

    expect(
      screen.getByRole("tab", { name: "My Requests" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "All Requests" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Downloads" })).toBeInTheDocument();
  });

  it("defaults to My Requests tab", async () => {
    renderWithAuth(Permission.REQUEST);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/requests?userId=1");
    });
  });

  it("switches to All Requests tab", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "All Requests" }));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/requests");
    });
  });

  it("shows empty state for My Requests", async () => {
    renderWithAuth(Permission.REQUEST);

    await waitFor(() => {
      expect(
        screen.getByText("You haven't made any requests yet")
      ).toBeInTheDocument();
    });
  });

  it("renders request cards when data is loaded", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 1,
            albumMbid: "abc",
            artistName: "Radiohead",
            albumTitle: "OK Computer",
            status: "pending",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            approvedAt: null,
            user: { id: 1, username: "testuser", thumb: null },
          },
        ]),
        { status: 200 }
      )
    );

    renderWithAuth(Permission.REQUEST);

    await waitFor(() => {
      expect(screen.getByText("OK Computer")).toBeInTheDocument();
    });
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });
});
