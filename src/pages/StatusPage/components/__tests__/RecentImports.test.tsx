import { render, screen } from "@testing-library/react";
import RecentImports from "../RecentImports";
import type { RecentImport } from "@/types";

function makeImport(overrides: Partial<RecentImport> = {}): RecentImport {
  return {
    id: 1,
    albumId: 100,
    date: "2025-01-15T12:00:00Z",
    sourceIndexer: null,
    artist: { artistName: "Test Artist", id: 1 },
    album: { id: 100, title: "Test Album" },
    ...overrides,
  };
}

describe("RecentImports", () => {
  it("shows empty state", () => {
    render(<RecentImports items={[]} />);
    expect(screen.getByText("No recent imports.")).toBeInTheDocument();
  });

  it("renders album and artist names", () => {
    render(<RecentImports items={[makeImport()]} />);
    expect(screen.getByText("Test Album")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("deduplicates by albumId", () => {
    const items = [
      makeImport({ id: 1, albumId: 100 }),
      makeImport({ id: 2, albumId: 100 }),
      makeImport({
        id: 3,
        albumId: 200,
        album: { id: 200, title: "Other Album" },
      }),
    ];
    render(<RecentImports items={items} />);

    expect(screen.getByText("Test Album")).toBeInTheDocument();
    expect(screen.getByText("Other Album")).toBeInTheDocument();
    expect(screen.getAllByText("imported")).toHaveLength(2);
  });

  it("shows imported status badge", () => {
    render(<RecentImports items={[makeImport()]} />);
    expect(screen.getByText("imported")).toBeInTheDocument();
  });

  it("displays source indexer when present", () => {
    render(
      <RecentImports items={[makeImport({ sourceIndexer: "Prowlarr" })]} />
    );
    expect(screen.getByText("via Prowlarr")).toBeInTheDocument();
  });

  it("does not display via text when sourceIndexer is null", () => {
    render(
      <RecentImports items={[makeImport({ sourceIndexer: null })]} />
    );
    expect(screen.queryByText(/^via /)).not.toBeInTheDocument();
  });
});
