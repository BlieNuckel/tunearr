import { render, screen } from "@testing-library/react";
import LibraryPicker from "../LibraryPicker";

vi.mock("@/components/Dropdown", () => ({
  default: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="dropdown">{placeholder}</div>
  ),
}));

describe("LibraryPicker", () => {
  it("shows loading state", () => {
    const { container } = render(
      <LibraryPicker
        artists={[]}
        loading={true}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no artists", () => {
    render(
      <LibraryPicker
        artists={[]}
        loading={false}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByText("No artists in library. Connect Lidarr in Settings.")
    ).toBeInTheDocument();
  });

  it("renders dropdown when artists available", () => {
    const artists = [{ id: 1, name: "Radiohead", foreignArtistId: "a1" }];
    render(
      <LibraryPicker
        artists={artists}
        loading={false}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByTestId("dropdown")).toBeInTheDocument();
    expect(screen.getByText("Search library...")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(
      <LibraryPicker
        artists={[]}
        loading={false}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Your Library")).toBeInTheDocument();
  });
});
