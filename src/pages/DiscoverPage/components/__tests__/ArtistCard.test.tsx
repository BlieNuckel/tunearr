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
  default: ({
    releaseGroup,
    inLibrary,
  }: {
    releaseGroup: ReleaseGroup;
    inLibrary?: boolean;
  }) => (
    <div
      data-testid={`release-group-${releaseGroup.id}`}
      data-in-library={inLibrary}
    >
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

const makeFeaturedAlbum = (
  overrides: Partial<ReleaseGroup> = {}
): ReleaseGroup =>
  makeAlbum({
    "artist-credit": [
      {
        name: "Other Artist",
        artist: { id: "a2", name: "Other Artist" },
      },
    ],
    ...overrides,
  });

describe("ArtistCard", () => {
  const defaultIsAlbumInLibrary = () => false;

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
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("renders artist image when imageUrl provided", () => {
    render(
      <ArtistCard
        name="Radiohead"
        imageUrl="https://example.com/img.jpg"
        isAlbumInLibrary={defaultIsAlbumInLibrary}
      />
    );
    const img = screen.getByAltText("Radiohead");
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("renders placeholder icon when no imageUrl", () => {
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows fallback icon when image fails to load", () => {
    render(
      <ArtistCard
        name="Radiohead"
        imageUrl="https://example.com/broken.jpg"
        isAlbumInLibrary={defaultIsAlbumInLibrary}
      />
    );
    const img = screen.getByAltText("Radiohead");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows match percentage when provided", () => {
    render(
      <ArtistCard
        name="Radiohead"
        match={0.87}
        isAlbumInLibrary={defaultIsAlbumInLibrary}
      />
    );
    expect(screen.getByText("87% match")).toBeInTheDocument();
  });

  it("does not show match when not provided", () => {
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
  });

  it("shows 'In Library' badge when inLibrary is true", () => {
    render(
      <ArtistCard
        name="Radiohead"
        inLibrary
        isAlbumInLibrary={defaultIsAlbumInLibrary}
      />
    );
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("does not show 'In Library' badge when inLibrary is false", () => {
    render(
      <ArtistCard
        name="Radiohead"
        inLibrary={false}
        isAlbumInLibrary={defaultIsAlbumInLibrary}
      />
    );
    expect(screen.queryByText("In Library")).not.toBeInTheDocument();
  });

  it("does not show albums section when collapsed", () => {
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    expect(screen.queryByText("Loading albums...")).not.toBeInTheDocument();
    expect(screen.queryByText("No albums found.")).not.toBeInTheDocument();
  });

  it("fetches albums on first expand", () => {
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(mockFetchAlbums).toHaveBeenCalledWith("Radiohead");
  });

  it("does not re-fetch albums if already loaded", () => {
    mockAlbums = [
      makeAlbum({
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(mockFetchAlbums).not.toHaveBeenCalled();
  });

  it("shows loading skeleton cards when loading", () => {
    mockLoading = true;
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));

    const skeletons = document.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error text when there is an error", () => {
    mockError = "Something went wrong";
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows 'No albums found.' when expanded with no albums and not loading", () => {
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("No albums found.")).toBeInTheDocument();
  });

  it("renders album cards when expanded with albums", () => {
    const radioheadCredit = [
      { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
    ];
    mockAlbums = [
      makeAlbum({
        id: "rg-1",
        title: "OK Computer",
        "artist-credit": radioheadCredit,
      }),
      makeAlbum({
        id: "rg-2",
        title: "Kid A",
        "artist-credit": radioheadCredit,
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Kid A")).toBeInTheDocument();
  });

  it("uses grid layout for album cards", () => {
    mockAlbums = [
      makeAlbum({
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));

    const grid = screen.getByTestId(`release-group-${mockAlbums[0].id}`)
      .parentElement!.parentElement!;
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-2");
  });

  it("collapses after exit animation timeout", () => {
    mockAlbums = [
      makeAlbum({
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Test Album")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText("Test Album")).not.toBeInTheDocument();
  });

  it("ignores clicks during exit animation", () => {
    mockAlbums = [
      makeAlbum({
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );

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
    mockAlbums = [
      makeAlbum({
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );
    fireEvent.click(screen.getByRole("button"));

    const wrapper = screen.getByTestId("release-group-rg-1").parentElement!;
    expect(wrapper.className).toContain("cascade-deal-in");
  });

  it("applies cascade-deal-out class to album cards when collapsing", () => {
    mockAlbums = [
      makeAlbum({
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      }),
    ];
    render(
      <ArtistCard name="Radiohead" isAlbumInLibrary={defaultIsAlbumInLibrary} />
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));

    const wrapper = screen.getByTestId("release-group-rg-1").parentElement!;
    expect(wrapper.className).toContain("cascade-deal-out");
  });

  it("passes inLibrary prop to ReleaseGroupCard based on isAlbumInLibrary", () => {
    const radioheadCredit = [
      { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
    ];
    mockAlbums = [
      makeAlbum({ id: "album-in-library", "artist-credit": radioheadCredit }),
      makeAlbum({
        id: "album-not-in-library",
        "artist-credit": radioheadCredit,
      }),
    ];
    const isAlbumInLibrary = (albumMbid: string) =>
      albumMbid === "album-in-library";

    render(<ArtistCard name="Radiohead" isAlbumInLibrary={isAlbumInLibrary} />);
    fireEvent.click(screen.getByRole("button"));

    const inLibraryCard = screen.getByTestId("release-group-album-in-library");
    const notInLibraryCard = screen.getByTestId(
      "release-group-album-not-in-library"
    );

    expect(inLibraryCard).toHaveAttribute("data-in-library", "true");
    expect(notInLibraryCard).toHaveAttribute("data-in-library", "false");
  });

  describe("primary vs featured album sections", () => {
    const radioheadCredit = [
      { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
    ];

    it("splits albums into primary and featured sections", () => {
      mockAlbums = [
        makeAlbum({
          id: "rg-primary",
          title: "OK Computer",
          "artist-credit": radioheadCredit,
        }),
        makeFeaturedAlbum({ id: "rg-featured", title: "Collab Album" }),
      ];
      render(
        <ArtistCard
          name="Radiohead"
          isAlbumInLibrary={defaultIsAlbumInLibrary}
        />
      );
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("OK Computer")).toBeInTheDocument();
      expect(screen.getByText("Collab Album")).toBeInTheDocument();
      expect(screen.getByText("Featured")).toBeInTheDocument();
    });

    it("does not show Featured heading when all albums are primary", () => {
      mockAlbums = [
        makeAlbum({
          id: "rg-1",
          title: "OK Computer",
          "artist-credit": radioheadCredit,
        }),
        makeAlbum({
          id: "rg-2",
          title: "Kid A",
          "artist-credit": radioheadCredit,
        }),
      ];
      render(
        <ArtistCard
          name="Radiohead"
          isAlbumInLibrary={defaultIsAlbumInLibrary}
        />
      );
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("OK Computer")).toBeInTheDocument();
      expect(screen.getByText("Kid A")).toBeInTheDocument();
      expect(screen.queryByText("Featured")).not.toBeInTheDocument();
    });

    it("shows Featured heading when only featured albums exist", () => {
      mockAlbums = [makeFeaturedAlbum({ id: "rg-1", title: "Collab Album" })];
      render(
        <ArtistCard
          name="Radiohead"
          isAlbumInLibrary={defaultIsAlbumInLibrary}
        />
      );
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Collab Album")).toBeInTheDocument();
      expect(screen.getByText("Featured")).toBeInTheDocument();
    });

    it("matches artist name case-insensitively", () => {
      mockAlbums = [
        makeAlbum({
          id: "rg-1",
          title: "Primary Album",
          "artist-credit": [
            { name: "radiohead", artist: { id: "a1", name: "radiohead" } },
          ],
        }),
      ];
      render(
        <ArtistCard
          name="Radiohead"
          isAlbumInLibrary={defaultIsAlbumInLibrary}
        />
      );
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Primary Album")).toBeInTheDocument();
      expect(screen.queryByText("Featured")).not.toBeInTheDocument();
    });

    it("continues deal-index for featured albums after primary ones", () => {
      mockAlbums = [
        makeAlbum({
          id: "rg-primary-1",
          title: "Album 1",
          "artist-credit": radioheadCredit,
        }),
        makeAlbum({
          id: "rg-primary-2",
          title: "Album 2",
          "artist-credit": radioheadCredit,
        }),
        makeFeaturedAlbum({ id: "rg-featured-1", title: "Featured Album" }),
      ];
      render(
        <ArtistCard
          name="Radiohead"
          isAlbumInLibrary={defaultIsAlbumInLibrary}
        />
      );
      fireEvent.click(screen.getByRole("button"));

      const featuredWrapper = screen.getByTestId(
        "release-group-rg-featured-1"
      ).parentElement!;
      expect(featuredWrapper.style.getPropertyValue("--deal-index")).toBe("2");
    });
  });
});
