import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "../SearchPage";
import type { ArtistSearchResult, ReleaseGroup } from "@/types";

let mockSearchState: {
  albums: ReleaseGroup[];
  artists: ArtistSearchResult[];
  kind: "album" | "artist";
  loading: boolean;
  error: string | null;
  search: ReturnType<typeof vi.fn>;
};

vi.mock("@/hooks/useSearch", () => ({
  default: () => mockSearchState,
}));

vi.mock("@/hooks/useLibraryAlbums", () => ({
  default: () => ({
    isAlbumInLibrary: () => false,
  }),
}));

vi.mock("@/hooks/useNavigateToArtist", () => ({
  default: () => ({ go: vi.fn(), resolving: false }),
}));

vi.mock("@/components/ReleaseGroupCard", () => ({
  default: ({ releaseGroup }: { releaseGroup: { title: string } }) => (
    <div data-testid="release-card">{releaseGroup.title}</div>
  ),
}));

vi.mock("@/pages/DiscoverPage/components/ArtistCard", () => ({
  default: ({ name }: { name: string }) => (
    <div data-testid="artist-card">{name}</div>
  ),
}));

function renderSearchPage(query = "", searchType = "album") {
  const path = query
    ? `/search?q=${query}&searchType=${searchType}`
    : "/search";
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SearchPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockSearchState = {
    albums: [],
    artists: [],
    kind: "album",
    loading: false,
    error: null,
    search: vi.fn(),
  };
});

describe("SearchPage", () => {
  it("renders the album heading by default", () => {
    renderSearchPage();
    expect(screen.getByText("Search Albums")).toBeInTheDocument();
  });

  it("renders the artist heading in artist mode", () => {
    renderSearchPage("Radiohead", "artist");
    expect(screen.getByText("Search Artists")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    renderSearchPage();
    expect(screen.getByTestId("search-form")).toBeInTheDocument();
  });

  it("shows the empty state when there is no query", () => {
    renderSearchPage();
    expect(screen.getByText("Search for music")).toBeInTheDocument();
  });

  it("renders album cards in album mode", () => {
    mockSearchState.albums = [
      {
        id: "rg-1",
        title: "OK Computer",
        score: 100,
        "primary-type": "Album",
        "first-release-date": "1997-06-16",
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      },
    ];
    renderSearchPage("OK", "album");
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
  });

  it("renders artist cards in artist mode", () => {
    mockSearchState.kind = "artist";
    mockSearchState.artists = [
      { mbid: "a1", name: "Radiohead" },
      { mbid: "a2", name: "Radio Dept." },
    ];
    renderSearchPage("Radio", "artist");
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Radio Dept.")).toBeInTheDocument();
  });

  it("clears input and focuses it on search:reset event", () => {
    renderSearchPage("Radiohead");
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("Radiohead");

    act(() => {
      window.dispatchEvent(new CustomEvent("search:reset"));
    });

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });
});
