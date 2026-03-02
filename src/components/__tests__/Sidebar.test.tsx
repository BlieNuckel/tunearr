import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/context/authContextDef";
import Sidebar from "../Sidebar";

const mockAuthValue: AuthContextValue = {
  status: "authenticated",
  user: { id: 1, username: "testadmin", role: "admin", theme: "system" },
  login: vi.fn(),
  logout: vi.fn(),
  setup: vi.fn(),
  updatePreferences: vi.fn(),
};

const renderSidebar = (path = "/") => {
  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe("Sidebar", () => {
  it("renders the logo and app name in both mobile header and desktop sidebar", () => {
    renderSidebar();
    const tunearrLinks = screen.getAllByText("Tunearr");
    expect(tunearrLinks).toHaveLength(2);
  });

  it("renders shared navigation links for both mobile and desktop", () => {
    renderSidebar();
    expect(screen.getAllByRole("link", { name: /Discover/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Search/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Status/ })).toHaveLength(2);
  });

  it("shows username in desktop sidebar account link", () => {
    renderSidebar();
    expect(screen.getByText("testadmin")).toBeInTheDocument();
  });

  it("shows Account label in mobile nav", () => {
    renderSidebar();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("renders account link to settings in both mobile and desktop", () => {
    renderSidebar();
    const accountLinks = screen.getAllByRole("link", { name: /testadmin|Account/ });
    expect(accountLinks).toHaveLength(2);
    accountLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/settings");
    });
  });

  it("highlights Discover link on home page in both mobile and desktop", () => {
    renderSidebar("/");
    const discoverLinks = screen.getAllByRole("link", { name: /Discover/ });
    expect(discoverLinks).toHaveLength(2);
    expect(discoverLinks[0]).toHaveClass("bg-amber-300");
    expect(discoverLinks[1]).toHaveClass("text-black");
  });

  it("highlights Search link on search page", () => {
    renderSidebar("/search");
    const searchLinks = screen.getAllByRole("link", { name: /Search/ });
    expect(searchLinks).toHaveLength(2);
    expect(searchLinks[0]).toHaveClass("bg-amber-300");
    expect(searchLinks[1]).toHaveClass("text-black");
  });

  it("highlights Status link on status page", () => {
    renderSidebar("/status");
    const statusLinks = screen.getAllByRole("link", { name: /Status/ });
    expect(statusLinks).toHaveLength(2);
    expect(statusLinks[0]).toHaveClass("bg-amber-300");
    expect(statusLinks[1]).toHaveClass("text-black");
  });

  it("highlights account link on settings page", () => {
    renderSidebar("/settings");
    const desktopAccountLink = screen.getByRole("link", { name: /testadmin/ });
    expect(desktopAccountLink).toHaveClass("bg-amber-300");
    const mobileAccountLink = screen.getByRole("link", { name: /Account/ });
    expect(mobileAccountLink).toHaveClass("text-black");
  });

  it("applies hover styles to non-active links", () => {
    renderSidebar("/");
    const searchLinks = screen.getAllByRole("link", { name: /Search/ });
    expect(searchLinks[0]).toHaveClass("hover:bg-amber-50");
    expect(searchLinks[0]).not.toHaveClass("bg-amber-300");
  });
});
