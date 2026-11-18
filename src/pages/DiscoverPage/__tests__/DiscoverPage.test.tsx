import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import DiscoverPage from "../DiscoverPage";

function SearchRouteProbe() {
  const location = useLocation();
  return (
    <div data-testid="search-route">
      {location.pathname}
      {location.search}
    </div>
  );
}

const render = (ui: React.ReactElement) =>
  rtlRender(ui, {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });

vi.mock("../components/sections/LiveBannerSection", () => ({
  default: () => <div data-testid="live-banner-section" />,
}));

vi.mock("../components/sections/NewReleasesSection", () => ({
  default: () => <div data-testid="new-releases-section" />,
}));

describe("DiscoverPage", () => {
  it("renders the Home heading", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders the live banner and new releases sections", () => {
    render(<DiscoverPage />);
    expect(screen.getByTestId("live-banner-section")).toBeInTheDocument();
    expect(screen.getByTestId("new-releases-section")).toBeInTheDocument();
  });

  it("renders no recommendation sections", () => {
    render(<DiscoverPage />);
    expect(
      screen.queryByTestId("discover-section-spotlight")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("discover-section-artists")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("discover-section-nearbyShows")
    ).not.toBeInTheDocument();
  });

  it("renders a search bar", () => {
    render(<DiscoverPage />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("opens the search page with the submitted query", () => {
    rtlRender(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/search" element={<SearchRouteProbe />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "Massive Attack" },
    });
    fireEvent.submit(screen.getByTestId("search-form"));

    expect(screen.getByTestId("search-route")).toHaveTextContent(
      "/search?q=Massive+Attack"
    );
  });
});
