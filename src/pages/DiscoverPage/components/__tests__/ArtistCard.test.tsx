import { render, screen, fireEvent, act } from "@testing-library/react";
import ArtistCard from "../ArtistCard";
import type { ReleaseGroup } from "@/types";

const mockFetchAlbums = vi.fn();
let mockAlbums: ReleaseGroup[] = [];
let mockLoading = false;
let mockError: string | null = null;

vi.mock("@/hooks/useArtistAlbums", () => ({
  default: () => ({
    albums: mockAlbums,
    loading: mockLoading,
    error: mockError,
    fetchAlbums: mockFetchAlbums,
  }),
}));

vi.mock("@/components/ReleaseGroupCard", () => ({
  default: ({ releaseGroup }: { releaseGroup: ReleaseGroup }) => (
    <div data-testid={`release-group-${releaseGroup.id}`}>
      {releaseGroup.title}
    </div>
  ),
}));

const makeAlbum = (overrides: Partial<ReleaseGroup> = {}): ReleaseGroup => ({
  id: "rg-1",
  score: 100,
  title: "Test Album",
  "primary-type": "Album",
  "first-release-date": "2023-01-01",
  "artist-credit": [
    { name: "Test Artist", artist: { id: "a1", name: "Test Artist" } },
  ],
  ...overrides,
});

describe("ArtistCard", () => {
  beforeEach(() => {
    mockAlbums = [];
    mockLoading = false;
    mockError = null;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders artist name", () => {
    render(<ArtistCard name="Radiohead" />);
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders artist image when imageUrl provided", () => {
    render(
      <ArtistCard name="Radiohead" imageUrl="https://example.com/img.jpg" />
    );
    const img = screen.getByAltText("Radiohead");
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("renders placeholder icon when no imageUrl", () => {
    render(<ArtistCard name="Radiohead" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows fallback icon when image fails to load", () => {
    render(
      <ArtistCard name="Radiohead" imageUrl="https://example.com/broken.jpg" />
    );
    const img = screen.getByAltText("Radiohead");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows match percentage when provided", () => {
    render(<ArtistCard name="Radiohead" match={0.87} />);
    expect(screen.getByText("87% match")).toBeInTheDocument();
  });

  it("does not show match when not provided", () => {
    render(<ArtistCard name="Radiohead" />);
    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
  });

  it("shows 'In Library' badge when inLibrary is true", () => {
    render(<ArtistCard name="Radiohead" inLibrary />);
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("does not show 'In Library' badge when inLibrary is false", () => {
    render(<ArtistCard name="Radiohead" inLibrary={false} />);
    expect(screen.queryByText("In Library")).not.toBeInTheDocument();
  });

  it("does not show albums section when collapsed", () => {
    render(<ArtistCard name="Radiohead" />);
    expect(screen.queryByText("Loading albums...")).not.toBeInTheDocument();
    expect(screen.queryByText("No albums found.")).not.toBeInTheDocument();
  });

  it("fetches albums on first expand", () => {
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockFetchAlbums).toHaveBeenCalledWith("Radiohead");
  });

  it("does not re-fetch albums if already loaded", () => {
    mockAlbums = [makeAlbum()];
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockFetchAlbums).not.toHaveBeenCalled();
  });

  it("shows loading text when loading", () => {
    mockLoading = true;
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Loading albums...")).toBeInTheDocument();
  });

  it("shows error text when there is an error", () => {
    mockError = "Something went wrong";
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows 'No albums found.' when expanded with no albums and not loading", () => {
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("No albums found.")).toBeInTheDocument();
  });

  it("renders album cards when expanded with albums", () => {
    mockAlbums = [
      makeAlbum({ id: "rg-1", title: "OK Computer" }),
      makeAlbum({ id: "rg-2", title: "Kid A" }),
    ];
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Kid A")).toBeInTheDocument();
  });

  it("uses grid layout for album cards", () => {
    mockAlbums = [makeAlbum()];
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));

    const grid = screen.getByTestId(`release-group-${mockAlbums[0].id}`)
      .parentElement!.parentElement!;
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-2");
  });

  it("collapses after exit animation timeout", () => {
    mockAlbums = [makeAlbum()];
    render(<ArtistCard name="Radiohead" />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Test Album")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText("Test Album")).not.toBeInTheDocument();
  });

  it("ignores clicks during exit animation", () => {
    mockAlbums = [makeAlbum()];
    render(<ArtistCard name="Radiohead" />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    // Still animating out - click should be ignored
    fireEvent.click(screen.getByRole("button"));

    // Albums should still be visible (animating out, not re-expanded)
    expect(screen.getByText("Test Album")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByText("Test Album")).not.toBeInTheDocument();
  });

  it("applies cascade-deal-in class to album cards when expanding", () => {
    mockAlbums = [makeAlbum()];
    render(<ArtistCard name="Radiohead" />);
    fireEvent.click(screen.getByRole("button"));

    const wrapper = screen.getByTestId("release-group-rg-1").parentElement!;
    expect(wrapper.className).toContain("cascade-deal-in");
  });

  it("applies cascade-deal-out class to album cards when collapsing", () => {
    mockAlbums = [makeAlbum()];
    render(<ArtistCard name="Radiohead" />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));

    const wrapper = screen.getByTestId("release-group-rg-1").parentElement!;
    expect(wrapper.className).toContain("cascade-deal-out");
  });
});
