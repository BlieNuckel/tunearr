import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import RequireAuth from "../RequireAuth";

function renderWithAuth(
  overrides: Partial<AuthContextValue>,
  initialPath = "/"
) {
  const defaultValue: AuthContextValue = {
    status: "authenticated",
    user: {
      id: 1,
      username: "admin",
      role: "admin",
      theme: "system",
    },
    login: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
    updatePreferences: vi.fn(),
    ...overrides,
  };

  return render(
    <AuthContext.Provider value={defaultValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>Main App</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("RequireAuth", () => {
  it("renders nothing while loading", () => {
    const { container } = renderWithAuth({ status: "loading" });
    expect(container.textContent).toBe("");
  });

  it("renders SetupPage when needs-setup", () => {
    renderWithAuth({ status: "needs-setup", user: null });
    expect(
      screen.getByRole("heading", { name: "Create Admin Account" })
    ).toBeInTheDocument();
  });

  it("renders LoginPage when unauthenticated", () => {
    renderWithAuth({ status: "unauthenticated", user: null });
    expect(
      screen.getByRole("heading", { name: "Sign in to Tunearr" })
    ).toBeInTheDocument();
  });

  it("renders outlet when authenticated", () => {
    renderWithAuth({ status: "authenticated" });
    expect(screen.getByText("Main App")).toBeInTheDocument();
  });
});
