import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AlbumPage from "../AlbumPage";
import type { AlbumDetails, AlbumLabel, ReleaseGroup } from "@/types";

type SectionFields = {
  loading: boolean;
  error: string | null;
  errorKind: "notFound" | "busy" | "other" | null;
  retrying: boolean;
  refresh: () => Promise<void>;
};

let mockState: SectionFields & { album: AlbumDetails | null };

let mockLabelState: SectionFields & { label: AlbumLabel | null };

let mockReleaseGroupsState: SectionFields & { releaseGroups: ReleaseGroup[] };

let mockSimilarAlbumsState: SectionFields & { albums: ReleaseGroup[] };

function idle(): SectionFields {
  return {
    loading: false,
    error: null,
    errorKind: null,
    retrying: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  };
}

let receivedArtistMbid: string | null | undefined;
let receivedSimilarMbid: string | null | undefined;

vi.mock("@/hooks/useReleaseGroupDetails", () => ({
  default: () => mockState,
}));

vi.mock("@/hooks/useReleaseGroupLabel", () => ({
  default: () => mockLabelState,
}));

vi.mock("@/hooks/useArtistReleaseGroups", () => ({
  default: (artistMbid: string | null | undefined) => {
    receivedArtistMbid = artistMbid;
    return mockReleaseGroupsState;
  },
}));

vi.mock("@/hooks/useSimilarAlbums", () => ({
  default: (mbid: string | null | undefined) => {
    receivedSimilarMbid = mbid;
    return mockSimilarAlbumsState;
  },
}));

vi.mock("@/hooks/useLibraryAlbums", () => ({
  default: () => ({
    isAlbumInLibrary: (id: string) => id === "rg-1",
    getAlbumLibrary: (id: string) =>
      id === "rg-1" ? { state: "partial", available: 9, total: 12 } : null,
  }),
}));

vi.mock("@/hooks/useWantedAlbums", () => ({
  default: () => ({ isAlbumWanted: (id: string) => id === "rg-1" }),
}));

vi.mock("../components/AlbumHeader", () => ({
  default: ({
    album,
    label,
    inLibrary,
    initialWanted,
    library,
  }: {
    album: AlbumDetails;
    label?: AlbumLabel | null;
    inLibrary?: boolean;
    initialWanted?: boolean;
    library?: { state: string; available: number; total: number } | null;
  }) => (
    <div
      data-testid="album-header"
      data-in-library={inLibrary}
      data-wanted={initialWanted}
      data-label={label?.name ?? "none"}
      data-library-state={library?.state}
      data-track-availability={
        library ? `${library.available}/${library.total}` : undefined
      }
    >
      {album.title}
    </div>
  ),
}));

vi.mock("../components/AlbumTracklist", () => ({
  default: ({
    albumMbid,
    artistName,
  }: {
    albumMbid: string | null;
    artistName: string | null;
  }) => (
    <div data-testid="album-tracklist" data-artist={artistName ?? "none"}>
      {albumMbid ?? "waiting"}
    </div>
  ),
}));

vi.mock("@/pages/ArtistPage/components/ReleaseSectionGrid", () => ({
  default: ({
    title,
    items,
    loading,
  }: {
    title: string;
    items: ReleaseGroup[];
    loading?: boolean;
  }) => (
    <div
      data-testid={
        title === "Similar albums" ? "similar-albums" : "more-from-artist"
      }
      data-count={items.length}
      data-loading={loading}
    >
      {title}
      {items.map((rg) => (
        <span key={rg.id}>{rg.title}</span>
      ))}
    </div>
  ),
}));

const makeAlbum = (overrides: Partial<AlbumDetails> = {}): AlbumDetails => ({
  mbid: "rg-1",
  title: "OK Computer",
  artistName: "Radiohead",
  artistMbid: "a1",
  firstReleaseDate: "1997-06-16",
  primaryType: "Album",
  secondaryTypes: [],
  ...overrides,
});

