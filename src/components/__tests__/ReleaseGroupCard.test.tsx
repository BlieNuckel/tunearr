import { render, screen, fireEvent } from "@testing-library/react";
import ReleaseGroupCard from "../ReleaseGroupCard";
import type { ReleaseGroup } from "../../types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const makeReleaseGroup = (
  overrides: Partial<ReleaseGroup> = {}
): ReleaseGroup => ({
  id: "abc-123",
  score: 100,
  title: "Test Album",
  "primary-type": "Album",
  "first-release-date": "2023-05-10",
  "artist-credit": [
    { name: "Test Artist", artist: { id: "a1", name: "Test Artist" } },
  ],
  ...overrides,
});

describe("ReleaseGroupCard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders album title, artist name, and year", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    expect(screen.getAllByText("Test Album").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Test Artist").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2023").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Unknown Artist' when artist-credit is empty", () => {
    render(
      <ReleaseGroupCard
        releaseGroup={makeReleaseGroup({ "artist-credit": [] })}
      />
    );

    expect(screen.getAllByText("Unknown Artist").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("hides year when first-release-date is empty", () => {
    render(
      <ReleaseGroupCard
        releaseGroup={makeReleaseGroup({ "first-release-date": "" })}
      />
    );

    expect(screen.queryByText(/^\d{4}$/)).not.toBeInTheDocument();
  });

  it("navigates to the album page when the card is clicked", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByTestId("release-group-card"));
    expect(mockNavigate).toHaveBeenCalledWith("/album/abc-123");
  });

  it("navigates from the mobile card too", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByTestId("release-group-card-mobile"));
    expect(mockNavigate).toHaveBeenCalledWith("/album/abc-123");
  });

  it("does not render action buttons", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    expect(screen.queryByLabelText("More options")).not.toBeInTheDocument();
    expect(screen.queryByTestId("track-list")).not.toBeInTheDocument();
  });
});
