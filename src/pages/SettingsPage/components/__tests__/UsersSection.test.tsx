import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission, PERMISSION_LABELS } from "@shared/permissions";

const mockUseUsers = vi.fn();
vi.mock("@/hooks/useUsers", () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
}));

const mockUseAuth = vi.fn();
vi.mock("@/context/useAuth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

import UsersSection from "../UsersSection";
import type { ManagedUser } from "@/hooks/useUsers";

const CURRENT_USER: ManagedUser = {
  id: 1,
  username: "admin",
  userType: "local",
  permissions: Permission.ADMIN | Permission.REQUEST,
  enabled: true,
  thumb: null,
};

const OTHER_USER: ManagedUser = {
  id: 2,
  username: "alice",
  userType: "plex",
  permissions: Permission.REQUEST,
  enabled: true,
  thumb: "https://plex.tv/alice.jpg",
};

const DISABLED_USER: ManagedUser = {
  id: 3,
  username: "bob",
  userType: "local",
  permissions: Permission.REQUEST,
  enabled: false,
  thumb: null,
};

const mockCreateUser = vi.fn();
const mockUpdatePermissions = vi.fn();
const mockToggleEnabled = vi.fn();
const mockRemoveUser = vi.fn();

function setupMocks(overrides: Partial<ReturnType<typeof mockUseUsers>> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: CURRENT_USER.id, username: CURRENT_USER.username },
  });
  mockUseUsers.mockReturnValue({
    users: [CURRENT_USER, OTHER_USER],
    loading: false,
    error: null,
    createUser: mockCreateUser,
    updatePermissions: mockUpdatePermissions,
    toggleEnabled: mockToggleEnabled,
    removeUser: mockRemoveUser,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateUser.mockResolvedValue(undefined);
  mockUpdatePermissions.mockResolvedValue(undefined);
  mockToggleEnabled.mockResolvedValue(undefined);
  mockRemoveUser.mockResolvedValue(undefined);
});

describe("UsersSection", () => {
  it("renders loading skeleton while loading", () => {
    setupMocks({ loading: true, users: [] });
    const { container } = render(<UsersSection />);
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  it("renders user list with usernames", () => {
    setupMocks();
    render(<UsersSection />);
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renders user type badges", () => {
    setupMocks();
    render(<UsersSection />);
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("renders disabled badge for disabled users", () => {
    setupMocks({ users: [CURRENT_USER, DISABLED_USER] });
    render(<UsersSection />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("shows Add User button", () => {
    setupMocks();
    render(<UsersSection />);
    expect(screen.getByText("Add User")).toBeInTheDocument();
  });

  it("opens create form when Add User is clicked", async () => {
    setupMocks();
    render(<UsersSection />);
    await userEvent.click(screen.getByText("Add User"));
    expect(screen.getByText("Create Local User")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("hides Add User button when create form is open", async () => {
    setupMocks();
    render(<UsersSection />);
    await userEvent.click(screen.getByText("Add User"));
    expect(screen.queryByText("Add User")).not.toBeInTheDocument();
  });

  it("submits the create form and closes it", async () => {
    mockCreateUser.mockResolvedValue({
      id: 10,
      username: "newuser",
      userType: "local",
      permissions: Permission.REQUEST,
      enabled: true,
      thumb: null,
    });
    setupMocks();
    render(<UsersSection />);

    await userEvent.click(screen.getByText("Add User"));
    await userEvent.type(
      screen.getByPlaceholderText("Enter username"),
      "newuser"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Enter password"),
      "password123"
    );
    await userEvent.click(screen.getByText("Create User"));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith({
        username: "newuser",
        password: "password123",
        permissions: Permission.REQUEST,
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Create Local User")).not.toBeInTheDocument();
    });
  });

  it("closes create form when Cancel is clicked", async () => {
    setupMocks();
    render(<UsersSection />);
    await userEvent.click(screen.getByText("Add User"));
    expect(screen.getByText("Create Local User")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Create Local User")).not.toBeInTheDocument();
  });

  it("displays permission badges on user cards", () => {
    setupMocks();
    render(<UsersSection />);
    const adminLabels = screen.getAllByText(PERMISSION_LABELS[Permission.ADMIN]);
    expect(adminLabels.length).toBeGreaterThanOrEqual(1);
    const requestLabels = screen.getAllByText(
      PERMISSION_LABELS[Permission.REQUEST]
    );
    expect(requestLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("calls toggleEnabled when enable toggle is clicked for another user", async () => {
    setupMocks();
    render(<UsersSection />);
    const toggles = screen.getAllByRole("button", { name: /Disable user/i });
    const otherUserToggle = toggles[1];
    await userEvent.click(otherUserToggle);
    await waitFor(() => {
      expect(mockToggleEnabled).toHaveBeenCalledWith(OTHER_USER.id);
    });
  });

  it("disables enable toggle for self", () => {
    setupMocks();
    render(<UsersSection />);
    const toggles = screen.getAllByRole("button", { name: /Disable user/i });
    expect(toggles[0]).toBeDisabled();
  });

  it("deletes a user with confirmation", async () => {
    setupMocks();
    render(<UsersSection />);
    const deleteButtons = screen.getAllByText("Delete");
    const otherDeleteBtn = deleteButtons[1];
    await userEvent.click(otherDeleteBtn);

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalledWith(OTHER_USER.id);
    });
  });

  it("cancels delete confirmation", async () => {
    setupMocks();
    render(<UsersSection />);
    const deleteButtons = screen.getAllByText("Delete");
    await userEvent.click(deleteButtons[1]);

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
  });

  it("disables delete button for self", () => {
    setupMocks();
    render(<UsersSection />);
    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons[0]).toBeDisabled();
  });

  it("displays error message", () => {
    setupMocks({ error: "Failed to load users" });
    render(<UsersSection />);
    expect(screen.getByText("Failed to load users")).toBeInTheDocument();
  });

  it("shows empty state when no users", () => {
    setupMocks({ users: [] });
    render(<UsersSection />);
    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("toggles permission on another user", async () => {
    setupMocks();
    render(<UsersSection />);
    const requestBadges = screen.getAllByText(
      PERMISSION_LABELS[Permission.REQUEST]
    );
    const aliceRequestBadge = requestBadges[requestBadges.length - 1];
    await userEvent.click(aliceRequestBadge);

    await waitFor(() => {
      expect(mockUpdatePermissions).toHaveBeenCalledWith(
        OTHER_USER.id,
        OTHER_USER.permissions ^ Permission.REQUEST
      );
    });
  });

  it("shows error in create form when creation fails", async () => {
    mockCreateUser.mockRejectedValue(new Error("Username already taken"));
    setupMocks();
    render(<UsersSection />);

    await userEvent.click(screen.getByText("Add User"));
    await userEvent.type(
      screen.getByPlaceholderText("Enter username"),
      "duplicate"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Enter password"),
      "pass123"
    );
    await userEvent.click(screen.getByText("Create User"));

    await waitFor(() => {
      expect(screen.getByText("Username already taken")).toBeInTheDocument();
    });
  });
});
