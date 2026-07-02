import { render, screen } from "@testing-library/react";
import AlbumTracklist from "../AlbumTracklist";

const mockFetchTracks = vi.fn();

vi.mock("@/hooks/useReleaseTracks", () => ({
  default: () => ({
    media: [],
    loading: false,
    error: null,
    fetchTracks: mockFetchTracks,
  }),
}));

vi.mock("@/hooks/useAudioPreview", () => ({
  default: () => ({
    toggle: vi.fn(),
    stop: vi.fn(),
    isTrackPlaying: () => false,
  }),
}));

vi.mock("@/components/TrackList", () => ({
  default: () => <div data-testid="track-list" />,
}));

afterEach(() => vi.clearAllMocks());

describe("AlbumTracklist", () => {
  it("fetches tracks for the album on mount", () => {
    render(<AlbumTracklist albumMbid="rg-1" artistName="Radiohead" />);

    expect(mockFetchTracks).toHaveBeenCalledWith("rg-1", "Radiohead");
    expect(screen.getByText("Tracklist")).toBeInTheDocument();
    expect(screen.getByTestId("track-list")).toBeInTheDocument();
  });
});
