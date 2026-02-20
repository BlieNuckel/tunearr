import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Layout from "../Layout";

function renderLayout(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>Home Content</div>} />
          <Route path="/other" element={<div>Other Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Layout", () => {
  it("renders the sidebar with logo in both mobile and desktop", () => {
    renderLayout();
    const tunearrElements = screen.getAllByText("Tunearr");
    expect(tunearrElements).toHaveLength(2); // One in mobile header, one in desktop sidebar
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
