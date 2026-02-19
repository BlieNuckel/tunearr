import { render, screen } from "@testing-library/react";
import QueueTable from "../QueueTable";
import type { QueueItem } from "@/types";

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 1,
    status: "downloading",
    title: "Test Album",
    size: 1000,
    sizeleft: 250,
    trackedDownloadStatus: "Ok",
    artist: { artistName: "Test Artist" },
    album: { title: "Test Album" },
    quality: { quality: { name: "FLAC" } },
    ...overrides,
  };
}

describe("QueueTable", () => {
  it("shows empty state", () => {
    render(<QueueTable items={[]} />);
    expect(screen.getByText("No active downloads.")).toBeInTheDocument();
  });

  it("renders items with artist and album info", () => {
    render(<QueueTable items={[makeQueueItem()]} />);
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
    expect(screen.getByText("Test Album")).toBeInTheDocument();
    expect(screen.getByText("FLAC")).toBeInTheDocument();
  });

  it("calculates progress percentage", () => {
    render(
      <QueueTable items={[makeQueueItem({ size: 1000, sizeleft: 250 })]} />
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows dash when size data is missing", () => {
    render(<QueueTable items={[makeQueueItem({ size: 0, sizeleft: 0 })]} />);
    const cells = screen.getAllByRole("cell");
    const progressCell = cells[3];
    expect(progressCell).toHaveTextContent("—");
  });
});
