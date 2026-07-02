import { renderHook } from "@testing-library/react";
import useAlbumActions from "../useAlbumActions";
import { Permission } from "@shared/permissions";
import type { ReleaseGroup } from "@/types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

let mockUser: { id: number; permissions: number } | null = {
  id: 1,
  permissions: Permission.IMPORT,
};

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/hooks/useLidarr", () => ({
  default: () => ({ state: "idle", errorMsg: null, requestAlbum: vi.fn() }),
}));

vi.mock("@/hooks/useWanted", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    addToWanted: vi.fn(),
    removeFromWanted: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePurchase", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    record: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFollowedArtists", () => ({
  default: () => ({
    items: [],
    loading: false,
    error: null,
    isFollowing: () => false,
    follow: vi.fn(),
    unfollow: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const makeReleaseGroup = (
  overrides: Partial<ReleaseGroup> = {}
): ReleaseGroup => ({
  id: "abc-123",
  score: 100,
  title: "Test Album",
  "primary-type": "Album",
  "first-release-date": "2023-05-10",
  "artist-credit": [
    { name: "Test Artist", artist: { id: "a1", name: "Test Artist" } },
  ],
  ...overrides,
});

const labels = (options: { label: string }[]) => options.map((o) => o.label);

describe("useAlbumActions contextOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 1, permissions: Permission.IMPORT };
  });

  it("includes wanted, purchase, upload and go-to-artist", () => {
    const { result } = renderHook(() =>
      useAlbumActions({ releaseGroup: makeReleaseGroup() })
    );

    expect(labels(result.current.contextOptions)).toEqual([
      "Add to wanted",
      "Mark as purchased",
      "Upload files",
      "Go to artist",
    ]);
  });

  it("navigates to the artist from the go-to-artist option", () => {
    const { result } = renderHook(() =>
      useAlbumActions({ releaseGroup: makeReleaseGroup() })
    );

    const goToArtist = result.current.contextOptions.find(
      (o) => o.label === "Go to artist"
    );
    goToArtist?.onClick();
    expect(mockNavigate).toHaveBeenCalledWith("/artist/a1");
  });

  it("omits go-to-artist when the release has no artist MBID", () => {
    const { result } = renderHook(() =>
      useAlbumActions({
        releaseGroup: makeReleaseGroup({ "artist-credit": [] }),
      })
    );

    expect(labels(result.current.contextOptions)).not.toContain("Go to artist");
  });

  it("omits upload files without IMPORT permission", () => {
    mockUser = { id: 2, permissions: Permission.REQUEST };
    const { result } = renderHook(() =>
      useAlbumActions({ releaseGroup: makeReleaseGroup() })
    );

    expect(labels(result.current.contextOptions)).not.toContain("Upload files");
  });
});
