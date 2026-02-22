import { render, screen, fireEvent } from "@testing-library/react";
import TrackList from "../TrackList";
import type { Medium } from "../../types";

describe("TrackList", () => {
  it("shows loading state", () => {
    const { container } = render(
      <TrackList media={[]} loading={true} error={null} />
    );
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state", () => {
    render(<TrackList media={[]} loading={false} error="Network error" />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<TrackList media={[]} loading={false} error={null} />);
    expect(screen.getByText("No tracks found.")).toBeInTheDocument();
  });

  it("renders tracks with formatted duration", () => {
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [
          { position: 1, title: "First Song", length: 180000 },
          { position: 2, title: "Second Song", length: 63000 },
        ],
      },
    ];

    render(<TrackList media={media} loading={false} error={null} />);
    expect(screen.getByText("First Song")).toBeInTheDocument();
    expect(screen.getByText("Second Song")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.getByText("1:03")).toBeInTheDocument();
  });

  it("omits duration when track length is null", () => {
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [{ position: 1, title: "No Duration", length: null }],
      },
    ];

    render(<TrackList media={media} loading={false} error={null} />);
    expect(screen.getByText("No Duration")).toBeInTheDocument();
    expect(screen.queryByTestId("track-duration")).not.toBeInTheDocument();
  });

  it("shows disc headers only when multiple media", () => {
    const singleMedia: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [{ position: 1, title: "Track", length: 60000 }],
      },
    ];
    const multiMedia: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [{ position: 1, title: "Track A", length: 60000 }],
      },
      {
        position: 2,
        format: "Vinyl",
        title: "Side B",
        tracks: [{ position: 1, title: "Track B", length: 60000 }],
      },
    ];

    const { rerender } = render(
      <TrackList media={singleMedia} loading={false} error={null} />
    );
    expect(screen.queryByText(/CD/)).not.toBeInTheDocument();

    rerender(<TrackList media={multiMedia} loading={false} error={null} />);
    expect(screen.getByText("CD 1")).toBeInTheDocument();
    expect(screen.getByText(/Vinyl 2/)).toBeInTheDocument();
  });

  it("renders play button when track has previewUrl and handlers provided", () => {
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [
          {
            position: 1,
            title: "Preview Track",
            length: 180000,
            previewUrl: "https://example.com/preview.mp3",
          },
        ],
      },
    ];

    render(
      <TrackList
        media={media}
        loading={false}
        error={null}
        onTogglePreview={vi.fn()}
        isTrackPlaying={() => false}
      />
    );

    expect(screen.getByTestId("preview-button-1")).toBeInTheDocument();
    expect(screen.getByLabelText("Play preview")).toBeInTheDocument();
  });

  it("does not render play button when no previewUrl", () => {
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [{ position: 1, title: "No Preview Track", length: 180000 }],
      },
    ];

    render(
      <TrackList
        media={media}
        loading={false}
        error={null}
        onTogglePreview={vi.fn()}
        isTrackPlaying={() => false}
      />
    );

    expect(screen.queryByTestId("preview-button-1")).not.toBeInTheDocument();
  });

  it("does not render play button when no preview handlers provided", () => {
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [
          {
            position: 1,
            title: "Has URL",
            length: 180000,
            previewUrl: "https://example.com/preview.mp3",
          },
        ],
      },
    ];

    render(<TrackList media={media} loading={false} error={null} />);

    expect(screen.queryByTestId("preview-button-1")).not.toBeInTheDocument();
  });

  it("calls onTogglePreview when play button is clicked", () => {
    const onToggle = vi.fn();
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [
          {
            position: 1,
            title: "Clickable Track",
            length: 180000,
            previewUrl: "https://example.com/preview.mp3",
          },
        ],
      },
    ];

    render(
      <TrackList
        media={media}
        loading={false}
        error={null}
        onTogglePreview={onToggle}
        isTrackPlaying={() => false}
      />
    );

    fireEvent.click(screen.getByTestId("preview-button-1"));
    expect(onToggle).toHaveBeenCalledWith("https://example.com/preview.mp3");
  });

  it("shows pause icon for playing track", () => {
    const media: Medium[] = [
      {
        position: 1,
        format: "CD",
        title: "",
        tracks: [
          {
            position: 1,
            title: "Playing Track",
            length: 180000,
            previewUrl: "https://example.com/preview.mp3",
          },
        ],
      },
    ];

    render(
      <TrackList
        media={media}
        loading={false}
        error={null}
        onTogglePreview={vi.fn()}
        isTrackPlaying={(url) => url === "https://example.com/preview.mp3"}
      />
    );

    expect(screen.getByLabelText("Pause preview")).toBeInTheDocument();
  });
});
