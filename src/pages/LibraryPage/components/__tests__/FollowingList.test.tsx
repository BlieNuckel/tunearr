import { render, screen, waitFor } from "@testing-library/react";
import FollowingList from "../FollowingList";
import { __resetFollowedArtistsForTests } from "@/hooks/useFollowedArtists";

beforeEach(() => {
  __resetFollowedArtistsForTests();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockEndpoints(map: Record<string, unknown>) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const key = Object.keys(map).find((k) => url.includes(k));
    if (key) {
      return Promise.resolve(
        new Response(JSON.stringify(map[key]), { status: 200 })
      );
    }
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  });
}

describe("FollowingList", () => {
  it("renders empty state for followed artists when none", async () => {
    mockEndpoints({
      "/api/followed/releases": [],
      "/api/followed": [],
    });

    render(<FollowingList />);

    expect(
      await screen.findByText(/aren't following any artists yet/i)
    ).toBeInTheDocument();
  });

  it("renders followed artists with last-checked label", async () => {
    mockEndpoints({
      "/api/followed/releases": [],
      "/api/followed": [
        {
          id: 1,
          artistMbid: "mbid-1",
          artistName: "Radiohead",
          lastCheckedAt: "2025-05-01T12:00:00.000Z",
          createdAt: "2025-04-01",
        },
      ],
    });

    render(<FollowingList />);
    expect(await screen.findByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText(/Last checked/i)).toBeInTheDocument();
  });

  it("renders the seen-release feed when entries exist", async () => {
    mockEndpoints({
      "/api/followed/releases": [
        {
          id: 5,
          followedArtistId: 1,
          artistMbid: "mbid-1",
          artistName: "Radiohead",
          releaseKey: "k",
          source: "musicbrainz",
          albumTitle: "New EP",
          releaseDate: "2025-05-01",
          externalId: "rg-1",
          notifiedAt: "2025-05-02",
        },
      ],
      "/api/followed": [],
    });

    render(<FollowingList />);
    await waitFor(() => {
      expect(screen.getByText("New EP")).toBeInTheDocument();
    });
    expect(screen.getByText(/Radiohead/)).toBeInTheDocument();
    expect(screen.getByText("musicbrainz")).toBeInTheDocument();
  });

  it("shows release feed error message on failure", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/followed/releases")) {
        return Promise.resolve(new Response("", { status: 500 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    render(<FollowingList />);
    expect(
      await screen.findByText(/Failed to load recent releases/i)
    ).toBeInTheDocument();
  });
});
