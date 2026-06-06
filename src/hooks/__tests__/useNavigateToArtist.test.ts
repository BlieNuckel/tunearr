import { renderHook, act } from "@testing-library/react";
import useNavigateToArtist from "../useNavigateToArtist";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useNavigateToArtist", () => {
  it("navigates directly when an mbid is provided", async () => {
    const { result } = renderHook(() => useNavigateToArtist());
    await act(() => result.current.go({ mbid: "a1", name: "Radiohead" }));

    expect(mockNavigate).toHaveBeenCalledWith("/artist/a1");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves the name to an mbid before navigating", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ mbid: "resolved-1" }), { status: 200 })
    );

    const { result } = renderHook(() => useNavigateToArtist());
    await act(() => result.current.go({ name: "Radiohead" }));

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "/api/musicbrainz/artist/id?name=Radiohead"
    );
    expect(mockNavigate).toHaveBeenCalledWith("/artist/resolved-1");
  });

  it("does not navigate when the name cannot be resolved", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ mbid: null }), { status: 200 })
    );

    const { result } = renderHook(() => useNavigateToArtist());
    await act(() => result.current.go({ name: "Unknown" }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
