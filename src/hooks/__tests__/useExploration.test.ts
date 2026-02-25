import { renderHook, act } from "@testing-library/react";
import useExploration from "../useExploration";
import type { ReleaseGroup } from "../../types";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeReleaseGroup(id: string, title: string): ReleaseGroup {
  return {
    id,
    score: 100,
    title,
    "primary-type": "Album",
    "first-release-date": "2020-01-01",
    "artist-credit": [
      { name: "Test Artist", artist: { id: "art-1", name: "Test Artist" } },
    ],
  };
}

function mockSuggestionsResponse(suggestions: unknown[], newTags: unknown[]) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ suggestions, newTags }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

describe("useExploration", () => {
  it("starts in search phase with empty state", () => {
    const { result } = renderHook(() => useExploration());
    expect(result.current.phase).toBe("search");
    expect(result.current.round).toBe(0);
    expect(result.current.collectedAlbums).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("transitions to round phase on startExploration", async () => {
    const source = makeReleaseGroup("src-1", "Source Album");

    mockSuggestionsResponse(
      [{ releaseGroup: makeReleaseGroup("sug-1", "Suggestion"), tag: "rock" }],
      [{ name: "rock", count: 80 }]
    );

    const { result } = renderHook(() => useExploration());
    await act(() => result.current.startExploration(source));

    expect(result.current.phase).toBe("round");
    expect(result.current.round).toBe(1);
    expect(result.current.collectedAlbums).toHaveLength(1);
    expect(result.current.collectedAlbums[0].releaseGroup.id).toBe("src-1");
  });

  it("accumulates albums on selectSuggestion", async () => {
    const source = makeReleaseGroup("src-1", "Source Album");
    const suggestion1 = makeReleaseGroup("sug-1", "Suggestion 1");

    mockSuggestionsResponse(
      [{ releaseGroup: suggestion1, tag: "rock" }],
      [{ name: "rock", count: 80 }]
    );

    const { result } = renderHook(() => useExploration());
    await act(() => result.current.startExploration(source));

    mockSuggestionsResponse(
      [{ releaseGroup: makeReleaseGroup("sug-2", "Suggestion 2"), tag: "indie" }],
      [{ name: "rock", count: 80 }, { name: "indie", count: 60 }]
    );

    await act(() => result.current.selectSuggestion(0));

    expect(result.current.round).toBe(2);
    expect(result.current.collectedAlbums).toHaveLength(2);
    expect(result.current.collectedAlbums[1].releaseGroup.id).toBe("sug-1");
    expect(result.current.collectedAlbums[1].tag).toBe("rock");
  });

  it("transitions to complete phase after 5 rounds", async () => {
    const { result } = renderHook(() => useExploration());

    mockSuggestionsResponse(
      [{ releaseGroup: makeReleaseGroup("s1", "S1"), tag: "rock" }],
      [{ name: "rock", count: 80 }]
    );
    await act(() =>
      result.current.startExploration(makeReleaseGroup("src", "Source"))
    );

    for (let i = 1; i < 5; i++) {
      mockSuggestionsResponse(
        [{ releaseGroup: makeReleaseGroup(`s${i + 1}`, `S${i + 1}`), tag: "rock" }],
        [{ name: "rock", count: 80 }]
      );
      await act(() => result.current.selectSuggestion(0));
    }

    await act(() => result.current.selectSuggestion(0));
    expect(result.current.phase).toBe("complete");
    expect(result.current.collectedAlbums).toHaveLength(6);
  });

  it("resets all state", async () => {
    const source = makeReleaseGroup("src-1", "Source");
    mockSuggestionsResponse(
      [{ releaseGroup: makeReleaseGroup("sug-1", "Suggestion"), tag: "rock" }],
      [{ name: "rock", count: 80 }]
    );

    const { result } = renderHook(() => useExploration());
    await act(() => result.current.startExploration(source));
    await act(() => result.current.reset());

    expect(result.current.phase).toBe("search");
    expect(result.current.round).toBe(0);
    expect(result.current.collectedAlbums).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.accumulatedTags).toEqual([]);
  });

  it("sets error on failed fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );

    const { result } = renderHook(() => useExploration());
    await act(() =>
      result.current.startExploration(makeReleaseGroup("src", "Source"))
    );

    expect(result.current.error).toBe("Server error");
  });
});
