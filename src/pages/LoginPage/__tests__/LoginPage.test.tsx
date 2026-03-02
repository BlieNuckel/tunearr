import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import LoginPage from "../LoginPage";

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const defaultValue: AuthContextValue = {
    status: "unauthenticated",
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
        <LoginPage />
      </AuthContext.Provider>
    ),
    authValue: defaultValue,
  };
}

describe("LoginPage", () => {
  it("renders the login form", () => {
    renderWithAuth();
    expect(
      screen.getByRole("heading", { name: "Sign in to Tunearr" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("shows error when fields are empty", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      screen.getByText("Username and password are required")
    ).toBeInTheDocument();
  });

  it("calls login with username and password", async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();
    renderWithAuth({ login: mockLogin });

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin", "password123");
    });
  });

  it("shows error from login failure", async () => {
    const user = userEvent.setup();
    const mockLogin = vi
      .fn()
      .mockRejectedValue(new Error("Invalid username or password"));
    renderWithAuth({ login: mockLogin });

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password")
      ).toBeInTheDocument();
    });
  });

  it("shows loading state while logging in", async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    const mockLogin = vi.fn().mockReturnValue(loginPromise);
    renderWithAuth({ login: mockLogin });

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Signing in...")).toBeInTheDocument();
    resolveLogin!();
  });
});
