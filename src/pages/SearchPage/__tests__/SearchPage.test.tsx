import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "../SearchPage";
import type { ArtistSearchResult, ReleaseGroup } from "@/types";

let mockSearchState: {
  albums: ReleaseGroup[];
  artists: ArtistSearchResult[];
  loading: boolean;
  error: string | null;
  missing: ("albums" | "artists")[];
  retrying: boolean;
  search: ReturnType<typeof vi.fn>;
  retryMissing: ReturnType<typeof vi.fn>;
};

let libraryAlbumMbids: string[] = [];
let libraryArtistMbids: string[] = [];

vi.mock("@/hooks/useSearch", () => ({
  default: () => mockSearchState,
}));

vi.mock("@/hooks/useNavigateToArtist", () => ({
  default: () => ({ go: vi.fn(), resolving: false }),
}));

vi.mock("@/hooks/useLibraryAlbums", () => ({
  default: () => ({
    getAlbumLibrary: (mbid: string) =>
      libraryAlbumMbids.includes(mbid)
        ? { state: "complete", available: 7, total: 7 }
        : null,
  }),
}));

vi.mock("@/hooks/useLibraryArtists", () => ({
  default: () => ({
    isArtistInLibrary: (mbid: string) => libraryArtistMbids.includes(mbid),
  }),
}));

vi.mock("@/components/ReleaseGroupCard", () => ({
  default: ({
    releaseGroup,
    library,
  }: {
    releaseGroup: { title: string };
    library?: { state: string } | null;
  }) => (
    <div
      data-testid="release-card"
      data-library-state={library?.state ?? "none"}
    >
      {releaseGroup.title}
    </div>
  ),
}));

vi.mock("@/components/ArtistCard", () => ({
  default: ({ name, inLibrary }: { name: string; inLibrary?: boolean }) => (
    <div data-testid="artist-card" data-in-library={String(!!inLibrary)}>
      {name}
    </div>
  ),
}));

function makeAlbum(id: string, title: string, score = 100): ReleaseGroup {
  return {
    id,
    title,
    score,
    "primary-type": "Album",
    "first-release-date": "1997-06-16",
    "artist-credit": [
      { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
    ],
  };
}

function renderSearchPage(query = "") {
  const path = query ? `/search?q=${query}` : "/search";
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
    loading: false,
    error: null,
    missing: [],
    retrying: false,
    search: vi.fn(),
    retryMissing: vi.fn(),
  };
  libraryAlbumMbids = [];
  libraryArtistMbids = [];
});

describe("SearchPage", () => {
  it("renders a single Search heading", () => {
    renderSearchPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Search" })
    ).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    renderSearchPage();
    expect(screen.getByTestId("search-form")).toBeInTheDocument();
  });

  it("shows the empty state when there is no query", () => {
    renderSearchPage();
    expect(screen.getByText("Search for music")).toBeInTheDocument();
  });

  it("renders both artist and album sections together", () => {
    mockSearchState.artists = [{ mbid: "a1", name: "Radiohead" }];
    mockSearchState.albums = [makeAlbum("rg-1", "OK Computer")];

    renderSearchPage("Radiohead");

    expect(screen.getByText("Artists")).toBeInTheDocument();
    expect(screen.getByText("Albums")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
  });

  it("orders the artist section before the album section", () => {
    mockSearchState.artists = [{ mbid: "a1", name: "Radiohead" }];
    mockSearchState.albums = [makeAlbum("rg-1", "OK Computer")];

    const { container } = renderSearchPage("Radiohead");
    const headings = within(container).getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(["Artists", "Albums"]);
  });

  it("omits the artists section when there are no artist results", () => {
    mockSearchState.albums = [makeAlbum("rg-1", "OK Computer")];

    renderSearchPage("OK");

    expect(screen.queryByText("Artists")).not.toBeInTheDocument();
    expect(screen.getByText("Albums")).toBeInTheDocument();
  });

  it("shows the no-results state when a query returns nothing", () => {
    renderSearchPage("nonexistent");
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("marks only the album results that are in the library", () => {
    libraryAlbumMbids = ["rg-1"];
    mockSearchState.albums = [
      makeAlbum("rg-1", "OK Computer"),
      makeAlbum("rg-2", "Kid A"),
    ];

    renderSearchPage("Radiohead");

    const cards = screen.getAllByTestId("release-card");
    expect(cards.map((c) => c.dataset.libraryState)).toEqual([
      "complete",
      "none",
    ]);
  });

  it("marks only the artist results that are in the library", () => {
    libraryArtistMbids = ["a1"];
    mockSearchState.artists = [
      { mbid: "a1", name: "Radiohead" },
      { mbid: "a2", name: "Thom Yorke" },
    ];

    renderSearchPage("Radiohead");

    const cards = screen.getAllByTestId("artist-card");
    expect(cards.map((c) => c.dataset.inLibrary)).toEqual(["true", "false"]);
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

  it("shows album results while artists are still being retried", () => {
    mockSearchState.albums = [
      {
        id: "rg-1",
        score: 100,
        title: "OK Computer",
        "primary-type": "Album",
        "first-release-date": "1997",
        "artist-credit": [],
      },
    ];
    mockSearchState.missing = ["artists"];
    mockSearchState.retrying = true;
    renderSearchPage("radio");

    expect(screen.getByText("Artists")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "MusicBrainz is busy, retrying…"
    );
    expect(screen.getAllByTestId("release-card")).toHaveLength(1);
    expect(screen.queryByText("No results found")).toBeNull();
  });

  it("offers a retry for a part once retries run out", () => {
    mockSearchState.missing = ["albums"];
    renderSearchPage("radio");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "MusicBrainz is still busy, so we couldn't load albums."
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockSearchState.retryMissing).toHaveBeenCalled();
  });
});
