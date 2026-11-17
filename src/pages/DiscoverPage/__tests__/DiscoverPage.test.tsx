import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DiscoverPage from "../DiscoverPage";

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
  it("renders the Discover heading", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("Discover")).toBeInTheDocument();
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
});
