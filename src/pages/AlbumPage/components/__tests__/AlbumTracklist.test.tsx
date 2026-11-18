import { render, screen, fireEvent } from "@testing-library/react";
import AlbumTracklist from "../AlbumTracklist";

const mockRefresh = vi.fn();

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
});

describe("AlbumTracklist", () => {
  it("renders the tracklist", () => {
    render(<AlbumTracklist tracks={tracks()} waiting={false} />);

    expect(screen.getByText("Tracklist")).toBeInTheDocument();
    expect(screen.getByTestId("track-list")).toHaveAttribute(
      "data-loading",
      "false"
    );
  });

  it("shows the skeleton while waiting for the album", () => {
    render(<AlbumTracklist tracks={tracks()} waiting />);

    expect(screen.getByTestId("track-list")).toHaveAttribute(
      "data-loading",
      "true"
    );
  });

  it("says MusicBrainz is busy while retrying", () => {
    render(
      <AlbumTracklist
        tracks={tracks({ retrying: true, error: "busy", errorKind: "busy" })}
        waiting={false}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "MusicBrainz is busy, retrying…"
    );
    expect(screen.queryByTestId("track-list")).toBeNull();
  });

  it("offers a retry once retries run out", () => {
    render(
      <AlbumTracklist
        tracks={tracks({ error: "busy", errorKind: "busy" })}
        waiting={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
