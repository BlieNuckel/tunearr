import { render, screen, fireEvent } from "@testing-library/react";
import TracksPreviewModal from "../TracksPreviewModal";

vi.mock("@/components/TrackList", () => ({
  default: ({ loading }: { loading: boolean }) => (
    <div data-testid="track-list">{loading ? "loading" : "loaded"}</div>
  ),
}));

const baseProps = {
  onClose: vi.fn(),
  albumName: "OK Computer",
  artistName: "Radiohead",
  media: [],
  loading: false,
  error: null,
  onTogglePreview: vi.fn(),
  isTrackPlaying: () => false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TracksPreviewModal", () => {
  it("renders nothing when closed", () => {
    render(<TracksPreviewModal {...baseProps} isOpen={false} />);
    expect(screen.queryByTestId("track-list")).not.toBeInTheDocument();
  });

  it("renders album, artist, and track list when open", () => {
    render(<TracksPreviewModal {...baseProps} isOpen={true} />);
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByTestId("track-list")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", () => {
    render(<TracksPreviewModal {...baseProps} isOpen={true} />);
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(baseProps.onClose).toHaveBeenCalled();
  });
});
