import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import SetupPage from "../SetupPage";

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const defaultValue: AuthContextValue = {
    status: "needs-setup",
    user: null,
    login: vi.fn(),
    plexLogin: vi.fn(),
    plexSetup: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
    updatePreferences: vi.fn(),
    ...overrides,
  };

  return {
    ...render(
      <AuthContext.Provider value={defaultValue}>
        <SetupPage />
      </AuthContext.Provider>
    ),
    authValue: defaultValue,
  };
}

describe("SetupPage", () => {
  it("renders the setup form and Plex button", () => {
    renderWithAuth();
    expect(
      screen.getByRole("heading", { name: "Create Admin Account" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set up with Plex" })
    ).toBeInTheDocument();
  });

  it("shows error when username is too short", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    await user.type(screen.getByLabelText("Username"), "ab");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen.getByText("Username must be at least 3 characters")
    ).toBeInTheDocument();
  });

  it("shows error when password is too short", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen.getByText("Password must be at least 8 characters")
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("calls setup on valid submission", async () => {
    const user = userEvent.setup();
    const mockSetup = vi.fn();
    renderWithAuth({ setup: mockSetup });

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(mockSetup).toHaveBeenCalledWith("admin", "password123");
    });
  });

  it("shows error from setup failure", async () => {
    const user = userEvent.setup();
    const mockSetup = vi.fn().mockRejectedValue(new Error("Server error"));
    renderWithAuth({ setup: mockSetup });

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("calls plexSetup when Plex button clicked", async () => {
    const user = userEvent.setup();
    const mockPlexSetup = vi.fn().mockResolvedValue(undefined);
    renderWithAuth({ plexSetup: mockPlexSetup });

    await user.click(
      screen.getByRole("button", { name: "Set up with Plex" })
    );

    await waitFor(() => {
      expect(mockPlexSetup).toHaveBeenCalled();
    });
  });

  it("shows Plex loading state", async () => {
    const user = userEvent.setup();
    const mockPlexSetup = vi
      .fn()
      .mockReturnValue(new Promise<void>(() => {}));
    renderWithAuth({ plexSetup: mockPlexSetup });

    await user.click(
      screen.getByRole("button", { name: "Set up with Plex" })
    );

    expect(
      screen.getByText("Setting up with Plex...")
    ).toBeInTheDocument();
  });

  it("shows error from Plex setup failure", async () => {
    const user = userEvent.setup();
    const mockPlexSetup = vi
      .fn()
      .mockRejectedValue(new Error("Plex sign-in was cancelled"));
    renderWithAuth({ plexSetup: mockPlexSetup });

    await user.click(
      screen.getByRole("button", { name: "Set up with Plex" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Plex sign-in was cancelled")
      ).toBeInTheDocument();
    });
  });

  it("disables both buttons while Plex setup is in progress", async () => {
    const user = userEvent.setup();
    const mockPlexSetup = vi
      .fn()
      .mockReturnValue(new Promise<void>(() => {}));
    renderWithAuth({ plexSetup: mockPlexSetup });

    await user.click(
      screen.getByRole("button", { name: "Set up with Plex" })
    );

    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Setting up with Plex..." })
    ).toBeDisabled();
  });
});
