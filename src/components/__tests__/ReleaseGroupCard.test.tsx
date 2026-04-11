import { render, screen, fireEvent } from "@testing-library/react";
import ReleaseGroupCard from "../ReleaseGroupCard";
import { Permission } from "@shared/permissions";
import type { ReleaseGroup } from "../../types";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, permissions: Permission.ADMIN },
  }),
}));

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

const mockRequestAlbum = vi.fn();
const mockFetchTracks = vi.fn();
const mockStop = vi.fn();
const mockAddToWanted = vi.fn();
const mockRemoveFromWanted = vi.fn();

vi.mock("../../hooks/useLidarr", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    requestAlbum: mockRequestAlbum,
  }),
}));

vi.mock("../../hooks/useWanted", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    addToWanted: mockAddToWanted,
    removeFromWanted: mockRemoveFromWanted,
  }),
}));

vi.mock("../../hooks/usePurchase", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    record: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(),
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

vi.mock("../../hooks/useAudioPreview", () => ({
  default: () => ({
    toggle: vi.fn(),
    stop: mockStop,
    isTrackPlaying: () => false,
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

vi.mock("../PurchasePriceModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="purchase-price-modal" /> : null,
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

  describe("hover flip (desktop)", () => {
    it("renders both faces for 3D flip", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      expect(screen.getByTestId("release-group-card")).toBeInTheDocument();
      expect(screen.getByTestId("release-group-card-back")).toBeInTheDocument();
    });

    it("flips card and fetches tracks with artistName on mouse enter", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen
        .getByTestId("release-group-card")
        .closest(".flip-card")!;

      fireEvent.mouseEnter(card);

      const inner = screen
        .getByTestId("release-group-card")
        .closest(".flip-card-inner")!;
      expect(inner).toHaveClass("flipped");
      expect(mockFetchTracks).toHaveBeenCalledWith("abc-123", "Test Artist");
    });

    it("flips back and stops audio on mouse leave", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen
        .getByTestId("release-group-card")
        .closest(".flip-card")!;

      fireEvent.mouseEnter(card);
      const inner = screen
        .getByTestId("release-group-card")
        .closest(".flip-card-inner")!;
      expect(inner).toHaveClass("flipped");

      fireEvent.mouseLeave(card);
      expect(inner).not.toHaveClass("flipped");
      expect(mockStop).toHaveBeenCalled();
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

      const expandContainer = screen
        .getByTestId("mobile-tracklist")
        .closest("[data-expanded]")!;
      expect(expandContainer).toHaveAttribute("data-expanded", "false");

      const mobileCard = screen.getByTestId("release-group-card-mobile");
      fireEvent.click(mobileCard.querySelector(".flex.items-center")!);

      expect(expandContainer).toHaveAttribute("data-expanded", "true");
      expect(mockFetchTracks).toHaveBeenCalledWith("abc-123", "Test Artist");
    });

    it("collapses tracklist and stops audio when expanded card is clicked again", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const clickTarget = screen
        .getByTestId("release-group-card-mobile")
        .querySelector(".flex.items-center")!;
      const expandContainer = screen
        .getByTestId("mobile-tracklist")
        .closest("[data-expanded]")!;

      fireEvent.click(clickTarget);
      expect(expandContainer).toHaveAttribute("data-expanded", "true");

      fireEvent.click(clickTarget);
      expect(expandContainer).toHaveAttribute("data-expanded", "false");
      expect(mockStop).toHaveBeenCalled();
    });

    it("opens purchase modal when + button is clicked", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      fireEvent.click(screen.getByTestId("mobile-monitor-button"));

      expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    });

    it("does not expand card when + button is clicked", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      fireEvent.click(screen.getByTestId("mobile-monitor-button"));

      const expandContainer = screen
        .getByTestId("mobile-tracklist")
        .closest("[data-expanded]")!;
      expect(expandContainer).toHaveAttribute("data-expanded", "false");
    });

    it("fetches tracks on expand but not on collapse", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const clickTarget = screen
        .getByTestId("release-group-card-mobile")
        .querySelector(".flex.items-center")!;

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

  describe("inLibrary behavior", () => {
    it("disables add button when inLibrary is true", () => {
      render(
        <ReleaseGroupCard releaseGroup={makeReleaseGroup()} inLibrary={true} />
      );

      const mobileButton = screen.getByTestId("mobile-monitor-button");
      expect(mobileButton).toBeDisabled();
    });

    it("shows checkmark icon when inLibrary is true", () => {
      render(
        <ReleaseGroupCard releaseGroup={makeReleaseGroup()} inLibrary={true} />
      );

      const mobileButton = screen.getByTestId("mobile-monitor-button");
      expect(mobileButton.className).toContain("bg-gray-200");
      expect(mobileButton.className).toContain("text-gray-500");
    });
  });

  describe("more menu", () => {
    it("renders more options button on mobile and desktop", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const moreButtons = screen.getAllByLabelText("More options");
      expect(moreButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows 'Add to wanted' option when menu is opened", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const moreButtons = screen.getAllByLabelText("More options");
      fireEvent.click(moreButtons[0]);

      expect(screen.getByText("Add to wanted")).toBeInTheDocument();
    });

    it("calls addToWanted when 'Add to wanted' is clicked", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const moreButtons = screen.getAllByLabelText("More options");
      fireEvent.click(moreButtons[0]);
      fireEvent.click(screen.getByText("Add to wanted"));

      expect(mockAddToWanted).toHaveBeenCalledWith("abc-123");
    });

    it("does not expand card when more menu is clicked on mobile", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

      const expandContainer = screen
        .getByTestId("mobile-tracklist")
        .closest("[data-expanded]")!;

      const moreButtons = screen.getAllByLabelText("More options");
      fireEvent.click(moreButtons[0]);

      expect(expandContainer).toHaveAttribute("data-expanded", "false");
    });
  });
});
