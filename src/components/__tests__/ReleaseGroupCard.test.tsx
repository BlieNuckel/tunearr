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

  it("fetches tracks on mouse enter", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    fireEvent.mouseEnter(screen.getByTestId("release-group-card"));

    expect(mockFetchTracks).toHaveBeenCalledWith("abc-123");
  });

  it("does not re-fetch tracks on subsequent mouse enters", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);
    const card = screen.getByTestId("release-group-card");

    fireEvent.mouseEnter(card);
    expect(mockFetchTracks).toHaveBeenCalledTimes(1);
  });

  it("renders track list in hover overlay", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    expect(screen.getByTestId("track-list")).toBeInTheDocument();
  });

  it("opens purchase modal when MonitorButton is clicked with a title", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByText("Add to Lidarr"));

    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });

  it("calls addToLidarr directly when album title is empty", () => {
    render(
      <ReleaseGroupCard releaseGroup={makeReleaseGroup({ title: "" })} />
    );

    fireEvent.click(screen.getByText("Add to Lidarr"));

    expect(mockAddToLidarr).toHaveBeenCalledWith({ albumMbid: "abc-123" });
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("calls addToLidarr when 'Add to Library' is clicked in modal", () => {
    render(<ReleaseGroupCard releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByText("Add to Lidarr"));
    fireEvent.click(screen.getByText("Add to Library"));

    expect(mockAddToLidarr).toHaveBeenCalledWith({ albumMbid: "abc-123" });
  });
});
