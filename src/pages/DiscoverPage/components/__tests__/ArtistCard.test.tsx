import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArtistCard from "../ArtistCard";

const mockGo = vi.fn();

vi.mock("@/hooks/useNavigateToArtist", () => ({
  default: () => ({ go: mockGo, resolving: false }),
}));

vi.mock("@/components/FollowArtistButton", () => ({
  default: ({ artistMbid }: { artistMbid: string }) => (
    <button data-testid={`follow-${artistMbid}`}>Follow</button>
  ),
}));

function renderCard(props: Parameters<typeof ArtistCard>[0]) {
  return render(
    <MemoryRouter>
      <ArtistCard {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArtistCard", () => {
  it("renders the artist name", () => {
    renderCard({ name: "Radiohead" });
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders the artist image when imageUrl is provided", () => {
    renderCard({ name: "Radiohead", imageUrl: "https://example.com/img.jpg" });
    expect(screen.getByAltText("Radiohead")).toHaveAttribute(
      "src",
      "https://example.com/img.jpg"
    );
  });

  it("renders a placeholder when no imageUrl is provided", () => {
    renderCard({ name: "Radiohead" });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("falls back to placeholder when the image fails to load", () => {
    renderCard({ name: "Radiohead", imageUrl: "https://example.com/broken" });
    fireEvent.error(screen.getByAltText("Radiohead"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the match percentage when provided", () => {
    renderCard({ name: "Radiohead", match: 0.87 });
    expect(screen.getByText("87% match")).toBeInTheDocument();
  });

  it("does not show match when not provided", () => {
    renderCard({ name: "Radiohead" });
    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
  });

  it("shows the 'In Library' badge when inLibrary is true", () => {
    renderCard({ name: "Radiohead", inLibrary: true });
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("navigates to the artist page on click", () => {
    renderCard({ name: "Radiohead", mbid: "a1" });
    fireEvent.click(screen.getByRole("button", { name: /Radiohead/ }));
    expect(mockGo).toHaveBeenCalledWith({ mbid: "a1", name: "Radiohead" });
  });

  it("passes name through for resolution when no mbid is available", () => {
    renderCard({ name: "Radiohead" });
    fireEvent.click(screen.getByRole("button", { name: /Radiohead/ }));
    expect(mockGo).toHaveBeenCalledWith({ mbid: undefined, name: "Radiohead" });
  });

  it("renders a follow button only when an mbid is present", () => {
    const { rerender } = renderCard({ name: "Radiohead", mbid: "a1" });
    expect(screen.getByTestId("follow-a1")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ArtistCard name="Radiohead" />
      </MemoryRouter>
    );
    expect(screen.queryByTestId(/follow-/)).not.toBeInTheDocument();
  });
});

describe("ArtistCard grid variant", () => {
  it("renders name, match, and library badge", () => {
    renderCard({
      name: "Boards of Canada",
      match: 0.72,
      inLibrary: true,
      variant: "grid",
    });
    expect(screen.getByText("Boards of Canada")).toBeInTheDocument();
    expect(screen.getByText("72% match")).toBeInTheDocument();
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("renders the image when provided", () => {
    renderCard({
      name: "Boards of Canada",
      imageUrl: "https://example.com/boc.jpg",
      variant: "grid",
    });
    expect(screen.getByAltText("Boards of Canada")).toHaveAttribute(
      "src",
      "https://example.com/boc.jpg"
    );
  });

  it("navigates to the artist page on click", () => {
    renderCard({ name: "Boards of Canada", mbid: "boc1", variant: "grid" });
    fireEvent.click(screen.getByRole("button", { name: /Boards of Canada/ }));
    expect(mockGo).toHaveBeenCalledWith({
      mbid: "boc1",
      name: "Boards of Canada",
    });
  });

  it("renders a follow button when an mbid is present", () => {
    renderCard({ name: "Boards of Canada", mbid: "boc1", variant: "grid" });
    expect(screen.getByTestId("follow-boc1")).toBeInTheDocument();
  });
});
