import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FollowArtistButton from "../FollowArtistButton";
import { __resetFollowedArtistsForTests } from "@/hooks/useFollowedArtists";

beforeEach(() => {
  __resetFollowedArtistsForTests();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("FollowArtistButton", () => {
  it("renders nothing when artistMbid is empty", () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]));
    const { container } = render(
      <FollowArtistButton artistMbid="" artistName="X" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Follow' when artist is not followed", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]));
    render(<FollowArtistButton artistMbid="mbid-1" artistName="X" />);
    expect(await screen.findByText("Follow")).toBeInTheDocument();
  });

  it("shows 'Following' when artist is already followed", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse([
        {
          id: 1,
          artistMbid: "mbid-1",
          artistName: "X",
          lastCheckedAt: null,
          createdAt: "2025-01-01",
        },
      ])
    );
    render(<FollowArtistButton artistMbid="mbid-1" artistName="X" />);
    expect(await screen.findByText("Following")).toBeInTheDocument();
  });

  it("clicking triggers POST when not followed", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ status: "added", id: 1 }))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            artistMbid: "mbid-1",
            artistName: "X",
            lastCheckedAt: null,
            createdAt: "2025-01-01",
          },
        ])
      );

    render(<FollowArtistButton artistMbid="mbid-1" artistName="X" />);
    const btn = await screen.findByRole("button", { name: /Follow X/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/followed",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("clicking triggers DELETE when already followed", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 1,
            artistMbid: "mbid-1",
            artistName: "X",
            lastCheckedAt: null,
            createdAt: "2025-01-01",
          },
        ])
      )
      .mockResolvedValueOnce(jsonResponse({ status: "removed" }));

    render(<FollowArtistButton artistMbid="mbid-1" artistName="X" />);
    const btn = await screen.findByRole("button", { name: /Unfollow X/i });
    fireEvent.click(btn);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === "DELETE"
      );
      expect(deleteCall?.[0]).toBe("/api/followed/mbid-1");
    });
  });
});
