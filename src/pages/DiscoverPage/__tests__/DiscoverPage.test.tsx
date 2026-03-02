import { render, screen, fireEvent } from "@testing-library/react";
import DiscoverPage from "../DiscoverPage";

const mockFetchSimilar = vi.fn();
const mockFetchTagArtists = vi.fn();
const mockRefreshPromotedAlbum = vi.fn();

let mockPromotedAlbum: unknown = null;

vi.mock("@/hooks/usePromotedAlbum", () => ({
  default: () => ({
    promotedAlbum: mockPromotedAlbum,
    loading: false,
    error: null,
    refresh: mockRefreshPromotedAlbum,
  }),
}));

vi.mock("../components/PromotedAlbum", () => ({
  default: ({
    data,
    onRefresh,
  }: {
    data: { album: { name: string } };
    onRefresh: () => void;
  }) => (
    <div data-testid="promoted-album">
      <span>{data.album.name}</span>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  ),
}));

vi.mock("../components/ExplorationBanner", () => ({
  default: () => <div data-testid="exploration-banner">Explore</div>,
}));

vi.mock("@/hooks/useDiscover", () => ({
  default: () => ({
    libraryArtists: [{ id: 1, name: "Radiohead", foreignArtistId: "a1" }],
    libraryAlbums: [{ id: 1, foreignAlbumId: "alb-1" }],
    libraryLoading: false,
    plexTopArtists: [{ name: "Pink Floyd", viewCount: 80, thumb: "" }],
    plexLoading: false,
    autoSelectedArtist: "Pink Floyd",
    similarArtists: [{ name: "Muse", mbid: "m1", match: 0.8, imageUrl: "" }],
    similarLoading: false,
    similarError: null,
    artistTags: [{ name: "rock", count: 100 }],
    tagsLoading: false,
    tagArtists: [],
    tagArtistSections: [],
    tagArtistsLoading: false,
    tagArtistsError: null,
    tagPagination: { page: 1, totalPages: 1 },
    fetchSimilar: mockFetchSimilar,
    fetchTagArtists: mockFetchTagArtists,
  }),
}));

vi.mock("@/components/Dropdown", () => ({
  default: ({
    onChange,
    placeholder,
  }: {
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <select data-testid="dropdown" onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      <option value="Radiohead">Radiohead</option>
    </select>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPromotedAlbum = null;
});

describe("DiscoverPage", () => {
  it("renders the Discover heading", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });

  it("renders PlexTopArtists section", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("Based on your listening")).toBeInTheDocument();
    expect(screen.getByText("Pink Floyd")).toBeInTheDocument();
  });

  it("renders LibraryPicker section", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("Your Library")).toBeInTheDocument();
  });

  it("renders ArtistSearchForm", () => {
    render(<DiscoverPage />);
    expect(
      screen.getByPlaceholderText("Type an artist name...")
    ).toBeInTheDocument();
  });

  it("renders tag list for selected artist", () => {
    render(<DiscoverPage />);
    expect(screen.getByText('Similar to "Pink Floyd"')).toBeInTheDocument();
    expect(screen.getByText("rock")).toBeInTheDocument();
  });

  it("calls fetchSimilar when plex artist clicked", () => {
    render(<DiscoverPage />);
    fireEvent.click(screen.getByText("Pink Floyd"));
    expect(mockFetchSimilar).toHaveBeenCalledWith("Pink Floyd");
  });

  it("calls fetchSimilar when search form submitted", () => {
    render(<DiscoverPage />);
    const input = screen.getByPlaceholderText("Type an artist name...");
    fireEvent.change(input, { target: { value: "Muse" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockFetchSimilar).toHaveBeenCalledWith("Muse");
  });

  it("calls fetchTagArtists when tag clicked", () => {
    render(<DiscoverPage />);
    fireEvent.click(screen.getByText("rock"));
    expect(mockFetchTagArtists).toHaveBeenCalledWith(["rock"]);
  });

  it("renders promoted album when data is available", () => {
    mockPromotedAlbum = {
      album: {
        name: "OK Computer",
        mbid: "alb-1",
        artistName: "Radiohead",
        artistMbid: "art-1",
        coverUrl: "",
      },
      tag: "alternative",
      inLibrary: false,
    };
    render(<DiscoverPage />);
    expect(screen.getByTestId("promoted-album")).toBeInTheDocument();
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
  });

  it("does not render promoted album when data is null", () => {
    mockPromotedAlbum = null;
    render(<DiscoverPage />);
    expect(screen.queryByTestId("promoted-album")).not.toBeInTheDocument();
  });

  it("calls refresh when promoted album refresh clicked", () => {
    mockPromotedAlbum = {
      album: {
        name: "OK Computer",
        mbid: "alb-1",
        artistName: "Radiohead",
        artistMbid: "art-1",
        coverUrl: "",
      },
      tag: "alternative",
      inLibrary: false,
    };
    render(<DiscoverPage />);
    fireEvent.click(screen.getByText("Refresh"));
    expect(mockRefreshPromotedAlbum).toHaveBeenCalled();
  });

  it("toggles tags on and off when clicked multiple times", () => {
    render(<DiscoverPage />);
    fireEvent.click(screen.getByText("rock"));
    expect(mockFetchTagArtists).toHaveBeenCalledWith(["rock"]);

    fireEvent.click(screen.getByText("rock"));
    expect(mockFetchTagArtists).toHaveBeenCalledTimes(1);
  });
});
