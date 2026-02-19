import { render, screen } from "@testing-library/react";
import TrackList from "../TrackList";
import type { Medium } from "../../types";

describe("TrackList", () => {
  it("shows loading state", () => {
    render(<TrackList media={[]} loading={true} error={null} />);
    expect(screen.getByText("Loading tracks...")).toBeInTheDocument();
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
    const li = screen.getByText("No Duration").closest("li")!;
    expect(li.querySelectorAll("span")).toHaveLength(2);
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
});
