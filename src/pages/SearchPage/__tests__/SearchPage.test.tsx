import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "../SearchPage";
import type { ArtistSearchResult, ReleaseGroup } from "@/types";

let mockSearchState: {
  albums: ReleaseGroup[];
  artists: ArtistSearchResult[];
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

vi.mock("@/hooks/useWantedAlbums", () => ({
  default: () => ({
    isAlbumWanted: (id: string) => id === "rg-wanted",
  }),
}));

vi.mock("@/hooks/useNavigateToArtist", () => ({
  default: () => ({ go: vi.fn(), resolving: false }),
}));

vi.mock("@/components/ReleaseGroupCard", () => ({
  default: ({
    releaseGroup,
    initialWanted,
  }: {
    releaseGroup: { title: string };
    initialWanted?: boolean;
  }) => (
    <div data-testid="release-card" data-wanted={initialWanted}>
      {releaseGroup.title}
    </div>
  ),
}));

vi.mock("@/pages/DiscoverPage/components/ArtistCard", () => ({
  default: ({ name }: { name: string }) => (
    <div data-testid="artist-card">{name}</div>
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
    search: vi.fn(),
  };
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

  it("seeds initialWanted from the wanted list for matching albums", () => {
    mockSearchState.albums = [
      makeAlbum("rg-wanted", "In Rainbows"),
      makeAlbum("rg-other", "Amnesiac", 90),
    ];

    renderSearchPage("Radiohead");

    expect(screen.getByText("In Rainbows")).toHaveAttribute(
      "data-wanted",
      "true"
    );
    expect(screen.getByText("Amnesiac")).toHaveAttribute(
      "data-wanted",
      "false"
    );
  });

  it("shows the no-results state when a query returns nothing", () => {
    renderSearchPage("nonexistent");
    expect(screen.getByText("No results found")).toBeInTheDocument();
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
