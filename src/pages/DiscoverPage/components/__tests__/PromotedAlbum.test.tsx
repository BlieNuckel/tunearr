import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PromotedAlbum from "../PromotedAlbum";
import type { PromotedAlbumData } from "@/hooks/usePromotedAlbum";

const mockAddToLidarr = vi.fn();
const mockReset = vi.fn();
const mockFetchTracks = vi.fn();
const mockResetTracks = vi.fn();
const mockStop = vi.fn();
const mockToggle = vi.fn();
let mockLidarrState = "idle";
let mockLidarrError: string | null = null;

vi.mock("@/hooks/useLidarr", () => ({
  default: () => ({
    state: mockLidarrState,
    errorMsg: mockLidarrError,
    addToLidarr: mockAddToLidarr,
    reset: mockReset,
  }),
}));

vi.mock("@/hooks/useReleaseTracks", () => ({
  default: () => ({
    media: [],
    loading: false,
    error: null,
    fetchTracks: mockFetchTracks,
    reset: mockResetTracks,
  }),
}));

vi.mock("@/hooks/useAudioPreview", () => ({
  default: () => ({
    toggle: mockToggle,
    stop: mockStop,
    isTrackPlaying: () => false,
  }),
}));

vi.mock("@/components/PurchaseLinksModal", () => ({
  default: ({
    isOpen,
    onClose,
    onAddToLibrary,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onAddToLibrary?: () => void;
  }) =>
    isOpen ? (
      <div data-testid="purchase-modal">
        <button onClick={onClose}>Close</button>
        {onAddToLibrary && (
          <button onClick={onAddToLibrary}>Add to Library</button>
        )}
      </div>
    ) : null,
}));

vi.mock("@/components/MonitorButton", () => ({
  default: ({ state, onClick }: { state: string; onClick: () => void }) => (
    <button data-testid="monitor-button" data-state={state} onClick={onClick}>
      {state === "already_monitored" ? "Already Monitored" : "Add to Lidarr"}
    </button>
  ),
}));

vi.mock("../RecommendationTraceModal", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="trace-modal">
        <button onClick={onClose}>Close Trace</button>
      </div>
    ) : null,
}));

vi.mock("@/components/TrackList", () => ({
  default: () => <div data-testid="track-list" />,
}));

const albumData: PromotedAlbumData = {
  album: {
    name: "OK Computer",
    mbid: "alb-1",
    artistName: "Radiohead",
    artistMbid: "art-1",
    coverUrl: "https://coverartarchive.org/release-group/alb-1/front-500",
    year: "1997",
  },
  tag: "alternative",
  inLibrary: false,
  trace: {
    plexArtists: [
      {
        name: "Radiohead",
        viewCount: 100,
        picked: true,
        tagContributions: [
          { tagName: "alternative", rawCount: 100, weight: 10000 },
        ],
      },
      {
        name: "Bjork",
        viewCount: 50,
        picked: false,
        tagContributions: [],
      },
    ],
    weightedTags: [
      { name: "alternative", weight: 10000, fromArtists: ["Radiohead"] },
      { name: "rock", weight: 8000, fromArtists: ["Radiohead"] },
    ],
    chosenTag: { name: "alternative", weight: 10000 },
    albumPool: {
      page1Count: 50,
      deepPage: 4,
      deepPageCount: 50,
      totalAfterDedup: 95,
    },
    selectionReason: "preferred_non_library",
  },
};

const mockRefresh = vi.fn();

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  mockLidarrState = "idle";
  mockLidarrError = null;
  vi.clearAllMocks();
});

