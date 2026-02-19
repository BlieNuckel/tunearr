import { render, screen, fireEvent } from "@testing-library/react";
import ImportReview from "../ImportReview";
import type { ManualImportItem } from "../../hooks/useManualImport";

function makeItem(overrides: Partial<ManualImportItem> = {}): ManualImportItem {
  return {
    path: "/music/file.flac",
    name: "test-file.flac",
    quality: { quality: { name: "FLAC" } },
    rejections: [],
    tracks: [{ id: 1, title: "Track 1", trackNumber: "1" }],
    albumReleaseId: 1,
    indexerFlags: 0,
    downloadId: "",
    disableReleaseSwitching: false,
    artist: { id: 1 },
    album: { id: 1 },
    ...overrides,
  };
}

describe("ImportReview", () => {
  it("renders item names", () => {
    const items = [makeItem({ name: "song.flac" })];
    render(
      <ImportReview items={items} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("song.flac")).toBeInTheDocument();
  });

  it("shows warning count for items with rejections", () => {
    const items = [
      makeItem({
        rejections: [{ reason: "bad quality" }, { reason: "wrong format" }],
      }),
    ];
    render(
      <ImportReview items={items} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("2 warnings")).toBeInTheDocument();
  });

  it("uses singular 'warning' for single rejection", () => {
    const items = [makeItem({ rejections: [{ reason: "issue" }] })];
    render(
      <ImportReview items={items} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("1 warning")).toBeInTheDocument();
  });

  it("shows correct button text for singular file", () => {
    render(
      <ImportReview
        items={[makeItem()]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Confirm Import (1 file)")).toBeInTheDocument();
  });

  it("shows correct button text for plural files", () => {
    render(
      <ImportReview
        items={[makeItem(), makeItem()]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Confirm Import (2 files)")).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ImportReview
        items={[makeItem()]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText(/Confirm Import/));
    expect(onConfirm).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
