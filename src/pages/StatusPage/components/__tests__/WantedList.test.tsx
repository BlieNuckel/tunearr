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
  ...overrides,
});

describe("WantedList", () => {
  it("shows empty state", () => {
    render(<WantedList items={[]} onSearch={vi.fn()} />);
    expect(screen.getByText("No missing albums.")).toBeInTheDocument();
  });

  it("renders items with title and artist", () => {
    render(<WantedList items={[makeItem()]} onSearch={vi.fn()} />);
    expect(screen.getByText("Kid A")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("calls onSearch with album id when Search is clicked", () => {
    const onSearch = vi.fn();
    render(<WantedList items={[makeItem({ id: 42 })]} onSearch={onSearch} />);

    fireEvent.click(screen.getByText("Search"));
    expect(onSearch).toHaveBeenCalledWith(42);
  });

  it("does not open modal when Search button is clicked", () => {
    render(<WantedList items={[makeItem()]} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText("Search"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });

  it("opens purchase modal when card is clicked", () => {
    render(<WantedList items={[makeItem()]} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText("Kid A"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
    expect(screen.getByText("Kid A by Radiohead")).toBeInTheDocument();
  });

  it("closes purchase modal when Close is clicked", () => {
    render(<WantedList items={[makeItem()]} onSearch={vi.fn()} />);

    fireEvent.click(screen.getByText("Kid A"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
  });
});
