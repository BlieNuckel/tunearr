import { render, screen } from "@testing-library/react";
import PurchaseCard from "../PurchaseCard";
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

const mockItem: PurchaseItem = {
  id: 1,
  albumMbid: "mbid-1",
  artistName: "Radiohead",
  albumTitle: "OK Computer",
  price: 999,
  currency: "USD",
  purchasedAt: "2024-06-15T12:00:00Z",
};

describe("PurchaseCard", () => {
  it("renders album title and artist name", () => {
    render(<PurchaseCard item={mockItem} onRemove={vi.fn()} />);

    expect(screen.getAllByText("OK Computer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Radiohead").length).toBeGreaterThanOrEqual(1);
  });

  it("renders formatted price", () => {
    render(<PurchaseCard item={mockItem} onRemove={vi.fn()} />);

    expect(screen.getAllByText("$9.99").length).toBeGreaterThanOrEqual(1);
  });

  it("renders purchase date", () => {
    render(<PurchaseCard item={mockItem} onRemove={vi.fn()} />);

    const dateElements = screen.getAllByText(/Jun.*2024|2024.*Jun/);
    expect(dateElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders JPY price without decimals", () => {
    const jpyItem: PurchaseItem = {
      ...mockItem,
      price: 1500,
      currency: "JPY",
    };

    render(<PurchaseCard item={jpyItem} onRemove={vi.fn()} />);

    expect(screen.getAllByText(/¥1,500/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows upload option for admin users", () => {
    render(<PurchaseCard item={mockItem} onRemove={vi.fn()} />);

    const optionButtons = screen.getAllByLabelText("More options");
    expect(optionButtons.length).toBeGreaterThan(0);
  });
});
