import { render, screen, fireEvent } from "@testing-library/react";
import WantedList from "../WantedList";
import type { WantedItem } from "@/types";

vi.mock("@/components/PurchaseLinksModal", () => ({
  default: ({
    isOpen,
    onClose,
    albumTitle,
    artistName,
  }: {
    isOpen: boolean;
    onClose: () => void;
    albumTitle: string;
    artistName: string;
  }) =>
    isOpen ? (
      <div data-testid="purchase-modal">
        <span>
          {albumTitle} by {artistName}
        </span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const makeItem = (overrides: Partial<WantedItem> = {}): WantedItem => ({
  id: 1,
  title: "Kid A",
  foreignAlbumId: "mbid-123",
  artist: { artistName: "Radiohead" },
  lastEvent: null,
  ...overrides,
});

describe("WantedList", () => {
  it("shows empty state", () => {
    render(<WantedList items={[]} onSearch={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("No missing albums.")).toBeInTheDocument();
  });

  it("renders items with title and artist", () => {
    render(
      <WantedList items={[makeItem()]} onSearch={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByText("Kid A")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("calls onSearch with album id when Search is clicked", () => {
    const onSearch = vi.fn();
    render(
      <WantedList
        items={[makeItem({ id: 42 })]}
        onSearch={onSearch}
        onRemove={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenCalledWith(42);
  });

  it("calls onRemove with foreignAlbumId when Unmonitor is clicked", () => {
    const onRemove = vi.fn();
    render(
      <WantedList
        items={[makeItem({ foreignAlbumId: "mbid-123" })]}
        onSearch={vi.fn()}
        onRemove={onRemove}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Unmonitor" }));
    expect(onRemove).toHaveBeenCalledWith("mbid-123");
  });

  it("does not open modal when Search button is clicked", () => {
    render(
      <WantedList items={[makeItem()]} onSearch={vi.fn()} onRemove={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("does not open modal when Unmonitor button is clicked", () => {
    render(
      <WantedList items={[makeItem()]} onSearch={vi.fn()} onRemove={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Unmonitor" }));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("opens purchase modal when card is clicked", () => {
    render(
      <WantedList items={[makeItem()]} onSearch={vi.fn()} onRemove={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Kid A"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    expect(screen.getByText("Kid A by Radiohead")).toBeInTheDocument();
  });

  it("closes purchase modal when Close is clicked", () => {
    render(
      <WantedList items={[makeItem()]} onSearch={vi.fn()} onRemove={vi.fn()} />
    );

    fireEvent.click(screen.getByText("Kid A"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("shows 'Never grabbed — try manual searching' when lastEvent is null", () => {
    render(
      <WantedList
        items={[makeItem({ lastEvent: null })]}
        onSearch={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(
      screen.getByText("Never grabbed — try manual searching")
    ).toBeInTheDocument();
  });

  it("shows 'Grabbed' with date for eventType 1", () => {
    const date = "2025-06-15T12:00:00Z";
    const expectedDate = new Date(date).toLocaleDateString();

    render(
      <WantedList
        items={[makeItem({ lastEvent: { eventType: 1, date } })]}
        onSearch={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText(`Grabbed ${expectedDate}`)).toBeInTheDocument();
  });

  it("shows 'Download failed' with date for eventType 4", () => {
    const date = "2025-06-15T12:00:00Z";
    const expectedDate = new Date(date).toLocaleDateString();

    render(
      <WantedList
        items={[makeItem({ lastEvent: { eventType: 4, date } })]}
        onSearch={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(
      screen.getByText(`Download failed ${expectedDate}`)
    ).toBeInTheDocument();
  });

  it("shows 'Import incomplete' with date for eventType 7", () => {
    const date = "2025-06-15T12:00:00Z";
    const expectedDate = new Date(date).toLocaleDateString();

    render(
      <WantedList
        items={[makeItem({ lastEvent: { eventType: 7, date } })]}
        onSearch={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(
      screen.getByText(`Import incomplete ${expectedDate}`)
    ).toBeInTheDocument();
  });

  it("shows generic 'Event' label for unknown eventType", () => {
    const date = "2025-06-15T12:00:00Z";
    const expectedDate = new Date(date).toLocaleDateString();

    render(
      <WantedList
        items={[makeItem({ lastEvent: { eventType: 99, date } })]}
        onSearch={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText(`Event ${expectedDate}`)).toBeInTheDocument();
  });
});
