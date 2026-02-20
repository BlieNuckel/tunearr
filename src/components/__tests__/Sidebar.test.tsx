import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../Sidebar";

const renderSidebar = (path = "/") => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>
  );
};

describe("Sidebar", () => {
  it("renders the logo and app name in both mobile header and desktop sidebar", () => {
    renderSidebar();
    const tunearrLinks = screen.getAllByText("Tunearr");
    expect(tunearrLinks).toHaveLength(2); // One in mobile header, one in desktop sidebar
  });

  it("renders all navigation links for both mobile and desktop", () => {
    renderSidebar();
    // Each link appears twice: once in desktop sidebar, once in mobile bottom nav
    expect(screen.getAllByRole("link", { name: /Discover/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Search/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Status/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Settings/ })).toHaveLength(2);
  });

  it("highlights Discover link on home page in both mobile and desktop", () => {
    renderSidebar("/");
    const discoverLinks = screen.getAllByRole("link", { name: /Discover/ });
    expect(discoverLinks).toHaveLength(2);
    // Desktop version has bg-amber-300
    expect(discoverLinks[0]).toHaveClass("bg-amber-300");
    // Mobile version has bg-amber-50
    expect(discoverLinks[1]).toHaveClass("bg-amber-50");
  });

  it("highlights Search link on search page", () => {
    renderSidebar("/search");
    const searchLinks = screen.getAllByRole("link", { name: /Search/ });
    expect(searchLinks).toHaveLength(2);
    expect(searchLinks[0]).toHaveClass("bg-amber-300");
    expect(searchLinks[1]).toHaveClass("bg-amber-50");
  });

  it("highlights Status link on status page", () => {
    renderSidebar("/status");
    const statusLinks = screen.getAllByRole("link", { name: /Status/ });
    expect(statusLinks).toHaveLength(2);
    expect(statusLinks[0]).toHaveClass("bg-amber-300");
    expect(statusLinks[1]).toHaveClass("bg-amber-50");
  });

  it("highlights Settings link on settings page", () => {
    renderSidebar("/settings");
    const settingsLinks = screen.getAllByRole("link", { name: /Settings/ });
    expect(settingsLinks).toHaveLength(2);
    expect(settingsLinks[0]).toHaveClass("bg-amber-300");
    expect(settingsLinks[1]).toHaveClass("bg-amber-50");
  });

  it("applies hover styles to non-active links", () => {
    renderSidebar("/");
    const searchLinks = screen.getAllByRole("link", { name: /Search/ });
    expect(searchLinks[0]).toHaveClass("hover:bg-amber-50");
    expect(searchLinks[0]).not.toHaveClass("bg-amber-300");
  });
});
