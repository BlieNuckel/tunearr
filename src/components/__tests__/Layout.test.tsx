import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import Layout from "../Layout";

const mockAuthValue: AuthContextValue = {
  status: "authenticated",
  user: { id: 1, username: "testadmin", role: "admin", theme: "system" },
  login: vi.fn(),
  logout: vi.fn(),
  setup: vi.fn(),
  updatePreferences: vi.fn(),
};

function renderLayout(path = "/") {
  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div>Home Content</div>} />
            <Route path="/other" element={<div>Other Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Layout", () => {
  it("renders the sidebar with logo in both mobile and desktop", () => {
    renderLayout();
    const tunearrElements = screen.getAllByText("Tunearr");
    expect(tunearrElements).toHaveLength(2);
  });

  it("renders child route content via Outlet", () => {
    renderLayout("/");
    expect(screen.getByText("Home Content")).toBeInTheDocument();
  });

  it("renders different child route content", () => {
    renderLayout("/other");
    expect(screen.getByText("Other Content")).toBeInTheDocument();
  });
});
