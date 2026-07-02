import { render, screen, fireEvent } from "@testing-library/react";
import AlbumActions from "../AlbumActions";
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

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

const mockRequestAlbum = vi.fn();
const mockAddToWanted = vi.fn();
const mockFollow = vi.fn();
const mockIsFollowing = vi.fn(() => false);

vi.mock("@/hooks/useLidarr", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    requestAlbum: mockRequestAlbum,
  }),
}));

vi.mock("@/hooks/useWanted", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    addToWanted: mockAddToWanted,
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
    isFollowing: mockIsFollowing,
    follow: mockFollow,
    unfollow: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/PurchaseLinksModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="purchase-modal" /> : null,
}));

vi.mock("@/components/PurchasePriceModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="purchase-price-modal" /> : null,
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

describe("AlbumActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockIsFollowing.mockReturnValue(false);
    mockUser = { id: 1, permissions: Permission.IMPORT };
  });

  it("renders the request button and options menu", () => {
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    expect(screen.getByText("Request")).toBeInTheDocument();
    expect(screen.getByLabelText("More options")).toBeInTheDocument();
  });

  it("opens the purchase links modal when Request is clicked", () => {
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByText("Request"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });

  it("adds to wanted from the heart button", () => {
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByLabelText("Add to wanted"));
    expect(mockAddToWanted).toHaveBeenCalledWith("abc-123");
  });

  it("does not show the wanted toggle in the options menu", () => {
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByLabelText("More options"));
    expect(screen.queryByText("Add to wanted")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove from wanted")).not.toBeInTheDocument();
  });

  it("opens the price modal from Mark as purchased", () => {
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Mark as purchased"));
    expect(screen.getByTestId("purchase-price-modal")).toBeInTheDocument();
  });

  it("calls follow with artist details from the menu", () => {
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Follow artist"));
    expect(mockFollow).toHaveBeenCalledWith("a1", "Test Artist");
  });

  it("hides the follow option when no artist MBID is present", () => {
    render(
      <AlbumActions releaseGroup={makeReleaseGroup({ "artist-credit": [] })} />
    );

    fireEvent.click(screen.getByLabelText("More options"));
    expect(screen.queryByText("Follow artist")).not.toBeInTheDocument();
  });

  it("hides Upload files without IMPORT permission", () => {
    mockUser = { id: 2, permissions: Permission.REQUEST };
    render(<AlbumActions releaseGroup={makeReleaseGroup()} />);

    fireEvent.click(screen.getByLabelText("More options"));
    expect(screen.queryByText("Upload files")).not.toBeInTheDocument();
  });
});
