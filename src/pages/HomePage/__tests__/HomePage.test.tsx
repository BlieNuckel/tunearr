import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "../HomePage";

vi.mock("../components/Highlights", () => ({
  default: () => <div data-testid="highlights" />,
}));

function SearchRouteProbe() {
  const location = useLocation();
  return (
    <div data-testid="search-route">
      {location.pathname}
      {location.search}
    </div>
  );
}

function render() {
  rtlRender(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchRouteProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("HomePage", () => {
  it("renders the Home heading, search and highlights", () => {
    render();

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("highlights")).toBeInTheDocument();
  });

  it("sends a search to the search page", () => {
    render();

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "yves tumor" },
    });
    fireEvent.submit(screen.getByTestId("search-form"));

    expect(screen.getByTestId("search-route")).toHaveTextContent(
      "/search?q=yves+tumor"
    );
  });
});