const makeRg = (id: string, title: string): ReleaseGroup => ({
  id,
  score: 0,
  title,
  "primary-type": "Album",
  "first-release-date": "",
  "artist-credit": [],
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/album/rg-1"]}>
      <Routes>
        <Route path="/album/:mbid" element={<AlbumPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockState = { ...idle(), album: null };
  mockLabelState = { ...idle(), label: null };
  mockReleaseGroupsState = { ...idle(), releaseGroups: [] };
  mockSimilarAlbumsState = { ...idle(), albums: [] };
  receivedArtistMbid = undefined;
  receivedSimilarMbid = undefined;
});

describe("AlbumPage", () => {
  it("shows a header skeleton while loading, and holds the tracklist for the artist name", () => {
    mockState.loading = true;
    renderPage();

    expect(screen.getByTestId("album-header-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("album-tracklist")).toHaveTextContent("waiting");
  });

  it("says an album doesn't exist without offering a retry", () => {
    mockState.error = "Album not found";
    mockState.errorKind = "notFound";
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "MusicBrainz has no record of this album."
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("keeps the rest of the page when the header fails", () => {
    mockState.error = "MusicBrainz is busy (returned 503)";
    mockState.errorKind = "busy";
    mockSimilarAlbumsState.albums = [makeRg("rg-9", "Loveless")];
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "MusicBrainz is still busy, so we couldn't load this album."
    );
    expect(screen.getByTestId("album-tracklist")).toHaveTextContent("rg-1");
    expect(screen.getByTestId("album-tracklist")).toHaveAttribute(
      "data-artist",
      "none"
    );
    expect(screen.getByTestId("similar-albums")).toBeInTheDocument();
  });

  it("retries the header on request", () => {
    mockState.error = "MusicBrainz is busy (returned 503)";
    mockState.errorKind = "busy";
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockState.refresh).toHaveBeenCalled();
  });

  it("says MusicBrainz is busy while the header is retried", () => {
    mockState.loading = true;
    mockState.retrying = true;
    mockState.error = "MusicBrainz is busy (returned 503)";
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      "MusicBrainz is busy, retrying…"
    );
    expect(screen.getByTestId("album-tracklist")).toHaveTextContent("rg-1");
  });

  it("shows a failed label under the header with its own retry", () => {
    mockState.album = makeAlbum();
    mockLabelState.error = "boom";
    mockLabelState.errorKind = "other";
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load the label."
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockLabelState.refresh).toHaveBeenCalled();
  });

  it("shows a failed discography in its own section", () => {
    mockState.album = makeAlbum();
    mockReleaseGroupsState.error = "boom";
    mockReleaseGroupsState.errorKind = "other";
    renderPage();

    expect(screen.getByText("More from this artist")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load more from this artist."
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockReleaseGroupsState.refresh).toHaveBeenCalled();
  });

  it("shows similar albums being retried in their own section", () => {
    mockState.album = makeAlbum();
    mockSimilarAlbumsState.retrying = true;
    mockSimilarAlbumsState.error = "busy";
    renderPage();

    expect(screen.getByText("Similar albums")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "MusicBrainz is busy, retrying…"
    );
  });

  it("renders the header and tracklist", () => {
    mockState.album = makeAlbum();
    renderPage();

    expect(screen.getByTestId("album-header")).toHaveTextContent("OK Computer");
    expect(screen.getByTestId("album-tracklist")).toHaveTextContent("rg-1");
  });

  it("passes library and wanted status to the header", () => {
    mockState.album = makeAlbum();
    renderPage();

    const header = screen.getByTestId("album-header");
    expect(header).toHaveAttribute("data-in-library", "true");
    expect(header).toHaveAttribute("data-wanted", "true");
    expect(header).toHaveAttribute("data-track-availability", "9/12");
    expect(header).toHaveAttribute("data-library-state", "partial");
  });

  it("passes the separately loaded label to the header", () => {
    mockState.album = makeAlbum();
    mockLabelState.label = { name: "Parlophone", mbid: "label-1" };
    renderPage();

    expect(screen.getByTestId("album-header")).toHaveAttribute(
      "data-label",
      "Parlophone"
    );
  });

  it("renders the header and tracklist while the discography is still loading", () => {
    mockState.album = makeAlbum();
    mockReleaseGroupsState.loading = true;
    renderPage();

    expect(screen.getByTestId("album-header")).toBeInTheDocument();
    expect(screen.getByTestId("album-tracklist")).toBeInTheDocument();
    expect(screen.getByTestId("more-from-artist")).toHaveAttribute(
      "data-loading",
      "true"
    );
  });

  it("looks up more-from-artist by the album's artist MBID", () => {
    mockState.album = makeAlbum();
    renderPage();

    expect(receivedArtistMbid).toBe("a1");
  });

  it("renders more-from-artist excluding the current album", () => {
    mockState.album = makeAlbum();
    mockReleaseGroupsState.releaseGroups = [
      makeRg("rg-1", "OK Computer"),
      makeRg("rg-2", "Kid A"),
    ];
    renderPage();

    const grid = screen.getByTestId("more-from-artist");
    expect(grid).toHaveAttribute("data-count", "1");
    expect(screen.getByText("Kid A")).toBeInTheDocument();
  });

  it("hides more-from-artist when there are no other releases", () => {
    mockState.album = makeAlbum();
    mockReleaseGroupsState.releaseGroups = [];
    renderPage();

    expect(screen.queryByTestId("more-from-artist")).not.toBeInTheDocument();
  });

  it("looks up similar albums by the route MBID", () => {
    mockState.album = makeAlbum();
    renderPage();

    expect(receivedSimilarMbid).toBe("rg-1");
  });

  it("renders similar albums", () => {
    mockState.album = makeAlbum();
    mockSimilarAlbumsState.albums = [makeRg("rg-9", "Loveless")];
    renderPage();

    const grid = screen.getByTestId("similar-albums");
    expect(grid).toHaveAttribute("data-count", "1");
    expect(screen.getByText("Loveless")).toBeInTheDocument();
  });

  it("shows the similar-albums section while it is still loading", () => {
    mockState.album = makeAlbum();
    mockSimilarAlbumsState.loading = true;
    renderPage();

    expect(screen.getByTestId("similar-albums")).toHaveAttribute(
      "data-loading",
      "true"
    );
  });

  it("hides similar albums when the endpoint returns nothing", () => {
    mockState.album = makeAlbum();
    mockSimilarAlbumsState.albums = [];
    renderPage();

    expect(screen.queryByTestId("similar-albums")).not.toBeInTheDocument();
  });
});
