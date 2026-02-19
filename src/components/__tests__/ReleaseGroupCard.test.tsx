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
    expect(screen.getByText("2023")).toBeInTheDocument();
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

  describe("detail modal (click)", () => {
    it("opens detail overlay and fetches tracks on click", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);

      expect(screen.getByTestId("detail-overlay")).toBeInTheDocument();
      expect(mockFetchTracks).toHaveBeenCalledWith("abc-123");
    });

    it("shows album info and track list in the detail overlay", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);

      const overlay = screen.getByTestId("detail-overlay");
      expect(overlay).toHaveTextContent("Test Album");
      expect(overlay).toHaveTextContent("Test Artist");
      expect(overlay).toHaveTextContent("2023");
      expect(screen.getAllByTestId("track-list").length).toBeGreaterThanOrEqual(1);
    });

    it("closes detail overlay when clicking the X button", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);
      expect(screen.getByTestId("detail-overlay")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("detail-close"));
      expect(screen.queryByTestId("detail-overlay")).not.toBeInTheDocument();
    });

    it("closes detail overlay when clicking the backdrop", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);
      expect(screen.getByTestId("detail-overlay")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("detail-overlay"));
      expect(screen.queryByTestId("detail-overlay")).not.toBeInTheDocument();
    });

    it("opens purchase modal when MonitorButton is clicked in detail overlay", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);
      const overlay = screen.getByTestId("detail-overlay");
      const addBtn = overlay.querySelector("button:not([data-testid='detail-close'])")!;
      fireEvent.click(addBtn);

      expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    });

    it("calls addToLidarr directly when album title is empty", () => {
      render(
        <ReleaseGroupCard releaseGroup={makeReleaseGroup({ title: "" })} />
      );
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);
      const overlay = screen.getByTestId("detail-overlay");
      const addBtn = overlay.querySelector("button:not([data-testid='detail-close'])")!;
      fireEvent.click(addBtn);

      expect(mockAddToLidarr).toHaveBeenCalledWith({ albumMbid: "abc-123" });
      expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
    });

    it("calls addToLidarr when 'Add to Library' is clicked in purchase modal", () => {
      render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
      const card = screen.getByTestId("release-group-card").closest(".flip-card")!;

      fireEvent.click(card);
      const overlay = screen.getByTestId("detail-overlay");
      const addBtn = overlay.querySelector("button:not([data-testid='detail-close'])")!;
      fireEvent.click(addBtn);
      fireEvent.click(screen.getByText("Add to Library"));

      expect(mockAddToLidarr).toHaveBeenCalledWith({ albumMbid: "abc-123" });
    });
  });
});
