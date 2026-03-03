import { render, screen, fireEvent } from "@testing-library/react";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import AccountSection from "../components/AccountSection";

const mockLogout = vi.fn();

const mockAuthValue: AuthContextValue = {
  status: "authenticated",
  user: { id: 1, username: "testadmin", role: "admin", theme: "system", thumb: null },
  login: vi.fn(),
  plexLogin: vi.fn(),
  plexSetup: vi.fn(),
  logout: mockLogout,
  setup: vi.fn(),
  updatePreferences: vi.fn(),
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
  it("renders username and role", () => {
    renderAccountSection();
    expect(screen.getByText("testadmin")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders user role for non-admin users", () => {
    renderAccountSection({
      user: { id: 2, username: "regularuser", role: "user", theme: "system", thumb: null },
    });
    expect(screen.getByText("regularuser")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("calls logout on Sign Out click", () => {
    renderAccountSection();
    fireEvent.click(screen.getByText("Sign Out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
