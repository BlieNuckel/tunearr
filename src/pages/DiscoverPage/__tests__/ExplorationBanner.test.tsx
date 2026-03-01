import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExplorationBanner from "../components/ExplorationBanner";

function renderBanner() {
  return render(
    <MemoryRouter>
      <ExplorationBanner />
    </MemoryRouter>
  );
}

describe("ExplorationBanner", () => {
  it("renders with link to /explore", () => {
    renderBanner();
    const link = screen.getByTestId("exploration-banner");
    expect(link).toHaveAttribute("href", "/explore");
  });

  it("displays title text", () => {
    renderBanner();
    expect(screen.getByText("Explore Albums")).toBeInTheDocument();
  });

  it("displays description text", () => {
    renderBanner();
    expect(
      screen.getByText(/Pick a starting album and discover new music/)
    ).toBeInTheDocument();
  });
});
