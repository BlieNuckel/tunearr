import { render, screen } from "@testing-library/react";
import PurchaseList from "../PurchaseList";
import { Permission } from "@shared/permissions";
import type { PurchaseItem } from "@/types";

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

describe("PurchaseList", () => {
  it("renders loading skeletons when loading", () => {
    render(
      <PurchaseList items={[]} loading={true} error={null} onRemove={vi.fn()} />
    );

    const skeletons = document.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error message", () => {
    render(
      <PurchaseList
        items={[]}
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
        loading={false}
        error={null}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getAllByText("$9.99").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$15.00").length).toBeGreaterThanOrEqual(1);
  });
});
