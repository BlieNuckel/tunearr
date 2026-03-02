import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import SetupPage from "../SetupPage";

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const defaultValue: AuthContextValue = {
    status: "needs-setup",
    user: null,
    login: vi.fn(),
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
  it("renders the setup form", () => {
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
});
