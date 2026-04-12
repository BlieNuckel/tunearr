import { render, screen, fireEvent } from "@testing-library/react";
import PurchaseLinksModal from "../PurchaseLinksModal";

const mockFetchContext = vi.fn();
const mockReset = vi.fn();
const mockPurchaseContext = {
  context: null as {
    recommendation: string;
    signals: { factor: string; recommendation: string; reason: string }[];
    label: { name: string; mbid: string } | null;
  } | null,
  loading: false,
  progress: null as { step: string; detail?: string } | null,
  fetchContext: mockFetchContext,
  reset: mockReset,
};

vi.mock("../../hooks/usePurchaseContext", () => ({
  default: () => mockPurchaseContext,
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  artistName: "Radiohead",
  albumTitle: "OK Computer",
  albumMbid: "mbid-123",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPurchaseContext.context = null;
  mockPurchaseContext.loading = false;
  mockPurchaseContext.progress = null;
});

describe("PurchaseLinksModal", () => {
  it("renders modal with album info", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Purchase Options")).toBeInTheDocument();
    expect(screen.getByText("OK Computer by Radiohead")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(<PurchaseLinksModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Purchase Options")).not.toBeInTheDocument();
  });

  it("shows Request Album button when onAddToLibrary provided", () => {
    render(<PurchaseLinksModal {...defaultProps} onAddToLibrary={vi.fn()} />);
    expect(screen.getByText("Request Album")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Close button when no onAddToLibrary", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.queryByText("Request Album")).not.toBeInTheDocument();
  });

  it("calls onAddToLibrary and onClose when Request Album clicked", () => {
    const onAddToLibrary = vi.fn();
    const onClose = vi.fn();
    render(
      <PurchaseLinksModal
        {...defaultProps}
        onClose={onClose}
        onAddToLibrary={onAddToLibrary}
      />
    );

    fireEvent.click(screen.getByText("Request Album"));
    expect(onAddToLibrary).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("fetches purchase context when modal opens", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(mockFetchContext).toHaveBeenCalledWith("mbid-123");
  });

  it("resets purchase context when modal closes", () => {
    render(<PurchaseLinksModal {...defaultProps} isOpen={false} />);
    expect(mockReset).toHaveBeenCalled();
  });

  it("shows request banner when recommendation is request", () => {
    mockPurchaseContext.context = {
      recommendation: "request",
      signals: [
        { factor: "label", recommendation: "request", reason: "blocklisted" },
      ],
      label: { name: "Universal Music", mbid: "label-umg" },
    };
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByTestId("purchase-banner-request")).toBeInTheDocument();
  });

  it("shows buy banner when recommendation is buy", () => {
    mockPurchaseContext.context = {
      recommendation: "buy",
      signals: [
        { factor: "label", recommendation: "buy", reason: "not blocklisted" },
      ],
      label: { name: "Warp Records", mbid: "label-warp" },
    };
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByTestId("purchase-banner-buy")).toBeInTheDocument();
  });

  it("shows label name and info links in header when label is present", () => {
    mockPurchaseContext.context = {
      recommendation: "buy",
      signals: [
        { factor: "label", recommendation: "buy", reason: "not blocklisted" },
      ],
      label: { name: "Warp Records", mbid: "label-warp" },
    };
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText(/Warp Records/)).toBeInTheDocument();
    const mbLink = screen.getByText("MusicBrainz").closest("a");
    expect(mbLink).toHaveAttribute(
      "href",
      "https://musicbrainz.org/label/label-warp"
    );
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
  });

  it("does not show label info when label is null", () => {
    mockPurchaseContext.context = {
      recommendation: "neutral",
      signals: [],
      label: null,
    };
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.queryByText("MusicBrainz")).not.toBeInTheDocument();
  });
});
