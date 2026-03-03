import { render, screen, fireEvent } from "@testing-library/react";
import UsersSection from "../UsersSection";

const mockUsers = [
  { id: 1, username: "admin", role: "admin" as const, enabled: true, theme: "system", thumb: null },
  { id: 2, username: "plexuser", role: "user" as const, enabled: true, theme: "dark", thumb: "https://thumb.jpg" },
];

const mockUpdateRole = vi.fn();
const mockToggleEnabled = vi.fn();
const mockRemoveUser = vi.fn();
const mockRefetch = vi.fn();

vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({
    users: mockUsers,
    loading: false,
    error: null,
    updateRole: mockUpdateRole,
    toggleEnabled: mockToggleEnabled,
    removeUser: mockRemoveUser,
    refetch: mockRefetch,
  }),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", role: "admin", theme: "system", thumb: null },
  }),
}));

describe("UsersSection", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders all users", () => {
    render(<UsersSection />);

    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("plexuser")).toBeInTheDocument();
  });

  it("shows (you) next to the current user", () => {
    render(<UsersSection />);

    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("shows role badges", () => {
    render(<UsersSection />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("disables role toggle for current user", () => {
    render(<UsersSection />);

    const adminBadge = screen.getByText("Admin");
    expect(adminBadge).toBeDisabled();
  });

  it("disables enable toggle for current user", () => {
    render(<UsersSection />);

    const toggles = screen.getAllByRole("button", { name: /disable|enable/i });
    const selfToggle = toggles[0];
    expect(selfToggle).toBeDisabled();
  });

  it("does not show delete button for current user", () => {
    render(<UsersSection />);

    const deleteButtons = screen.getAllByText("Delete");
    expect(deleteButtons).toHaveLength(1);
  });

  it("calls updateRole when role badge is clicked", () => {
    render(<UsersSection />);

    const userBadge = screen.getByText("User");
    fireEvent.click(userBadge);

    expect(mockUpdateRole).toHaveBeenCalledWith(2, "admin");
  });

  it("calls toggleEnabled when toggle is clicked", () => {
    render(<UsersSection />);

    const toggles = screen.getAllByRole("button", { name: /disable|enable/i });
    const otherUserToggle = toggles[1];
    fireEvent.click(otherUserToggle);

    expect(mockToggleEnabled).toHaveBeenCalledWith(2, false);
  });

  it("shows confirmation before deleting", () => {
    render(<UsersSection />);

    fireEvent.click(screen.getByText("Delete"));

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls removeUser when delete is confirmed", () => {
    render(<UsersSection />);

    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Confirm"));

    expect(mockRemoveUser).toHaveBeenCalledWith(2);
  });

  it("cancels delete when Cancel is clicked", () => {
    render(<UsersSection />);

    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(mockRemoveUser).not.toHaveBeenCalled();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
  });
});
