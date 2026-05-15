import { renderHook, act, waitFor } from "@testing-library/react";
import useFollowedArtists, {
  __resetFollowedArtistsForTests,
} from "../useFollowedArtists";

beforeEach(() => {
  __resetFollowedArtistsForTests();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockSequence(...responses: Response[]) {
  const fn = vi.mocked(fetch);
  for (const r of responses) {
    fn.mockResolvedValueOnce(r);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("useFollowedArtists", () => {
  it("loads followed artists on mount", async () => {
    mockSequence(
      jsonResponse([
        {
          id: 1,
          artistMbid: "mbid-1",
          artistName: "Radiohead",
          lastCheckedAt: null,
          createdAt: "2025-01-01",
        },
      ])
    );

    const { result } = renderHook(() => useFollowedArtists());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.isFollowing("mbid-1")).toBe(true);
    expect(result.current.isFollowing("mbid-other")).toBe(false);
  });

  it("sets error on fetch failure", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));
    const { result } = renderHook(() => useFollowedArtists());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load followed artists");
  });

  it("follow() POSTs and refreshes the list", async () => {
    mockSequence(
      jsonResponse([]),
      jsonResponse({ status: "added", id: 7 }),
      jsonResponse([
        {
          id: 7,
          artistMbid: "mbid-1",
          artistName: "X",
          lastCheckedAt: null,
          createdAt: "2025-05-01",
        },
      ])
    );

    const { result } = renderHook(() => useFollowedArtists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.follow("mbid-1", "X");
    });

    expect(result.current.items).toHaveLength(1);
    const postCall = vi.mocked(fetch).mock.calls[1];
    expect(postCall[0]).toBe("/api/followed");
    expect((postCall[1] as RequestInit).method).toBe("POST");
  });

  it("unfollow() removes the item locally on 200", async () => {
    mockSequence(
      jsonResponse([
        {
          id: 1,
          artistMbid: "mbid-1",
          artistName: "X",
          lastCheckedAt: null,
          createdAt: "2025-01-01",
        },
      ]),
      jsonResponse({ status: "removed" })
    );

    const { result } = renderHook(() => useFollowedArtists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.unfollow("mbid-1");
    });

    expect(result.current.items).toHaveLength(0);
    const deleteCall = vi.mocked(fetch).mock.calls[1];
    expect((deleteCall[1] as RequestInit).method).toBe("DELETE");
  });

  it("unfollow() also removes locally on 404", async () => {
    mockSequence(
      jsonResponse([
        {
          id: 1,
          artistMbid: "mbid-1",
          artistName: "X",
          lastCheckedAt: null,
          createdAt: "2025-01-01",
        },
      ]),
      jsonResponse({ error: "not found" }, 404)
    );

    const { result } = renderHook(() => useFollowedArtists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.unfollow("mbid-1");
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("follow() throws when API returns an error", async () => {
    mockSequence(jsonResponse([]), jsonResponse({ error: "boom" }, 500));

    const { result } = renderHook(() => useFollowedArtists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.follow("mbid-1", "X");
      })
    ).rejects.toThrow("boom");
  });
});