describe("PromotedAlbum", () => {
  it("renders album info", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("· 1997")).toBeInTheDocument();
    expect(
      screen.getByText("Because you listen to alternative")
    ).toBeInTheDocument();
  });

  it("does not render year separator when year is empty", () => {
    const noYearData: PromotedAlbumData = {
      ...albumData,
      album: { ...albumData.album, year: "" },
    };
    renderWithRouter(
      <PromotedAlbum
        data={noYearData}
        loading={false}
        onRefresh={mockRefresh}
      />
    );
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("links artist name to search page with artist search type", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    const artistLink = screen.getByText("Radiohead").closest("a");
    expect(artistLink).toHaveAttribute(
      "href",
      "/search?q=Radiohead&searchType=artist"
    );
  });

  it("renders cover image", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    const img = screen.getByAltText("OK Computer cover");
    expect(img).toHaveAttribute("src", albumData.album.coverUrl);
  });

  it("shows pastel fallback on cover error", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    const img = screen.getByAltText("OK Computer cover");
    fireEvent.error(img);
    expect(screen.queryByAltText("OK Computer cover")).not.toBeInTheDocument();
  });

  it("calls onRefresh when shuffle button clicked", () => {
    vi.useFakeTimers();
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByLabelText("Shuffle recommendation"));

    expect(mockRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRefresh).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("resets lidarr state when shuffle button clicked", () => {
    vi.useFakeTimers();
    mockLidarrState = "success";
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByLabelText("Shuffle recommendation"));
    expect(mockReset).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("disables shuffle button during animation", () => {
    vi.useFakeTimers();
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    const button = screen.getByLabelText("Shuffle recommendation");

    fireEvent.click(button);
    expect(button).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(button).not.toBeDisabled();

    vi.useRealTimers();
  });

  it("opens modal on monitor button click", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByTestId("monitor-button"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });

  it("calls addToLidarr via modal", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByTestId("monitor-button"));
    fireEvent.click(screen.getByText("Add to Library"));
    expect(mockAddToLidarr).toHaveBeenCalledWith({ albumMbid: "alb-1" });
  });

  it("shows already_monitored state when inLibrary", () => {
    const inLibraryData = { ...albumData, inLibrary: true };
    renderWithRouter(
      <PromotedAlbum
        data={inLibraryData}
        loading={false}
        onRefresh={mockRefresh}
      />
    );
    expect(screen.getByTestId("monitor-button")).toHaveAttribute(
      "data-state",
      "already_monitored"
    );
  });

  it("does not open modal when inLibrary is true", () => {
    const inLibraryData = { ...albumData, inLibrary: true };
    renderWithRouter(
      <PromotedAlbum
        data={inLibraryData}
        loading={false}
        onRefresh={mockRefresh}
      />
    );
    fireEvent.click(screen.getByTestId("monitor-button"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("closes modal when close button clicked", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByTestId("monitor-button"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("renders section heading", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
  });

  it("shows skeleton loaders when loading is true with no data", () => {
    renderWithRouter(
      <PromotedAlbum data={null} loading={true} onRefresh={mockRefresh} />
    );

    const skeletons = document.querySelectorAll(
      ".animate-pulse, .animate-shimmer"
    );
    expect(skeletons.length).toBeGreaterThan(0);

    expect(screen.queryByText("OK Computer")).not.toBeInTheDocument();
  });

  it("shows skeleton loaders when loading is true even with existing data (shuffle)", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={true} onRefresh={mockRefresh} />
    );

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll(
      ".animate-pulse, .animate-shimmer"
    );
    expect(skeletons.length).toBeGreaterThan(0);

    // Should not show the old album data
    expect(screen.queryByText("OK Computer")).not.toBeInTheDocument();
  });

  it("disables shuffle button when loading", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={true} onRefresh={mockRefresh} />
    );

    const button = screen.getByLabelText("Shuffle recommendation");
    expect(button).toBeDisabled();
  });

  it("tag chip is a clickable button", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    const tagChip = screen.getByText("Because you listen to alternative");
    expect(tagChip.tagName).toBe("BUTTON");
  });

  it("clicking tag chip opens trace modal", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByText("Because you listen to alternative"));
    expect(screen.getByTestId("trace-modal")).toBeInTheDocument();
  });

  it("closes trace modal when close button clicked", () => {
    renderWithRouter(
      <PromotedAlbum data={albumData} loading={false} onRefresh={mockRefresh} />
    );
    fireEvent.click(screen.getByText("Because you listen to alternative"));
    expect(screen.getByTestId("trace-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close Trace"));
    expect(screen.queryByTestId("trace-modal")).not.toBeInTheDocument();
  });

  describe("track preview", () => {
    it("renders preview button when album is loaded", () => {
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      expect(screen.getByLabelText("Preview tracks")).toBeInTheDocument();
      expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("does not render preview button when loading", () => {
      renderWithRouter(
        <PromotedAlbum data={null} loading={true} onRefresh={mockRefresh} />
      );
      expect(screen.queryByLabelText("Preview tracks")).not.toBeInTheDocument();
    });

    it("fetches tracks when preview button is clicked the first time", () => {
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      expect(mockFetchTracks).toHaveBeenCalledWith("alb-1", "Radiohead");
    });

    it("does not re-fetch tracks when already fetched for the same album", () => {
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      expect(mockFetchTracks).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText("Hide tracks"));
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      expect(mockFetchTracks).toHaveBeenCalledTimes(1);
    });

    it("shows track list after clicking preview", () => {
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      expect(screen.getByTestId("track-list")).toBeInTheDocument();
    });

    it("toggles label to Hide tracks when open", () => {
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      expect(screen.getByLabelText("Hide tracks")).toBeInTheDocument();
      expect(screen.getByText("Hide tracks")).toBeInTheDocument();
    });

    it("stops audio when closing track list", () => {
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      fireEvent.click(screen.getByLabelText("Hide tracks"));
      expect(mockStop).toHaveBeenCalled();
    });

    it("stops audio and closes track list on shuffle", () => {
      vi.useFakeTimers();
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Preview tracks"));
      expect(screen.getByText("Hide tracks")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Shuffle recommendation"));
      expect(mockStop).toHaveBeenCalled();
      expect(screen.queryByText("Hide tracks")).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("resets track state on shuffle so new album re-fetches", () => {
      vi.useFakeTimers();
      renderWithRouter(
        <PromotedAlbum
          data={albumData}
          loading={false}
          onRefresh={mockRefresh}
        />
      );
      fireEvent.click(screen.getByLabelText("Shuffle recommendation"));
      expect(mockResetTracks).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
