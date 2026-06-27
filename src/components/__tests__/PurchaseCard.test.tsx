import { render, screen, fireEvent } from "@testing-library/react";
import PurchaseCard from "../PurchaseCard";
import { Permission } from "@shared/permissions";
import type { PurchaseItem } from "@/types";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

let mockUser: { id: number; permissions: number } | null = {
  id: 1,
  permissions: Permission.IMPORT,
};

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
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
  afterEach(() => {
    mockUser = { id: 1, permissions: Permission.IMPORT };
  });

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

  it("shows 'Upload files' option for a user with IMPORT permission", () => {
    mockUser = { id: 2, permissions: Permission.IMPORT };
    render(<PurchaseCard item={mockItem} onRemove={vi.fn()} />);

    fireEvent.click(screen.getAllByLabelText("More options")[0]);

    expect(screen.getByText("Upload files")).toBeInTheDocument();
  });

  it("hides 'Upload files' option for a user without IMPORT permission", () => {
    mockUser = { id: 3, permissions: Permission.REQUEST };
    render(<PurchaseCard item={mockItem} onRemove={vi.fn()} />);

    fireEvent.click(screen.getAllByLabelText("More options")[0]);

    expect(screen.queryByText("Upload files")).not.toBeInTheDocument();
  });
});
