import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import LibraryPage from "../LibraryPage";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import { Permission } from "@shared/permissions";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(fetch).mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
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
      hasPlexToken: false,
    },
    login: vi.fn(),
    plexLogin: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
    plexSetup: vi.fn(),
    linkPlex: vi.fn(),
    updatePreferences: vi.fn(),
    refreshUser: vi.fn(),
  };
}

function renderWithAuth(permissions: number) {
  return render(
    <AuthContext.Provider value={makeAuthContext(permissions)}>
      <LibraryPage />
    </AuthContext.Provider>
  );
}

async function toggleFilterChip(
  user: ReturnType<typeof userEvent.setup>,
  pillText: string,
  optionLabel: string
) {
  const existingOption = screen.queryByRole("option", { name: optionLabel });
  if (!existingOption) {
    const pill = screen.getByRole("button", { name: new RegExp(pillText) });
    await user.click(pill);
  }

  const option = screen.getByRole("option", { name: optionLabel });
  await user.click(option);
}

describe("LibraryPage", () => {
  it("renders page title", async () => {
    renderWithAuth(Permission.REQUEST);

    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  it("shows requester and status filter pills", async () => {
    renderWithAuth(Permission.REQUEST);

    expect(
      screen.getByRole("button", { name: /Requester/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Status/ })).toBeInTheDocument();
  });

  it("shows filter options when pill is clicked", async () => {
    renderWithAuth(Permission.REQUEST);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Requester/ }));

    expect(screen.getByRole("option", { name: "Me" })).toBeInTheDocument();
  });

  it("shows status filter options when status pill is clicked", async () => {
    renderWithAuth(Permission.REQUEST);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Status/ }));

    expect(screen.getByRole("option", { name: "Pending" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Approved" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Declined" })
    ).toBeInTheDocument();
  });

  it("defaults to showing all requests with no filters active", async () => {
    renderWithAuth(Permission.ADMIN);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/requests");
    });
  });

  it("fetches only user requests for basic users", async () => {
    renderWithAuth(Permission.REQUEST);

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/requests?userId=1");
    });
  });

  it("fetches user requests when selecting 'Me' filter", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Requester", "Me");

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/requests?userId=1");
    });
  });

  it("fetches all requests when deselecting 'Me' filter as admin", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Requester", "Me");
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/requests?userId=1");
    });

    await toggleFilterChip(user, "Requester", "Me");
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenLastCalledWith("/api/requests");
    });
  });

  it("fetches filtered requests when selecting a status", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Status", "Pending");

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/requests?status=pending"
      );
    });
  });

  it("combines requester and status filters", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Requester", "Me");
    await toggleFilterChip(user, "Status", "Approved");

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/requests?userId=1&status=approved"
      );
    });
  });

  it("sends repeated status params for multi-select", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Status", "Pending");
    await toggleFilterChip(user, "Status", "Approved");

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/requests?status=pending&status=approved"
      );
    });
  });

  it("shows empty state for user's requests when 'Me' filter active", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Requester", "Me");

    await waitFor(() => {
      expect(
        screen.getByText("You haven't made any requests yet")
      ).toBeInTheDocument();
    });
  });

  it("does not show reset button when no filters are active", async () => {
    renderWithAuth(Permission.ADMIN);

    expect(screen.queryByText("Reset filters")).not.toBeInTheDocument();
  });

  it("shows reset button when a filter is active and resets on click", async () => {
    renderWithAuth(Permission.ADMIN);
    const user = userEvent.setup();

    await toggleFilterChip(user, "Requester", "Me");
    await toggleFilterChip(user, "Status", "Approved");

    expect(screen.getByText("Reset filters")).toBeInTheDocument();

    await user.click(screen.getByText("Reset filters"));

    expect(screen.queryByText("Reset filters")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenLastCalledWith("/api/requests");
    });
  });

  it("shows empty state for all requests when no filters active", async () => {
    renderWithAuth(Permission.ADMIN);

    await waitFor(() => {
      expect(screen.getByText("No requests yet")).toBeInTheDocument();
    });
  });

  it("renders request cards when data is loaded", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
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
              lidarr: null,
            },
          ]),
          { status: 200 }
        )
      )
    );

    renderWithAuth(Permission.REQUEST);

    await waitFor(() => {
      expect(screen.getByText("OK Computer")).toBeInTheDocument();
    });
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });
});
