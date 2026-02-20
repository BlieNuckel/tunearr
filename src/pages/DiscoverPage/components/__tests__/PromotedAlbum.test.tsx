import { render, screen, fireEvent } from "@testing-library/react";
import PromotedAlbum from "../PromotedAlbum";
import type { PromotedAlbumData } from "@/hooks/usePromotedAlbum";

const mockAddToLidarr = vi.fn();
let mockLidarrState = "idle";
let mockLidarrError: string | null = null;

vi.mock("@/hooks/useLidarr", () => ({
  default: () => ({
    state: mockLidarrState,
    errorMsg: mockLidarrError,
    addToLidarr: mockAddToLidarr,
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
  default: ({
    state,
    onClick,
  }: {
    state: string;
    onClick: () => void;
  }) => (
    <button data-testid="monitor-button" data-state={state} onClick={onClick}>
      {state === "already_monitored" ? "Already Monitored" : "Add to Lidarr"}
    </button>
  ),
}));

const albumData: PromotedAlbumData = {
  album: {
    name: "OK Computer",
    mbid: "alb-1",
    artistName: "Radiohead",
    artistMbid: "art-1",
    coverUrl: "https://coverartarchive.org/release-group/alb-1/front-500",
  },
  tag: "alternative",
  inLibrary: false,
};

const mockRefresh = vi.fn();

beforeEach(() => {
  mockLidarrState = "idle";
  mockLidarrError = null;
  vi.clearAllMocks();
});

describe("PromotedAlbum", () => {
  it("renders album info", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(
      screen.getByText("Because you listen to alternative")
    ).toBeInTheDocument();
  });

  it("renders cover image", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    const img = screen.getByAltText("OK Computer cover");
    expect(img).toHaveAttribute("src", albumData.album.coverUrl);
  });

  it("shows pastel fallback on cover error", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    const img = screen.getByAltText("OK Computer cover");
    fireEvent.error(img);
    expect(screen.queryByAltText("OK Computer cover")).not.toBeInTheDocument();
  });

  it("calls onRefresh when refresh button clicked", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    fireEvent.click(screen.getByLabelText("Refresh recommendation"));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("opens modal on monitor button click", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    fireEvent.click(screen.getByTestId("monitor-button"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });

  it("calls addToLidarr via modal", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    fireEvent.click(screen.getByTestId("monitor-button"));
    fireEvent.click(screen.getByText("Add to Library"));
    expect(mockAddToLidarr).toHaveBeenCalledWith({ albumMbid: "alb-1" });
  });

  it("shows already_monitored state when inLibrary", () => {
    const inLibraryData = { ...albumData, inLibrary: true };
    render(<PromotedAlbum data={inLibraryData} onRefresh={mockRefresh} />);
    expect(screen.getByTestId("monitor-button")).toHaveAttribute(
      "data-state",
      "already_monitored"
    );
  });

  it("does not open modal when inLibrary is true", () => {
    const inLibraryData = { ...albumData, inLibrary: true };
    render(<PromotedAlbum data={inLibraryData} onRefresh={mockRefresh} />);
    fireEvent.click(screen.getByTestId("monitor-button"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("closes modal when close button clicked", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    fireEvent.click(screen.getByTestId("monitor-button"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("renders section heading", () => {
    render(<PromotedAlbum data={albumData} onRefresh={mockRefresh} />);
    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
  });
});
