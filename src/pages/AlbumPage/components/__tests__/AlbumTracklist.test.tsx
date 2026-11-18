import { render, screen, fireEvent } from "@testing-library/react";
import AlbumTracklist from "../AlbumTracklist";

const mockUseReleaseTracks = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/hooks/useReleaseTracks", () => ({
  default: (...args: unknown[]) => mockUseReleaseTracks(...args),
}));

vi.mock("@/hooks/useAudioPreview", () => ({
  default: () => ({
    toggle: vi.fn(),
    stop: vi.fn(),
    isTrackPlaying: () => false,
  }),
}));

vi.mock("@/components/TrackList", () => ({
  default: ({ loading }: { loading: boolean }) => (
    <div data-testid="track-list" data-loading={loading} />
  ),
}));

function tracks(overrides: Record<string, unknown> = {}) {
  return {
    media: [],
    loading: false,
    error: null,
    errorKind: null,
    retrying: false,
    refresh: mockRefresh,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseReleaseTracks.mockReturnValue(tracks());
});

describe("AlbumTracklist", () => {
  it("loads tracks for the album with the artist name", () => {
    render(<AlbumTracklist albumMbid="rg-1" artistName="Radiohead" />);

    expect(mockUseReleaseTracks).toHaveBeenCalledWith("rg-1", "Radiohead");
    expect(screen.getByText("Tracklist")).toBeInTheDocument();
    expect(screen.getByTestId("track-list")).toBeInTheDocument();
  });

  it("shows the skeleton while waiting for the album", () => {
    render(<AlbumTracklist albumMbid={null} artistName={null} />);

    expect(screen.getByTestId("track-list")).toHaveAttribute(
      "data-loading",
      "true"
    );
  });

  it("says MusicBrainz is busy while retrying", () => {
    mockUseReleaseTracks.mockReturnValue(
      tracks({ retrying: true, error: "busy", errorKind: "busy" })
    );
    render(<AlbumTracklist albumMbid="rg-1" artistName="Radiohead" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "MusicBrainz is busy, retrying…"
    );
    expect(screen.queryByTestId("track-list")).toBeNull();
  });

  it("offers a retry once retries run out", () => {
    mockUseReleaseTracks.mockReturnValue(
      tracks({ error: "busy", errorKind: "busy" })
    );
    render(<AlbumTracklist albumMbid="rg-1" artistName="Radiohead" />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
