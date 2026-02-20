import { render, screen, fireEvent } from "@testing-library/react";
import ArtistResultsList from "../ArtistResultsList";

vi.mock("@/components/Pagination", () => ({
  default: ({
    page,
    totalPages,
    onPageChange,
  }: {
    page: number;
    totalPages: number;
    onPageChange: (p: number) => void;
  }) => (
    <div data-testid="pagination">
      <span>
        Page {page} of {totalPages}
      </span>
      <button onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  ),
}));

vi.mock("../ArtistCard", () => ({
  default: ({ name, inLibrary }: { name: string; inLibrary: boolean }) => (
    <div data-testid="artist-card">
      {name} {inLibrary && "(in library)"}
    </div>
  ),
}));

describe("ArtistResultsList", () => {
  const isInLibrary = (name: string) => name === "Radiohead";

  it("returns null for empty artists", () => {
    const { container } = render(
      <ArtistResultsList artists={[]} isInLibrary={isInLibrary} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders artist cards", () => {
    const artists = [
      { name: "Radiohead", match: 1.0 },
      { name: "Muse", match: 0.8 },
    ];

    render(<ArtistResultsList artists={artists} isInLibrary={isInLibrary} />);

    expect(screen.getByText("Radiohead (in library)")).toBeInTheDocument();
    expect(screen.getByText("Muse")).toBeInTheDocument();
  });

  it("renders pagination when provided", () => {
    const onPageChange = vi.fn();
    const artists = [{ name: "Muse", match: 0.8 }];

    render(
      <ArtistResultsList
        artists={artists}
        isInLibrary={() => false}
        pagination={{ page: 1, totalPages: 5, onPageChange }}
      />
    );

    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("does not render pagination when not provided", () => {
    render(
      <ArtistResultsList
        artists={[{ name: "Muse", match: 0.5 }]}
        isInLibrary={() => false}
      />
    );

    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });
});
