import { render, screen } from "@testing-library/react";
import WantedList from "../WantedList";
import { Permission } from "@shared/permissions";
import type { WantedItem } from "@/types";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, permissions: Permission.ADMIN },
  }),
}));

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

const mockIsAlbumInLibrary = vi.fn((_mbid: string) => false);

vi.mock("@/hooks/useLibraryAlbums", () => ({
  default: () => ({
    isAlbumInLibrary: mockIsAlbumInLibrary,
  }),
}));

vi.mock("@/hooks/useLidarr", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    requestAlbum: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWanted", () => ({
  default: () => ({
    state: "wanted",
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

vi.mock("@/hooks/useReleaseTracks", () => ({
  default: () => ({
    media: [],
    loading: false,
    error: null,
    fetchTracks: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAudioPreview", () => ({
  default: () => ({
    toggle: vi.fn(),
    stop: vi.fn(),
    isTrackPlaying: () => false,
  }),
}));

vi.mock("@/components/PurchaseLinksModal", () => ({
  default: () => null,
}));

vi.mock("@/components/PurchasePriceModal", () => ({
  default: () => null,
}));

vi.mock("@/components/TrackList", () => ({
  default: () => <div data-testid="track-list" />,
}));

const mockItems: WantedItem[] = [
  {
    id: 1,
    albumMbid: "mbid-1",
    artistName: "Radiohead",
    albumTitle: "OK Computer",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    albumMbid: "mbid-2",
    artistName: "Bjork",
    albumTitle: "Homogenic",
    createdAt: "2024-01-02T00:00:00Z",
  },
];

describe("WantedList", () => {
  it("renders loading skeletons when loading", () => {
    render(
      <WantedList items={[]} loading={true} error={null} onRemove={vi.fn()} />
    );

    const skeletons = document.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error message", () => {
    render(
      <WantedList
        items={[]}
        loading={false}
        error="Network error"
        onRemove={vi.fn()}
      />
    );

    expect(
      screen.getByText("Failed to load wanted list: Network error")
    ).toBeInTheDocument();
  });

  it("renders empty state when no items", () => {
    render(
      <WantedList items={[]} loading={false} error={null} onRemove={vi.fn()} />
    );

    expect(screen.getByText("Your wanted list is empty")).toBeInTheDocument();
  });

  it("shows Monitored button when album is in library", () => {
    mockIsAlbumInLibrary.mockImplementation(
      (mbid: string) => mbid === "mbid-1"
    );

    render(
      <WantedList
        items={mockItems}
        loading={false}
        error={null}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Monitored")).toBeInTheDocument();

    mockIsAlbumInLibrary.mockReturnValue(false);
  });

  it("renders ReleaseGroupCards for each wanted item", () => {
    render(
      <WantedList
        items={mockItems}
        loading={false}
        error={null}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getAllByText("OK Computer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Radiohead").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Homogenic").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bjork").length).toBeGreaterThanOrEqual(1);
  });
});
