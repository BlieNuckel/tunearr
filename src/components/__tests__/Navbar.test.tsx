import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../Navbar";

function renderNavbar(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  );
}

describe("Navbar", () => {
  it("renders the logo link", () => {
    renderNavbar();
    expect(screen.getByText("Tunearr")).toBeInTheDocument();
  });

  it("shows current page label in menu button", () => {
    renderNavbar("/");
    expect(screen.getByRole("button")).toHaveTextContent("Home");
  });

  it("shows Search label on search page", () => {
    renderNavbar("/search");
    expect(screen.getByRole("button")).toHaveTextContent("Search");
  });

  it("shows Settings label on settings page", () => {
    renderNavbar("/settings");
    expect(screen.getByRole("button")).toHaveTextContent("Settings");
  });

  it("opens dropdown menu on button click", () => {
    renderNavbar();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("closes dropdown when clicking a link", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Status")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Status"));
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
  });

  it("closes dropdown on outside click", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Status")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("toggles dropdown on repeated clicks", () => {
    renderNavbar();
    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(screen.getByText("Status")).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });
});
