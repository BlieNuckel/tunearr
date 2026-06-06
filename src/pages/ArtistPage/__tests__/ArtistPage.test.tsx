import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ArtistPage from "../ArtistPage";
import type { ArtistDetails, ReleaseGroup } from "@/types";

let mockState: {
  artist: ArtistDetails | null;
  releaseGroups: ReleaseGroup[];
  loading: boolean;
  error: string | null;
};

vi.mock("@/hooks/useArtistDetails", () => ({
  default: () => mockState,
}));

vi.mock("@/hooks/useLibraryAlbums", () => ({
  default: () => ({
    isAlbumInLibrary: (id: string) => id === "in-lib",
  }),
}));

vi.mock("@/components/ReleaseGroupCard", () => ({
  default: ({
    releaseGroup,
    inLibrary,
  }: {
    releaseGroup: ReleaseGroup;
    inLibrary?: boolean;
  }) => (
    <div data-testid={`rg-${releaseGroup.id}`} data-in-library={inLibrary}>
      {releaseGroup.title}
    </div>
  ),
}));

vi.mock("@/components/FollowArtistButton", () => ({
  default: () => <button>Follow</button>,
}));

const makeRg = (overrides: Partial<ReleaseGroup>): ReleaseGroup => ({
  id: "rg",
  score: 100,
  title: "Title",
  "primary-type": "Album",
  "first-release-date": "2020-01-01",
  "artist-credit": [{ name: "Artist", artist: { id: "a1", name: "Artist" } }],
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/artist/a1"]}>
      <Routes>
        <Route path="/artist/:mbid" element={<ArtistPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockState = {
    artist: null,
    releaseGroups: [],
    loading: false,
    error: null,
  };
});

describe("ArtistPage", () => {
  it("shows a skeleton while loading", () => {
    mockState.loading = true;
    renderPage();
    expect(
      document.querySelectorAll(".animate-shimmer").length
    ).toBeGreaterThan(0);
  });

  it("shows an error state when the artist fails to load", () => {
    mockState.error = "Artist not found";
    renderPage();
    expect(screen.getByText("Artist not found")).toBeInTheDocument();
  });

  it("renders the artist name and grouped sections", () => {
    mockState.artist = { mbid: "a1", name: "Radiohead", type: "Group" };
    mockState.releaseGroups = [
      makeRg({ id: "alb", title: "OK Computer", "primary-type": "Album" }),
      makeRg({ id: "ep", title: "Drill EP", "primary-type": "EP" }),
    ];
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Radiohead" })
    ).toBeInTheDocument();
    expect(screen.getByText("Albums")).toBeInTheDocument();
    expect(screen.getByText("EPs")).toBeInTheDocument();
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Drill EP")).toBeInTheDocument();
  });

  it("passes library status through to release cards and header", () => {
    mockState.artist = { mbid: "a1", name: "Radiohead" };
    mockState.releaseGroups = [
      makeRg({ id: "in-lib", title: "Owned" }),
      makeRg({ id: "missing", title: "Not owned" }),
    ];
    renderPage();

    expect(screen.getByTestId("rg-in-lib")).toHaveAttribute(
      "data-in-library",
      "true"
    );
    expect(screen.getByTestId("rg-missing")).toHaveAttribute(
      "data-in-library",
      "false"
    );
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("shows an empty message when the artist has no releases", () => {
    mockState.artist = { mbid: "a1", name: "Radiohead" };
    mockState.releaseGroups = [];
    renderPage();
    expect(
      screen.getByText("No releases found for this artist.")
    ).toBeInTheDocument();
  });
});
