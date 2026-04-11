import { render, screen } from "@testing-library/react";
import PurchaseList from "../PurchaseList";
import { Permission } from "@shared/permissions";
import type { PurchaseItem, SpendingSummary } from "@/types";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, permissions: Permission.ADMIN },
  }),
}));

vi.mock("@/context/useSettings", () => ({
  useSettings: () => ({
    settings: {
      spending: { currency: "USD", monthlyLimit: null },
    },
  }),
}));

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

const mockItems: PurchaseItem[] = [
  {
    id: 1,
    albumMbid: "mbid-1",
    artistName: "Radiohead",
    albumTitle: "OK Computer",
    price: 999,
    currency: "USD",
    purchasedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    albumMbid: "mbid-2",
    artistName: "Bjork",
    albumTitle: "Homogenic",
    price: 1500,
    currency: "USD",
    purchasedAt: "2024-01-02T00:00:00Z",
  },
];

const mockSummary: SpendingSummary = {
  week: 999,
  month: 2499,
  year: 2499,
  allTime: 2499,
};

describe("PurchaseList", () => {
  it("renders loading skeletons when loading", () => {
    render(
      <PurchaseList
        items={[]}
        summary={null}
        loading={true}
        error={null}
        onRemove={vi.fn()}
      />
    );

    const skeletons = document.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error message", () => {
    render(
      <PurchaseList
        items={[]}
        summary={null}
        loading={false}
        error="Network error"
        onRemove={vi.fn()}
      />
    );

    expect(
      screen.getByText("Failed to load purchases: Network error")
    ).toBeInTheDocument();
  });

  it("renders empty state when no items", () => {
    render(
      <PurchaseList
        items={[]}
        summary={mockSummary}
        loading={false}
        error={null}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("No purchases recorded yet")).toBeInTheDocument();
  });

  it("renders purchase cards for each item", () => {
    render(
      <PurchaseList
        items={mockItems}
        summary={mockSummary}
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

  it("shows price on purchase cards", () => {
    render(
      <PurchaseList
        items={mockItems}
        summary={mockSummary}
        loading={false}
        error={null}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getAllByText("$9.99").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$15.00").length).toBeGreaterThanOrEqual(1);
  });

  it("renders spending summary when provided", () => {
    render(
      <PurchaseList
        items={mockItems}
        summary={mockSummary}
        loading={false}
        error={null}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("This month")).toBeInTheDocument();
  });
});
