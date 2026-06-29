import { renderHook, waitFor } from "@testing-library/react";
import useLibraryArtists from "../useLibraryArtists";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

const libraryArtists = [
  { id: 1, name: "Radiohead", foreignArtistId: "rh-1" },
  { id: 2, name: "Muse", foreignArtistId: "" },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useLibraryArtists", () => {
  it("matches an in-library artist by mbid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(libraryArtists));

    const { result } = renderHook(() => useLibraryArtists());

    await waitFor(() =>
      expect(result.current.isArtistInLibrary("rh-1", "Whatever")).toBe(true)
    );
  });

  it("matches an in-library artist by name (case-insensitive)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(libraryArtists));

    const { result } = renderHook(() => useLibraryArtists());

    await waitFor(() =>
      expect(result.current.isArtistInLibrary("", "muse")).toBe(true)
    );
  });

  it("does not match an unknown artist", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(libraryArtists));

    const { result } = renderHook(() => useLibraryArtists());

    await waitFor(() =>
      expect(result.current.isArtistInLibrary("rh-1", "Radiohead")).toBe(true)
    );
    expect(result.current.isArtistInLibrary("nope", "Nobody")).toBe(false);
  });

  it("ignores an empty mbid that would match empty foreignArtistId", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(libraryArtists));

    const { result } = renderHook(() => useLibraryArtists());

    await waitFor(() =>
      expect(result.current.isArtistInLibrary("", "muse")).toBe(true)
    );
    expect(result.current.isArtistInLibrary("", "Unknown")).toBe(false);
  });

  it("treats an unconfigured library as empty", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("not configured"));

    const { result } = renderHook(() => useLibraryArtists());

    expect(result.current.isArtistInLibrary("rh-1", "Radiohead")).toBe(false);
  });
});
