import { render, screen, fireEvent } from "@testing-library/react";
import PurchaseLinksModal from "../PurchaseLinksModal";
import { Permission } from "@shared/permissions";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, permissions: Permission.ADMIN },
  }),
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

  it("shows upload button for admin users", () => {
    render(<PurchaseLinksModal {...defaultProps} />);
    expect(screen.getByText("Upload purchased files")).toBeInTheDocument();
  });

  it("navigates to upload page when upload button clicked", () => {
    const onClose = vi.fn();
    render(<PurchaseLinksModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("Upload purchased files"));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/library/upload?mbid=mbid-123");
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
});
