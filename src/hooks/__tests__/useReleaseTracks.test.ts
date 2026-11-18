import { renderHook, waitFor } from "@testing-library/react";
import useReleaseTracks from "../useReleaseTracks";

const media = [{ position: 1, format: "CD", title: "", tracks: [] }];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReleaseTracks", () => {
  it("waits while the id is null", () => {
    const { result } = renderHook(() => useReleaseTracks(null));

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.media).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("fetches tracks", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ media }), { status: 200 })
    );

    const { result } = renderHook(() => useReleaseTracks("rg-123"));

    await waitFor(() => expect(result.current.media).toEqual(media));
    expect(fetch).toHaveBeenCalledWith(
      "/api/musicbrainz/tracks/rg-123",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("asks for previews when the artist name is known", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ media }), { status: 200 })
    );

    renderHook(() => useReleaseTracks("rg-123", "Sigur Rós"));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/musicbrainz/tracks/rg-123?artistName=Sigur+R%C3%B3s",
        expect.anything()
      )
    );
  });

  it("returns an empty list when the response has no media", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );

    const { result } = renderHook(() => useReleaseTracks("rg-123"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.media).toEqual([]);
  });

  it("exposes a busy MusicBrainz as a retrying error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "MusicBrainz is busy (returned 503)",
          retryable: true,
          retryAfterMs: 1000,
        }),
        { status: 503 }
      )
    );

    const { result } = renderHook(() => useReleaseTracks("rg-123"));

    await waitFor(() => expect(result.current.retrying).toBe(true));
    expect(result.current.errorKind).toBe("busy");
  });

  it("exposes a plain failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    const { result } = renderHook(() => useReleaseTracks("rg-123"));

    await waitFor(() => expect(result.current.error).toBe("Not found"));
    expect(result.current.errorKind).toBe("notFound");
    expect(result.current.retrying).toBe(false);
  });
});
