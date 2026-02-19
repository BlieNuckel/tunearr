import { render, screen, fireEvent } from "@testing-library/react";
import ReleaseGroupCard from "../ReleaseGroupCard";
import type { ReleaseGroup } from "../../types";

const mockAddToLidarr = vi.fn();
const mockFetchTracks = vi.fn();

vi.mock("../../hooks/useLidarr", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    addToLidarr: mockAddToLidarr,
  }),
}));

vi.mock("../../hooks/useReleaseTracks", () => ({
  default: () => ({
    media: [],
    loading: false,
    error: null,
    fetchTracks: mockFetchTracks,
  }),
}));

vi.mock("../PurchaseLinksModal", () => ({
  default: ({
    isOpen,
    onAddToLibrary,
  }: {
    isOpen: boolean;
    onAddToLibrary: () => void;
  }) =>
    isOpen ? (
      <div data-testid="purchase-modal">
        <button onClick={onAddToLibrary}>Add to Library</button>
      </div>
    ) : null,
}));

vi.mock("../TrackList", () => ({
  default: () => <div data-testid="track-list" />,
}));

const makeReleaseGroup = (
  overrides: Partial<ReleaseGroup> = {}
): ReleaseGroup => ({
  id: "abc-123",
  score: 100,
  title: "Test Album",
  "primary-type": "Album",
  "first-release-date": "2023-05-10",
  "artist-credit": [{ name: "Test Artist", artist: { id: "a1", name: "Test Artist" } }],
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

    expect(screen.getAllByText("Unknown Artist").length).toBeGreaterThanOrEqual(1);
  });

  it("hides year when first-release-date is empty", () => {
    render(
      <ReleaseGroupCard
        releaseGroup={makeReleaseGroup({ "first-release-date": "" })}
      />
    );

    expect(screen.queryByText(/^\d{4}$/)).not.toBeInTheDocument();
  });

  describe("hover flip (desktop)", () => {
    it("renders both faces for 3D flip", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      expect(screen.getByTestId("release-group-card")).toBeInTheDocument();
      expect(screen.getByTestId("release-group-card-back")).toBeInTheDocument();
    });

    it("flips card and fetches tracks on mouse enter", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.mouseEnter(card);

      const inner = screen.getByTestId("release-group-card").closest(".flip-card-inner")!;
      expect(inner).toHaveClass("flipped");
      expect(mockFetchTracks).toHaveBeenCalledWith("abc-123");
    });

    it("flips back on mouse leave", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.mouseEnter(card);
      const inner = screen.getByTestId("release-group-card").closest(".flip-card-inner")!;
      expect(inner).toHaveClass("flipped");

      fireEvent.mouseLeave(card);
      expect(inner).not.toHaveClass("flipped");
    });
  });

  describe("mobile layout", () => {
    it("renders mobile card with title, artist, year, and monitor button", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const mobileCard = screen.getByTestId("release-group-card-mobile");
      expect(mobileCard).toBeInTheDocument();
      expect(screen.getByTestId("mobile-monitor-button")).toBeInTheDocument();
    });

    it("expands to show tracklist when card is clicked", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      expect(screen.queryByTestId("mobile-tracklist")).not.toBeInTheDocument();

      const mobileCard = screen.getByTestId("release-group-card-mobile");
      fireEvent.click(mobileCard.querySelector(".flex.items-center")!);

      expect(screen.getByTestId("mobile-tracklist")).toBeInTheDocument();
      expect(mockFetchTracks).toHaveBeenCalledWith("abc-123");
    });

    it("collapses tracklist when expanded card is clicked again", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const clickTarget = screen.getByTestId("release-group-card-mobile").querySelector(".flex.items-center")!;

      fireEvent.click(clickTarget);
      expect(screen.getByTestId("mobile-tracklist")).toBeInTheDocument();

      fireEvent.click(clickTarget);
      expect(screen.queryByTestId("mobile-tracklist")).not.toBeInTheDocument();
    });

    it("opens purchase modal when + button is clicked", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      fireEvent.click(screen.getByTestId("mobile-monitor-button"));

      expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    });

    it("does not expand card when + button is clicked", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      fireEvent.click(screen.getByTestId("mobile-monitor-button"));

      expect(screen.queryByTestId("mobile-tracklist")).not.toBeInTheDocument();
    });

    it("fetches tracks on expand but not on collapse", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const clickTarget = screen.getByTestId("release-group-card-mobile").querySelector(".flex.items-center")!;

      fireEvent.click(clickTarget);
      expect(mockFetchTracks).toHaveBeenCalledTimes(1);

      fireEvent.click(clickTarget);
      expect(mockFetchTracks).toHaveBeenCalledTimes(1);
    });
  });

  it("does not render a detail overlay", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    expect(screen.queryByTestId("detail-overlay")).not.toBeInTheDocument();
  });
});
