import { renderHook, act, waitFor } from "@testing-library/react";
import useDiscover from "../useDiscover";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchResponses(responses: { url: string; data: unknown }[]) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const match = responses.find((r) => url.includes(r.url));
    if (match) {
      return Promise.resolve(
        new Response(JSON.stringify(match.data), { status: 200 })
      );
    }
    return Promise.resolve(new Response("", { status: 404 }));
  });
}

describe("useDiscover", () => {
  it("has correct initial state", () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    const { result } = renderHook(() => useDiscover());

    expect(result.current.libraryArtists).toEqual([]);
    expect(result.current.libraryLoading).toBe(true);
    expect(result.current.plexTopArtists).toEqual([]);
    expect(result.current.plexLoading).toBe(true);
    expect(result.current.similarArtists).toEqual([]);
    expect(result.current.similarLoading).toBe(false);
    expect(result.current.similarError).toBeNull();
  });

  it("loads library artists on mount", async () => {
    const artists = [{ id: 1, name: "Radiohead", foreignArtistId: "a1" }];
    mockFetchResponses([
      { url: "/api/lidarr/artists", data: artists },
      { url: "/api/plex/top-artists", data: { artists: [] } },
    ]);

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.libraryLoading).toBe(false);
    });
    expect(result.current.libraryArtists).toEqual(artists);
  });

  it("loads plex top artists on mount", async () => {
    const artists = [
      { name: "Pink Floyd", viewCount: 50, thumb: "", genres: [] },
    ];
    mockFetchResponses([
      { url: "/api/lidarr/artists", data: [] },
      { url: "/api/plex/top-artists", data: { artists } },
      { url: "/api/lastfm/similar", data: { artists: [] } },
      { url: "/api/lastfm/artist/tags", data: { tags: [] } },
    ]);

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.plexLoading).toBe(false);
    });
    expect(result.current.plexTopArtists).toEqual(artists);
  });

  it("auto-discovers similar from top plex artist", async () => {
    const plexArtists = [
      { name: "Radiohead", viewCount: 100, thumb: "", genres: [] },
    ];
    const similar = [{ name: "Muse", mbid: "m1", match: 0.8, imageUrl: "" }];
    mockFetchResponses([
      { url: "/api/lidarr/artists", data: [] },
      { url: "/api/plex/top-artists", data: { artists: plexArtists } },
      { url: "/api/lastfm/similar", data: { artists: similar } },
      {
        url: "/api/lastfm/artist/tags",
        data: { tags: [{ name: "rock", count: 100 }] },
      },
    ]);

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.autoSelectedArtist).toBe("Radiohead");
    });
    await waitFor(() => {
      expect(result.current.similarArtists).toEqual(similar);
    });
  });

  it("fetchSimilar sets error on failure", async () => {
    mockFetchResponses([
      { url: "/api/lidarr/artists", data: [] },
      { url: "/api/plex/top-artists", data: { artists: [] } },
    ]);

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => expect(result.current.plexLoading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    await act(() => result.current.fetchSimilar("Unknown"));

    expect(result.current.similarError).toBe("Not found");
    expect(result.current.similarArtists).toEqual([]);
  });

  it("fetchTagArtists loads tag results", async () => {
    mockFetchResponses([
      { url: "/api/lidarr/artists", data: [] },
      { url: "/api/plex/top-artists", data: { artists: [] } },
    ]);

    const { result } = renderHook(() => useDiscover());
    await waitFor(() => expect(result.current.plexLoading).toBe(false));

    const tagArtists = [{ name: "Nirvana", mbid: "n1", imageUrl: "", rank: 1 }];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          artists: tagArtists,
          pagination: { page: 1, totalPages: 3 },
        }),
        { status: 200 }
      )
    );

    await act(() => result.current.fetchTagArtists("grunge"));

    expect(result.current.tagArtists).toEqual(tagArtists);
    expect(result.current.tagPagination).toEqual({ page: 1, totalPages: 3 });
  });

  it("fetchTagArtists sets error on failure", async () => {
    mockFetchResponses([
      { url: "/api/lidarr/artists", data: [] },
      { url: "/api/plex/top-artists", data: { artists: [] } },
    ]);

    const { result } = renderHook(() => useDiscover());
    await waitFor(() => expect(result.current.plexLoading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Tag not found" }), { status: 404 })
    );

    await act(() => result.current.fetchTagArtists("unknown-tag"));

    expect(result.current.tagArtistsError).toBe("Tag not found");
  });

  it("handles library fetch failure gracefully", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/lidarr/artists")) {
        return Promise.reject(new Error("Network error"));
      }
      if (url.includes("/api/plex/top-artists")) {
        return Promise.resolve(
          new Response(JSON.stringify({ artists: [] }), { status: 200 })
        );
      }
      return Promise.resolve(new Response("", { status: 404 }));
    });

    const { result } = renderHook(() => useDiscover());

    await waitFor(() => {
      expect(result.current.libraryLoading).toBe(false);
    });
    expect(result.current.libraryArtists).toEqual([]);
  });
});
