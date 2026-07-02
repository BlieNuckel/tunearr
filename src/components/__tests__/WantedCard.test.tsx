import { render, screen, fireEvent } from "@testing-library/react";
import WantedCard from "../WantedCard";
import { Permission } from "@shared/permissions";
import type { ReleaseGroup } from "../../types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, permissions: Permission.ADMIN } }),
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
const mockRemoveFromWanted = vi.fn();

vi.mock("../../hooks/useLidarr", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    requestAlbum: mockRequestAlbum,
  }),
}));

vi.mock("../../hooks/useWanted", () => ({
  default: () => ({
    state: "wanted",
    errorMsg: null,
    addToWanted: mockAddToWanted,
    removeFromWanted: mockRemoveFromWanted,
  }),
}));

vi.mock("../../hooks/usePurchase", () => ({
  default: () => ({
    state: "idle",
    errorMsg: null,
    record: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../../hooks/useFollowedArtists", () => ({
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

vi.mock("../PurchaseLinksModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="purchase-modal" /> : null,
}));

vi.mock("../PurchasePriceModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="purchase-price-modal" /> : null,
}));

const makeReleaseGroup = (
  overrides: Partial<ReleaseGroup> = {}
): ReleaseGroup => ({
  id: "mbid-1",
  score: 0,
  title: "OK Computer",
  "primary-type": "Album",
  "first-release-date": "",
  "artist-credit": [
    { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
  ],
  ...overrides,
});

describe("WantedCard", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders album title and artist", () => {
    render(<WantedCard releaseGroup={makeReleaseGroup()} initialWanted />);

    expect(screen.getByText("OK Computer")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
  });

  it("navigates to the album page when the body is clicked", () => {
    render(<WantedCard releaseGroup={makeReleaseGroup()} initialWanted />);

    fireEvent.click(screen.getByText("OK Computer"));
    expect(mockNavigate).toHaveBeenCalledWith("/album/mbid-1");
  });

  it("shows the Monitored button when the album is in library", () => {
    render(
      <WantedCard releaseGroup={makeReleaseGroup()} initialWanted inLibrary />
    );

    expect(screen.getByText("Monitored")).toBeInTheDocument();
  });

  it("calls onRemovedFromWanted from the options menu", () => {
    const onRemove = vi.fn();
    render(
      <WantedCard
        releaseGroup={makeReleaseGroup()}
        initialWanted
        onRemovedFromWanted={onRemove}
      />
    );

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Remove from wanted"));

    expect(onRemove).toHaveBeenCalledWith("mbid-1");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("opens the purchase links modal when the request button is clicked", () => {
    render(<WantedCard releaseGroup={makeReleaseGroup()} initialWanted />);

    fireEvent.click(screen.getByText("Request"));
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });
});
